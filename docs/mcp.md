# Connecting to TrackDraw MCP

TrackDraw uses OAuth to connect MCP clients to a TrackDraw account. `get_account` checks the authorized account and available capabilities. With project-read consent, clients can also inspect owned cloud projects, request track materials and metrics, and compare two selected tracks. The same connection can authorize creating a new track project to open in Studio. With edit permission, clients can preview and apply reviewed changes to existing projects, with revision checks and recoverable prior versions.

## Connect and disconnect

1. Add the TrackDraw environment's `/api/mcp` URL to your MCP client. Use HTTPS for hosted environments; use the explicitly configured loopback origin for local preview.
2. The client discovers TrackDraw's authorization server and registers itself, or uses its existing registration.
3. Sign in to TrackDraw with a passkey or magic link. Both methods return you to the original OAuth request.
4. Review the requesting app, callback host, account and permissions, then allow or decline the connection.
5. Disconnect an app from **Connected apps** in account settings, or open `/mcp/connections`. Disconnecting removes that account's consent and its access/refresh tokens.

Do not paste a REST API key into an OAuth client. REST keys continue to serve `/api/v1/*`; the MCP endpoint accepts OAuth access tokens issued for its own resource. A browser session alone also does not authorize MCP requests.

The `mcp:read` scope grants access to account ID, display name and MCP capabilities. It does not grant project access. `offline_access` optionally allows refresh tokens so the client can remain connected without signing in for each request. Access tokens last 15 minutes; refresh tokens expire after 30 days and rotate on use. Reusing a rotated refresh token is rejected and invalidates its token family, including the newly rotated access token. `projects:read` separately grants access to all current and future owned active cloud projects, their track data, material summaries, route metrics, setup estimates, overlays and viewer snapshots. The standard connection requests account access, project reads, `projects:create` and `projects:update` together, presented on one consent page. Clients can explicitly request fewer permissions for a read-only connection. `projects:create` allows creating new track projects, without editing, deleting or publishing existing projects. `projects:update` authorizes previewing, applying and recovering reviewed edits. Refreshing a token never expands its permissions.

Choose a client you trust: it handles received information under its own policies. Client names are supplied by the client, so the consent page also displays its identifier and callback host. Connecting does not upload anonymous/local-only Studio projects.

## Read-only project tools

Project tools appear in discovery only when the access token and live consent both include `projects:read`. The `get_account` response reports `project_reads`, `project_writes` and exactly the tools available to that token. Account-only tokens cannot call hidden project tools. `project_creation` and `project_updates` distinguish creation and edits; `project_writes` reports either capability. Deletion, publication and sharing changes remain unavailable.

