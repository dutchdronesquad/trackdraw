# TrackDraw REST API Research

Date: April 28, 2026

Status: proposed product direction

## Purpose

This document evaluates whether TrackDraw should add a real REST API and how that API should fit the existing product model.

The original integration prompt came from moving TrackDraw data into `rh-stream-overlays` and RotorHazard-adjacent workflows. The broader opportunity is larger: make account-backed TrackDraw projects and published tracks consumable by external tools without making the browser editor itself account-mandatory.

## Product Thesis

TrackDraw should add a versioned REST API as an account-backed integration surface.

The API should let users create an account, generate a permissioned API key with an expiry, and allow external tools to read their TrackDraw projects, published tracks, share metadata, and export-friendly track data.

This should not replace the existing public web surfaces:

- `/share/[token]` remains the canonical no-account read-only view for pilots and crew
- `/embed/[token]` remains the account-published iframe surface for websites
- `/gallery` remains the public discovery surface
- `/studio` remains usable without an account for core editing, autosave, import/export, and temporary sharing

The REST API is for tools and automation. The public web routes are for humans.

## Why Build It

### 1. External Tooling

TrackDraw already stores useful structured course data:

- real-scale field dimensions
- obstacle geometry
- route paths
- timing marker metadata
- inventory/buildability data
- share/gallery metadata
- published snapshots that can be opened read-only

That data becomes more valuable when external tools can consume it reliably.

Likely consumers:

- `rh-stream-overlays`
- club websites
- event dashboards
- OBS/browser-source tooling
- briefing and PDF generators
- Discord or event bots
- archive and results systems
- future RotorHazard plugins

### 2. Better Account Value

Accounts currently add ownership, project continuity, durable shares, gallery publishing, and embeds. API keys are a natural account-only addition because they depend on identity, revocation, expiry, and user-controlled access. TrackDraw should prefer Better Auth's API Key plugin for this foundation instead of building a parallel token system.

### 3. Safer Than Sharing Raw Project Files

JSON import/export is still useful, but it is manual and file-oriented. A REST API can provide:

- stable schema versions
- explicit auth
- rate limits
- permissioned API keys
- predictable error responses
- future deprecation windows
- integrations that can refresh data without users downloading files repeatedly

## Recommended Product Boundary

### In Scope For V1

- account-only API key creation and management, backed by Better Auth's API Key plugin
- expiring bearer API keys
- API key revocation
- plugin-backed hashed key storage
- plugin-backed permissions and rate limiting for `/api/v1/*`
- read-only access to the owner's projects and account-published shares
- read-only export endpoints for JSON-oriented integration data
- OpenAPI documentation
- clear public-versus-authenticated endpoint policy
- audit log entries for API key lifecycle events

### Out Of Scope For V1

- write APIs for creating or editing tracks
- anonymous API keys
- public unauthenticated API reads for arbitrary share tokens
- team or club-owned API keys
- OAuth app marketplace behavior
- webhooks
- per-key billing or usage quotas beyond basic rate limiting
- server-side rendering of every export format

## API Auth Model

### Account Session Versus API Key

TrackDraw should keep two auth modes distinct:

- Browser account session: used by the app UI to manage projects, shares, gallery state, account profile, and API keys.
- API bearer key: used by external tools to call `/api/v1/*`.

The account session can create and revoke API keys. API keys should not be allowed to create more API keys.

Better Auth's API Key plugin should provide key creation, storage, verification, expiry, permissions, and rate limiting. TrackDraw should still keep API bearer authorization explicit in `/api/v1/*` instead of enabling API keys to become full browser sessions. In other words, do not use session impersonation as the default REST API model; verify keys and map them to the limited integration identity needed by each endpoint.

### API Key Format

Use opaque bearer keys with a visible prefix:

```txt
td_live_<random secret>
td_dev_<random secret>
```

Let the Better Auth API Key plugin store and verify the key secret. Store or expose only plugin-supported safe previews/metadata in TrackDraw UI so users can identify keys later without exposing the full value again.

### Expiry

Every key should have an expiry.

Recommended initial choices:

- 7 days
- 30 days
- 90 days
- 1 year

Do not ship non-expiring keys in v1. Long-lived integrations can rotate yearly.

### Permissions

Start with read-only permissions using the Better Auth API Key plugin permission model. Map the product-facing permission labels consistently:

- `tracks:read`: read normalized track/project data
- `shares:read`: read account-published share metadata and share-backed track data
- `exports:read`: read export-oriented JSON packages and lightweight previews
- `gallery:read`: read public gallery metadata through authenticated calls

Defer write permissions until there is a specific integration that needs them.

### Ownership Rules

An API key acts as the account that created it.

It can read:

- that account's active projects
- that account's account-published shares
- public gallery metadata if the endpoint allows it

It cannot read:

- another user's private project
- anonymous temporary shares owned by nobody
- expired or revoked shares
- map references that are intentionally stripped from public share/export serialization
- account profile data beyond a minimal `/me` response

