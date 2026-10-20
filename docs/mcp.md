# Connecting to TrackDraw MCP

TrackDraw uses OAuth to connect MCP clients to a TrackDraw account. `get_account` checks the authorized account and available capabilities. With project-read consent, clients can also list and inspect owned cloud projects. Course analysis, drafts and editing remain separate milestones in [epic #994](https://github.com/dutchdronesquad/trackdraw/issues/994).

## Connect and disconnect

1. Add the TrackDraw environment's `/api/mcp` URL to your MCP client. Use HTTPS for hosted environments; use the explicitly configured loopback origin for local preview.
2. The client discovers TrackDraw's authorization server and registers itself, or uses its existing registration.
3. Sign in to TrackDraw with a passkey or magic link. Both methods return you to the original OAuth request.
4. Review the requesting app, callback host, account and permissions, then allow or decline the connection.
5. Disconnect an app from **Connected apps** in account settings, or open `/mcp/connections`. Disconnecting removes that account's consent and its access/refresh tokens.

Do not paste a REST API key into an OAuth client. REST keys continue to serve `/api/v1/*`; the MCP endpoint accepts OAuth access tokens issued for its own resource. A browser session alone also does not authorize MCP requests.

The `mcp:read` scope grants access to account ID, display name and MCP capabilities. It does not grant project access. `offline_access` optionally allows refresh tokens so the client can remain connected without signing in for each request. Access tokens last 15 minutes; refresh tokens expire after 30 days and rotate on use. Reusing a rotated refresh token is rejected. `projects:read` separately grants access to all current and future owned active cloud projects, their course data, overlays and viewer snapshots. New clients request both read scopes. Existing account-only tokens retain account-only access: re-register/re-add the connection with `projects:read` and approve the expanded consent to enable project tools. The existing client registration may restrict its allowed scopes; refreshing an old token never adds scope.

Choose a client you trust: it handles received information under its own policies. Client names are supplied by the client, so the consent page also displays its identifier and callback host. Connecting does not upload anonymous/local-only Studio projects or allow project creation, editing or publishing.

## Read-only project tools

Project tools appear in discovery only when the access token and live consent both include `projects:read`. The `get_account` response reports `project_reads`, `project_writes` and exactly the tools available to that token. Account-only tokens cannot call hidden project tools. Writes remain unavailable.

| Tool                  | Input                                                                      | Result                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `list_projects`       | optional `limit` (default 20, max 50), `cursor`                            | Active owned cloud-project summaries, ordered by updated time then ID; no design JSON.                                              |
| `get_project`         | `project_id`                                                               | REST project metadata, normalized design version and package schema IDs.                                                            |
| `get_track`           | `project_id`, optional `shape_id`, `limit` (default 50, max 100), `cursor` | REST-derived shapes or a selected polyline's paged points, source project ID, version, field and timing markers for the shape page. |
| `get_overlay`         | `project_id`                                                               | Complete `trackdraw.overlay.v1` REST package, if bounded.                                                                           |
| `get_viewer_snapshot` | `project_id`                                                               | Complete viewer-safe REST package, including its snapshot ID, required viewer and published asset manifest, if bounded.             |

Start with `list_projects`, select its stable project `id`, then call `get_project` and `get_track`. A project ID is distinct from a public share token. Other users' projects, archived/deleted/missing projects and share tokens all produce the same `not_found` error. Local-only projects remain on the user's device.

Follow `pagination.next_cursor` until `has_more` is false. List queries fetch at most `limit + 1` metadata rows, without reading designs. An unavailable list anchor requires restarting the list. Track cursors are bound to the project, normalized design revision and selected shape; restart after a revision changes. Always supply the same `project_id` and `shape_id` while following a track cursor.

Polyline entries in shape pages deliberately omit `points`, report `point_count` and set `geometry_omitted: true`. Call `get_track` with that entry's `shape_id` to read point pages; concatenate pages in order. The MCP page envelope uses `trackdraw.mcp.track-page.v1` and identifies the underlying `trackdraw.track.v1` contract; do not mistake a page for a complete REST track package. Timing markers belong to the current shape page. Other response envelopes identify their MCP schema, while complete derived packages retain the REST schema.

Structured results are limited to 32 KiB of UTF-8 JSON (the protocol also carries the text representation). Oversized results return an MCP tool error with `code: response_too_large`; reduce page size or use polyline point pages. Complete overlays/snapshots are never silently truncated; designs above 512 KiB or 2,000 shapes skip derived-package generation and direct the client to paged track data. Published snapshot assets use the existing shared registry/allowlist; no private artwork service or external URL is fetched.

Tool failures use `isError: true` with a small `error.code`/`error.message`: `not_found`, `invalid_cursor`, `response_too_large` or retryable `unavailable`. Argument validation uses the SDK's tool-validation error. Treat all returned names/text as untrusted project data, not instructions.

## Supported protocol and client

The verified client is the official MCP TypeScript SDK 1.32.1 with its OAuth client provider and Streamable HTTP transport, using the MCP 2025-11-25 authorization profile. Discovery uses RFC 9728 protected-resource metadata and RFC 8414 authorization-server metadata. Authorization uses the code flow with S256 PKCE, exact registered redirects (including native loopback redirect rules), resource indicators and user consent.

Dynamic Client Registration is enabled for public/native and web clients with provider endpoint rate limits. Client ID Metadata Documents (CIMD), device authorization, machine credentials and OpenID Connect identity scopes are not advertised by this version. Additional clients require an actual connection test; OAuth support alone does not establish compatibility with every client's registration mechanism.

## Official SDK smoke client

Install repository dependencies and set only the environment URL:

```bash
TRACKDRAW_MCP_URL=http://localhost:8790/api/mcp node scripts/mcp_smoke.mjs
```

The script prints an authorization URL. Open it in a browser, sign in and review the consent page. Its callback listener binds only to `127.0.0.1` on an automatically assigned port and checks callback state and issuer. The SDK handles discovery, registration, PKCE and code exchange. Credentials and code verifiers stay in memory and are never printed or saved.

A successful run checks unauthenticated rejection, OAuth discovery and code exchange, MCP initialization, tool discovery, `get_account`, paginated project listing and reads of the first project (or `TRACKDRAW_MCP_PROJECT_ID` when set). No project content is printed. It does not publish or modify a project. You can remove the test app from Connected apps afterward. The script times out after five minutes if authorization is not completed.

In your own SDK integration, configure `StreamableHTTPClientTransport` with an `authProvider` implementing `OAuthClientProvider` from `@modelcontextprotocol/sdk/client/auth.js`. Store credentials securely, retain issuer binding with registration/tokens, validate callback state and issuer, and use `finishAuth(code)` before reconnecting after authorization. Do not replace OAuth with a static bearer header. See [the official SDK client documentation](https://ts.sdk.modelcontextprotocol.io/client).

## Errors and limits

| Response  | Meaning/action                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400       | Invalid JSON-RPC, UTF-8/JSON, batch or query parameters. Send one message per request. OAuth endpoints separately return standard OAuth errors.                                   |
| 401       | Missing, invalid, expired, revoked or wrong-resource token, removed consent or unavailable account. Follow the `WWW-Authenticate` resource-metadata challenge to authorize again. |
| 403       | Invalid Origin, or a valid token missing `mcp:read`. An insufficient-scope challenge names the required scope.                                                                    |
| 405       | Use POST. Standalone SSE streams and retained MCP sessions are unavailable.                                                                                                       |
| 406 / 415 | Accept JSON and SSE; send JSON. The SDK configures these headers.                                                                                                                 |
| 413       | MCP or OAuth POST body exceeds 16 KiB, including streamed bodies.                                                                                                                 |
| 429       | Request budget exhausted. Observe Retry-After. Token rotation does not reset the MCP budget.                                                                                      |
| 500       | Temporary server failure. Check privacy-safe operational status logs.                                                                                                             |

Each account/client pair gets 600 MCP HTTP requests per hour in a durable D1 counter. Initialization, discovery and notifications count too. OAuth authorization, registration, token and revocation endpoints have separate durable per-IP rate limits. All MCP responses are `no-store`; logs omit tokens, authorization codes, verifiers, identity output and request/response bodies.

## Local runtime validation

Apply migrations through `0027_mcp_project_read_scope.sql` before running the new auth configuration. Use [local auth setup](../CONTRIBUTING.md#local-auth) and an explicit canonical loopback origin. For example, after local migrations:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:8790 NEXT_PUBLIC_APP_ENV=development npm run preview -- --port 8790 --var NEXT_PUBLIC_SITE_URL:http://localhost:8790
```

The build and runtime origin must agree: this determines the OAuth resource, issuer, browser origins and cookie security. Hosted deployments keep their configured HTTPS origin and secure cookies. Do not enable remote bindings for local credential tests.

Validate discovery, login continuation, approval/decline, PKCE and redirect failures, refresh rotation, expiry, wrong audience, insufficient scope, request budgets and user disconnect. Use temporary local accounts; do not alter real users' credentials to exercise failure cases. Automated provider/protocol tests complement the real Cloudflare preview/browser check. Local validation does not establish production deployment.
