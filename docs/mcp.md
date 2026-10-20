# Connecting to TrackDraw MCP

TrackDraw's initial MCP endpoint supports an account connection check. Project reads, course analysis, creating drafts and editing projects are tracked separately in [epic #994](https://github.com/dutchdronesquad/trackdraw/issues/994).

## Supported client and authentication

Use the official MCP TypeScript SDK's `StreamableHTTPClientTransport` with an explicitly configured bearer header. The endpoint uses standard Streamable HTTP with JSON responses and no retained MCP session. It does not provide OAuth discovery or an interactive OAuth sign-in flow. Clients that require OAuth are not supported by this version; compatibility with other clients needs an actual connection test.

1. Open `/studio?dialog=account&section=api-keys` on the TrackDraw environment you want to connect to and sign in.
2. Create an expiring key for your integration. The existing form supplies the standard read permissions; there is no separate MCP write toggle or scope selector.
3. Store the key in your client's protected environment or secret configuration, then configure the `/api/mcp` URL from that same environment.
4. Connect, discover tools and call `get_account` with `{}`. Check the returned account and capabilities.
5. Revoke the key in account settings when the connection is no longer needed. Subsequent MCP requests must fail with 401.

An API key can be limited to selected cloud projects. Its project-access settings will remain authoritative when project tools are added. Connecting does not upload local-only or anonymous Studio projects.

Only grant a key to a client you trust. The client receives the tool output and handles it under its own policies. The initial account tool returns account ID/display name, granted REST permissions, expiry and available MCP capabilities. It omits email, credentials and project contents. REST permissions in this response do not imply that equivalent MCP tools have already shipped.

## Official SDK example

After installing this repository's dependencies, set `TRACKDRAW_MCP_URL` and `TRACKDRAW_API_KEY` in a protected shell environment and run:

```bash
node scripts/mcp_smoke.mjs
```

For local preview, use `http://localhost:8787/api/mcp`. For another environment, use its explicit origin followed by `/api/mcp`; this documentation alone does not establish that a release is deployed there. Read secrets through your normal secret manager or an interactive shell prompt rather than placing them in command history.

The script verifies unauthenticated rejection, protocol initialization, tool discovery and an authenticated account/capability check. It prints capability names and success state without printing the key or account identity. Its core connection is:

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "trackdraw-integration", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL(process.env.TRACKDRAW_MCP_URL),
  {
    requestInit: {
      headers: { Authorization: `Bearer ${process.env.TRACKDRAW_API_KEY}` },
    },
  }
);

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const account = await client.callTool({ name: "get_account", arguments: {} });
  // Consume account output only within your trusted integration.
} finally {
  await client.close();
}
```

Use HTTPS for hosted connections. Plain HTTP is limited to localhost development. Keep credentials out of URLs, queries, logs and public configuration.

## Errors and limits

| Response  | Meaning/action                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 400       | Invalid JSON-RPC, UTF-8/JSON body, batch, protocol version or query parameters. Send one message to the endpoint without query parameters. |
| 401       | Missing, invalid, expired, disabled, revoked or orphaned API key. Browser cookies do not authorize MCP.                                    |
| 403       | A supplied Origin is not allowed. Native clients can omit Origin; browser clients cannot use arbitrary origins.                            |
| 405       | Use POST. Standalone SSE, retained sessions and session deletion are unavailable.                                                          |
| 406 / 415 | Accept both `application/json` and `text/event-stream`; send `application/json`. The SDK configures these headers.                         |
| 413       | Request body exceeds 16 KiB, including streamed bodies without Content-Length.                                                             |
| 429       | Shared API-key budget exhausted. Observe Retry-After when present and reduce request frequency.                                            |
| 500       | Temporary server failure. Investigate the privacy-safe operational status logs; do not log secrets while debugging.                        |

The existing per-key budget is 600 requests per hour, shared with REST calls using the same key. Initialization, notifications and discovery consume requests too. No project writes are exposed; an attempted write tool returns an MCP error and does not change a project.

## Contributor validation

Run `npm run migrate:local` and `npm run preview`, following [local authentication setup](../CONTRIBUTING.md#local-auth). Use a local-only account/key for validation. Run the smoke client, revoke the key and verify another request returns 401. Validate an expired/disabled key and the 429 budget path with local fixtures only. Do not change a real user's key or quota to exercise these cases.

The automated route tests use the real SDK client and server/transport while mocking auth and database dependencies. They establish protocol and boundary behavior; Cloudflare preview with actual D1/Better Auth establishes runtime integration. Neither proves deployment or compatibility with an untested client.