## Public Versus Authenticated Endpoint Policy

The safest v1 is authenticated by default.

Recommended boundary:

| Endpoint class                 | Auth            | V1 recommendation                                                                                      |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------ |
| Account API key management     | Browser session | Required                                                                                               |
| Owner projects                 | API bearer key  | Required                                                                                               |
| Owner published shares         | API bearer key  | Required                                                                                               |
| Export packages                | API bearer key  | Required                                                                                               |
| OpenAPI JSON                   | Public          | Allowed                                                                                                |
| API docs page                  | Public          | Allowed                                                                                                |
| Gallery metadata               | Optional later  | Keep authenticated in first slice unless product needs public API discovery                            |
| Published share by share token | Optional later  | Defer public REST access; `/share/[token]` and `/embed/[token]` already cover public human consumption |

This keeps v1 simple: if a machine is calling the REST API for track data, it presents an API key.

Public API reads can come later if there is a clear use case, such as a static club site pulling listed gallery entries without a token. That should be a deliberate expansion, not the default.

## Candidate Endpoints

### Documentation

```txt
GET /api/v1/openapi.json
GET /api/docs
```

The docs page should render the OpenAPI schema. It can be branded as API docs even if users call it a Swagger page.

### API Key Management

Browser-session endpoints:

```txt
GET /api/account/api-keys
POST /api/account/api-keys
DELETE /api/account/api-keys/{keyId}
```

These endpoints should use the existing Better Auth browser session and never accept API bearer auth. They can either call the Better Auth API Key plugin endpoints directly from the client or wrap the plugin server methods behind TrackDraw-owned routes if the product needs custom naming, defaults, or audit events.

### API Identity

```txt
GET /api/v1/me
```

Returns a minimal identity and API key metadata:

- account id
- display name
- key id
- key permissions
- key expiry

### Projects

```txt
GET /api/v1/projects
GET /api/v1/projects/{projectId}
GET /api/v1/projects/{projectId}/track
```

`/track` should return an integration-stable shape, not necessarily the same object used internally by the editor.

### Published Shares

```txt
GET /api/v1/shares
GET /api/v1/shares/{shareToken}
GET /api/v1/shares/{shareToken}/track
```

Only return shares owned by the API key's account. A share token is a public URL identifier, not an API credential.

### Export-Oriented Data

```txt
GET /api/v1/projects/{projectId}/exports/trackdraw
GET /api/v1/projects/{projectId}/exports/overlay
```

Keep export routes project-first in v1. Account projects are the durable source of truth for integrations, while share tokens are public URL identifiers for human-facing published views. Share-backed export routes should only be added later if a real consumer starts from a share token or needs the exact published snapshot rather than the owner's current project data.

Do not use file extensions in v1 API endpoint paths. The route should identify the export resource, and the response should declare the representation through `Content-Type`. Download filenames can be handled through `Content-Disposition` when needed.

First export formats:

- `exports/trackdraw`: normalized TrackDraw project data with schema versioning
- `exports/overlay`: smaller route/timing/marker package for `rh-stream-overlays`

Defer PNG/SVG/PDF export endpoints until there is a proven consumer. Existing browser exports can continue to serve human workflows.

### Explicitly Out Of V1

```txt
POST /api/v1/projects
PATCH /api/v1/projects/{projectId}
DELETE /api/v1/projects/{projectId}
GET /api/v1/shares/{shareToken} without bearer auth
GET /api/v1/gallery/tracks
```

Write APIs, unauthenticated share reads, and public gallery API discovery should be deliberate later expansions rather than part of the first REST API.

## OpenAPI Direction

TrackDraw should maintain an OpenAPI 3.1 document as a first-class artifact.

Recommended shape:

- source schema lives in `src/lib/api/openapi.ts` or a static JSON file if that stays simpler
- `GET /api/v1/openapi.json` serves the schema
- `/api/docs` renders the schema as an interactive documentation page
- endpoint handlers and docs share response/error types where practical

The first docs version can be lightweight. The important v1 requirement is that external developers can see:

- auth scheme
- key expiry behavior
- permissions
- endpoint list
- response examples
- error model
- pagination model
- rate limit headers

## Response Standards

TrackDraw should use a small, explicit REST response convention instead of copying the older internal app-route response style everywhere.

Recommended standards:

- JSON responses use `application/json` unless an error is returned as Problem Details
- error responses use RFC 9457 Problem Details with `application/problem+json`
- timestamps use ISO 8601 strings in UTC
- response fields use `camelCase`
- ids, share tokens, and API key previews are strings
- list endpoints use cursor pagination, not page-number pagination
- rate-limited responses return HTTP `429` with `Retry-After`
- rate-limit headers should be documented in OpenAPI when implemented

Success responses should use a stable top-level envelope:

```json
{
  "data": {
    "id": "project-id",
    "type": "project"
  },
  "meta": {
    "apiVersion": "v1"
  }
}
```

