import "server-only";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getSiteUrl } from "@/lib/seo";
import { authenticateMcpRequest } from "./oauth-auth";
import { createMcpServer } from "./server";
import { readBoundedRequestBody } from "@/lib/server/bounded-request-body";

export const MCP_MAX_BODY_BYTES = 16_384;

function mcpError(
  status: number,
  code: number,
  message: string,
  headers?: HeadersInit
) {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers }
  );
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Native MCP clients do not send an Origin; authentication is still required.
  if (origin === null) return true;
  const allowed = [new URL(getSiteUrl()).origin];
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    allowed.push("http://localhost:8787", "http://127.0.0.1:8787");
  }
  return allowed.includes(origin);
}

async function readMessage(request: Request) {
  try {
    const body = await readBoundedRequestBody(request, MCP_MAX_BODY_BYTES);
    if (body.tooLarge)
      return {
        error: mcpError(413, -32000, "MCP request exceeds 16384 bytes."),
      };
    const message: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(body.bytes)
    );
    // One message per budgeted request; JSON-RPC batches are outside MCP v1.
    if (Array.isArray(message) || message === null) {
      return {
        error: mcpError(400, -32600, "Send one JSON-RPC message per request."),
      };
    }
    return { message };
  } catch {
    return { error: mcpError(400, -32700, "Invalid UTF-8 JSON body.") };
  }
}

async function dispatch(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return mcpError(403, -32000, "Origin is not allowed.");
  }
  if (new URL(request.url).search) {
    return mcpError(
      400,
      -32600,
      "Use the MCP endpoint without query parameters."
    );
  }

  // Revalidate OAuth on every request, including discovery and notifications.
  // Browser sessions and REST API keys do not authorize MCP requests.
  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) {
    return mcpError(auth.status, -32000, auth.detail, auth.headers);
  }

  if (request.method !== "POST") {
    return mcpError(
      405,
      -32000,
      "Use POST; MCP sessions and SSE streams are not enabled.",
      { Allow: "POST" }
    );
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return mcpError(415, -32000, "Content-Type must be application/json.");
  }
  const body = await readMessage(request);
  if (body.error) return body.error;

  const server = createMcpServer(auth.identity);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    // The bounded reader above also rejects batches before SDK dispatch.
    return await transport.handleRequest(request, { parsedBody: body.message });
  } finally {
    await server.close();
  }
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await dispatch(request);
  } catch {
    // Never include the exception: SDK/auth errors can contain request data.
    response = mcpError(
      500,
      -32603,
      "TrackDraw MCP is temporarily unavailable."
    );
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  console.info(
    JSON.stringify({
      event: "mcp_request",
      method: request.method,
      status: response.status,
      duration_ms: Date.now() - startedAt,
    })
  );
  return response;
}
