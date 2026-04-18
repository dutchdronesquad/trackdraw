# Live Race Overlay PVA

Date: April 17, 2026

Status: proposed

## Decision Summary

Recommended decision:

- approve `Live race overlay` for implementation planning
- treat the first version as a TrackDraw-to-`rh-stream-overlays` integration, not a TrackDraw-owned overlay runtime
- model drone position as estimated route progress from timing events, not exact spatial tracking
- require real RotorHazard race data for the actual feature
- require explicit export/import contracts between TrackDraw and `rh-stream-overlays`
- require explicit timing-role mapping such as start/finish and split anchors before live RotorHazard integration

For the full product evaluation and rationale, see [docs/research/live-race-overlay-evaluation.md](../research/live-race-overlay-evaluation.md).

## Approval Recommendation

TrackDraw should approve this feature for build preparation if the team is comfortable with the following first-version shape:

- TrackDraw owns track preparation, route mapping, and export
- `rh-stream-overlays` owns OBS-facing overlay rendering
- 2D minimap only
- TrackDraw route used as the motion path
- explicit timing-role mapping for start/finish and split anchors
- RotorHazard-fed pilot markers with estimated movement between anchors
- a defined import contract that `rh-stream-overlays` can consume reliably

TrackDraw should not approve this feature yet if the team expects any of these to be part of v1:

- exact real-world drone positioning
- 3D live overlay
- full race control or timing management inside TrackDraw
- automatic timing-role mapping from obstacles without manual verification
- replay tooling or advanced broadcast packages

## Delivery Checklist

- [ ] Phase 0: lock the product model and truth boundaries
- [ ] Phase 1: define the TrackDraw export contract and `rh-stream-overlays` import contract
- [ ] Phase 2: add timing-role mapping in TrackDraw
- [ ] Phase 3: drive a minimap overlay in `rh-stream-overlays` from imported track data
- [ ] Phase 4: connect RotorHazard live race events and harden estimation behavior

## Go / No-Go Criteria

Go for implementation planning if:

- the team accepts that v1 shows estimated race position rather than exact location
- OBS overlay is the clear primary use case
- `rh-stream-overlays` is accepted as the preferred overlay runtime
- explicit timing-role mapping is considered acceptable race-day setup work
- the team is willing to define and maintain an export/import contract between repos

No-go or keep parked if:

- the team expects precise telemetry without additional positioning hardware
- the product wants a full timing dashboard rather than a focused overlay
- RotorHazard event access is too limited or unstable for practical race use
- the team is not willing to maintain mapping between track layout and timing points
- the cross-repo integration cost between TrackDraw and `rh-stream-overlays` is considered too high

## Codebase Anchor

### JSON Hardening Checklist

The following TrackDraw files are the primary places to review or adjust for the JSON-hardening work that enables this integration.

Export and serialization:

- [src/components/dialogs/ExportDialog.tsx](../../src/components/dialogs/ExportDialog.tsx)
  Change JSON export to write `serializeDesign(design)` rather than the raw editor object.
- [src/components/editor/EditorShell.tsx](../../src/components/editor/EditorShell.tsx)
  Update project-manager JSON export to use the same serialized path so all JSON downloads are consistent.
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
  Treat `serializeDesign()` as the canonical export shape and keep `parseDesign()` as the canonical import path.

Import and validation:

- [src/components/dialogs/ImportDialog.tsx](../../src/components/dialogs/ImportDialog.tsx)
  Replace the current ad hoc `data.shapes` gate with `parseDesign()` so import preview and actual import use the same validation rules.
