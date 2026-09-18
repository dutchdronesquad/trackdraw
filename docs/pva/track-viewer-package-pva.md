# Track Viewer Package PVA

Date: September 16, 2026

Status: Approved for Phases 0–3 (through the DDS website attachment) and the RotorHazard local-import half of Phase 5. FPVScores (Phase 4) and RotorHazard's cloud adapter (the other half of Phase 5) proceed once the package exists; they are not build blockers today.

## Decision Summary

Recommended decision:

- extract one reusable read-only viewer (`@trackdraw/viewer`) and one portable course snapshot format (`trackdraw.viewer-snapshot.v1`)
- ship the extracted viewer package under Apache-2.0; the editor and server stay `AGPL-3.0-only`
- use host-stored snapshots with explicit manual refresh as the v1 event model — no live backend proxy, no per-visitor TrackDraw API traffic
- treat DDS's own website as the first production consumer, ahead of any external partner
- treat FPVScores and RotorHazard as reference host adapters that shaped the design, not a closed target list
- RotorHazard plugin ownership starts with TrackDraw; each plugin release targets the latest tagged stable RotorHazard release
- treat each host's own attachment UI/backend extension as that host's own build, sequenced after the npm package ships, not a precondition TrackDraw negotiates first

For the full research, evidence, and rationale, see [docs/research/in-progress/track-viewer-package.md](../research/in-progress/track-viewer-package.md).

## Approval Recommendation

Approve Phases 0–3 and the RotorHazard local-import route for build if the team accepts this v1 shape:

- host-stored snapshot plus explicit organizer refresh, never a live TrackDraw API dependency for visitor rendering
- `@trackdraw/viewer` ships Apache-2.0; only the extracted package changes license, not the editor or server
- DDS's own website is the first real usage of the package, validated in production before any partner sees it
- one active course attachment per event; no live timing/pilot markers, OAuth, or bidirectional editing in v1
- RotorHazard requires both local course-file import and cloud project selection/refresh; local import must work fully offline
- no analytics/telemetry callback inside the distributed viewer package; adoption measurement lives on TrackDraw's own side (API/export events, and first-party product-metrics events on the DDS site)

Do not treat this PVA as approving:

- FPVScores' or RotorHazard's exact integration UI, event placement, or account/permission model — each host's own build
- automatic/background refresh, multiple courses per event, or per-round mappings
- long-term RotorHazard plugin ownership transfer — tracked as a future possibility, not decided
- live race overlay features — kept in the separate [live overlay PVA](live-race-overlay-pva.md)

## Delivery Checklist

