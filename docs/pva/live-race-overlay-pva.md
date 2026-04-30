# Live Race Overlay PVA

Date: April 17, 2026
Updated: April 30, 2026

Status: TrackDraw-side preparation complete; external overlay runtime work remains

## Decision Summary

Recommended decision:

- proceed with `Live race overlay` implementation on the overlay-runtime side
- treat the first version as a TrackDraw-to-`rh-stream-overlays` integration, not a TrackDraw-owned overlay runtime
- model drone position as estimated route progress from timing events, not exact spatial tracking
- require real RotorHazard race data for the actual feature
- use the TrackDraw REST API as the primary course-data contract between TrackDraw and `rh-stream-overlays`
- require explicit timing-role mapping such as start/finish and split anchors before live RotorHazard integration
- treat the remaining TrackDraw work as contract hardening, not a new product surface

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

- [x] Phase 0: lock the product model and truth boundaries
- [x] Phase 1: define the first TrackDraw REST overlay contract
- [x] Phase 2: add timing-role mapping in TrackDraw
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
- [src/lib/track/overlay-prep.ts](../../src/lib/track/overlay-prep.ts)
  Overlay readiness validation: detects missing route, multiple routes, missing start/finish, duplicate timing IDs, missing split IDs, and timing points that cannot be projected onto the route. The REST overlay response exposes this as `readiness`.

REST contract follow-up:

- [x] wire `overlay-prep.ts` validation output into the REST overlay response so consumers can inspect readiness without a separate call
- [ ] add minimap viewport or bounds hints for stable overlay framing
- [ ] confirm the timing identifier naming and semantics with the `rh-stream-overlays`/RotorHazard side
- [x] document a sample `trackdraw.overlay.v1` payload in this PVA once the consumer contract is confirmed
- [ ] add explicit active race route selection only if real projects need more than the current single-route preparation rule

Sample `trackdraw.overlay.v1` response body:

```json
{
  "data": {
    "type": "overlay_track",
    "schema": "trackdraw.overlay.v1",
    "source": { "type": "project", "id": "project_123" },
    "title": "Club race layout",
    "field": {
      "width": 60,
      "height": 40,
      "origin": "tl",
      "unit": "m"
    },
    "route": {
      "shape_id": "route_123",
      "closed": false,
      "length_m": 126.4,
      "waypoints": [
        { "x": 8, "y": 20, "z": 0 },
        { "x": 28, "y": 12, "z": 1.5 }
      ],
      "sampled_points": [
        { "x": 8, "y": 20 },
        { "x": 12.4, "y": 18.2 }
      ]
    },
    "route_status": "ready",
    "route_obstacles": [
      {
        "id": "gate_1",
        "kind": "gate",
        "name": "Gate 1",
        "x": 12,
        "y": 18,
        "rotation": 90,
        "route_number": 1,
        "route_position": {
          "distance_m": 14.2,
          "progress": 0.112,
          "x": 12.1,
          "y": 18.1,
          "offset_m": 0.2
        },
        "width": 3,
        "height": 1.8
      }
    ],
    "timing_markers": [
      {
        "shape_id": "gate_1",
        "role": "start_finish",
        "timing_id": null,
        "title": "Start / finish",
        "position": { "x": 12, "y": 18 },
        "route_position": {
          "distance_m": 14.2,
          "progress": 0.112,
          "x": 12.1,
          "y": 18.1,
          "offset_m": 0.2
        }
      }
    ],
    "readiness": {
      "status": "ready",
      "race_route_id": "route_123",
      "route_length_m": 126.4,
      "issues": [],
      "timing_points": [
        {
          "shape_id": "gate_1",
          "role": "start_finish",
          "timing_id": null,
          "title": "Start / finish",
          "path_distance_m": 0.2,
          "projected_point": { "x": 12.1, "y": 18.1 },
          "route_distance_m": 14.2,
          "route_progress": 0.112
        }
      ]
    },
    "updated_at": "2026-04-28T12:29:48.000Z"
  },
  "meta": { "api_version": "v1" }
}
```

Timing metadata and typing:

- [src/lib/track/timing.ts](../../src/lib/track/timing.ts)
  Owns the first timing marker model on gates through normalized `shape.meta.timing`.
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
  Normalizes timing metadata during design normalization.
- [src/components/inspector/views/single.tsx](../../src/components/inspector/views/single.tsx)
  Exposes start/finish and split assignment for timing-capable gates.

Primary route behavior:

- [src/store/selectors.ts](../../src/store/selectors.ts)
  Route-related behavior still generally falls back to the first usable polyline. The overlay preparation validator blocks multiple usable routes instead of silently choosing one.
- [src/lib/track/polyline-derived.ts](../../src/lib/track/polyline-derived.ts)
  Reuse this layer for route length and progress calculations rather than duplicating geometry logic elsewhere.

Recommended implementation order:

1. Confirm timing identifier semantics with the RotorHazard/plugin side.
2. Begin cross-repo consumption work in `rh-stream-overlays`.
3. Add viewport or bounds hints if `rh-stream-overlays` needs stable framing from the payload.
4. Return to explicit active route selection only if real multi-route courses make the single-route rule too limiting.

## Phase Plan

### Top-Level Checklist

- [x] Phase 0 complete: product boundaries and data truth are locked
- [x] Phase 1 complete: first REST overlay contract is defined and documented
- [x] Phase 2 complete: timing-role model and setup flow are defined in TrackDraw
- [ ] Phase 3 complete: `rh-stream-overlays` renders REST-backed minimap data
- [ ] Phase 4 complete: RotorHazard live race data drives estimated position on the minimap

### Phase 0: Lock Product And Data Boundaries

Start state:

- completed for TrackDraw-side planning
- RotorHazard event details remain an overlay-runtime/plugin concern

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

- first `trackdraw.overlay.v1` REST package exists
- route geometry, route status, numbered route obstacles, timing markers, and route positions are available through bearer-authenticated project reads

Work:

- define how timing-point identifiers map to RotorHazard concepts
- define consumer behavior for bad or incomplete overlay packages
- keep the response example aligned with OpenAPI as the plugin integration evolves

Done state:

- TrackDraw exposes a stable first contract
- remaining ambiguity is narrowed to consumer semantics and live event mapping

### Phase 2: Add Timing Roles And Mapping In TrackDraw

Start state:

- completed for the first TrackDraw-side slice
- timing metadata is stored on gate shapes through normalized `shape.meta.timing`
- timing markers are exposed in the editor inspector, Race Pack export, track package, and overlay package

Work:

- keep the setup UX focused on assigning timing roles to marked gates
- avoid expanding into a separate race setup mode until the overlay runtime proves what extra setup state is needed

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