- [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
  Confirm project-save APIs continue to accept the same normalized serialized form.
- [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)
  Confirm share-publish APIs continue to accept the same normalized serialized form.

Timing metadata and typing:

- [src/lib/types.ts](../../src/lib/types.ts)
  Decide whether timing metadata remains documented under `shape.meta` only or gets a more explicit typed helper shape.
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
  Add any normalization needed for timing metadata if TrackDraw starts persisting `meta.timing`.
- [src/lib/schema.d.ts](../../src/lib/schema.d.ts)
  Review whether the existing schema helpers need to recognize newer shape kinds and any timing metadata contract.

Primary route behavior:

- [src/store/selectors.ts](../../src/store/selectors.ts)
  Today `selectPrimaryPolyline()` falls back to the first polyline. Decide whether that remains acceptable for overlay export or whether TrackDraw needs an explicit active race route marker.
- [src/lib/track/polyline-derived.ts](../../src/lib/track/polyline-derived.ts)
  Reuse this layer for route length and progress calculations rather than duplicating geometry logic elsewhere.

Editor UX follow-up for timing roles:

- [src/components/inspector/views/single.tsx](../../src/components/inspector/views/single.tsx)
  Likely place for shape-level timing-role controls if timing starts attached to obstacles.
- [src/components/inspector/Inspector.tsx](../../src/components/inspector/Inspector.tsx)
  Likely integration point for exposing timing metadata editing without creating a separate editor mode immediately.

Recommended implementation order:

1. Standardize JSON export on `serializeDesign()`.
2. Standardize JSON import on `parseDesign()`.
3. Define and document `meta.timing`.
4. Decide how TrackDraw identifies the active race route.
5. Only then begin cross-repo import work in `rh-stream-overlays`.

## Phase Plan

### Top-Level Checklist

- [ ] Phase 0 complete: product boundaries and data truth are locked
- [ ] Phase 1 complete: export/import contract is defined
- [ ] Phase 2 complete: timing-role model and setup flow are defined in TrackDraw
- [ ] Phase 3 complete: `rh-stream-overlays` renders imported minimap data
- [ ] Phase 4 complete: RotorHazard live race data drives estimated position on the minimap

### Phase 0: Lock Product And Data Boundaries

Start state:

- live race overlay is still an idea
- timing precision expectations are not yet locked
- RotorHazard contract details are not yet formalized
- TrackDraw-to-`rh-stream-overlays` integration boundaries are not yet formalized

Work:

- define the exact meaning of `estimated position`
- define the first supported RotorHazard event contract
- decide where timing-role configuration belongs
- decide the export/import schema and ownership
- define unsupported states for v1

Done state:

- feature boundary is explicit
- no one expects exact telemetry from v1
- mapping, export, and overlay-runtime responsibilities are clear

### Phase 1: Define Export And Import Contract

Start state:

- no shared schema exists between TrackDraw and `rh-stream-overlays`
- import and export expectations are still implicit

Work:

- define the JSON package shape
- define how timing-point identifiers map to RotorHazard concepts
- define versioning and failure behavior for bad imports

Done state:

- both repos can target the same contract
- import/export work can proceed without ambiguity

### Phase 2: Add Timing Roles And Mapping In TrackDraw

Start state:

- the contract exists
- TrackDraw still lacks timing-role authoring support

Work:

- define timing-role data structures
- add validation for missing or conflicting anchors
- define or implement setup UX for assigning timing roles to route positions or marked obstacles

Done state:

- a track can be prepared for live race use
- timing points have an explicit place on the TrackDraw route

### Phase 3: Import And Render In `rh-stream-overlays`

Start state:

- TrackDraw can describe the course
- `rh-stream-overlays` does not yet render imported minimap data

Work:

- import TrackDraw packages
- render the minimap route and timing markers
- validate OBS browser-source behavior and transparency

Done state:

- the overlay runtime can display TrackDraw-authored course data
- the visual surface is validated separately from live race estimation

### Phase 4: Connect RotorHazard Live Data And Harden Estimation

Start state:

- imported minimap rendering works
- live position behavior is not yet connected or not yet robust

Work:

- connect RotorHazard live race data through the overlay/plugin stack
- improve movement estimation between split anchors
- add stale-state and disconnect handling
- refine label density, readability, and safe-area behavior for OBS
- validate the overlay with real or replayed race sessions

Done state:

- the overlay is stable enough for practical livestream use
- failure states are understandable instead of misleading

## Validation Expectations

Before TrackDraw treats this as implementation-ready, validate at least:

- export/import round-trip on at least one real TrackDraw course
- schema validation behavior for missing or bad timing markers
- track rendering readability at common stream resolutions
- multi-pilot visibility on crowded layouts
- race-state behavior under delayed, missing, or stale updates

Before TrackDraw treats this as release-ready, validate at least:

- one real or replayed RotorHazard-driven race session
- disconnect and reconnect handling
- end-of-heat behavior
- that existing editor, share, and export flows remain unaffected
