# TrackDraw MCP foundation PVA

Date: October 20, 2026

Status: implementing [#995](https://github.com/dutchdronesquad/trackdraw/issues/995), under [epic #994](https://github.com/dutchdronesquad/trackdraw/issues/994).

## Decision

Host stateless MCP Streamable HTTP at `/api/mcp` inside the existing Next.js/OpenNext Worker. Use the official MCP TypeScript SDK's Web Standards transport, JSON responses and Cloudflare-compatible schema validator. No retained transport sessions, standalone SSE stream or additional Worker binding is needed.

OAuth is the connection flow. Better Auth's official MCP/OAuth provider owns discovery, Dynamic Client Registration, authorization codes, S256 PKCE, redirect validation, signed consent requests, token issuance, refresh rotation and revocation. Keep the existing passkey/magic-link login, with a callback that returns to the original authorization request. Add an explicit consent screen and account-owned connected-app management.

Use opaque, hashed access/refresh tokens with provider-side validation on every MCP request. This supports immediate expiry/revocation checks without a JWKS fetch or accepting a stale signed token. A pathless server-only Better Auth endpoint calls the provider's `requireActiveAccessToken`; it is not exposed as unauthenticated HTTP introspection. The resource handler additionally checks issuer, audience, subject, expiry, scope, live consent and the current unbanned account.

REST API keys remain separate and continue to work on REST. They are not OAuth access tokens and are not accepted by MCP. Browser sessions authorize consent and connection management, never MCP calls themselves.

## Scope and compatibility

- `mcp:read`: inspect account ID/display name and implemented MCP capabilities. No project access or writes.
- `offline_access`: optional renewable access. Tokens last 15 minutes; refresh tokens expire after 30 days and rotate with no replay grace period. The resource policy includes this scope to preserve refresh authorization across rotations.
- Future project reads/writes need explicit additional scopes, shared project ownership/access checks and renewed consent. Existing grants must not silently acquire project access.
- Anonymous/local-only projects are not uploaded or exposed. Sharing, gallery, editor persistence and public viewers remain unchanged.
- Verify the official SDK 1.32.1 with the MCP 2025-11-25 authorization profile. DCR supports native/public and web clients; CIMD is not advertised because a secure metadata-fetch transport for Workers is not part of this foundation. Do not claim compatibility with clients that require CIMD without a DCR/pre-registration fallback.
- Client credentials, device grants and OIDC identity scopes are disabled/out of scope. No trusted clients bypass consent.

## Runtime and persistence

- Canonical resource: the configured site origin plus `/api/mcp`; issuer: the same origin plus `/api/auth`. Hosted deployments use HTTPS. Local preview must explicitly use the same loopback origin at build and runtime.
- Forward `/.well-known/*` discovery requests to the auth handler, retaining the original path. Serve both resource-root/path metadata and issuer-path authorization metadata through the official provider.
- Migration `0026_mcp_oauth.sql` follows the installed provider's schema, references TrackDraw's `users` and `sessions`, and adds durable auth/MCP request counters. Apply it before deploying the plugin.
- Consent deletion atomically removes its account/client access and refresh tokens. The resource server also requires live consent. User deletion cascades through grants, tokens and budgets, and removes outstanding OAuth authorization codes.
- The daily `mcp_oauth` cleanup owner removes old expired tokens, assertion/code evidence, stale counters and old unowned clients with no grants or tokens. Other cleanup owners continue independently on failure.
- The MCP budget is 600 requests/hour per account/client, with an atomic D1 claim. Refreshes and Worker restarts do not reset it. Provider endpoints use durable per-IP limits for authorization, registration, token exchange and revocation.
- Limit MCP and OAuth POST bodies to 16 KiB using observed streamed bytes as well as Content-Length. Reject JSON-RPC batches. Forward a rebuilt URL-based Request at the Next.js/Worker boundary to avoid mixing Request implementations.
- Accept absent Origin for native clients or the configured origin; local preview aliases remain limited to development. No wildcard CORS or cookie fallback on the MCP endpoint.
- Return RFC 9728/RFC 6750 challenges, no-store responses and sanitized failures. Log only allowlisted method/status/duration; never log credentials, codes, verifiers, private account data or bodies.

## Codebase anchors

- `src/lib/server/mcp/oauth-provider.ts`: official provider configuration and server-only token validation endpoint.
- `src/lib/server/mcp/oauth-auth.ts`: resource/scopes/consent/account validation and durable MCP budget.
- `src/lib/server/mcp/connections.ts`, `/mcp/consent`, `/mcp/connections` and account connection APIs: signed consent and owned grant lifecycle.
- `src/lib/mcp/login-continuation.ts`: safe return to authorization after either sign-in method.
- `src/app/.well-known/[...discovery]/route.ts`: provider discovery forwarding.
- `src/lib/server/mcp/handler.ts` and `server.ts`: protocol request boundaries and account-bound read-only tool.
- `src/lib/server/bounded-request-body.ts`: shared bounded reader for the MCP/OAuth transport boundary.
- `tests/lib/server/mcp`, `tests/app/api/mcp.route.test.ts`, OAuth boundary and component tests: real-provider grant flow, protocol, persistence and explicit consent.
- `scripts/mcp_smoke.mjs`: official SDK OAuth client with a loopback callback and in-memory credentials.

## Delivery checks

- [x] Add OAuth discovery, code + S256 PKCE, consent and refresh/revocation through the official provider.
- [x] Separate scopes, enforce resource binding and require live consent on each MCP call.
- [x] Add connected-app management, durable budgets and credential lifecycle migration/cleanup.
- [x] Cover the real provider's successful and rejected authorization flows, protocol boundaries and owner-safe disconnect.
- [x] Run final lint, tests, types, builds, formatting and English-only i18n checks.
- [x] Run the official client against local Cloudflare preview with real browser consent on desktop/mobile; verify refresh, expiry, budgets and disconnect.
- [x] Update PR #1001 with the final OAuth behavior and current-head validation evidence.

Validation: 1,466 tests pass; lint, types, Next.js/OpenNext builds, formatting and both i18n checks pass. The official SDK and real browser consent/disconnect pass against local Cloudflare preview. Real token lifecycle checks cover refresh rotation, expiry, revocation, account-bound identity, request budgets and REST-key rejection. The selected consent design was compared with its implementation and checked at desktop and 390px mobile.

The parent epic stays open after this foundation. Production deployment and compatibility with additional clients require separate evidence.

## Sources

- [Better Auth MCP provider](https://better-auth.com/docs/plugins/mcp)
- [Better Auth OAuth provider](https://better-auth.com/docs/plugins/oauth-provider)
- [MCP HTTP authorization profile](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [Official SDK server](https://ts.sdk.modelcontextprotocol.io/server) and [client](https://ts.sdk.modelcontextprotocol.io/client)