List responses should use the same envelope with cursor metadata:

```json
{
  "data": [],
  "pagination": {
    "limit": 50,
    "nextCursor": "opaque-cursor",
    "hasMore": true
  },
  "meta": {
    "apiVersion": "v1"
  }
}
```

Error responses should use Problem Details:

```json
{
  "type": "https://trackdraw.app/problems/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "A valid API bearer key is required.",
  "code": "unauthorized",
  "requestId": "req_123"
}
```

This gives external consumers familiar HTTP semantics while keeping TrackDraw-specific fields such as `code` and `requestId`.

## Data Contract Direction

The API should not expose every editor implementation detail forever.

Recommended response layers:

### Metadata

Small list responses:

- id
- title
- description
- updatedAt
- publishedAt when relevant
- field dimensions
- shape count
- gallery state when relevant

### Track Package

Detailed track responses:

- schema version
- source type: `project` or `share`
- source id/token
- title and description
- field dimensions and units
- normalized shapes safe for external consumption
- primary route when available
- timing markers when available
- export metadata

### Internal Editor Data

Only expose raw serialized project data through an explicit format such as `exports/trackdraw`, and document that it is more complete but less integration-minimal than the overlay package.

## Security And Abuse Considerations

### API Key Storage

- use Better Auth's API Key plugin as the storage and verification source of truth
- never store raw key secrets outside the plugin's supported model
- show the full key only once at creation
- support revoke by key id

### API Key Use

- require `Authorization: Bearer <key>` for TrackDraw `/api/v1/*` routes, even if the plugin also supports `x-api-key`
- reject keys in query strings
- check expiry on every request
- let the Better Auth plugin update supported usage metadata/rate-limit counters
- store additional last-used IP/user-agent metadata only if the privacy posture is accepted

### Rate Limits

V1 should include throttling and rate limiting before the API is considered release-ready. This is part of the API safety model, not an optional optimization.

Recommended layers:

- per-key limits for ordinary API reads
- stricter per-key limits for export-oriented endpoints
- per-IP fallback limits for unauthenticated public docs endpoints if they become noisy
- Cloudflare-level protection for broad `/api/v1/*` abuse
- a stable `429` error response with a machine-readable error code
- `Retry-After` headers for throttled responses
- standard rate-limit headers if the implementation can keep them accurate

Do not let API export endpoints become unbounded server-side render jobs.

Initial limits can be conservative and adjusted later. The important first decision is that every API key has an enforced budget, and that high-cost endpoints have a smaller budget than metadata reads.

### Privacy

API responses should follow the existing share/export boundary:

- do not expose editor-only map references in share-backed public/export responses
- do not expose account emails except perhaps `/me` if absolutely needed
- avoid including private local-only data because the API should be account-backed only

## Recommended First Slice

Build the smallest useful authenticated API:

1. Better Auth API Key plugin installation and schema/migration setup.
2. Browser-session API key management surface.
3. Bearer API key resolver helper.
4. `GET /api/v1/me`.
5. `GET /api/v1/projects`.
6. `GET /api/v1/projects/{projectId}/track`.
7. `GET /api/v1/openapi.json`.
8. `/api/docs` page.
9. Conservative per-key throttling for the shipped `/api/v1/*` endpoints.

This proves the Better Auth API Key plugin integration, docs model, and account ownership model before adding share metadata or overlay-specific packages.

## Recommended Defaults

- Make API keys available to every signed-in user through account/developer settings.
- Default API keys to 90 days, with 7-day, 30-day, 90-day, and 1-year options. Do not offer non-expiring keys.
- Enforce read permissions from the first implementation.
- Treat the first API as generic project/share access, with `rh-stream-overlays` as the first concrete integration consumer rather than the whole API shape.
- Keep unauthenticated share reads and public gallery API discovery out of v1.
- Use separate per-key budgets for metadata and export endpoints. Start with 600 metadata requests per hour and 60 export requests per hour, with lower burst caps for exports.
- Prefer Better Auth API Key plugin rate limiting first. Add a TrackDraw-specific limiter abstraction only where route class budgets, export throttles, or Cloudflare-native controls need behavior the plugin cannot express cleanly.
- Use `meta.apiVersion` on successful `/api/v1/*` responses, Problem Details for errors, opaque signed cursors, and a default list limit of 50 with a maximum of 100.
- Keep API export packages share-safe by default and exclude map references.
- Treat `exports/overlay` as a planned Phase 4 endpoint that should ship only after the `rh-stream-overlays` import contract is specific enough to validate.
- Keep browser CORS restrictive in v1 and target server-to-server/plugin integrations first.

## Recommendation

Proceed to PVA.

Build the REST API as an account-backed, read-only, API-key-authenticated integration surface first. Prefer Better Auth's API Key plugin for key lifecycle, verification, permissions, and base rate limiting. Keep public REST reads and write APIs out of v1. Add OpenAPI docs from the first implementation slice so the contract is explicit from day one.
