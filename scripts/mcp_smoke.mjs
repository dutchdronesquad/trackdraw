import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";

let endpoint;
try {
  endpoint = new URL(process.env.TRACKDRAW_MCP_URL);
  assert.equal(endpoint.pathname, "/api/mcp");
  assert.equal(
    endpoint.search + endpoint.username + endpoint.password + endpoint.hash,
    ""
  );
  assert.ok(
    endpoint.protocol === "https:" ||
      (endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname))
  );
} catch {
  console.error(
    "Set TRACKDRAW_MCP_URL to an HTTPS /api/mcp endpoint or a loopback HTTP preview URL, without credentials, query or fragment."
  );
  process.exit(1);
}

// Credentials stay in this process only. The SDK owns discovery, public-client
// registration, S256 PKCE, resource indicators and authorization-code exchange.
let registration;
let tokens;
let verifier;
let redirectUrl;
const state = randomBytes(32).toString("base64url");
let resolveCallback;
let rejectCallback;
const callback = new Promise((resolve, reject) => {
  resolveCallback = resolve;
  rejectCallback = reject;
});
void callback.catch(() => {});
const provider = {
  get redirectUrl() {
    return redirectUrl;
  },
  get clientMetadata() {
    return {
      client_name: "TrackDraw MCP connection check",
      redirect_uris: [redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "mcp:read projects:read offline_access",
    };
  },
  state: () => state,
  clientInformation: () => registration,
  saveClientInformation: (value) => {
    registration = value;
  },
  tokens: () => tokens,
  saveTokens: (value) => {
    tokens = value;
  },
  saveCodeVerifier: (value) => {
    verifier = value;
  },
  codeVerifier: () => verifier,
  redirectToAuthorization: (url) => {
    console.log(`Authorize TrackDraw in your browser: ${url.href}`);
  },
};
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  const url = new URL(request.url, redirectUrl);
  const suppliedState = Buffer.from(url.searchParams.get("state") ?? "");
  const expectedState = Buffer.from(state);
  if (
    request.method !== "GET" ||
    request.headers.host !== new URL(redirectUrl).host ||
    url.pathname !== "/callback" ||
    suppliedState.length !== expectedState.length ||
    !timingSafeEqual(suppliedState, expectedState) ||
    !registration?.issuer ||
    url.searchParams.get("iss") !== registration.issuer
  ) {
    response.writeHead(400).end("Invalid authorization callback.");
    return;
  }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.has("error")) {
    response
      .writeHead(403)
      .end("TrackDraw connection declined. You can close this window.");
    rejectCallback(new Error("Authorization declined"));
    return;
  }
  response
    .writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
    .end("TrackDraw connection approved. You can close this window.");
  resolveCallback(code);
});
const client = new Client({ name: "trackdraw-smoke", version: "1.0.0" });
const timeout = setTimeout(
  () => rejectCallback(new Error("Authorization timed out")),
  5 * 60_000
);
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  redirectUrl = `http://127.0.0.1:${server.address().port}/callback`;
  const unauthenticated = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get("cache-control"), "no-store");
  assert.match(
    unauthenticated.headers.get("www-authenticate"),
    /resource_metadata=/
  );
  await unauthenticated.body?.cancel();
  let transport = new StreamableHTTPClientTransport(endpoint, {
    authProvider: provider,
  });
  try {
    await client.connect(transport);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
    const code = await callback;
    await transport.finishAuth(code);
    await client.close();
    transport = new StreamableHTTPClientTransport(endpoint, {
      authProvider: provider,
    });
    await client.connect(transport);
  }
  assert.equal(client.getServerVersion()?.name, "trackdraw");
  assert.equal(transport.sessionId, undefined);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "get_account",
      "list_projects",
      "get_project",
      "get_track",
      "get_overlay",
      "get_viewer_snapshot",
    ]
  );
  const result = await client.callTool({ name: "get_account", arguments: {} });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent?.type, "api_identity");
  assert.equal(result.structuredContent?.mcp?.project_writes, false);
  assert.equal(result.structuredContent?.mcp?.project_reads, true);
  const listed = await client.callTool({
    name: "list_projects",
    arguments: { limit: 2 },
  });
  assert.notEqual(listed.isError, true);
  assert.equal(listed.structuredContent?.type, "project_list");
  assert.ok(Array.isArray(listed.structuredContent.data));
  const projectId =
    process.env.TRACKDRAW_MCP_PROJECT_ID ??
    listed.structuredContent.data[0]?.id;
  if (projectId) {
    const metadata = await client.callTool({
      name: "get_project",
      arguments: { project_id: projectId },
    });
    assert.notEqual(metadata.isError, true);
    assert.equal(metadata.structuredContent?.project?.id, projectId);
    const track = await client.callTool({
      name: "get_track",
      arguments: { project_id: projectId, limit: 1 },
    });
    assert.notEqual(track.isError, true);
    assert.equal(track.structuredContent?.source?.id, projectId);
    for (const name of ["get_overlay", "get_viewer_snapshot"]) {
      const derived = await client.callTool({
        name,
        arguments: { project_id: projectId },
      });
      if (derived.isError)
        assert.equal(
          derived.structuredContent?.error?.code,
          "response_too_large"
        );
      else assert.equal(derived.structuredContent?.source?.id, projectId);
    }
  }
  console.log(
    "MCP OAuth smoke passed: discovery, registration, PKCE authorization, initialization, get_account and owned project reads."
  );
} catch {
  // Do not dump SDK errors, callbacks or token responses into logs.
  console.error(
    "MCP OAuth smoke failed. Check the endpoint, consent and privacy-safe server status logs."
  );
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await client.close();
  server.close();
  tokens = undefined;
  verifier = undefined;
}
