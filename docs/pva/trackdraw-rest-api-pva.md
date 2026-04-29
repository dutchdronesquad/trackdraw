# TrackDraw REST API PVA

Date: April 28, 2026

Status: proposed

## Decision Summary

Recommended decision:

- approve a versioned TrackDraw REST API for implementation planning
- make v1 account-backed and read-only
- require users to create an account before generating API keys
- require expiring bearer API keys for `/api/v1/*` track data
- require throttling and rate limiting for v1 API endpoints
- keep API key management behind the existing browser account session
- prefer Better Auth's API Key plugin for API key lifecycle, storage, verification, permissions, and base rate limiting
- publish OpenAPI documentation from the first implementation slice
- defer unauthenticated public REST reads until a clear consumer needs them
- defer write APIs until read integrations are proven

For the product evaluation and rationale, see [docs/research/trackdraw-rest-api.md](../research/trackdraw-rest-api.md).

## Approval Recommendation

TrackDraw should approve this work if the team accepts the following first-version shape:

- the REST API is for tools and automation, not for replacing `/share/[token]`, `/embed/[token]`, `/gallery`, or `/studio`
- API users must have a TrackDraw account
- API keys are permissioned, expiring, revocable, and only shown once
- API keys have enforced request budgets, with room for stricter limits on expensive package endpoints
- v1 reads only the API key owner's account-backed projects and derived overlay packages
- the first useful external data shape is JSON, with preview/image endpoints deferred unless needed
- OpenAPI docs are part of the API, not an afterthought

TrackDraw should not approve this work yet if the expected v1 includes:

- anonymous API access to arbitrary share tokens
- editing or creating tracks through the API
- non-expiring API keys
- team, club, or organization ownership
- broad public search/discovery endpoints
- server-side PDF/PNG/SVG rendering as a first requirement

## Delivery Checklist

- [x] Phase 0: lock API product boundaries and endpoint auth policy
- [x] Phase 1: add Better Auth API Key plugin integration and API key management surface
- [x] Phase 2: add bearer API key auth and first account-owned read endpoints
- [x] Phase 3: add OpenAPI schema and API docs page
- [ ] Phase 4: add livestream overlay package for integration consumers
- [ ] Phase 5: harden throttling, audit events, tests, and docs

## Go / No-Go Criteria

Go for implementation if:

- account-only API key auth is accepted for v1
- read-only API permissions are enough for the first integration consumers
- API docs can ship with the first endpoint set
- rate limiting is treated as a release requirement, not a post-launch cleanup task
- the team accepts that public REST reads are deferred
- Better Auth session management and API Key plugin storage/verification remain the foundation

No-go or keep in planning if:

- write access is considered mandatory for v1
- API keys need organization/team ownership before individual account keys are useful
- the first consumer requires unauthenticated data access
- the team is not ready to maintain an API contract and deprecation path

## Codebase Anchor

### Existing Auth And Ownership

- [src/lib/server/auth-session.ts](../../src/lib/server/auth-session.ts)
  Existing Better Auth session resolver for browser-session API calls.
- [src/lib/server/auth.ts](../../src/lib/server/auth.ts)
  Better Auth server configuration. Add the API Key plugin here so key lifecycle, permissions, expiry, verification, and base rate limiting stay inside the auth layer instead of a parallel TrackDraw token system.
- [src/lib/server/authorization.ts](../../src/lib/server/authorization.ts)
  Existing ownership/capability helpers. API key authorization should stay separate from dashboard role checks, but reuse the ownership posture.
- [src/app/api/account/session/route.ts](../../src/app/api/account/session/route.ts)
  Existing account-session API pattern.

### Existing Project And Share APIs

