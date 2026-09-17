# Track Viewer Package: A Shared Viewer And Snapshot Format

**Original research:** June 15, 2026

**Revised:** September 16, 2026

**Status:** Active research and architecture recommendation; no standalone viewer package or host integration implemented yet. The [Track Viewer Package PVA](../../pva/track-viewer-package-pva.md) now covers Phases 0–3 (through the DDS website attachment) and the RotorHazard local-import route. [Remaining Decisions](#remaining-decisions) separates what this research already settles (the `@trackdraw/viewer` license: Apache-2.0; RotorHazard plugin ownership: TrackDraw for now), what still needs an owner call before Slice 0 (RotorHazard supported-version policy), what Slice 1 resolves by execution, and what is simply sequenced after FPVScores builds against the shipped npm package rather than blocked on a decision.

## Recommended Direction

Build one reusable read-only viewer and one portable course snapshot format, better than a plain iframe, that any site can embed a TrackDraw course into. FPVScores and RotorHazard are the two external examples used to shape the design; DDS's own website is the first actual consumer, since it needs no partner alignment and validates the full chain (extraction, packaging, licensing, embedding) end to end before any external party sees the package. FPVScores installs the viewer through npm and fetches selected tracks through its backend. RotorHazard installs a static build of the same viewer and supports two required input routes: local course-file import and cloud project selection through the API. Organizers choose either route; both store a complete course snapshot and assets locally. Cloud configuration is optional for the user, while cloud support is part of the planned delivery.

Use an event snapshot for both platforms, with explicit organizer refresh. FPVScores being online should not require a TrackDraw API request for each visitor or make the event course change whenever its author edits the source project. The API key is for discovering and importing tracks; displaying an attached course requires only the host's stored snapshot and installed viewer.

This recommendation develops the proposed organizer flow: configure an API key, choose a TrackDraw project, and attach it to an event. It does not assume that FPVScores already exposes the necessary attachment UI or backend extension.

The existing hosted embed remains a fallback if package distribution is not viable. It is no longer the proposed primary integration.

FPVScores and RotorHazard are reference implementations, not a closed target list. No other external host is committed as of this revision, but they were deliberately chosen because they sit at opposite ends of the host-adapter space: FPVScores is a hosted backend that proxies a live API key, RotorHazard is a fully local/offline device that never needs one. DDS's own website is a third reference point that needs neither: a fully self-owned host, useful precisely because it removes every partner dependency from the first real usage of the package. A future interested party should fit the same viewer/snapshot/host-adapter boundary defined below without forcing a redesign of that boundary; do not let any one host's specific mechanics (FPVScores' server-side secret storage, RotorHazard's static-plugin packaging) leak into the parts of this document meant to be host-agnostic.

## Why This Model

| Approach                                | Benefit                                                                                              | Limitation                                                                                                               | Recommendation                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| TrackDraw-hosted iframe                 | Existing 2D/3D viewer; smallest host change.                                                         | TrackDraw availability and published-share lifecycle remain runtime dependencies; no offline RotorHazard course.         | Fallback or temporary demo.            |
| npm viewer with live backend proxy      | Host controls presentation and visitors do not receive the API key.                                  | Visitor rendering still depends on key validity and TrackDraw availability; edits can silently change an event's course. | Do not use as the default event model. |
| Shared viewer plus host-stored snapshot | Host controls presentation, updates, and availability; same viewer/data contract for both platforms. | Requires a complete exportable snapshot and asset handling.                                                              | Preferred foundation.                  |

The shared part is rendering and course data. Event records, credentials, organizer permissions, storage, and refresh scheduling remain host responsibilities. A separate generic integration SDK is unnecessary until duplicated adapter work justifies it — but keep that boundary itself (viewer, snapshot envelope, host adapter) drawn generically rather than shaped around FPVScores/RotorHazard specifics, so a real third host stays a new adapter rather than a rewrite.

```text
FPVScores organizer -> FPVScores backend -> TrackDraw API
                             |                 (key stays server-side)
                             +-> snapshot + assets -> npm viewer

Local TrackDraw design -> browser file export -> USB / local transfer
                                                       |
                                  RotorHazard local import
                                                       |
                                  local data + static viewer -> LAN visitors

RotorHazard cloud selection -> the same local import/validation pipeline
```

## Organizer And Visitor Flows

### FPVScores

1. An authorized organizer adds a TrackDraw API key to their permitted FPVScores integration settings. The server verifies it and stores it as a secret; the browser receives connection status only.
2. In an event's track settings, the organizer chooses that connection and selects an owned TrackDraw project from the API-backed list.
3. FPVScores fetches a viewer snapshot and required assets server-side, validates them, and shows a private attachment preview.
4. The organizer attaches the previewed snapshot to the event. This is an explicit publication of that course on the event's surface, including when the source project was private in TrackDraw.
5. Visitors view the stored course through `@trackdraw/viewer`, without signing into TrackDraw and without a TrackDraw API key or API call.
6. The organizer can manually refresh, replace, or remove the event course. Refresh previews a new snapshot before replacing the current one.

Start with one active course attachment per event. Multiple courses, per-round mappings, and automatic change detection can follow when a concrete event requires them.

Scope the saved connection and all project-list/import actions to the appropriate organizer or organization permissions in FPVScores, as a single organization-scoped connection rather than a separate per-event grant — the exact account/role model is FPVScores' own to define. The existing TrackDraw permission allows reading the key owner's projects; it is not an event-specific or single-project grant. Never expose that private project list to public visitors or unrelated organizers.

### RotorHazard: Local Import And Cloud Connection

RotorHazard must support both workflows below in the planned integration. Neither depends on first configuring the other.

**Local route:** attach and display a course without ever connecting to TrackDraw, creating an account, or configuring an API key. Offline means more than continuing to display a previously cloud-synced course.

1. The organizer works with a local TrackDraw design; it does not need to be saved to an account or published.
2. TrackDraw generates a viewer package locally from that design. The export builder must run in the browser using locally available viewer assets, not call an authenticated or cloud package-generation endpoint.
3. The organizer transfers the file through USB, a shared local folder, or the LAN.
4. In RotorHazard, the organizer chooses **Import local course**, selects the file, reviews it, and attaches it to the event.
5. RotorHazard validates and stores the course locally. All visitor devices load the viewer, lazy chunks, and assets from the local race server.
6. A course change is another local export/import. No source project ID, share token, or cloud revision is required; local content hashes identify snapshots.

The plugin installation artifact must contain its static viewer and bundled catalog assets and be transferable offline too. Its install/runtime path must not download npm packages, CDN scripts, remote schemas, or missing renderer assets. Pin a compatible viewer in the plugin release; reject newer unsupported course capabilities with a clear local error rather than trying to download an update.

Manual course packages contain data and any supported non-bundled assets, not executable viewer JavaScript. The trusted plugin distribution carries the executable code. This preserves a local-only workflow without treating uploaded course archives as applications.

**Cloud route:** when a race server has internet, the organizer can choose **Connect TrackDraw**, configure an API key on the RotorHazard server, select an owned project, preview it, and attach it to the event. Fetch and validate all required data/assets before activating the attachment. A **Refresh from TrackDraw** action previews and imports a newer snapshot using the same validator.

After a successful cloud import, disconnecting the internet or expiry of the key must not interrupt course display. A failed or interrupted fetch preserves the previous complete snapshot. Local file import remains available with or without a configured connection. Switching the event to a different local or cloud course uses the same deliberate preview-and-replace flow.

Both routes are required for RotorHazard acceptance. The cloud connection is optional to configure, not a deferred product capability.

RotorHazard does not need npm or a Node runtime on the race computer. Its plugin ships the static browser artifact produced by the same viewer release used by FPVScores.

This integration must support a design that was never uploaded. Making the complete TrackDraw editor installable and authorable on a fully disconnected machine is a separate distribution concern; the current browser app's cold-start offline capability has not been established by this research. Verify local export with the app/assets already locally available, and explicitly include local editor distribution if the agreed end-to-end use case also requires a new air-gapped authoring machine.

### Snapshot Lifecycle

- Attachment stores source identity and update time when available, plus snapshot identifier/hash, viewer/schema compatibility, and import time. Cloud provenance is optional; a locally authored file is a complete valid source. Public viewer data contains only course content and approved display metadata.
- Repeated fetches of identical content can reuse a snapshot. Validate and store a replacement completely before switching the event attachment; failed refreshes keep the last valid course.
- Editing or archiving the TrackDraw source does not silently change or delete an exported event course.
- Expired/revoked API keys stop discovery and refresh, while existing snapshots remain viewable. Show a reconnect action to the organizer, not an authentication error to spectators.
- Disconnecting the TrackDraw connection stops future sync. Removing the event attachment is a separate action. Event deletion and host retention determine removal of stored copies.
- TrackDraw share revocation cannot recall an exported snapshot. Make host publication and removal behavior clear before attaching a private project.
- Automatic refresh during a race is outside v1. Historical event pages should retain the course actually attached for that event.

## Current Evidence And Gaps

### TrackDraw Code

Verified against this checkout on September 12, 2026:

| Existing code                                                                                                                                                                                                    | Useful foundation                                          | Gap for this integration                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`GET /api/v1/projects`](../../../src/app/api/v1/projects/route.ts)                                                                                                                                              | Owner-authenticated project summaries using `tracks:read`. | Maximum 100 entries, with `has_more` but always `next_cursor: null`. Add working pagination before promising a complete track picker.                            |
| [`GET /api/v1/projects/[projectId]/track`](../../../src/app/api/v1/projects/[projectId]/track/route.ts)                                                                                                          | Existing authenticated geometry endpoint.                  | Not a faithful standalone viewer snapshot.                                                                                                                       |
| [`toApiTrackPackage` / `toApiShape`](../../../src/lib/server/api-projects.ts)                                                                                                                                    | `trackdraw.track.v1` layout data.                          | Strips `shape.meta`, including catalog identity used by renderers, and omits design version. Do not reconstruct the viewer by blindly reversing snake_case keys. |
| [`serializeDesignForShare`](../../../src/lib/track/design.ts)                                                                                                                                                    | Existing design serialization and map exclusion.           | Still carries author/inventory and arbitrary shape metadata. Reuse geometry serialization, with an explicit viewer allowlist rather than exporting everything.   |
| [2D viewer](../../../src/components/canvas/viewer/TrackCanvas.tsx), [3D viewer](../../../src/components/canvas/viewer/TrackPreview3D.tsx), [viewer shell](../../../src/components/editor/viewer/EditorShell.tsx) | Existing renderers and interactions.                       | Coupled to editor state, Next.js routing/dynamic imports, app translations, and app preferences. Extraction is real work.                                        |
| [Catalog identity](../../../src/lib/track/elements/catalog.ts) and [scene texture loading](../../../src/components/canvas/preview3d/shared-scene.tsx)                                                            | Existing catalog visuals.                                  | Preserve rendering metadata and resolve assets through the host; current scene imports eagerly preload catalog textures.                                         |
| [`/embed/[token]`](../../../src/app/embed/[token]/page.tsx) and [`EmbedViewer`](../../../src/app/embed/EmbedViewer.tsx)                                                                                          | Existing hosted published-share display.                   | Requires TrackDraw at runtime, rejects temporary shares, and includes app measurement. Useful fallback, not an npm package.                                      |