- [x] Phase 0: confirm distribution fit (license, asset inventory, RotorHazard version policy)
- [x] Phase 1: prove viewer extraction and snapshot fidelity
- [x] Phase 2: package and API foundation
- [ ] Phase 3: DDS website attachment (first real consumer)
- [ ] Phase 4: FPVScores event attachment (sequenced after Phase 2/3; owned by FPVScores' own build)
- [ ] Phase 5: RotorHazard local and cloud adapter

## Go / No-Go Criteria

Go for implementation planning if:

- the team accepts Apache-2.0 for the extracted viewer package while the rest of the codebase stays AGPL
- DDS has, or will soon have, a real event page to attach the viewer to
- manual refresh (not live sync) is acceptable as the v1 event model
- the team accepts building RotorHazard's dual local/cloud requirement as one integration, not two separate ones
- the team accepts that FPVScores' and RotorHazard's own UI work happens on their own timeline, not as a TrackDraw-owned deliverable

No-go or keep parked if:

- the team is unwilling to relicense any part of the codebase, even a thin extracted client package
- there is no near-term DDS website surface to attach a real course to
- FPVScores or RotorHazard adoption is treated as a launch requirement rather than a follow-on

## Codebase Anchor

### Existing Code To Reuse

- [`GET /api/v1/projects`](../../src/app/api/v1/projects/route.ts)
  Owner-authenticated project summaries using `tracks:read`. Fix pagination (`next_cursor` is always `null`) before Phase 2 ships a complete project picker.
- [`GET /api/v1/projects/[projectId]/track`](../../src/app/api/v1/projects/[projectId]/track/route.ts) and [`GET /api/v1/projects/[projectId]/overlay`](../../src/app/api/v1/projects/[projectId]/overlay/route.ts)
  Existing authenticated read contracts to keep compatible; the new viewer-snapshot route is additive, not a replacement.
- [`toApiTrackPackage` / `toApiShape`](../../src/lib/server/api-projects.ts)
  Existing `trackdraw.track.v1` serialization. Strips `shape.meta` and design version — do not reuse as-is for the viewer snapshot.
- [`serializeDesignForShare`](../../src/lib/track/design.ts)
  Best starting point for the viewer allowlist; still carries author/inventory/arbitrary metadata that must be explicitly excluded.
- [2D viewer](../../src/components/canvas/viewer/TrackCanvas.tsx), [3D viewer](../../src/components/canvas/viewer/TrackPreview3D.tsx), [viewer shell](../../src/components/editor/viewer/EditorShell.tsx)
  Extraction target. Coupled to editor state, Next.js routing, translations, and app preferences today.
- [Catalog identity](../../src/lib/track/elements/catalog.ts) and [scene texture loading](../../src/components/canvas/preview3d/shared-scene.tsx)
  Catalog visuals to preserve; current scene imports eagerly preload every texture, which the extracted package must not do.
- [`/embed/[token]`](../../src/app/embed/[token]/page.tsx) and [`EmbedViewer`](../../src/app/embed/EmbedViewer.tsx)
  Existing hosted fallback if package distribution stalls; not the target architecture.
- [package.json](../../package.json) and [NOTICE.md](../../NOTICE.md)
  Repository-wide `AGPL-3.0-only`. Apply Apache-2.0 license text/NOTICE/headers to the extracted `@trackdraw/viewer` package specifically during Phase 1; do not relicense anything else.

### New Surfaces

- `@trackdraw/viewer`: framework-neutral mount API (`createTrackDrawViewer`), ESM npm build plus a static browser build from one codebase/release. [`packages/viewer/`](../../packages/viewer/) held only the Phase 0 license/NOTICE scaffold; Phase 1 added its source under `packages/viewer/src/`, consumed today via a dev-only TypeScript path alias; Phase 2 (#860) added `package.json`/`tsup` build tooling, still consumed from source (no npm publish). **Repo-location decision (finalized):** the package moves to its own repository (`dutchdronesquad/track-viewer` — deliberately without "trackdraw" in the name, to read as a standalone, brand-neutral project rather than a TrackDraw-only tool; the npm package stays `@trackdraw/viewer`, the scope does not need to match the repo name). Issue [#870](https://github.com/dutchdronesquad/trackdraw/issues/870) (vendoring `packages/viewer/src`'s remaining `@/...` imports into the app) is **done**: `packages/viewer/src` now has zero source-level dependency on the main app's `src/` tree, and `packages/viewer/tsconfig.json`'s `paths` is explicitly empty so any regression breaks the build immediately. This supersedes the earlier "stays in this repo, revisit later" framing from Phase 1/2. Reasoning: the AGPL/Apache-2.0 license boundary between this repo and the package was not previously structurally enforced — issue #870 existed precisely because the boundary had already leaked (the package transitively pulled in AGPL-licensed app code via `@/...` imports). A separate repository makes that boundary a structural fact instead of a code-review discipline, which matters more than the monorepo convenience of colocated versioned releases (git tags/a scoped `package.json` version work fine either way). Tracked as issue [#871](https://github.com/dutchdronesquad/trackdraw/issues/871), now unblocked.
- `trackdraw.viewer-snapshot.v1`: versioned envelope (`schema`, `snapshot_id`, `required_viewer`/capabilities, `design`, `assets`) built by a shared snapshot builder used by both the browser manual-export path and the authenticated API route.
- Candidate route: `GET /api/v1/projects/[projectId]/viewer-snapshot`, reusing `tracks:read`. Name and shape are proposed, not frozen — confirm during Phase 2 and publish OpenAPI.
- Manual export format: `.tdviewer.zip` (manifest, course data, non-bundled assets, optional poster) built by the same snapshot builder, with no cloud call required.

### Privacy And Metrics Boundary

No `apiKey` option and no analytics callback inside `@trackdraw/viewer` — this is a privacy boundary (RotorHazard instances are often fully offline; FPVScores' visitors are not TrackDraw's to track), not an oversight. Adoption measurement instead uses: snapshot-fetch API calls and manual-export actions on TrackDraw's own server/browser, following the existing [product metrics contract](../research/implemented/product-metrics-contract.md); and, for the DDS website specifically (first-party surface, Phase 3), viewer load/view/2D-3D-switch events added to that same contract.

## Phase Plan

### Phase 0: Confirm Distribution Fit

Start state: research complete; license, RotorHazard version policy, and RotorHazard plugin ownership are decided (see the research doc's [Remaining Decisions](../research/in-progress/track-viewer-package.md#remaining-decisions)).

Work:

- apply Apache-2.0 license text, `NOTICE`, and headers to the extraction target package scaffold
- decide asset inventory: which catalog/texture assets are viewer-owned (ship with the package) versus source-restricted (never leave TrackDraw)

Done state: the extracted package has its own license/NOTICE in place and a confirmed asset inventory before Phase 1 code is written.

Asset inventory decision:

- **Viewer-owned (ship with the package):** TrackDraw's own generic catalog geometry — gate, flag, cone, label, start/finish, ladder, dive-gate, tower, banner, fence, net (`organization: "TrackDraw"` in [`src/lib/track/elements/catalog.ts`](../../src/lib/track/elements/catalog.ts)). These are procedural/code-driven with no extracted third-party artwork.
- **Source-restricted (never bundled into the redistributable npm/static package):** MultiGP-branded catalog textures — every entry with `organization: "MultiGP"`, texture paths under `public/assets/models/textures/multigp-obstacles/`. Per [`docs/assets/multigp-obstacle-asset-workflow.md`](../../docs/assets/multigp-obstacle-asset-workflow.md), "MultiGP names, obstacle artwork, and related branding belong to MultiGP" — that source documents TrackDraw's own in-app use, not a redistribution license for a permissively licensed package any third party can install and redistribute further. The existing `organization` field on each catalog entry already gives Phase 1 a ready-made, code-level signal for this split; no new tagging work is needed.
- **How MultiGP visuals still render:** treat these textures as the "future course-specific assets" class already described in [Viewer Snapshot And Assets](../research/in-progress/track-viewer-package.md#viewer-snapshot-and-assets) — copied into a specific snapshot's asset set at export/API-fetch time when a design actually uses a MultiGP-catalog item, not installed with the versioned viewer package itself. This keeps the same rule RotorHazard's offline route already needs (a design's required assets travel with its snapshot/manual export, not as a separate network fetch) and avoids embedding MultiGP artwork in an openly redistributable package.
- Follow-up for Phase 1/2: confirm this split holds once the extraction spike enumerates every asset request, and update [Viewer Snapshot And Assets](../research/in-progress/track-viewer-package.md#viewer-snapshot-and-assets) if it turns out not all catalog textures cleanly follow the `organization` field. **Confirmed in Phase 1** — the `organization` split held for every catalog texture; the spike's full inventory found exactly one asset request outside `getTrackElementCatalogTexturePaths()`'s original scope, the TrackDraw brand watermark logo (`/assets/brand/trackdraw-logo-mono-*.svg`), which is TrackDraw-owned by definition and does not change the split. See the [findings doc](../research/in-progress/track-viewer-extraction-spike-findings.md#networkasset-request-inventory).
- How the source-restricted textures get hosted, vendored, and (potentially, later) opened to other organizations is its own research track, not decided here: see [Catalog Asset Hosting](../research/planned/catalog-asset-hosting.md).

Checklist:

- [x] Apache-2.0 `LICENSE`/`NOTICE`/header text drafted for the viewer package ([`packages/viewer/LICENSE`](../../packages/viewer/LICENSE), [`packages/viewer/NOTICE.md`](../../packages/viewer/NOTICE.md))
- [x] Asset inventory decided and documented (viewer-owned vs. source-restricted)

### Phase 1: Prove Viewer Extraction And Snapshot Fidelity

Start state: 2D/3D viewers exist but are coupled to editor state, Next.js, translations, and preferences.

Work:

- build an isolated spike page with representative catalog obstacles, route elevation/rotation, labels, and multiple simultaneous viewer instances
- compare 2D/3D output against the existing viewer
- remove the Next.js/editor-store dependency from the package boundary
- inventory every network request and asset the extracted viewer makes
- finalize the `design`/metadata allowlist and a `required_viewer` compatibility/versioning rule as an explicit output of this phase

Done state: plain host page renders a snapshot, 3D loads on demand, controls work on desktop/mobile, unsupported WebGL retains 2D, multiple instances do not interfere, and all assets resolve under a non-root URL prefix.

Checklist:

- [x] Isolated spike page built outside the Next.js app shell — `src/app/dev/viewer-spike/`, no `EditorShell`/`Header`/`MobilePanels`/auth; extracted viewer lives at [`packages/viewer/src/`](../../packages/viewer/src/)
- [x] 2D/3D visual parity confirmed against the existing viewer — manually reviewed on PR [#868](https://github.com/dutchdronesquad/trackdraw/pull/868)'s Vercel preview (`/dev/viewer-spike`), confirmed matching
- [x] Multi-instance isolation confirmed (no shared editor store) — confirmed by construction (no `useEditor`/store import anywhere in `packages/viewer/src/**`) and by the spike page's two concurrently-rendered instances; details in the [findings doc](../research/in-progress/track-viewer-extraction-spike-findings.md#multi-instance-isolation)
- [x] Finalized display-metadata allowlist and `required_viewer` versioning rule recorded — implementation in [`packages/viewer/src/snapshot/`](../../packages/viewer/src/snapshot/) and [`src/lib/track/viewer-snapshot.ts`](../../src/lib/track/viewer-snapshot.ts); rule recorded in the [findings doc](../research/in-progress/track-viewer-extraction-spike-findings.md#allowlist-and-required_viewer-versioning--finalized)

Full network/asset inventory and remaining findings: [track-viewer-extraction-spike-findings.md](../research/in-progress/track-viewer-extraction-spike-findings.md).

### Phase 2: Package And API Foundation

Start state: extraction spike proven; snapshot allowlist finalized.

Work:

- produce the ESM npm build and the static browser build from one codebase/release
- build the shared snapshot builder used by both manual export and the API route
- add validated serialization and asset manifest (schema/size validation at the import boundary, not just normalization)
- implement `GET /api/v1/projects/[projectId]/viewer-snapshot`
- fix `GET /api/v1/projects` pagination
- publish the integration contract (OpenAPI)

Done state: browser manual export and authenticated API output produce equivalent visible courses from the same design; no keys/private fields leak into the snapshot; existing `/track`, `/overlay`, and share contracts remain compatible.

Checklist:

- [x] ESM + static builds published from one release pipeline — `npm run viewer:build` (`packages/viewer/`, `tsup`), producing `dist/*.js` (multi-entry ESM) and `dist/static/trackdraw-viewer.global.js` + `trackdraw-viewer.css` (self-contained IIFE + compiled Tailwind, for hosts with no bundler). Not published to any registry — deliberately out of scope, see the PVA's "New Surfaces" section. **Known gap:** no `.d.ts` type declarations ship yet — `tsup`'s `dts` option pulls in a `rollup-plugin-dts` pin incompatible with this repo's TypeScript 7; not a blocker today (nothing consumes `dist/`), tracked in `packages/viewer/tsup.config.ts` and `packages/viewer/README.md`.
- [x] Shared snapshot builder used by both export and API paths — `toViewerDesignSnapshot()` (`src/lib/track/viewer-snapshot.ts`) is called directly by the editor's new "Viewer Snapshot" export action (`ExportDialog.tsx`) and indirectly by `toApiViewerSnapshotPackage()` (`src/lib/server/api-projects.ts`), which the API route calls.
- [x] `viewer-snapshot` route implemented and schema-validated — `GET /api/v1/projects/[projectId]/viewer-snapshot`; snapshots are validated against `packages/viewer/src/snapshot/schema.ts`'s Zod schema plus a `MAX_VIEWER_SNAPSHOT_BYTES` serialized-size cap before ever leaving `toViewerDesignSnapshot()`.
- [x] Project-list pagination fixed — `GET /api/v1/projects` now accepts an opaque `cursor` query param and returns a real `next_cursor` (previously always `null`); `listProjectSummariesForUser`'s SQL gained `id asc` as a stable secondary sort key.
- [x] OpenAPI documentation published — new `ViewerSnapshotPackage` schema, path entry, and `Cursor` parameter in `src/lib/api/openapi.ts`, served at `/api/v1/openapi.json` and rendered at `/api/docs`.

### Phase 3: DDS Website Attachment (First Real Consumer)

Start state: package and API foundation exist; no production usage yet.

Work:

- attach `@trackdraw/viewer` to a real DDS event page using the Phase 2 snapshot builder/API — no DDS-only data or packaging path
- add viewer load/view/2D-3D-switch events to the product metrics contract for this first-party surface only

Done state: at least one real DDS event page embeds the npm viewer against a real snapshot in production, proving extraction, packaging, licensing, and embedding together end to end before any external party sees the package.

Checklist:

- [ ] At least one production DDS event page uses `@trackdraw/viewer`
- [ ] First-party viewer usage events added to the product metrics contract
- [ ] Learnings on "viewer used" definitions captured for later FPVScores/RotorHazard measurement

### Phase 4: FPVScores Event Attachment

Start state: package published and proven on DDS's own site; FPVScores has not yet built against it.

Work (owned by FPVScores' own timeline, not a TrackDraw-scheduled deliverable):

- FPVScores adds connection settings, project picker, snapshot preview, and attach/refresh/remove using the published npm package and API route
- TrackDraw supports with API stability, docs, and organization-scoped `tracks:read` permission behavior; does not build FPVScores' UI

Done state: an actual FPVScores test event works without visitor TrackDraw authentication; private project lists remain private; API key expiry or TrackDraw downtime does not break an already-attached course; a failed refresh retains the prior snapshot.

Checklist:

- [ ] FPVScores connection settings and project picker built (their side)
- [ ] Snapshot preview and attach/refresh/remove flow built (their side)
- [ ] Real FPVScores test event validated end to end

### Phase 5: RotorHazard Local And Cloud Adapter

Start state: package and API foundation exist (Phase 2 complete); local route does not require Phase 3/4.

Work:

- ship an offline-installable static viewer and bundled catalog assets in a supported plugin release
- implement local course-file import (`.tdviewer.zip`) with full validation and no network calls
- implement server-side API connection/project selection with explicit refresh, sharing the same validator as local import
- apply the RotorHazard supported-version policy (latest tagged stable at each plugin release)

Done state (both routes required):

- Local: with WAN access disabled and no TrackDraw credentials, install the plugin, import a locally authored course, and load both 2D and 3D from a second LAN device with an empty cache; replacing the course via another local file works; no step makes external requests.
- Cloud: configure a key, select a project, preview/attach, and refresh; then disable WAN access and reload from an empty cache — the imported course remains fully available; interrupted refresh, expired credentials, and invalid responses preserve the previous snapshot.
- Shared: reload and server restart preserve the attachment; invalid imports do not replace it; switching between local and cloud sources works without requiring either to be configured first.

Checklist:

- [ ] Offline-installable plugin artifact ships with bundled viewer/catalog assets
- [ ] Local course-file import validated fully offline
- [ ] Cloud connection/project selection/refresh validated
- [ ] Shared attachment storage/preview/validation confirmed for both routes
- [ ] Supported-version policy applied and documented in the plugin release
