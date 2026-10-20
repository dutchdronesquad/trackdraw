import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const rawUrl = process.env.TRACKDRAW_MCP_URL;
const key = process.env.TRACKDRAW_API_KEY;
if (!rawUrl || !key) {
  console.error(
    "Set TRACKDRAW_MCP_URL and TRACKDRAW_API_KEY in a protected environment."
  );
  process.exit(1);
}
let url;
try {
  url = new URL(rawUrl);
  assert.equal(url.pathname, "/api/mcp", "Use the /api/mcp endpoint.");
  assert.equal(url.search, "", "Do not put credentials in the URL.");
  assert.equal(
    url.username + url.password + url.hash,
    "",
    "Use header-based credentials only."
  );
  assert.ok(
    url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)),
    "Use HTTPS except for loopback development."
  );
} catch {
  console.error(
    "Use a valid /api/mcp URL over HTTPS or loopback HTTP without credentials, query or fragment."
  );
  process.exit(1);
}

const client = new Client({ name: "trackdraw-smoke", version: "1.0.0" });
try {
  const unauthenticated = await fetch(url, {
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
  await unauthenticated.body?.cancel();

  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  await client.connect(transport);
  assert.equal(client.getServerVersion()?.name, "trackdraw");
  assert.equal(transport.sessionId, undefined);
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["get_account"]
  );
  const result = await client.callTool({ name: "get_account", arguments: {} });
  assert.notEqual(result.isError, true);
  assert.equal(result.structuredContent?.type, "api_identity");
  assert.equal(result.structuredContent?.mcp?.project_writes, false);
  console.log(
    "MCP smoke passed: initialization, discovery, get_account, no-store and unauthenticated rejection."
  );
} catch {
  // SDK errors may include private response data; do not dump them to logs.
  console.error(
    "MCP smoke failed. Check the endpoint, key validity and server status logs."
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