Keep the existing `/track` and `/overlay` contracts compatible. A generic viewer snapshot endpoint is justified by display fidelity and asset packaging, not by the FPVScores or RotorHazard vendor name. Keep livestream timing and position estimation in the separate [live overlay research](live-race-overlay-evaluation.md).

### Host Evidence

Public primary sources checked September 12, 2026. No host integration was exercised.

- FPVScores documents a hosted event/results platform and RotorHazard sync. A [public DDS event](https://fpvscores.com/events/zgeGobJeVG) contains a Twitch iframe, but that does not establish general viewer support. The inspected [documentation](https://docs.fpvscores.com/docs/introduction/) and [sync repository](https://github.com/FPVScores/FPVScores-Sync) do not document a TrackDraw attachment API or the site's frontend/backend extension model. Per [Remaining Decisions](#remaining-decisions), npm-package consumption and server-side secret storage are treated as working assumptions rather than gated on partner confirmation; the actual attachment UI/backend extension is FPVScores' own build, expected only after `@trackdraw/viewer` ships.
- The FPVScores sync Event UUID can modify results and is explicitly secret. Keep it separate from viewer identifiers and the TrackDraw connection. [Official plugin settings](https://docs.fpvscores.com/docs/sync-plugin/settings/).
- RotorHazard documents custom Flask routes through `ui.blueprint_add` and event-scoped options through `fields.register_option`. These support investigating a local viewer plugin; they do not implement event-course attachment themselves. [RHAPI documentation](https://github.com/RotorHazard/RotorHazard/blob/main/doc/RHAPI.md).
- RotorHazard supports local operation without internet and warns that development documentation may differ from stable releases. Choose supported releases before implementing the plugin. [Official project documentation](https://github.com/RotorHazard/RotorHazard) and [plugin documentation](https://github.com/RotorHazard/RotorHazard/blob/main/doc/Plugins.md).

## Shared Viewer Boundary

Proposed package name: `@trackdraw/viewer`, subject to availability and release decisions. Prefer a framework-neutral mount API with React/Konva/Three.js behind it; retain existing renderer technology instead of rewriting geometry for the host's framework. FPVScores does not need to adopt Next.js or TrackDraw's editor store.

```ts
// Proposed API, not a currently published package.
import { createTrackDrawViewer } from "@trackdraw/viewer";

const viewer = createTrackDrawViewer(container, {
  snapshot,
  assetsBaseUrl: "/event-assets/course-123/",
  initialView: "2d",
  theme: "light",
  locale: "en",
});

viewer.setView("3d");
viewer.fit();
viewer.destroy();
```

- The caller supplies validated data and an asset base/resolver. There is no `apiKey` option or TrackDraw fetching inside the viewer.
- Each instance owns its viewport and display state; two event previews on one page must not share the global editor store.
- Use explicit container sizing, locale, theme, and unit inputs. No host-router mutation, host-wide CSS reset, implicit persistence, account UI, or analytics callbacks to TrackDraw. This is a privacy boundary, not an oversight: RotorHazard's viewer instances are often fully offline, and FPVScores' visitors are FPVScores' own audience — a bundled analytics beacon would mean silently tracking a third party's visitors, which the [product metrics contract](../implemented/product-metrics-contract.md)'s privacy boundary does not extend to. Measure adoption on TrackDraw's own side instead: snapshot-fetch API calls and manual-export actions already happen against TrackDraw's server/browser and can use existing product-metrics events; a per-visitor embed view count is not available for FPVScores/RotorHazard and is not worth compromising the offline/no-tracking guarantee to get. DDS's own website is the exception, since it is TrackDraw's own first-party surface — see [Concrete Delivery Slices → 3](#3-dds-website-attachment-first-real-consumer).
- Ship an npm ESM entry for FPVScores and a static browser build for RotorHazard from one codebase/release. Document asset copying, CSS scope, supported browsers, and teardown. A React wrapper or custom element can follow if the host needs it.
- Start with 2D/3D switching, fit, orbit/pan/zoom, route direction, obstacle numbers, and mobile controls. Lazy-load 3D; retain 2D on unsupported WebGL. Flythrough, host messages, object highlighting, and live race state are follow-up capabilities.
- Test extraction in an isolated host page before replacing the existing TrackDraw share/embed shell. A working package must not regress existing read-only or editor behavior.

## Viewer Snapshot And Assets

Use a versioned envelope around a deliberately restricted serialized design. Preserve `TrackDesign.version: 2`, existing coordinates, rotations, shape kinds, route geometry, and renderer-required catalog metadata. Reuse normalization and geometry code, but apply actual schema/size validation at the import boundary; normalization alone is not input validation.

Proposed envelope responsibilities:

| Field                            | Purpose                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `schema`                         | Independent viewer snapshot version, e.g. `trackdraw.viewer-snapshot.v1`.                       |
| `snapshot_id`                    | Stable content identity for deduplication and event attachment.                                 |
| `required_viewer` / capabilities | Compatibility with the installed renderer and supported shape/asset set.                        |
| `design`                         | Allowlisted serialized course, including explicit design version and approved display metadata. |
| `assets`                         | Required relative paths, content types, sizes, and hashes; attribution where applicable.        |

The host keeps connection ID, private project ID, source update time, and event mapping outside the public envelope. All generated content and the asset manifest must correspond to the same source snapshot; do not combine separate reads of a changing project.

Use `serializeDesignForShare` as an implementation starting point, then explicitly select required shape fields and metadata. Omit author details, inventory, credentials, arbitrary private metadata, editor state, and source ownership by default. Include catalog identity and route/timing display metadata only where the viewer requires it.

For v1, exclude map references consistently with existing share serialization. Venue imagery, tile fetching, and user-uploaded assets need a separate portability and redistribution decision. Do not promise visual parity with an editor-only map layer.

Separate two asset classes:

- Viewer-owned catalog textures and other required static assets: installed with the versioned viewer, with a manifest/resolver that works at any host URL prefix.
- Future course-specific assets: copied into the snapshot asset set when supported. Rendering must not depend on an expiring source URL or CDN after import.

The static viewer must load its own lazy chunks locally too. Copying `track.json` alone does not establish offline support. Avoid eager loading of every catalog texture when only a subset is used.

Manual export can use `.tdviewer.zip` containing a manifest, course data, required non-bundled assets, and an optional poster. The host installs viewer JavaScript separately. Validate archive paths, expanded size, allowed types, hashes, schema, and required capabilities; reject incomplete imports before changing the event attachment. Hashes detect corruption, not authorship.

## API And Host Adapter

Reuse the existing bearer permission `tracks:read` for discovery and authorized source reads. API keys remain on each host's backend; they never appear in public URLs, snapshots, logs, or browser viewer options.

Candidate new route: `GET /api/v1/projects/[projectId]/viewer-snapshot`. This is a proposed generic read endpoint, not an existing API or a frozen name. Agree the response and asset transport with the contract spike and publish OpenAPI when implemented. Manual export must run that same snapshot builder locally, without invoking this endpoint or requiring cloud credentials.

The adapter owns:

1. Connection validation and authorized project discovery, including complete pagination.
2. Authenticated snapshot fetch with actionable expired-key/rate-limit failures.
3. Fetching only approved asset locations and validating the resulting complete snapshot.
4. Staging and previewing the candidate attachment, then atomically activating it.
5. Serving approved public course data/assets with host caching, retention, and event access controls.

Use manual refresh for v1. No per-visitor TrackDraw API traffic, automatic publication from background polling, OAuth flow, bidirectional editing, or race-result sync is required for the first integration.

## Concrete Delivery Slices

### 0. Confirm Host And Distribution Fit

Host-side specifics (frontend integration entry, exact settings UI, event placement, retention) are each host's own build to work out once `@trackdraw/viewer` exists as an npm package, not a precondition for this slice — see [Remaining Decisions](#remaining-decisions). Permission scoping and the privacy consequence of attaching a private project are decided on TrackDraw's side and do not need a specific host's agreement to keep building against.

The repository currently declares `AGPL-3.0-only` in [package.json](../../../package.json) and [NOTICE](../../../NOTICE.md). Per the [licensing decision](#remaining-decisions), `@trackdraw/viewer` ships under Apache-2.0 while the editor and server stay AGPL-3.0-only. Apply the Apache-2.0 license text, `NOTICE`, and headers to the extracted package during the Slice 1 spike so the license is in place before any npm publish; still decide asset inventory (which catalog/texture assets are viewer-owned versus source-restricted) before committing to partner npm adoption.

For RotorHazard, plugin ownership is decided (TrackDraw maintains it for now, see [Remaining Decisions](#remaining-decisions)); apply the supported-version policy (latest tagged stable at each plugin release) rather than picking one version here. FPVScores can proceed first without waiting for the finished RotorHazard plugin, provided the common artifact is locally serveable from the start.

### 1. Prove Viewer Extraction And Snapshot Fidelity

Build an isolated spike with representative catalog obstacles, route elevation/rotation, labels, and multiple simultaneous viewer instances. Compare 2D/3D output with the existing viewer. Remove Next.js/editor-store dependency from the package boundary and inventory every network request and asset.

Acceptance: plain host page renders the snapshot, 3D loads on demand, controls work on desktop/mobile, unsupported 3D retains 2D, instances do not interfere, and all assets resolve under a non-root URL prefix.

### 2. Package And API Foundation

Produce ESM/static builds and a shared snapshot builder, add validated serialization and asset manifest, implement the selected generic API route, and fix discovery pagination. Define compatibility errors and publish the integration contract.

Acceptance: browser manual export and authenticated API output produce equivalent visible courses from the same design; keys/private fields are absent; existing API contracts and share flows remain compatible.

### 3. DDS Website Attachment (First Real Consumer)

Attach `@trackdraw/viewer` to a real DDS event page before any external partner integration. This is the cheapest full-chain validation available: DDS controls the frontend, the event content, and the deployment, so nothing here waits on FPVScores or RotorHazard, and it is the first place the package, its Apache-2.0 licensing, and the snapshot contract get used in production rather than in an isolated spike. Reuse the same snapshot builder and public API route built in Slice 2; do not fork a DDS-only data or packaging path.

Acceptance: at least one real DDS event page embeds the npm viewer against a real snapshot in production, proving extraction, packaging, and embedding together end to end. Because this surface is TrackDraw's own first-party site, viewer load/view/2D-3D-switch events can be added to the existing [product metrics contract](../implemented/product-metrics-contract.md) here without the privacy concerns that block equivalent tracking inside the distributed package (see [Shared Viewer Boundary](#shared-viewer-boundary)); use this slice to learn what "viewer used" should mean before it matters for FPVScores/RotorHazard adoption measurement.

### 4. FPVScores Event Attachment

Implement connection settings, project picker, snapshot preview, attach/refresh/remove, and the public npm viewer on the agreed host surface.

Acceptance: actual FPVScores test event works without visitor TrackDraw authentication; private project lists remain private; expiry of the API key or TrackDraw downtime does not break an already attached course; failed refresh retains the prior snapshot.

### 5. RotorHazard Local And Cloud Adapter

Ship an offline-installable static viewer and assets in a supported plugin release. Implement both local course-file import and server-side API connection/project selection with explicit refresh. Both use the same validation, preview, and local attachment storage. They can be built in separate slices, but both are required to complete the RotorHazard integration.

Acceptance covers both routes:

- Local: with WAN access disabled from the start and no TrackDraw credentials or prior cloud sync, install the prepared plugin artifact, import a locally authored course file, and load both 2D and 3D from a second LAN device with an empty browser cache. Replace the course through another local file. No step makes external requests.
- Cloud: configure a key, select a project, preview/attach, and explicitly refresh it. Then disable WAN access and reload from an empty browser cache; the imported course remains fully available. Interrupted refresh, expired credentials, and invalid responses preserve the previous snapshot.
- Shared: reload and server restart preserve the attachment; invalid imports do not replace it. Switching between local and cloud sources works without requiring either source to be configured first.

## Remaining Decisions

The original version of this section listed four open items without saying who could close each one, or when, which made the whole set look like a single blocker on FPVScores alignment. Splitting them by what actually closes them showed that most were already answerable without a partner conversation: the license and RotorHazard-ownership items below are now decided, and the FPVScores item turned out to be a sequencing fact rather than a decision gate.

### Already decided by this research; do not re-open before a PVA

- **Manual snapshot refresh is the v1 event default.** This is stated consistently in [API And Host Adapter](#api-and-host-adapter) ("Use manual refresh for v1") and [Snapshot Lifecycle](#snapshot-lifecycle) ("Automatic refresh during a race is outside v1"). A PVA should record this as accepted scope, including archive/removal behavior as already specified in Snapshot Lifecycle, rather than list it as still open.
- **Single active course attachment per event, no live timing/pilot markers, no OAuth, no bidirectional editing in v1.** Stated in [Organizer And Visitor Flows](#organizer-and-visitor-flows) and [API And Host Adapter](#api-and-host-adapter). Treat as settled v1 scope, not a decision to revisit.
- **Viewer package license: Apache-2.0.** The repository is `AGPL-3.0-only` ([package.json](../../../package.json), [NOTICE.md](../../../NOTICE.md)); shipping `@trackdraw/viewer` under that same license would be a common adoption blocker for a partner like FPVScores, since bundling AGPL code into a proprietary frontend can force releasing that frontend's source. Decided: the extracted `@trackdraw/viewer` package ships under Apache-2.0 — its explicit patent grant and retaliation clause, and its NOTICE-file convention, fit a package handed to a commercial partner and match the NOTICE.md practice this repository already follows for AGPL. The editor and server stay AGPL-3.0-only; only the extracted viewer package changes license. Apply the Apache-2.0 text/NOTICE/headers to the package during Slice 1, before any npm publish.

### Owner decision needed before Slice 0; does not require FPVScores or RotorHazard input

- **Supported RotorHazard versions.** No fixed version needs to be picked now, and pinning one in this document would go stale. Adopt a policy instead: each plugin release targets the latest tagged stable RotorHazard release at build time, states its minimum supported version in the plugin's own metadata, and is re-verified against a current stable release before every plugin release — consistent with the existing note in [Host Evidence](#host-evidence) that RotorHazard's development documentation can differ from stable releases. This closes the "supported versions" question without partner input; it only needs restating in the PVA as an ongoing release practice, not a one-time answer.
- **RotorHazard plugin ownership: TrackDraw for now.** TrackDraw (Dutch Drone Squad) builds and maintains the plugin as the initial owner. Do not treat this as permanent: the owner has explicitly left open that maintenance could move to something internal within the RotorHazard project itself later. Keep the plugin's packaging, versioning policy, and code boundaries clean enough that ownership could transfer without a rewrite — do not couple plugin-side code to TrackDraw-only infrastructure or credentials beyond the documented API-key adapter.

### Resolved by executing Slice 1, not by deciding something now

- **Exact allowed display metadata and renderer capability/version policy.** [Viewer Snapshot And Assets](#viewer-snapshot-and-assets) already states the allowlist approach; the exact field list is a byproduct of building the extraction spike in [Concrete Delivery Slices → 1](#1-prove-viewer-extraction-and-snapshot-fidelity), since it depends on what the extracted renderer actually needs. Do not block PVA approval on picking this list in the abstract. Record it as a Slice 1 acceptance artifact instead: the spike's output should include the finalized allowlist and a compatibility/versioning rule for `required_viewer` capabilities.

### Sequenced after the npm package ships; not a TrackDraw decision gate

Building any specific host's attachment UI is that host's own work, done after `@trackdraw/viewer` exists as an npm package — not a precondition TrackDraw needs to negotiate first. TrackDraw's own working assumptions (secret storage, permission scoping, npm consumption are all feasible; attaching a private project is the track owner's deliberate choice, comparable to an existing share link) are sufficient to keep designing the shared viewer/snapshot/adapter boundary without waiting on a specific partner's confirmation of their internals. Whether any one named host's integration is ever completed depends on that host's own timeline, not on a TrackDraw decision, and does not block Slices 0–3 (through the DDS website attachment) or the RotorHazard local-import route.

Live timing, pilot markers, shared credentials between hosts, cross-platform event synchronization, multiple courses per event, and richer map assets remain separate follow-ups. Mark either integration delivered only after its own host acceptance; a shared viewer demo does not establish either deployment.
