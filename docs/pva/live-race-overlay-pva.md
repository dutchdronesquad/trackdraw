# Live Race Overlay PVA

Date: April 17, 2026
Updated: April 28, 2026

Status: TrackDraw-side preparation complete; external overlay runtime work remains

## Decision Summary

Recommended decision:

- proceed with `Live race overlay` implementation on the overlay-runtime side
- treat the first version as a TrackDraw-to-`rh-stream-overlays` integration, not a TrackDraw-owned overlay runtime
- model drone position as estimated route progress from timing events, not exact spatial tracking
- require real RotorHazard race data for the actual feature
- use the TrackDraw REST API as the primary course-data contract between TrackDraw and `rh-stream-overlays`
- require explicit timing-role mapping such as start/finish and split anchors before live RotorHazard integration

For the full product evaluation and rationale, see [docs/research/live-race-overlay-evaluation.md](../research/live-race-overlay-evaluation.md).

## Approval Recommendation

TrackDraw should approve this feature for build preparation if the team is comfortable with the following first-version shape:

- TrackDraw owns track preparation, route mapping, and the REST course-data endpoint
- `rh-stream-overlays` owns OBS-facing overlay rendering
- 2D minimap only
- TrackDraw route used as the motion path
- explicit timing-role mapping for start/finish and split anchors
- RotorHazard-fed pilot markers with estimated movement between anchors
- a defined REST contract that `rh-stream-overlays` can consume reliably

TrackDraw should not approve this feature yet if the team expects any of these to be part of v1:

- exact real-world drone positioning
- 3D live overlay
- full race control or timing management inside TrackDraw
- automatic timing-role mapping from obstacles without manual verification
- replay tooling or advanced broadcast packages

## Delivery Checklist

- [ ] Phase 0: lock the product model and truth boundaries
- [ ] Phase 1: define and harden the TrackDraw REST overlay contract
- [ ] Phase 2: add timing-role mapping in TrackDraw
- [ ] Phase 3: drive a minimap overlay in `rh-stream-overlays` from REST track data
- [ ] Phase 4: connect RotorHazard live race events and harden estimation behavior

## Go / No-Go Criteria

Go for implementation planning if:

- the team accepts that v1 shows estimated race position rather than exact location
- OBS overlay is the clear primary use case
- `rh-stream-overlays` is accepted as the preferred overlay runtime
- explicit timing-role mapping is considered acceptable race-day setup work
- the team is willing to define and maintain a REST contract between repos

No-go or keep parked if:

- the team expects precise telemetry without additional positioning hardware
- the product wants a full timing dashboard rather than a focused overlay
- RotorHazard event access is too limited or unstable for practical race use
- the team is not willing to maintain mapping between track layout and timing points
- the cross-repo integration cost between TrackDraw and `rh-stream-overlays` is considered too high

## Codebase Anchor

### REST Overlay Contract Checklist

The TrackDraw REST API is the only supported course-data contract for the live minimap integration. Do not use manual JSON export/import as the integration path for `rh-stream-overlays`.

Implemented REST contract:

- [src/app/api/v1/projects/[projectId]/overlay/route.ts](../../src/app/api/v1/projects/[projectId]/overlay/route.ts)
  Serves `GET /api/v1/projects/{projectId}/overlay` for account-owned projects through bearer API-key auth.
- [src/lib/server/api-projects.ts](../../src/lib/server/api-projects.ts)
  Builds the `trackdraw.overlay.v1` package with field dimensions, route geometry, route status, numbered route obstacles, timing markers, and route positions.
- [src/lib/api/openapi.ts](../../src/lib/api/openapi.ts)
  Documents the RotorHazard integration endpoint under the REST API docs.

REST contract follow-up:

- [ ] add explicit active race route selection instead of relying on the first valid polyline
- [ ] add overlay validation output for missing route, duplicate timing roles, missing split identifiers, and timing markers that cannot be mapped onto route progress
- [ ] add minimap viewport or bounds hints for stable overlay framing
- [ ] confirm the timing identifier naming and semantics with the `rh-stream-overlays`/RotorHazard side
- [ ] document a sample `trackdraw.overlay.v1` payload in this PVA once the consumer contract is confirmed

Timing metadata and typing:

- [src/lib/types.ts](../../src/lib/types.ts)
  Decide whether timing metadata remains documented under `shape.meta` only or gets a more explicit typed helper shape.
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
  Add any normalization needed for timing metadata if TrackDraw starts persisting `meta.timing`.
- [src/lib/schema.d.ts](../../src/lib/schema.d.ts)
  Review whether the existing schema helpers need to recognize newer shape kinds and any timing metadata contract.

Primary route behavior:

- [src/store/selectors.ts](../../src/store/selectors.ts)
  Today route-related behavior falls back to the first polyline. Decide where TrackDraw stores an explicit active race route marker.
- [src/lib/track/polyline-derived.ts](../../src/lib/track/polyline-derived.ts)
  Reuse this layer for route length and progress calculations rather than duplicating geometry logic elsewhere.

Editor UX follow-up for timing roles:

