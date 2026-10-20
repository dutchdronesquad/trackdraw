# TrackDraw MCP foundation PVA

Date: October 20, 2026

Status: implementing [#995](https://github.com/dutchdronesquad/trackdraw/issues/995), under [epic #994](https://github.com/dutchdronesquad/trackdraw/issues/994).

## Decision

Host a stateless MCP Streamable HTTP endpoint at `/api/mcp` inside the existing Next.js/OpenNext Worker. Use the official TypeScript SDK's Web Standards transport and its Cloudflare-compatible JSON Schema validator. JSON request/response mode avoids long-lived SSE streams, cross-instance sessions, new storage bindings and background transport state.

The initial supported client is the official MCP TypeScript SDK with an explicitly configured `Authorization: Bearer` header. Provision an ordinary, expiring TrackDraw API key through the existing account settings. Reuse Better Auth verification, revocation, permission semantics, request budgets and account activity tracking on every HTTP request. Browser cookies never substitute for a bearer key.

This is a deliberately limited, manually provisioned bearer integration. It does not implement the MCP OAuth discovery/authorization flow and must not be advertised as compatible with clients that require OAuth. The HTTP authorization specification recommends OAuth; manual header configuration is a documented interoperability tradeoff for the first supported client. Add OAuth before claiming support for OAuth-only clients, rather than exposing misleading discovery metadata or treating a REST key as an OAuth access token.

## Tool and permission contract

The first tool is `get_account`, with an empty, strict input object. Like REST `/api/v1/me`, every verified account key can inspect its own minimal identity, granted REST permissions and key expiry. The MCP result additionally identifies the tools actually implemented and states that project reads and writes are unavailable. The result excludes email, key material, key metadata and project contents.

All current MCP tools are read-only. No write tool is registered, even if a future key contains a write permission. Project tools in #996 must reuse REST permission checks and selected-project restrictions from `src/lib/api/project-access.ts`; account ownership alone does not imply access to every project. Draft creation (#998) and existing-project changes (#999) require separate explicit write capabilities and their own acceptance checks. Never infer write permission from read access or a successful connection.

Account-backed projects are the future MCP data boundary. Anonymous/local-only Studio projects are neither uploaded nor exposed by connecting a client. Share tokens remain distinct from project identifiers. There are no changes to public share/embed routes or editor persistence.

## Runtime and protection

- `/api/mcp` remains under `/api/*`, so the existing Worker page-method guard does not block protocol POST requests. Preserve the early server-action guard.
- Instantiate the server and transport per request, bind the verified identity through a closure, and close them after the JSON response is ready. No module-level account/transport state.
- Authenticate initialization, discovery, tool calls and notifications independently. Revoking or expiring a key takes effect on subsequent requests without waiting for a connection to close.
- Share Better Auth's existing 600 requests/hour budget per key across REST and MCP. Initialization, notifications, discovery and failed authenticated requests consume requests too. No extra MCP quota store is introduced.
- Read at most 16 KiB, checking both declared and actual streamed bytes. Require UTF-8 JSON and one message per request; reject batches so one budgeted request cannot dispatch multiple calls.
- Require an absent Origin (native client) or the configured site origin. Permit localhost/127.0.0.1 port 8787 only outside production. No wildcard CORS or cookie authorization.
- Return no-store responses, 401 bearer challenges, 429 with retry timing when provided by Better Auth, and sanitized 500 errors. Authenticated GET/DELETE/other methods return 405; there is no standalone SSE stream or session termination endpoint.
- Operational logs contain only `event`, HTTP `method`, `status` and `duration_ms`. Do not log tokens, accounts, RPC arguments, response bodies or exception text.

## Codebase anchors

- `src/app/api/mcp/route.ts`: route methods and dynamic execution.
- `src/lib/server/mcp/handler.ts`: request boundary, authorization, limits and transport lifecycle.
- `src/lib/server/mcp/server.ts`: tool definitions and account-bound handlers.
- `src/lib/server/api-identity.ts`: minimal identity serialization shared with REST `/me`.
- `src/lib/server/api-keys.ts` and `auth.ts`: existing key lifecycle, authorization and budgets.
- `tests/app/api/mcp.route.test.ts`: real SDK protocol/client tests with mocked persistence/auth dependencies.
- `scripts/mcp_smoke.mjs`: official client check against Cloudflare preview or an explicitly selected deployed environment.

## Delivery and go/no-go

- [x] Select the supported transport/client and document the manual bearer/OAuth boundary.
- [x] Add authenticated discovery and the account/capability tool with shared identity serialization.
- [x] Cover invalid/expired/revoked credentials, cross-account isolation, unknown writes, limits, origin checks and sanitized failures.
- [x] Run lint, full tests, type checking and production build.
- [x] Run migrations and Cloudflare preview locally; exercise the documented client with a real local key, then expiration/revocation and request-budget failure paths.
- [x] Record validation evidence and limitations below and in the delivery PR.

Do not claim universal MCP client support, production availability or completion of the parent epic from this foundation. A failed Worker build or failed authenticated preview check is a no-go for marking #995 complete.

## Sources

- [Official SDK server and transport documentation](https://ts.sdk.modelcontextprotocol.io/server)
- [SDK Web Standards transport](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/server/webStandardStreamableHttp.ts)
- [MCP Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- [MCP HTTP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Cloudflare Web Request API](https://developers.cloudflare.com/workers/runtime-apis/request/)

## Local validation evidence

Validated on October 20, 2026 with SDK 1.32.1, OpenNext Cloudflare 1.20.12 and Wrangler 4.151.2:

- Lint and type checking pass; all 1,435 tests pass, including 37 MCP route/protocol checks using the official SDK.
- The production Next.js build and `npm run preview` Worker build both complete.
- A temporary local D1 account/session fixture creates a real key through the existing account API; the official smoke client completes initialization, discovery and `get_account` against the local Worker.
- MCP and REST `/me` return the same identity summary. Unknown write tools fail; disabled, expired, invalid and revoked keys return 401. Forced local quota exhaustion returns 429 with Retry-After. Revocation uses the existing account API. Temporary fixture rows are removed afterward.
- English-only legal updates pass i18n integrity and hardcoded-copy checks; existing target-catalog fallbacks remain unchanged.

No production deployment or browser OAuth onboarding was exercised. The supported client evidence covers the official SDK with manual bearer configuration; additional clients remain unverified.
