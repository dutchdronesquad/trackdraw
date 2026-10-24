# MCP client validation and release gates

This checklist tracks [#1000](https://github.com/dutchdronesquad/trackdraw/issues/1000) under [epic #994](https://github.com/dutchdronesquad/trackdraw/issues/994). User connection instructions, permissions, disconnecting and troubleshooting live in the [MCP guide](mcp.md). Protocol contracts and contributor test instructions are in the [technical reference](#technical-reference) below.

## Compatibility matrix

Record a client version, environment, date and observed OAuth flow before marking it verified. A working transport or a provider unit test alone does not establish client compatibility.

| Client                                       | Flow                                                                                                                                                               | Evidence and limitations                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official MCP TypeScript SDK 1.32.1           | Streamable HTTP, protected-resource and issuer discovery, public Dynamic Client Registration, authorization code, S256 PKCE, loopback callback, resource indicator | Verified against the deployed development Worker for browser consent, small-track reads/creation/edits/recovery and token lifecycle. The output-schema correction is merged; one post-#1011 full run passed all workflow/auth/budget checks, but post-#1013 and October 24 large-track requests still exceed the Free CPU limit. See the latest evidence below; hosted acceptance remains blocked. |
| Other desktop, browser and hosted assistants | Not yet tested                                                                                                                                                     | Do not advertise compatibility until that exact client/version completes discovery, consent, callback and the required tools. Clients requiring CIMD have no verified fallback; CIMD is not advertised.                                                                                                                                                                                            |

Use the SDK smoke client as a reproducible reference. It does not replace testing the actual assistant a user intends to connect. REST API keys are not an OAuth fallback.

## Development recheck and Paid recommendation — October 24, 2026

[Development run 40043017973](https://github.com/dutchdronesquad/trackdraw/actions/runs/40043017973) deployed `002c6297aa665c6ee36c1d8ff4a39dc4d373c3cc` with successful migration and deploy jobs. The failing invocation below identifies Worker version `2e23d462-01e6-47dc-895e-a180fb3598fb`; Studio subsequently displayed `dev-002c629`.

The official SDK 1.32.1 completed browser OAuth with discovery, public DCR, S256 PKCE and a loopback callback. The full run passed tool discovery, separate project creation, edit preview/apply/retry, stale-proposal conflict, recovery and small/typical reads, analysis and comparison. Studio opened the generated 30 × 20 m project with two gates.

Large-track pagination still failed with HTTP 503/Cloudflare 1102 on the 2,001-gate / 6,000-point fixture. All five immediate repetitions also returned 503/1102. The filtered Worker tail captured one failing invocation with `outcome: exceededCpu`, `cpuTime: 10 ms`, `wallTime: 69 ms` and “Worker exceeded CPU time limit.” The tail does not establish a CPU duration for each repeat. Remaining full-run negative-auth, budget and token-lifecycle checks were not reached.

Earlier in the session, all 100 public discovery/challenge requests and 100 repeated large-track cursor-page reads passed. A development deployment completed during the session; those preliminary loops are not pinned acceptance evidence for the later commit. Their success also did not predict the full run's failure.

**Recommended next gate:** validate the existing architecture on Workers Paid, rather than requiring the full MCP workload to fit the Workers Free 10 ms request allowance. Cloudflare currently documents a $5/month minimum per account, including 10 million requests and 30 million CPU-ms; usage above the included amounts is billed separately. Paid defaults to 30 seconds of CPU per HTTP request. See [pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time). This is a recommendation, not an activated subscription or proof of acceptance.

After an operator explicitly enables Paid, verify the effective usage model and CPU limit for the development Worker, record its deployed commit/version, and rerun the original public and large-page loops plus all three milestone workflows, negative-auth, durable budgets, refresh and revocation checks. Keep the existing result bounds, consent, ownership and recovery gates. Record production availability separately.

Temporary development users, projects and exact DCR clients were removed. Separate SELECT queries confirmed zero matching users, projects and clients. Production MCP/discovery still returned 404 at the start of this session. No subscription, CPU limit or production deployment was changed. Keep #1000 and #994 open pending complete hosted acceptance.

## Development recheck after PR #1013 — October 21, 2026

[Run 39514497985](https://github.com/dutchdronesquad/trackdraw/actions/runs/39514497985) successfully deployed merge `d48262133cd73553c08e3720f8d836ceaa27513a`, Worker `f2ff2ee4-ae23-43a2-a540-c73ef829e7da`. The handler gzip check passed at 2,037,794 / 2,252,800 bytes.

All 100 public checks passed: 50 protected-resource discovery responses returned 200 and 50 unauthenticated MCP challenges returned 401, with no 1102 responses. Hosted browser OAuth, creation/retry, preview/apply/retry/conflict/recovery, small/typical reads and analysis/comparison also passed. Studio confirmed the generated 30 × 20 m, two-gate track and `dev-d482621`.

The full run still failed during large-track pagination. A second run explicitly returned 503/1102 there. A reduced loop passed 100 repetitions of the first page, but a cursor-page loop failed after 70 successful calls; all five immediate repeats then returned 503/1102. This time the sanitized error-only Worker tail captured all six failures as `exceededCpu`, at 10–11 ms CPU. This is a confirmed CPU limit failure, not a response-size or memory attribution inferred from 1102 alone. The full run did not reach its extra repeated-page, auth-negative, request-budget or token-lifecycle checks; the previous deployment's results remain separate evidence.

A local cache probe recorded one auth initialization, 110 cache hits and zero subsequent misses. A database-side geometry projection reduced transferred data but increased D1 reads from 1 to 12,018 for a shape page (10,116 for a point page) on the generated dev fixture, so that experimental change was discarded. A direct Worker-handler prototype passed 100 local large-page requests; it is not a deployed or production-ready architecture. See the [CPU follow-up](research/in-progress/mcp-request-cpu.md).

Keep #1000 and #994 open until the remaining runtime limit is resolved and complete hosted acceptance passes. Temporary dev data and exact test clients were removed; separate SELECT verification returned zero matching users, projects and clients. Production discovery and MCP still returned 404. No subscription, CPU setting, production deployment or experimental application change was applied.

## Development recheck after PR #1011 — October 21, 2026

[Development run 39512650912](https://github.com/dutchdronesquad/trackdraw/actions/runs/39512650912) successfully deployed merge `1734d0bd05534765560e13056c2894fe44732f15`, Worker version `fb470ee8-b18d-4f68-80ca-897e3d6d806a`. The handler-size check passed at 2,039,601 bytes gzip against its 2,252,800-byte budget.

A complete official SDK 1.32.1 run passed browser OAuth, account/catalog discovery, creation/retry, reviewed edits/apply/retry/conflict/recovery, small and typical analysis/comparison, all 41 large-fixture shape pages and the first two route-point pages, bounded oversized-result refusal, scope/tool isolation, expired-token and wrong-resource rejection, durable request-budget exhaustion and persistence across refresh, reset, refresh rotation and immediate revocation. Studio opened the generated 30 × 20 m, two-gate track and showed `dev-1734d0b`.

Acceptance remains blocked by intermittent resource failures: an earlier full run failed during large-track pagination with HTTP 503/Cloudflare 1102. A subsequent reduced attempt failed before authorization on an unauthenticated MCP challenge; all five immediate repetitions also returned 503/1102. Two separate five-pair discovery/challenge loops passed. The filtered tail captured successful requests but no failed invocation, so these failures do not establish their exact CPU/memory breakdown. A passing retry does not resolve the observed availability defect.

All generated dev users/projects and exact client registrations were deleted, with separate SELECT verification returning zero matching users, projects and clients. Keep #1000 and #994 open. The follow-up serves missing-credential challenges before Next and serializes only the requested track/point page; its local checks must remain distinct from a future hosted recheck.

## Development recheck after PR #1007

The merged correction deployed as `668ffd493d6bcdadeb54a7309f3626b187592910` in [run 39475061909](https://github.com/dutchdronesquad/trackdraw/actions/runs/39475061909). Browser consent, creation/retry, preview/apply/conflict/recovery, Studio opening and typical-track analysis/comparison passed. Full acceptance still failed: large-track pagination and, on another run, a typical-track overlay request returned HTTP 503. A later authorization attempt also failed. The reduced unauthenticated discovery loop reproduced Cloudflare error 1102 on two of five calls. The remaining full auth-negative, budget and token-lifecycle checks were not reached on those runs.

All newly generated dev data and exact client registrations were cleaned up and their absence verified. Production MCP/discovery still returned 404. See the [request CPU follow-up](research/in-progress/mcp-request-cpu.md) for the reduced reproduction, evidence limits and the initialized-auth/public-discovery correction. Its local SDK checks pass, but the hosted gate remains pending. Keep #1000 and #994 open until the full deployed recheck passes.

## Deployment evidence — October 20, 2026

- Development: [deployment run 39430592150](https://github.com/dutchdronesquad/trackdraw/actions/runs/39430592150) succeeded for commit `525cae811cebf54dc68675f8db244a01cca5ffee`, including migrations through `0029_mcp_project_edits.sql` and Worker deployment. This contains all three capability milestones.
- A live request to `https://dev.trackdraw.app/.well-known/oauth-protected-resource/api/mcp` returned 200, the expected resource URL and all four capability scopes. An unauthenticated MCP POST returned 401 with a resource-metadata challenge and `Cache-Control: no-store`.
- Production: both MCP discovery and `/api/mcp` returned 404. The latest production deployment is release `v1.18.1`, predating MCP. Do not present production onboarding as available.
- Local verification: provider tests exercise actual Better Auth code with an in-memory adapter; route tests use the official SDK and migrated SQLite D1 adapter. These establish implementation behavior, not Cloudflare deployment or compatibility of another assistant.

### Observed client results

The SDK's real OAuth flow completed through the hosted consent page and loopback callback using a disposable, ordinary development account. The initial consent contained the requested read/create/edit scopes together. The returned Studio link opened the generated 30 × 20 m, two-gate project with the expected inventory.

| Environment / code                    | Result                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deployed dev, `525cae81`              | Small-track account/catalog reads, creation retry, preview without saving, apply retry, stale-proposal conflict and recovery passed. A separate read-only connection confirmed update tools were unavailable.                                                                                                                                                                                                |
| Deployed dev, `525cae81`              | Forced expiry returned 401; missing scope returned 403; wrong resource returned 401. Setting only the disposable account/client counter to its limit returned 429 with Retry-After; resetting only that counter restored access. Refresh rotation preserved access; refresh-token revocation immediately rejected access. Old refresh-token replay also invalidated the rotated access token.                |
| Deployed dev, `525cae81`              | A typical track (50 gates, 500 route points) and a large track (2,001 gates, 6,000 route points) returned bounded shape and point pages. Typical material analysis returned 51 shapes. Oversized complete results exposed the schema incompatibility below. Some requests, including consent rendering, also returned Cloudflare 1102; a later retry succeeded. No CPU or memory cause has been established. |
| This branch, local Cloudflare preview | The complete SDK smoke passed on both fixtures: full shape-page traversal, the first two point pages, materials or explicit `response_too_large`, complete derived results or explicit refusal, creation, edit/conflict/recovery, refresh and revocation. This validates the fix locally; retest the merged commit on dev before accepting its hosted-runtime gate.                                          |

All generated account/project data, tokens and exact test client registrations were removed afterward. Production was not changed. The failures above remain part of the evidence; successful retries do not establish a latency or availability target.

### Post-merge CPU investigation

[Development run 39438260232](https://github.com/dutchdronesquad/trackdraw/actions/runs/39438260232) deployed merged PR #1006 at `0d44a06e476e19f0069a952506dd890175c10c9c`. Browser OAuth, creation/retry, edit preview/apply/retry, stale-proposal conflict, recovery and opening the created project in Studio passed. The complete acceptance run still failed with HTTP 503 during comparison or material analysis of the typical fixture (50 gates, 500 route points). Cloudflare tail recorded `exceededCpu`, 59 ms CPU and “Worker exceeded CPU time limit”. The account owner confirmed Workers Free, whose documented [CPU allowance](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) is 10 ms per request; the observed 59 ms is not a configured limit. The remaining scale and auth/request-budget acceptance gates have not passed on this deployment.

A local Node CPU probe of the same generated fixture (fresh design per sample, 10 warm-up runs and 60 measured runs) isolated unnecessary obstacle numbering inside the shared setup-plan builder: median analysis CPU was 12.3 ms, versus 11.5 ms for numbering alone and 0.2 ms for MCP server construction. Analysis now requests the same setup estimate without obstacle numbers; the normal Race Pack plan retains numbering by default. Median analysis CPU fell to 2.9 ms in that probe. These local measurements identify avoidable work; they do not establish Cloudflare CPU usage or acceptance on Workers Free. No subscription, CPU setting, schema validation or request isolation changes are involved. Repeat the full deployed acceptance after this correction merges. The corrected local Cloudflare preview also passed the official SDK flow with typical-track comparison, both scale fixtures, paged geometry and bounded derived-result refusal, OAuth, creation/edit/recovery, refresh and revocation.

### Compatibility correction found by the real client

SDK 1.32.1 caches output validators after `listTools()`. Returning an error object in `structuredContent` then failed the successful tool output schema, turning an actionable `response_too_large` or `not_found` into protocol error `-32602`. Earlier route tests called these tools without discovery first and did not expose this path.

Errors now use `isError: true` plus their bounded JSON text content, without `structuredContent`. Successful structured results and their published schemas stay intact. This follows the [MCP tool result and error contract](https://modelcontextprotocol.io/specification/2025-11-25/server/tools). A regression test explicitly discovers tools before checking missing projects, invalid cursors and oversized analysis/overlay/snapshot results. Provider coverage also checks that replay invalidates the rotated token family.

## Repeatable acceptance checks

Use an explicitly selected environment and disposable account containing generated tracks. Do not change real users' credentials or counters for failure tests. Record outcomes and failures without tokens, authorization URLs, user identities or project content.

| Check                | Expected result                                                                                                                                                       | Repeatable evidence                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect and inspect  | One initial consent, correct account/capabilities, owned project listing, paged geometry, material quantities and selected-project comparison                         | Read-only smoke, optionally setting two owned project IDs; SDK route tests cover ownership and serializers.                                                           |
| Create               | A version 2 track with the requested field/inventory; same request key returns the same project; open the returned Studio link                                        | `TRACKDRAW_MCP_CREATE_TRACK=1`; inspect the saved project in Studio.                                                                                                  |
| Edit and recover     | Preview leaves revision unchanged; apply and retry are stable; stale proposal conflicts; recovery restores the prior state and preserves later work on retry          | `TRACKDRAW_MCP_EDIT_TRACK=1`; SDK route and persistence tests also cover Studio conflicts and rollback.                                                               |
| Refresh and revoke   | Rotation preserves access; revocation immediately rejects access                                                                                                      | `TRACKDRAW_MCP_CHECK_REVOCATION=1`; provider tests cover old-token replay rejection. Separately disconnect in `/mcp/connections` and verify existing access fails.    |
| Auth failures        | Decline, wrong PKCE/redirect/resource, expired or revoked tokens and missing scope fail; no cross-account data                                                        | Provider, boundary, connection and MCP route tests; repeat the relevant failure paths on the candidate deployment.                                                    |
| Pagination and scale | Small and typical race tracks remain readable; large routes use point pages; complete oversized outputs return `response_too_large`, never truncated success          | Route tests include 6,000 route points, 2,001 shapes, oversized shape pages and cursor invalidation; repeat with representative fixtures on the candidate deployment. |
| Request budgets      | 600 MCP requests/hour per account/client, including initialization/notifications; exhaustion returns 429 and Retry-After without token rotation resetting the counter | Durable budget route tests; exercise only a disposable account/client counter when checking the deployed runtime.                                                     |

The reference smoke checks shape pagination up to 5,000 shapes, and the first two point pages of one route. The larger fixture and budget tests above are separate acceptance checks. These are correctness checks; they do not establish a production latency target or prove flight safety.

## Release checklist

For each milestone, keep these evidence levels separate:

1. **Implementation:** merged code, focused regression tests and lint/test/type/build. Check English localization only if product copy changes.
2. **Cloudflare preview:** migrations, real browser OAuth and SDK flows against the canonical local origin. Record the tested commit and runtime; unit tests do not substitute for this check.
3. **Development deployment:** verify migration and deploy jobs, then repeat discovery, auth failures, the milestone workflow, representative track sizes and budget behavior against the deployed origin.
4. **Production release:** use the normal release process. Verify the actual production commit, migrations and endpoints, then repeat onboarding and the milestone checks with disposable data. A successful dev run is not a production release.

| Milestone                        | Merged implementation | Development deployment                                                              | Production   |
| -------------------------------- | --------------------- | ----------------------------------------------------------------------------------- | ------------ |
| Read projects and materials      | #995–#997             | Small-track workflow verified; complete acceptance blocked by the CPU failure above | Not released |
| Create track projects            | #998                  | Small-track workflow verified; complete acceptance blocked by the CPU failure above | Not released |
| Preview/apply edits and recovery | #999                  | Small-track workflow verified; complete acceptance blocked by the CPU failure above | Not released |

PR #1006 is merged, but its deployed acceptance hit the CPU limit described above. After the CPU correction merges, verify its development deploy and repeat the three milestone workflows against that exact deployed commit, including the corrected oversized-result handling and remaining auth/request-budget checks. Once that passes and the evidence is recorded, #1000 and epic #994 can close. Production rollout follows the normal release process and is not an additional issue-closure condition; keep its availability status explicit. Do not treat merge or green CI alone as deployed-runtime acceptance.

## Technical reference

The following sections document the OAuth/tool contracts and repeatable contributor checks. Select the intended environment explicitly when testing; historical deployment evidence above remains separate from these instructions.

## Connect and disconnect

1. Add `https://trackdraw.app/api/mcp` to your MCP client.
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
TRACKDRAW_MCP_URL=https://trackdraw.app/api/mcp node scripts/mcp_smoke.mjs
```

The script prints an authorization URL. Open it in a browser, sign in and review the consent page. Its callback listener binds only to `127.0.0.1` on an automatically assigned port and checks callback state and issuer. A lightweight TrackDraw confirmation page shows whether authorization was approved, declined or could not be verified; return to the terminal for the connection check result. Other MCP clients provide their own callback page. The SDK handles discovery, registration, PKCE and code exchange. Credentials and code verifiers stay in memory and are never printed or saved.

A successful run checks unauthenticated rejection, OAuth discovery and code exchange, MCP initialization, tool discovery, `get_account`, paginated project listing, material analysis and reads of the first project (or `TRACKDRAW_MCP_PROJECT_ID` when set). Set `TRACKDRAW_MCP_COMPARE_PROJECT_ID` to a second explicitly selected owned project ID to also verify comparison. The script walks shape pages (up to 100 pages of 50 items) and checks the first two point pages of the first route, when present. A track exceeding this smoke budget fails explicitly. No project content is printed. The default run does not publish, create or modify a project. You can remove the test app from Connected apps afterward. The script times out after five minutes if authorization is not completed.

To validate edits and recovery, use a disposable account and opt into the edit workflow:

```bash
TRACKDRAW_MCP_URL=https://trackdraw.app/api/mcp TRACKDRAW_MCP_EDIT_TRACK=1 TRACKDRAW_MCP_CHECK_REVOCATION=1 node scripts/mcp_smoke.mjs
```

`TRACKDRAW_MCP_EDIT_TRACK=1` includes creation and edit scopes in the initial consent. It creates a new example project and only edits that project. If `TRACKDRAW_MCP_PROJECT_ID` is set, it also reads that selected project without editing it. It checks that preview does not save, apply increments the revision, retry does not rewrite, a competing proposal conflicts, and restoring the previous version recovers the original gate position. Retrying the original apply after recovery must preserve the recovered revision. Creation/edit checks leave the new project in the account for inspection in Studio; remove the disposable data afterward.

`TRACKDRAW_MCP_CHECK_REVOCATION=1` rotates the refresh token, checks that the renewed access works, revokes this run's refresh token and verifies that its access token is immediately rejected. It disconnects this smoke session; it does not revoke other clients. Without this option, use `/mcp/connections` to disconnect the test app manually.

See the [release checklist](#release-checklist) above for dated evidence, client limitations and deployment-specific results. A successful local smoke run does not establish support for a different client or deployment.

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