- [src/components/inspector/views/single.tsx](../../src/components/inspector/views/single.tsx)
  Likely place for shape-level timing-role controls if timing starts attached to obstacles.
- [src/components/inspector/Inspector.tsx](../../src/components/inspector/Inspector.tsx)
  Likely integration point for exposing timing metadata editing without creating a separate editor mode immediately.

Recommended implementation order:

1. Treat `/api/v1/projects/{projectId}/overlay` as the primary TrackDraw course-data contract.
2. Confirm the `trackdraw.overlay.v1` payload with `rh-stream-overlays`.
3. Add validation output for route and timing readiness.
4. Add explicit active race route selection.
5. Begin cross-repo consumption work in `rh-stream-overlays`.

## Phase Plan

### Top-Level Checklist

- [ ] Phase 0 complete: product boundaries and data truth are locked
- [ ] Phase 1 complete: REST overlay contract is defined and documented
- [ ] Phase 2 complete: timing-role model and setup flow are defined in TrackDraw
- [ ] Phase 3 complete: `rh-stream-overlays` renders REST-backed minimap data
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
- decide the REST overlay schema and ownership
- define unsupported states for v1

Done state:

- feature boundary is explicit
- no one expects exact telemetry from v1
- mapping, REST data, and overlay-runtime responsibilities are clear

### Phase 1: Define REST Overlay Contract

Start state:

- no shared schema exists between TrackDraw and `rh-stream-overlays`
- REST consumption expectations are still implicit

Work:

- define the `trackdraw.overlay.v1` package shape
- define how timing-point identifiers map to RotorHazard concepts
- define versioning and failure behavior for bad or incomplete overlay packages
- document the endpoint, response example, and validation semantics in OpenAPI and this PVA

Done state:

- both repos can target the same contract
- REST consumption work can proceed without ambiguity

### Phase 2: Add Timing Roles And Mapping In TrackDraw

Start state:

- TrackDraw has a first `trackdraw.overlay.v1` contract builder
- TrackDraw has basic timing-role authoring support, but the overlay runtime import path is not finalized

Work:

- keep timing-role data structures normalized under `shape.meta.timing`
- reuse overlay-preparation validation for missing or conflicting anchors
- keep setup UX focused on assigning timing roles to marked obstacles unless multi-route support creates a need for explicit route selection

Done state:

- a track can be prepared for live race use
- timing points have an explicit place on the TrackDraw route

### Phase 3: Consume And Render In `rh-stream-overlays`

Start state:

- TrackDraw can describe the course
- `rh-stream-overlays` does not yet render TrackDraw REST minimap data

Work:

- consume TrackDraw overlay packages
- render the minimap route and timing markers
- validate OBS browser-source behavior and transparency

Done state:

- the overlay runtime can display TrackDraw-authored course data
- the visual surface is validated separately from live race estimation
- missing, invalid, or blocked packages produce a clear setup state instead of a broken overlay

Recommended first visual surface:

- `race-overview`: full-scene overview with minimap plus compact race panel
- `minimap`: small transparent corner overlay that can be layered over existing scenes
- both variants reuse the same imported route renderer and theme tokens

### Phase 4: Connect RotorHazard Live Data And Harden Estimation

Start state:

- REST-backed minimap rendering works
- live position behavior is not yet connected or not yet robust

Work:

- add a race adapter that listens to RotorHazard race lifecycle and lap events
- map RotorHazard pilot/node data into a small overlay state: pilot id, node, callsign, color, lap, last timing anchor, last event time, estimated route progress, and confidence
- start with start/finish lap events as the reliable v1 signal
- enable split anchors only when RotorHazard event data or plugin configuration can map a source timing event to a TrackDraw `timingId`
- broadcast overlay state through the existing Socket.IO-driven overlay update path
- estimate movement between confirmed anchors with simple deterministic interpolation
- snap/correct pilot dots to confirmed anchors when new timing events arrive
- add stale-state and disconnect handling
- refine label density, readability, and safe-area behavior for OBS
- validate the overlay with real or replayed race sessions

Done state:

- the overlay is stable enough for practical livestream use
- failure states are understandable instead of misleading
- the UI clearly communicates estimated route progress rather than exact drone location

Recommended v1 behavior:

- before race start: show the imported track and pilot lineup, no moving dots
- race start: place all active pilots at the start/finish anchor
- lap recorded: confirm a pilot at start/finish and advance lap/progress state
- split recorded, if supported: confirm a pilot at the matching split anchor
- stale pilot: fade or pulse the dot and stop advancing once the confidence window expires
- race finish/stop: freeze final positions and keep the result panel readable for OBS

## Validation Expectations

Before the overlay-runtime work is implementation-ready, validate at least:

- REST overlay package output on at least one real TrackDraw course
- schema validation behavior for missing or bad timing markers
- track rendering readability at common stream resolutions
- multi-pilot visibility on crowded layouts
- race-state behavior under delayed, missing, or stale updates

Before the live race overview is release-ready, validate at least:

- one real or replayed RotorHazard-driven race session
- disconnect and reconnect handling
- end-of-heat behavior
- that existing editor and share flows remain unaffected
