import { getSiteUrl } from "@/lib/seo";
import { getMcpResource, MCP_DEFAULT_SCOPES } from "./oauth-metadata";

export function mcpChallenge(
  error?: "invalid_token" | "insufficient_scope",
  siteUrl: string = getSiteUrl()
) {
  const metadata = new URL(
    "/.well-known/oauth-protected-resource/api/mcp",
    getMcpResource(siteUrl)
  ).href;
  return `Bearer resource_metadata="${metadata}", scope="${MCP_DEFAULT_SCOPES.join(" ")}"${error ? `, error="${error}"` : ""}`;
}

export function mcpError(
  status: number,
  code: number,
  message: string,
  headers?: HeadersInit
) {
  const response = Response.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    { status, headers }
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

/** Reject public invalid requests before loading Next or initializing auth. */
export function getEarlyMcpResponse(
  request: Request,
  siteUrl: string = getSiteUrl(),
  appEnv: string | undefined = process.env.NEXT_PUBLIC_APP_ENV
): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== "/api/mcp") return null;
  const origin = request.headers.get("origin");
  const allowed = [new URL(siteUrl).origin];
  if (appEnv !== "production")
    allowed.push("http://localhost:8787", "http://127.0.0.1:8787");
  if (origin !== null && !allowed.includes(origin))
    return mcpError(403, -32000, "Origin is not allowed.");
  if (url.search)
    return mcpError(
      400,
      -32600,
      "Use the MCP endpoint without query parameters."
    );
  if (!request.headers.get("authorization"))
    return mcpError(
      401,
      -32000,
      "Authorize your TrackDraw account to connect.",
      { "WWW-Authenticate": mcpChallenge(undefined, siteUrl) }
    );
  // Every supplied credential still goes through live authentication and budgets.
  return null;
}