- [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
  Existing account-only project list/save behavior.
- [src/app/api/projects/[projectId]/route.ts](../../src/app/api/projects/[projectId]/route.ts)
  Existing account-owned project read/archive behavior.
- [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)
  Existing publish and owned-share listing behavior.
- [src/app/api/shares/[token]/route.ts](../../src/app/api/shares/[token]/route.ts)
  Existing owner-authorized share revoke/gallery behavior.

### Existing Data Helpers

- [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
  Account-owned project persistence and read helpers.
- [src/lib/server/shares.ts](../../src/lib/server/shares.ts)
  Share resolution, ownership, expiry, revoke, and published-share behavior.
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
  Canonical design normalization and serialization.
- [src/lib/track/timing.ts](../../src/lib/track/timing.ts)
  Timing metadata normalization used by race-day and future overlay integration work.
- [src/lib/types.ts](../../src/lib/types.ts)
  Track, shape, and serialized design types.

### Database

- [migrations/0002_accounts_and_projects.sql](../../migrations/0002_accounts_and_projects.sql)
  Existing Better Auth and account project tables.
- [migrations/0008_share_lifecycle.sql](../../migrations/0008_share_lifecycle.sql)
  Existing published/temporary share lifecycle model.

Recommended schema path:

- Use Better Auth's API Key plugin migration/schema as the source of truth.
- If the Better Auth CLI cannot generate a D1-compatible migration in this repo, add the plugin's required table and indexes manually in `migrations/` while preserving Better Auth's expected model/field names.
- Avoid creating a separate TrackDraw-owned API key table unless plugin compatibility blocks the preferred path.

Recommended indexes:

- plugin-required key lookup index
- user id / owner index
- expiry/revoked cleanup indexes where the plugin schema supports them

Recommended rate-limit storage:

- start with Better Auth API Key plugin rate limiting where it can express the required budgets
- keep TrackDraw route-class throttling separate from key verification if package endpoints need stricter budgets than metadata reads
- keep room to add Cloudflare-native rate limits for broad path/IP abuse later

## Technical Model

### API Key Storage Shape

Preferred implementation:

- install and configure Better Auth's API Key plugin
- use plugin-generated or plugin-compatible D1 schema
- configure key prefix, expiry bounds, required name, permissions, and base rate limits in the Better Auth server config
- verify keys through the plugin from `/api/v1/*` server handlers

Fallback only if plugin compatibility blocks the preferred path:

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  permissions_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Do not store raw key secrets outside the Better Auth plugin's supported storage model. If fallback storage is unavoidable, do not store raw secrets.

### API Key Management Surface

Browser-session only:

```txt
GET /api/account/api-keys
POST /api/account/api-keys
DELETE /api/account/api-keys/{keyId}
```

The `POST` response is the only place that returns the full API key secret.

These routes can be implemented as thin TrackDraw wrappers around Better Auth API Key plugin server methods, or the UI can call Better Auth's generated API key endpoints directly if that keeps behavior and naming clear. Prefer wrappers if TrackDraw needs product-specific defaults, audit events, response copy, or scope-to-permission mapping.

### Endpoint Inventory

Recommended v1 endpoint set:

| Phase | Endpoint                                   | Auth            | Permission    | Purpose                                                                                   |
| ----- | ------------------------------------------ | --------------- | ------------- | ----------------------------------------------------------------------------------------- |
| 1     | `GET /api/account/api-keys`                | Browser session | n/a           | List the signed-in user's API keys without exposing secrets.                              |
| 1     | `POST /api/account/api-keys`               | Browser session | n/a           | Create a permissioned expiring API key and return the secret once.                        |
| 1     | `DELETE /api/account/api-keys/{keyId}`     | Browser session | n/a           | Revoke one of the signed-in user's API keys.                                              |
| 2     | `GET /api/v1/me`                           | Bearer key      | n/a           | Return minimal account identity and bearer-key capabilities for integration setup checks. |
| 2     | `GET /api/v1/projects`                     | Bearer key      | `tracks:read` | List the key owner's active account-backed projects.                                      |
| 2     | `GET /api/v1/projects/{projectId}`         | Bearer key      | `tracks:read` | Return project metadata and ownership-safe summary fields.                                |
| 2     | `GET /api/v1/projects/{projectId}/track`   | Bearer key      | `tracks:read` | Return the integration-stable track package for an owned project.                         |
| 3     | `GET /api/v1/openapi.json`                 | Public          | n/a           | Serve the OpenAPI 3.1 schema.                                                             |
| 3     | `GET /api/docs`                            | Public          | n/a           | Render interactive API documentation from the OpenAPI schema.                             |
| 4     | `GET /api/v1/projects/{projectId}/overlay` | Bearer key      | `tracks:read` | Return compact route, obstacle, and timing data for livestream minimaps.                  |

Do not use a generic `tracks/{trackRef}` route in v1. Project ids and share tokens should stay on separate routes so ownership checks, error messages, and OpenAPI docs stay clear.

### Endpoint Details

#### API Key Management

```txt
GET /api/account/api-keys
```

Returns API key records for the signed-in user:

- id
- name
- key prefix and preview
- permissions
- createdAt
- expiresAt
- revokedAt
- lastUsedAt

```txt
POST /api/account/api-keys
```

Creates an API key from:

- name
- permissions
- expiresInDays

Returns the raw API key secret once. Better Auth stores only its supported non-secret representation.

```txt
DELETE /api/account/api-keys/{keyId}
```

Revokes the API key if it belongs to the signed-in user.

#### API Identity

```txt
GET /api/v1/me
```

Returns minimal integration identity:

- account id
- display name
- key permissions
- key expiry

#### Projects

```txt
GET /api/v1/projects
```

Returns cursor-paginated project summaries:

- id
- title
- updated_at
- field dimensions
- shape count

```txt
GET /api/v1/projects/{projectId}
```

Returns metadata for one owned project. This is useful when an integration needs to confirm a project exists without downloading the full track package.

```txt
GET /api/v1/projects/{projectId}/track
```

Returns the integration-stable track package for one owned project.

#### Documentation

```txt
GET /api/v1/openapi.json
GET /api/docs
```

`/api/v1/openapi.json` can remain public if simpler, but must not leak private runtime state. `/api/docs` should render the OpenAPI schema as an interactive API documentation page.

#### Live Overlay

```txt
GET /api/v1/projects/{projectId}/overlay
```

Returns a compact `trackdraw.overlay.v1` package for livestream minimaps and timing overlays:

- field dimensions and coordinate origin
- primary route waypoints and sampled route points
- route status from existing obstacle-numbering validation
- numbered route obstacles with route positions
- timing markers with route positions

Keep this endpoint project-based for v1. Livestream tools should target durable account projects rather than published share snapshots unless a concrete workflow needs exact published-share parity.

#### Deferred Share Endpoints

Do not ship share endpoints in v1 until a concrete consumer needs share-token lookup or exact published snapshot parity. Project reads and the overlay package cover the first integration target without widening the API surface.

Potential later endpoints:

```txt
GET /api/v1/shares
GET /api/v1/shares/{shareToken}
GET /api/v1/shares/{shareToken}/track
```

Share endpoints must only return account-published shares owned by the API key account. Temporary anonymous shares, expired shares, revoked shares, and shares owned by another account must not resolve through the REST API.

### Explicitly Out Of V1

- `POST /api/v1/projects`
- `PATCH /api/v1/projects/{projectId}`
- `DELETE /api/v1/projects/{projectId}`
- public unauthenticated `GET /api/v1/shares/{shareToken}`
- public gallery search/list endpoints
- PNG, SVG, PDF, or video rendering endpoints
- webhooks
- OAuth application registration

### Response Standards

Use a stricter response standard for `/api/v1/*` than the older internal app routes.

Recommended convention:

- JSON success responses use `application/json`
- error responses use compact Problem Details-style JSON with `application/problem+json`
- timestamps use ISO 8601 strings in UTC
- `/api/v1/*` response fields use `snake_case`
- ids, share tokens, and API key previews are strings
- list endpoints use cursor pagination
- rate-limited responses return HTTP `429` with `Retry-After`

Success responses should use a stable top-level envelope:

```json
{
  "data": {
    "id": "project-id",
    "type": "project"
  },
  "meta": {
    "api_version": "v1"
  }
}
```

List responses should include pagination metadata:

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "next_cursor": "opaque-cursor",
    "has_more": true
  },
  "meta": {
    "api_version": "v1"
  }
}
```

### Error Model

Use a compact Problem Details-style model for errors:

```json
{
  "title": "Unauthorized",
  "status": 401,
  "detail": "A valid API bearer key is required.",
  "code": "unauthorized"
}
```

Existing app routes use string errors today. The REST API can define a stricter model under `/api/v1/*` without changing old routes. Keep the v1 error body small: do not add TrackDraw problem-document URLs or request ids until there is a concrete support workflow that uses them.

Throttle responses should use the same model:

```json
{
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Too many requests for this API key. Try again later.",
  "code": "rate_limited"
}
```

Return HTTP `429` and a `Retry-After` header when the retry window is known.

### Track Package

The first detailed track response should be integration-stable:

```json
{
  "data": {
    "type": "track",
    "schema": "trackdraw.track.v1",
    "source": {
      "type": "project",
      "id": "project-id"
    },
    "title": "Race layout",
    "field": {
      "width": 60,
      "height": 40,
      "origin": "tl",
      "unit": "m"
    },
    "shape_count": 0,
    "timing_markers": [],
    "updated_at": "2026-04-28T00:00:00.000Z",
    "shapes": []
  },
  "meta": {
    "api_version": "v1"
  }
}
```

The track package should stay smaller than full editor serialization: include field dimensions, integration-safe shapes, and a top-level timing marker summary, while excluding map references, inventory, author metadata, tags, shape locks, front-offset guide metadata, shape metadata, and editor grid settings.

## Recommended Decisions Before Build

These are the recommended defaults for Phase 0. They optimize for a small safe v1 while leaving room for public APIs, richer integrations, and heavier export formats later.

### Product And Rollout

- API key access should be available to every signed-in user, but surfaced from an account/developer settings area rather than promoted as a primary product feature.
- The first target should be project reads plus a compact overlay package for `rh-stream-overlays`, without making the broader API overlay-specific.
- The v1 account UI should show API key creation, expiry, revoke, permissions, key preview, and `lastUsedAt`. Detailed usage logs can wait until real users need debugging or audit trails.
- API docs should be public at `/api/docs` and linked from account/developer settings. Public docs are useful, while actual data remains token-protected.

### Auth And Scopes

- Ship expiry options of 7 days, 30 days, 90 days, and 1 year. Default to 90 days. Do not ship non-expiring keys.
- Enforce permissions from day one. Starting with real permission checks avoids a future breaking migration when integrations already exist.
- Require key names. Allow duplicate names, because the key preview, creation date, permissions, and expiry identify the actual key.
- Keep revoked and expired keys visible in the account UI for 90 days, then hide them from default views. Audit records can remain longer according to the existing audit-log retention posture.

### Rate Limits

- Start with separate budgets for metadata reads and package endpoints if traffic patterns need it.
- Recommended initial metadata budget: 600 requests per hour per key with a short burst cap of 60 requests per minute.
- Recommended initial package budget, if separate budgets are needed: 60 requests per hour per key with a short burst cap of 10 requests per minute.
- Prefer Better Auth API Key plugin rate limiting first. Add a small TrackDraw limiter only where route class budgets need behavior the plugin cannot express cleanly. Cloudflare-native controls should also protect broad path/IP abuse.
- Guarantee `Retry-After` on throttled responses when the retry window is known. Prefer standard `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers when the limiter can report them accurately.

### Response Contract

- Include `meta.api_version` on every successful `/api/v1/*` JSON response. Consistency is worth the small payload cost.
- Keep error bodies compact with `title`, `status`, `detail`, and `code`; defer request ids until support tooling needs them.
- Use cursor pagination with `limit` defaulting to 50 and a maximum of 100.
- Use opaque signed cursors rather than exposing raw sort keys. This keeps pagination internals changeable.

### Data Contract

- `/track` should be the integration-stable package: metadata, field dimensions, normalized objects needed by external tools, route/timing summaries when available, and schema version.
- `/overlay` should be the livestream minimap package: route waypoints, sampled route points, numbered route obstacles, timing markers, and route positions.
- API packages should follow the share-safe privacy boundary by default and exclude map references. A future private owner-only map-reference permission can be added later if there is a strong venue workflow.
- Use schema names `trackdraw.track.v1` and `trackdraw.overlay.v1` for the shipped v1 packages.

### Public API Boundary

- Keep unauthenticated share reads out of v1. Existing `/share/[token]` and `/embed/[token]` routes already cover public human consumption.
- Do not reserve future public endpoints in the OpenAPI schema until they are ready to be supported.
- Public gallery metadata can be reconsidered later as a separate public API surface, not bundled into the account-key v1.
- Treat v1 as server-to-server/plugin oriented. Keep browser CORS restrictive at first, then open specific origins or documented CORS behavior once browser-based third-party clients are a real requirement.

## Phase Plan

### Top-Level Checklist

- [x] Phase 0 complete: API boundary and auth matrix are accepted
- [x] Phase 1 complete: account users can create, list, and revoke expiring API keys
- [x] Phase 2 complete: bearer auth resolves an API key owner and serves first project reads
- [x] Phase 3 complete: OpenAPI schema and docs page are available
- [ ] Phase 4 complete: livestream overlay package supports first integration consumers
- [ ] Phase 5 complete: validation, tests, audit, and docs are complete

### Phase 0: Lock Product Boundary

Start state:

- TrackDraw has account-backed projects and shares
- REST API permissions and endpoint auth policy are not formalized
- external integrations are still file/share-link oriented

Work:

- approve account-only API key model
- approve read-only v1
- approve public-versus-authenticated endpoint matrix
- verify Better Auth API Key plugin package/import path, Cloudflare runtime compatibility, and D1 migration strategy
- decide whether API keys are visible to all users immediately or gated behind account settings
- decide first key expiry choices and permissions

Done state:

- API permissions are explicit
- Better Auth API Key plugin integration path is known before code work starts
- v1 does not accidentally become a write API or public data API
- implementation can proceed without reopening auth policy on every endpoint

### Phase 1: Better Auth API Key Integration And Management

Start state:

- users can sign in but cannot create API credentials

Work:

- install and configure the Better Auth API Key plugin
- add plugin-generated or plugin-compatible D1 migration/schema
- configure key prefix, expiry bounds, required names, default permissions, and base rate limits
- add API key list/create/revoke browser-session endpoints or a TrackDraw wrapper around the plugin endpoints
- add minimal account UI entry point if this phase includes UI
- add audit events for API key created and revoked

Done state:

- signed-in users can create expiring read-only API keys
- API key secrets are only shown once
- revoked keys cannot be used later

### Phase 2: Bearer API Key Auth And First Read Endpoints

Start state:

- API keys exist but no `/api/v1/*` data endpoint trusts them

Work:

- add `getApiUserFromBearerKey()` style helper backed by Better Auth API key verification
- validate expiry, revocation, and permissions on every request
- enforce a conservative per-key read limit
- add `GET /api/v1/me`
- add `GET /api/v1/projects`
- add `GET /api/v1/projects/{projectId}`
- add `GET /api/v1/projects/{projectId}/track`
- keep project reads owner-scoped

Done state:

- an external tool can authenticate and retrieve the user's own normalized project data

### Phase 3: OpenAPI And Docs

Start state:

- first endpoints exist but external contract is not yet self-describing

Work:

- add OpenAPI 3.1 schema for shipped endpoints
- serve `GET /api/v1/openapi.json`
- add `/api/docs` page that renders the schema
- include bearer auth, permissions, expiry, response examples, Problem Details error examples, pagination, and rate-limit headers

Done state:

- developers can discover and test the API contract from TrackDraw itself

### Phase 4: Livestream Overlay Package

Start state:

- project reads work
- livestream minimap consumers still need a stable package

Work:

- add `GET /api/v1/projects/{projectId}/overlay`
- include field dimensions and coordinate origin
- include the primary route, sampled route points, route status, numbered route obstacles, and timing markers
- include route positions where a marker or obstacle can be projected onto the route
- defer share endpoints until a concrete consumer needs them
- document the difference between `/track` and `/overlay`

Done state:

- `rh-stream-overlays` has a clear target endpoint and package shape
- share endpoints remain out of v1 unless a real consumer need appears

### Phase 5: Hardening And Validation

Start state:

- the core API works but production behavior needs tightening

Work:

- finalize throttling for `/api/v1/*`
- add stricter budgets for package endpoints than metadata endpoints if usage requires it
- return stable `429` errors and `Retry-After` headers
- add tests for API key creation, expiry, revoke, owner scoping, and bad bearer keys
- add tests for throttled requests
- add tests for project and overlay endpoint authorization
- add a cleanup path for expired and revoked API key records after the visible retention window
- update `CONTRIBUTING.md` with preview-mode validation notes if needed
- update user-facing docs if API docs are linked from account settings
- confirm existing editor, share, gallery, and embed behavior is unchanged

Done state:

- API is safe enough for practical external use
- docs and tests cover the auth and ownership boundaries

## Validation Expectations

Before treating the API as implementation-ready:

- confirm v1 endpoint list and auth matrix
- confirm API key expiry options
- confirm whether OpenAPI docs are public
- confirm response envelope, Problem Details errors, and cursor pagination
- confirm the first integration data package shape

Before treating the API as release-ready:

- API key creation returns the full secret only once
- raw API keys are not stored outside Better Auth's supported plugin storage model
- expired and revoked keys return `401`
- throttled keys return `429` with a stable error code
- error responses use Problem Details consistently under `/api/v1/*`
- owner scoping blocks access to another user's project/share
- `/api/v1/openapi.json` matches shipped endpoints
- `/api/docs` loads in local dev and preview
- `npm run lint` passes
- `npm run type` passes
- preview-mode auth/API flow is tested with D1

## Risks

- API keys expand the security surface beyond browser sessions.
- Long-lived integrations can make stale or overbroad data access harder to notice.
- Public REST endpoints could accidentally bypass the existing share and public-output privacy boundary.
- OpenAPI documentation can drift if it is not maintained with endpoint changes.
- Rendering endpoints can become expensive if image/PDF generation is added too early.

## Recommended Next Step

Approve Phase 0 and build Phase 1 first.

Do not start with every endpoint. Start by making account-owned, expiring API keys real through the Better Auth API Key plugin, then prove one bearer-authenticated read path before adding the livestream overlay package. Defer shares and full exports until a real consumer needs them.