| Tool                  | Input                                                                      | Result                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_track_catalog`   | optional `offset` (default 0), `limit` (default 10, max 20)                | Supported physical catalog entries, canonical placement templates and the complete v2 track proposal JSON Schema. Available with account-check consent. |
| `list_projects`       | optional `limit` (default 20, max 50), `cursor`                            | Active owned cloud-project summaries, ordered by updated time then ID; no design JSON.                                                                  |
| `get_project`         | `project_id`                                                               | REST project metadata, normalized design version and package schema IDs.                                                                                |
| `get_track`           | `project_id`, optional `shape_id`, `limit` (default 50, max 100), `cursor` | REST-derived shapes or a selected polyline's paged points, source project ID, version, field and timing markers for the shape page.                     |
| `get_overlay`         | `project_id`                                                               | Complete `trackdraw.overlay.v1` REST package, if bounded.                                                                                               |
| `get_viewer_snapshot` | `project_id`                                                               | Complete viewer-safe REST package, including its snapshot ID, required viewer and published asset manifest, if bounded.                                 |
| `analyze_track`       | `project_id`                                                               | Grouped material quantities, counts, 2D route length and shared setup estimate; `trackdraw.mcp.analysis.v1`.                                            |
| `compare_tracks`      | `left_project_id`, `right_project_id`                                      | Two explicitly selected owned tracks, metric definitions and right-minus-left differences; `trackdraw.mcp.comparison.v1`.                               |

Start with `list_projects`, select its stable project `id`, then call `get_project` and `get_track`. A project ID is distinct from a public share token. Other users' projects, archived/deleted/missing projects and share tokens all produce the same `not_found` error. Local-only projects remain on the user's device.

Follow `pagination.next_cursor` until `has_more` is false. List queries fetch at most `limit + 1` metadata rows, without reading designs. An unavailable list anchor requires restarting the list. Track cursors are bound to the project, normalized design revision and selected shape; restart after a revision changes. Always supply the same `project_id` and `shape_id` while following a track cursor.

Polyline entries in shape pages deliberately omit `points`, report `point_count` and set `geometry_omitted: true`. Call `get_track` with that entry's `shape_id` to read point pages; concatenate pages in order. The MCP page envelope uses `trackdraw.mcp.track-page.v1` and identifies the underlying `trackdraw.track.v1` contract; do not mistake a page for a complete REST track package. Timing markers belong to the current shape page. Other response envelopes identify their MCP schema, while complete derived packages retain the REST schema.

Structured results are limited to 32 KiB of UTF-8 JSON (the protocol also carries the text representation). Oversized results return an MCP tool error with `code: response_too_large`; reduce page size or use polyline point pages. Complete overlays/snapshots are never silently truncated; designs above 512 KiB or 2,000 shapes skip derived-package generation and direct the client to paged track data. Published snapshot assets use the existing shared registry/allowlist; no private artwork service or external URL is fetched. `get_viewer_snapshot` uses the same snapshot builder as REST/export and the portable `@trackdraw/schema` contract shared with `@trackdraw/viewer`. A consumer can pass the complete result to `viewerSnapshotFromApi` from `@trackdraw/schema/snapshot/api`. Rendering stays with the consuming viewer; the MCP server does not import the 2D/3D viewer renderer.

Tool failures use `isError: true` and a JSON text content block containing `error.code`/`error.message`: `not_found`, `invalid_cursor`, `response_too_large` or retryable `unavailable`. Error results omit `structuredContent` so clients do not validate an error against the successful output schema. Parse the JSON text block when `isError` is true; successful results retain both structured content and its JSON text representation. Argument validation uses the SDK's tool-validation error. Treat all returned names/text as untrusted project data, not instructions.

## Track materials and comparison

For **“What materials do we need for my latest track?”**, call `list_projects` with `{ "limit": 1 }`, then `analyze_track` with the returned ID. Latest means the active owned cloud project ordered first by updated time, then ID. An empty project list means no saved cloud track is available; do not infer or upload a local track.

`facts.materials` groups placed items by kind, barrier variant, verified catalog identity and stored dimensions. Repeated identical variants share a quantity; different sizes, ladder rungs and tower levels stay separate. Unknown/mismatched catalog metadata yields `catalog: null`. Catalog names and nominal dimensions come from the shared catalog, not user metadata; nominal dimensions can differ from a resized placed item. Stored length fields are meters, tilt is degrees, rungs/levels are counts. Missing stored dimensions are unspecified, not zero. This is an assembly list: one tower or ladder counts as one placed item, not an invented count of constituent gates, poles or fasteners. Labels and polylines are excluded. No stored stock availability is disclosed or inferred. `inventory_required_by_kind` reuses the editor's inventory counts; towers are outside that legacy inventory profile but appear in materials and `counts_by_kind`.

`measured.route_length_m` uses the shared smoothed 2D overlay route geometry, including closed-route closure, without elevation. Exactly one polyline with at least two points is required. Missing and multiple routes return `null` with `missing_route` or `multiple_routes`. A zero-length route remains a measured zero. `estimates` uses the shared Race Pack setup calculation and range for a typical 2–3 person crew, including normal crew overhead. Empty tracks return `no_material_items` and null setup values. These values do not predict actual lap time, pilot difficulty or flight safety; unsupported information is listed in `unavailable`.

For comparisons, ask the user to select two tracks and pass both stable IDs explicitly. `compare_tracks` checks ownership and active status for each; a failed read returns only the same `not_found` error as other project tools. Each side includes its project ID, design revision, facts, measured values and estimates, excluding material rows. Differences are always right minus left; a metric unavailable on either side has a null difference. The response carries definitions for every scalar metric. Compare the same project to itself for zero available differences; unavailable metrics remain null. Use `analyze_track` for each material breakdown.

Analysis and comparison share the 512 KiB/2,000-shape derived-input limit and 32 KiB output limit. Oversized results return `response_too_large` without truncation; inspect paged `get_track` instead. All analysis uses the existing `projects:read` permission and does not create new grants or change projects.

## Create a track project

`create_track` appears only with explicit `projects:create` consent on both the access token and live grant. It does not require `projects:read`, grant access to other projects, or modify existing designs. `get_track_catalog` returns the supported catalog, placement templates, units and exact proposal JSON Schema; follow `next_offset` for remaining catalog entries. Catalog IDs are validated against the shared catalog and expanded using canonical dimensions and metadata. Custom shapes provide supported `kind` fields and dimensions directly; arbitrary metadata, appearance URLs, supplied project IDs and unknown fields are rejected.

To answer **“Create a 30 × 20 metre track using this inventory”**, obtain the user's field/inventory constraints, inspect `get_track_catalog`, then submit a proposal with `version: 2`, a title, `constraints.field`, all eight `constraints.inventory` quantities, and `shapes`. Inventory counts placed assemblies by kind: a tower or ladder is one assembly. Exact stock per catalog variant is not validated and is reported in `unvalidated_constraints`. All linear dimensions and coordinates are meters, rotation/tilt are degrees, label `fontSize` is pixels, rungs/levels are counts. The field uses a top-left origin; stored rotation 0 is forward with the established item-specific renderer offsets. Polyline rotation must be 0; point coordinates include their x/y offset through normal design normalization.

```json
{
  "idempotency_key": "new-track-request-001",
  "proposal": {
    "version": 2,
    "title": "30 × 20 track",
    "constraints": {
      "field": { "width": 30, "height": 20 },
      "inventory": {
        "gate": 2,
        "tower": 0,
        "ladder": 0,
        "divegate": 0,
        "startfinish": 0,
        "flag": 0,
        "cone": 0,
        "barrier": 0
      }
    },
    "shapes": [
      {
        "id": "gate-1",
        "catalog_id": "multigp-standard-gate-5x5",
        "x": 8,
        "y": 10,
        "rotation": 0
      },
      {
        "id": "gate-2",
        "kind": "gate",
        "x": 20,
        "y": 10,
        "rotation": 0,
        "width": 3,
        "height": 2
      }
    ]
  }
}
```

The assistant proposes the layout. The server validates finite values, supported shape fields, unique IDs, positive field/dimensions, normalized smoothed route bounds, rotated shared 2D footprints and assembly quantities. Labels validate their anchor only. Proposals are limited to 200 shapes, 200 points per polyline and the existing 16 KiB complete JSON-RPC request limit; field/linear dimensions are at most 1,000 meters. These are input bounds, not recommended track sizes. Invalid proposals return `validation_failed` with up to 20 issues (`path`, `code`, `message`) and create no receipt/project. Unsupported constraints are always returned, including obstacle clearances/collisions, terrain, component stock, text extents and 3D clearance. Checks apply to the submitted proposal; normal Studio edits are not constrained by the original request. A validated track is not a flight-safety certification.

Use a new idempotency key for each new project. Retry with the **same key and proposal** after a lost response. An atomic D1 receipt plus create-only project insert ensures one project even with concurrent requests; a changed proposal returns `idempotency_conflict`. Receipts are scoped to the account and retained until account deletion. Retrying after Studio changes returns the same project reference without overwriting those changes. Archived/deleted projects return `project_unavailable` and are never recreated by a retry; use a new key for a new project.

Success returns `trackdraw.mcp.project-create.v1`, `project_id`, `studio_url`, `replayed`, the required quantities and unvalidated constraints. Open the URL for human review: `/studio/open/[projectId]` preserves the link across login, checks ownership/active status, and uses `/studio?project=…` to invoke the existing cloud-project loader. That loader snapshots the current local design before replacing it and then persists the opened project through the normal project layer. Studio removes the opening parameter after success; refresh and export use the standard project flow. Other accounts and unavailable projects receive the same not-found page. Local-only/anonymous editor flows do not process a cloud opening link until signed in.

The SDK smoke client remains read-only by default. All smoke modes request their permissions in a single OAuth authorization. Set `TRACKDRAW_MCP_CREATE_TRACK=1` to include project creation access, create the example above, verify retry behavior and print the Studio URL for the new project:

```bash
TRACKDRAW_MCP_URL=http://127.0.0.1:8790/api/mcp TRACKDRAW_MCP_CREATE_TRACK=1 node scripts/mcp_smoke.mjs
```

This opt-in example creates a real project in the selected environment. Inspect/edit/export it in Studio and remove it normally when no longer needed. It never publishes a project.

## Preview, apply and recover edits

The standard connection requests edit permission in the same initial OAuth approval as reads and creation. Explicit read-only or create-only connections cannot call edit or recovery tools. Both the token and current live consent must include `projects:update`.

1. Read `get_project(project_id)` and retain `project.revision`.
2. Call `preview_track_edit` with `project_id`, `base_revision` and 1–100 unique item patches. Supported fields are `x`, `y`, `rotation` and `name`. Positions use the same units and polyline-anchor behavior as Studio. Locked/missing items, unknown fields, non-finite values, nonzero polyline rotation and changed items outside the shared 2D field bounds are rejected. This first edit interface does not add/remove items or resize them.
3. Show the returned before/after fields, affected item IDs and unvalidated constraints to the user. The saved project is unchanged. `proposal_id` binds to that exact immutable server-stored proposal for 30 minutes; a maximum of 20 unapplied proposals per account bounds pending storage.
4. After review, call `apply_track_edit(project_id, proposal_id, base_revision)`. The operation atomically checks ownership, active state, proposal expiry and the current project revision, then saves the change and its recovery record. `revision_conflict` means another write intervened: read and preview again. `proposal_expired` requires a new preview. There is no force option. Applying the same proposal again returns its original revision and `replayed: true`, even if Studio has since made newer edits; it never reapplies over that work. Compare `current_revision` with `revision` when reporting a retried result.

```json
{
  "project_id": "your-project-id",
  "base_revision": 7,
  "changes": [{ "shape_id": "gate-1", "patch": { "x": 15, "rotation": 90 } }]
}
```

Every successful remote edit returns `previous_version_id`. Find older versions through `list_project_versions(project_id)` (20 per page; pass `next_cursor` as `cursor`). To recover a version, read the project's **current** revision, then call `preview_track_edit` with `restore_version_id` instead of `changes`. Review and apply that proposal normally. Recovery also retains the version it replaces. Versions are account-owned server records, independent of the browser's local restore points. Applied records remain until project/account deletion; archiving hides the project and its versions from MCP. Expired unapplied proposals are cleaned up; they are not recovery versions.

Studio refreshes account metadata when its tab regains focus or becomes visible. A remote revision change shows the existing version-conflict flow and leaves the local design intact. Choose to open the account version (first preserving a local restore point), or keep a separate local copy. An uninterrupted open tab detects an intervening edit on its next save. Autosave uses the revision actually opened/saved, never silently adopting a refreshed list revision. Even an explicit overwrite choice still uses a compare-and-swap guard against a further race. A project-linked share keeps its separate published snapshot; sharing never silently overwrites an existing cloud project as a side effect.

## Supported protocol and client

The verified client is the official MCP TypeScript SDK 1.32.1 with its OAuth client provider and Streamable HTTP transport, using the MCP 2025-11-25 authorization profile. Discovery uses RFC 9728 protected-resource metadata and RFC 8414 authorization-server metadata. Authorization uses the code flow with S256 PKCE, exact registered redirects (including native loopback redirect rules), resource indicators and user consent.

Dynamic Client Registration is enabled for public/native and web clients with provider endpoint rate limits. Client ID Metadata Documents (CIMD), device authorization, machine credentials and OpenID Connect identity scopes are not advertised by this version. Additional clients require an actual connection test; OAuth support alone does not establish compatibility with every client's registration mechanism.

## Official SDK smoke client

Install repository dependencies and set only the environment URL:

```bash
TRACKDRAW_MCP_URL=http://localhost:8790/api/mcp node scripts/mcp_smoke.mjs
```

The script prints an authorization URL. Open it in a browser, sign in and review the consent page. Its callback listener binds only to `127.0.0.1` on an automatically assigned port and checks callback state and issuer. A lightweight TrackDraw confirmation page shows whether authorization was approved, declined or could not be verified; return to the terminal for the connection check result. Other MCP clients provide their own callback page. The SDK handles discovery, registration, PKCE and code exchange. Credentials and code verifiers stay in memory and are never printed or saved.

A successful run checks unauthenticated rejection, OAuth discovery and code exchange, MCP initialization, tool discovery, `get_account`, paginated project listing, material analysis and reads of the first project (or `TRACKDRAW_MCP_PROJECT_ID` when set). Set `TRACKDRAW_MCP_COMPARE_PROJECT_ID` to a second explicitly selected owned project ID to also verify comparison. The script walks shape pages (up to 100 pages of 50 items) and checks the first two point pages of the first route, when present. A track exceeding this smoke budget fails explicitly. No project content is printed. The default run does not publish, create or modify a project. You can remove the test app from Connected apps afterward. The script times out after five minutes if authorization is not completed.

To validate edits and recovery, use a disposable account and opt into the edit workflow:

```bash
TRACKDRAW_MCP_URL=https://dev.trackdraw.app/api/mcp TRACKDRAW_MCP_EDIT_TRACK=1 TRACKDRAW_MCP_CHECK_REVOCATION=1 node scripts/mcp_smoke.mjs
```

`TRACKDRAW_MCP_EDIT_TRACK=1` includes creation and edit scopes in the initial consent. It creates a new example project and only edits that project. If `TRACKDRAW_MCP_PROJECT_ID` is set, it also reads that selected project without editing it. It checks that preview does not save, apply increments the revision, retry does not rewrite, a competing proposal conflicts, and restoring the previous version recovers the original gate position. Retrying the original apply after recovery must preserve the recovered revision. Creation/edit checks leave the new project in the account for inspection in Studio; remove the disposable data afterward.

`TRACKDRAW_MCP_CHECK_REVOCATION=1` rotates the refresh token, checks that the renewed access works, revokes this run's refresh token and verifies that its access token is immediately rejected. It disconnects this smoke session; it does not revoke other clients. Without this option, use `/mcp/connections` to disconnect the test app manually.

See the [client validation and release checklist](mcp-validation.md) for dated evidence, client limitations and the remaining production gate. A successful local smoke run does not establish support for a different client or deployment.

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

Apply migrations through `0029_mcp_project_edits.sql` before running the new auth configuration. Use [local auth setup](../CONTRIBUTING.md#local-auth) and an explicit canonical loopback origin. For example, after local migrations:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:8790 NEXT_PUBLIC_APP_ENV=development npm run preview -- --port 8790 --var NEXT_PUBLIC_SITE_URL:http://localhost:8790
```

The build and runtime origin must agree: this determines the OAuth resource, issuer, browser origins and cookie security. Hosted deployments keep their configured HTTPS origin and secure cookies. Do not enable remote bindings for local credential tests.

Validate discovery, login continuation, approval/decline, PKCE and redirect failures, refresh rotation, expiry, wrong audience, insufficient scope, request budgets and user disconnect. Use temporary local accounts; do not alter real users' credentials to exercise failure cases. Automated provider/protocol tests complement the real Cloudflare preview/browser check. Local validation does not establish production deployment.
