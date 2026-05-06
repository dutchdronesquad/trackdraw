# Live Race Overlay PVA

Date: April 17, 2026
Updated: May 3, 2026

Status: TrackDraw and first `rh-stream-overlays` map-overlay estimation slices complete; Phase 5 styling polish nearly complete, Phase 6 overview composition started

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
- 2D map overlay only
- no user-facing TrackDraw base URL setup in the plugin; the plugin uses the production TrackDraw API endpoint by default
- TrackDraw route used as the motion path
- explicit timing-role mapping for start/finish and split anchors
- project id and API key are the only required TrackDraw credentials/settings in RotorHazard
- v1 supports one active TrackDraw project per RotorHazard plugin instance
- cached course data can be prepared online and reused at offline race locations
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
- [x] Phase 3: drive a map overlay in `rh-stream-overlays` from REST track data
- [x] Phase 4: connect RotorHazard live race events and harden estimation behavior
- [ ] Phase 5: make the map overlay stream-worthy
- [ ] Phase 6: add overview composition from the shared renderer

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

The TrackDraw REST API is the only supported course-data contract for the live map-overlay integration. Do not use manual JSON export/import as the integration path for `rh-stream-overlays`.

Implemented REST contract:

- [src/app/api/v1/projects/[projectId]/overlay/route.ts](../../src/app/api/v1/projects/[projectId]/overlay/route.ts)
  Serves `GET /api/v1/projects/{projectId}/overlay` for account-owned projects through bearer API-key auth.
- [src/lib/server/api-projects.ts](../../src/lib/server/api-projects.ts)
  Builds the `trackdraw.overlay.v1` package with field dimensions, route geometry, route status, numbered route obstacles, timing markers, and route positions.
- [src/lib/api/openapi.ts](../../src/lib/api/openapi.ts)
  Documents the RotorHazard integration endpoint under the REST API docs.
- [src/lib/track/overlay-prep.ts](../../src/lib/track/overlay-prep.ts)
  Overlay readiness validation: detects missing or ambiguous route setup, missing start/finish, duplicate timing IDs, missing split IDs, and timing points that cannot be projected onto the route. The REST overlay response exposes this as `readiness`.

REST contract follow-up:

- [x] wire `overlay-prep.ts` validation output into the REST overlay response so consumers can inspect readiness without a separate call
- [x] keep viewport/bounds out of the v1 contract; the plugin should derive first-pass framing from `field`, `route.sampled_points`, `route_obstacles`, and `timing_markers`
- [x] confirm first RotorHazard split semantics: split records expose zero-based `split_id` values from secondary split timers
- [x] document a sample `trackdraw.overlay.v1` payload in this PVA once the consumer contract is confirmed
- [x] keep one race line per track as the supported model; do not add active route selection

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
    "duration_estimate": {
      "estimated_lap_ms": 12600,
      "route_length_m": 126.4,
      "assumed_speed_mps": 10,
      "source": "trackdraw_default",
      "confidence": "low"
    },
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
        "split_index": null,
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
          "split_index": null,
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
  A valid live overlay track has one race line. The overlay preparation validator blocks missing or ambiguous route setups instead of adding active-route selection.
- [src/lib/track/polyline-derived.ts](../../src/lib/track/polyline-derived.ts)
  Reuse this layer for route length and progress calculations rather than duplicating geometry logic elsewhere.

Recommended implementation order:

1. Begin cross-repo consumption work in `rh-stream-overlays`.
2. Use TrackDraw's route-ordered `split_index` values to map RotorHazard `split_id` values automatically; do not expose split mapping as a normal setup field.
3. Validate whether plugin-derived framing is stable on real courses before adding any TrackDraw viewport contract.

### `rh-stream-overlays` Code Review

Reviewed local clone of the `rh-stream-overlays` repository. Use repository-relative paths when carrying this analysis into issues, PRs, or implementation notes.

Current plugin shape:

- `custom_plugins/stream_overlays/__init__.py`
  Registers a Flask blueprint plus stream-page panels on RotorHazard startup. The existing OBS routes are `/stream/overlay/<name>/node/<node_id>`, `/stream/overlay/<name>/topbar`, `/stream/overlay/<name>/leaderboard/<class_id>/overall`, `/stream/overlay/<name>/leaderboard/<class_id>/class`, and `/stream/overlay/<name>/heat/upcoming`.
- `custom_plugins/stream_overlays/utils.py`
  Builds markdown links for the RotorHazard streams page. New map and overview links should be registered here so the feature appears with the existing OBS overlay links.
- `custom_plugins/stream_overlays/pages/stream/*`
  Uses RotorHazard's `layout-basic.html` with plugin-owned CSS and JS assets. Existing overlays are organized around named themes such as `DDS`, `LCDR`, and `APEX`; the map overlay should follow that model with shared logic and theme-specific presentation wrappers.
- `custom_plugins/stream_overlays/static/js/main/stream_topbar.js`
  Listens to `race_status`, `race_scheduled`, `leaderboard`, `prestage_ready`, `stage_ready`, and `stop_timer`.
- `custom_plugins/stream_overlays/static/js/overlay_node_shared.js`
  Listens to `current_heat`, `current_laps`, `race_status`, and `leaderboard`. It already reads lap snapshots and formats split data when present on lap records.
- `custom_plugins/stream_overlays/static/js/overlay_heat.js`
  Listens to `current_heat`, `heat_data`, `pilot_data`, `class_data`, `format_data`, and `frequency_data` for the upcoming-heat overlay.

Key findings:

- The plugin is currently browser-overlay first. It does not have a persistent server-side TrackDraw client, stored integration settings, or a custom Socket.IO publisher.
- Existing overlays rely on RotorHazard's built-in `data_dependencies` and browser Socket.IO events. A first live map overlay can reuse browser-side race messages before adding backend event aggregation.
- The plugin should not expose a user-facing TrackDraw base URL. Use `https://trackdraw.app` as the code-level default production origin and build the overlay endpoint path from the configured project id.
- TrackDraw API keys should not be embedded in an OBS/browser URL or client JavaScript. The plugin should fetch TrackDraw overlay packages server-side, cache the last valid package, and expose only a local read endpoint to the overlay page.
- Offline race-day use is a first-version requirement: the operator should be able to fetch and validate the TrackDraw package while online, then use the cached package at a venue without internet access.
- RotorHazard emits current lap snapshots through `current_laps`. Each lap can include a `splits` array with `split_id`, `split_time`, `split_raw`, and `split_speed`. The `split_id` is the zero-based secondary split timer index, not a TrackDraw identifier.
- RotorHazard does not emit a dedicated browser `split_pass` event in the reviewed flow. Split pass handling updates `current_laps` and emits `phonetic_split_call`, so the map overlay should detect split confirmations by diffing `current_laps` snapshots.
- RotorHazard's plugin API supports general settings through `rhapi.ui.register_panel`, `rhapi.fields.register_option`, `UIField`, and `UIFieldType`. Store operator-entered TrackDraw credentials in RotorHazard server config with a registered `persistent_section`, not in race/event options. Plugin-owned runtime cache can still use plugin state storage. The server runtime already uses `requests`, so a plugin-side TrackDraw fetch helper can use `requests.Session` with a short timeout.
- RotorHazard exposes lifecycle hooks such as `Evt.RACE_STAGE`, `Evt.RACE_START`, `Evt.RACE_STOP`, and `Evt.RACE_LAP_RECORDED` through `rhapi.events`, but the first map overlay does not need a backend publisher if it reuses existing browser Socket.IO messages.
- There is no map renderer or geometry utility in the plugin today. The lowest-risk renderer is plugin-local SVG: convert TrackDraw field coordinates to an SVG viewBox, draw `route.sampled_points`, draw `timing_markers`, and place pilot markers by route progress.
- The plugin already has multiple visual themes. The map data, geometry, and race-state code should be theme-neutral. Theme-specific work should live in templates/CSS wrappers, starting with DDS presentation and adding LCDR/APEX variants after the data and estimation model is stable.
- The first map overlay slice is a technical proof point, not yet a stream-worthy product surface. The feature should not be considered compelling until the map styling looks broadcast-grade and pilot positions communicate confidence clearly.
- Race track map overlays in motorsport and sim-racing products consistently use a small set of patterns worth copying: a thick route spline with contrast outline, sector/split ticks, start/finish emphasis, driver bubbles with labels, leader/current-driver rings, stale/off-track/incident styling, and configurable label density. Useful reference patterns include SDK Gaming's iRacing Track Map component, ATVO's track map widget, iRaceControl's track map behavior, and modern iRacing overlay projects such as irdashies.
- Pilot position must be treated as a learned estimate, not a real-time location feed. RotorHazard gives timing snapshots, lap updates, split data when configured, race state, heat/pilot/node data, and historical lap results. The map overlay should learn from that data and express confidence instead of pretending to know exact drone position.
- The hardest estimation gap is the first lap: before a pilot has completed a lap, the overlay has no pilot-specific lap duration. Use TrackDraw's `duration_estimate` overlay-package field as the first-lap baseline when available, then replace it with learned RotorHazard lap/split data as soon as real timing data exists.

Required `rh-stream-overlays` slices:

1. Add TrackDraw integration settings and server-side fetch.
   Store one active project id and bearer API key in RotorHazard plugin settings backed by persistent server config. Register those fields on a RotorHazard page that preserves `persistent_section` values; keep OBS overlay links on the streams page. Enable automatic sync by default: fetch and validate the package on RotorHazard startup and when the local package cache is missing or stale. Automatic sync failures should not spam RotorHazard alerts; expose structured readiness diagnostics in the local JSON payload and reserve notifications/alerts for explicit operator refresh actions. Readiness diagnostics must include a summary plus issue-level messages/details so setup blockers such as missing route, missing start/finish, duplicate timing IDs, or off-route timing points can be fixed without reading server logs. Do not ask the user for a TrackDraw base URL or split mapping. Fetch `GET /api/v1/projects/{projectId}/overlay` against the plugin's built-in `https://trackdraw.app` API origin with `requests.Session`, a short timeout, schema/readiness checks, and a durable last-good-ready cache. Do not pass the API key into templates.
2. Add local overlay-data endpoints.
   Add a plugin route such as `/stream/overlay/<name>/trackdraw/track.json` that returns the cached `trackdraw.overlay.v1` package and a setup-state payload when fetch, auth, schema, or readiness fails. If the system is offline but a ready cached package exists, return that package with stale/offline metadata instead of blocking the overlay.
3. Add OBS overlay routes and panel links.
   Add the `map` route under the existing `/stream/overlay/<name>/...` pattern, then expose it through `utils.py`. Keep `overview` as a follow-up after the map overlay.
4. Add a shared map renderer.
   Create plugin-local HTML/CSS/JS for route rendering, timing markers, safe-area padding, transparent background, disconnected/setup states, and resolution checks at 1920x1080 and 1280x720. Keep geometry and race-state modules shared across themes; keep colors, typography, marker styling, panel chrome, and spacing in theme CSS. The visual direction should follow race broadcast/sim-racing track maps rather than the TrackDraw editor UI: thick high-contrast route spline, outline stroke, start/finish badge, split ticks, gate/obstacle labels, pilot roundels, leader/current-pilot rings, and clear stale/low-confidence styling.
5. Add browser-side race state adapter.
   Reuse `race_status`, `current_heat`, `leaderboard`, and `current_laps` to build pilot state without requiring a custom backend publisher for v1. Track node, callsign, color, lap, last confirmed anchor, last update time, estimated progress, and confidence.
6. Add estimation and correction behavior.
   Start with start/finish-only lap anchors. Move markers between anchors using deterministic elapsed-time interpolation, then snap to confirmed anchors with a short visual fade when a lap or split update arrives. Do not animate corrections along route progress, because this can look like a false sprint over the track. Before a pilot has a completed lap, use a baseline predicted lap duration from TrackDraw's `duration_estimate`, class/heat median, or a conservative default. After real timing data exists, learn a per-pilot expected lap and sector duration from valid RotorHazard laps/splits. Stop advancing and fade markers when the confidence window expires.
7. Add split-anchor support through TrackDraw-provided split indexes.
   TrackDraw publishes zero-based `split_index` values on split timing points in route order. Map RotorHazard zero-based `split_id` values to those `split_index` values automatically. Do not make this a normal user-facing setup field; add an advanced override only if real timing hardware proves that split timer order can differ from route order.
8. Validate against real or replayed race data.
   Use at least one real TrackDraw course and one RotorHazard session before treating the overlay as production-ready.

TrackDraw follow-up after this review:

- Keep the current REST contract as the integration source of truth.
- Make the project id visible and easy to copy from TrackDraw for account-backed projects. Prefer the Projects dialog account-project surface over export or API-key management because the value belongs to project identity, not to a file export or key lifecycle.
- Do not add `bounds` or `viewport` hints for v1; revisit only if plugin-derived framing fails on real courses.
- Keep split mapping automatic in the plugin by default: RotorHazard `split_id` values map to TrackDraw's route-ordered `split_index` values.
- Do not add a TrackDraw-owned live overlay route unless the RotorHazard plugin path proves insufficient.

## Phase Plan

### Top-Level Checklist

- [x] Phase 0 complete: product boundaries and data truth are locked
- [x] Phase 1 complete: first REST overlay contract is defined and documented
- [x] Phase 2 complete: timing-role model and setup flow are defined in TrackDraw
- [x] Phase 3 complete: `rh-stream-overlays` renders REST-backed map data
- [x] Phase 4 complete: RotorHazard live race data drives estimated position on the map overlay
- [ ] Phase 5 complete: map overlay styling and confidence behavior are stream-worthy
- [ ] Phase 6 complete: overview uses the proven map renderer and race-state model

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
- `rh-stream-overlays` does not yet render TrackDraw REST map data

Work:

- add plugin-owned TrackDraw settings for one active project id and bearer API key
- map RotorHazard `split_id` values to TrackDraw-provided route-ordered `split_index` values; do not expose this as a normal setup field
- use `https://trackdraw.app` as the built-in production TrackDraw API origin in plugin code; do not expose base URL as a normal setup field
- allow a hidden dev/test origin override only through config or environment
- fetch the TrackDraw overlay package server-side, never from OBS/browser JavaScript with the bearer key
- cache the last valid ready `trackdraw.overlay.v1` package durably and expose it through a local plugin JSON route
- support offline race-day use from cached course data after an earlier successful online refresh
- render the map route and timing markers from `route.sampled_points` and `timing_markers`
- derive first-pass viewport framing from the TrackDraw field and sampled route; open a TrackDraw follow-up for `bounds`/`viewport` hints only if real-course validation proves the plugin cannot frame reliably
- render the first map as a functional skeleton, then explicitly harden it toward a motorsport broadcast map rather than treating the skeleton as final UI
- expose setup states for missing config, auth failure, network failure, blocked readiness, unsupported schema, and stale cached data
- validate OBS browser-source behavior, transparency, and safe-area framing

Done state:

- the overlay runtime can display TrackDraw-authored course data
- the visual surface is validated separately from live race estimation
- missing, invalid, or blocked packages produce a clear setup state instead of a broken overlay
- the team understands that this phase is still not the "wow" stream product; it is the data and rendering foundation for later polish

Recommended first visual surface:

- ship `map` first as a small transparent corner overlay that can be layered over existing scenes
- add `overview` only after the map renderer, setup states, and live estimation model are validated
- keep both variants on the same imported route renderer and theme tokens when `overview` is added

Broadcast map styling direction:

- draw the route as a thick high-contrast spline with a darker outside stroke and a lighter inside stroke
- keep the route itself calm: no direction chevrons and no colored center highlight unless real stream validation proves it helps
- mark start/finish with a chequered finish-line visual rather than text such as `S/F`
- draw split anchors as smaller sector/timing ticks at their authored gate position
- draw gates as compact broadcast markers, not numbered editor-style object labels
- render gate and timing-marker visuals at their authored shape position (`x/y` or `position`) while using `route_position.progress` only as the movement/timing anchor
- use pilot roundels with RH pilot color and short label text such as position, node number, initials, or callsign abbreviation
- use an accent ring for leader, selected/current pilot, or race focus
- use opacity, dashed halos, or pulsing rings to communicate stale or low-confidence estimates
- keep theme-specific color, typography, and chrome in theme CSS, but keep geometry, label placement, collision avoidance, and marker logic shared
- avoid one-off decorative styling that looks like the TrackDraw editor; the viewer should read this as a race broadcast element

Visual references to learn from:

- SDK Gaming Track Map component: driver labels on a live track map with options for position, car number, initials, or short name
- ATVO/iRacing track map: configurable spline style, sector lines, and driver templates
- iRaceControl track map: leader ring, incident/off-track highlighting, fallback behavior, and animated car markers
- modern iRacing overlay projects such as irdashies: route outline, configurable driver circles, labels, and visibility controls

Phase 3 implementation checklist:

- [x] Add TrackDraw config storage for one active project id and API key through RotorHazard persistent plugin settings; enable automatic package sync by default and do not expose base URL as a normal setup field.
- [x] Add a copyable project id surface in TrackDraw for account-backed projects.
- [x] Add a safe server-side fetch helper using `requests.Session` and the plugin's built-in `https://trackdraw.app` API origin.
- [x] Use TrackDraw-provided zero-based `split_index` values for RotorHazard `split_id` mapping.
- [x] Add durable last-good-ready overlay-package caching for offline venue use.
- [x] Add local cached overlay-package JSON endpoint without exposing the TrackDraw bearer key.
- [x] Include structured readiness diagnostics in the local JSON endpoint and overlay setup state.
- [ ] Show cache status in plugin setup: never fetched, fresh, stale/offline, blocked, or auth failed.
- [x] Treat cache as fresh for 24 hours after successful refresh; after that, keep it usable as stale/offline if it was last-good-ready.
- [x] Keep stale/offline cached course data usable even if the API key later expires; require a valid key only for refresh.
- [x] Register the `map` link on the RotorHazard streams page; defer `overview` until the map overlay is proven.
- [x] Add shared SVG route renderer, timing marker renderer, setup-state renderer, and theme-aware OBS-safe CSS.
- [x] Keep the first DDS map overlay theme as the reference implementation without hardcoding DDS assumptions into shared data or race-state modules.
- [x] Add broadcast-style route outline/inner stroke, start-finish badge, split ticks, gate labels, and pilot roundel primitives.
- [x] Add low-confidence/stale marker styling so estimated positions never look more exact than the data supports.
- [ ] Validate one real TrackDraw REST payload and one blocked-readiness payload.

### Phase 4: Connect RotorHazard Live Data And Harden Estimation

Start state:

- REST-backed map rendering works
- live position behavior is not yet connected or not yet robust
- the first rendered map may look technically correct but still not exciting enough for a stream

Work:

- add a browser-side race adapter that listens to the same RotorHazard Socket.IO path the existing overlays already use
- map RotorHazard pilot/node data into a small overlay state: pilot id, node, callsign, color, lap, last timing anchor, last event time, estimated route progress, and confidence
- start with start/finish lap events as the reliable v1 signal
- enable split anchors through TrackDraw-provided route-order `split_index` mapping
- detect split confirmations by diffing updated `current_laps` snapshots because RotorHazard updates split state through current laps rather than a dedicated browser split event
- estimate movement between confirmed anchors with deterministic interpolation plus a learned expected duration per pilot/sector
- snap pilot dots to confirmed anchors when new timing events arrive and use a short fade to make corrections readable without fake route movement
- add stale-state and disconnect handling
- refine label density, readability, and safe-area behavior for OBS
- validate the overlay with real or replayed race sessions

Done state:

- the overlay is stable enough for practical livestream use
- failure states are understandable instead of misleading
- the UI clearly communicates estimated route progress rather than exact drone location
- first-lap, no-split, split-timer, stale, and reconnect behavior are explicitly defined and tested

Recommended v1 behavior:

- before race start: show the imported track and pilot lineup, no moving dots
- blocked readiness or missing TrackDraw config: show a setup state and do not animate pilot dots
- race start: place all active pilots at the start/finish anchor but keep them frozen until RotorHazard confirms the holeshot/first crossing
- lap recorded from `current_laps`: confirm a pilot at start/finish and advance lap/progress state
- split recorded from `current_laps`: confirm a pilot at the TrackDraw split anchor whose `split_index` matches that split's RotorHazard `split_id`
- stale pilot: continue interpolation only inside a short confidence window, then fade the dot and stop advancing
- race finish/stop: freeze final positions and keep the result panel readable for OBS

Pilot position estimation model:

- Treat every timing signal as an anchor confirmation, not as continuous telemetry.
- Anchor model:
  - start/race stage places active pilots at the TrackDraw start/finish route progress, not at a hardcoded route progress `0`
  - lap confirmation places a pilot at start/finish and closes the previous lap
  - split confirmation places a pilot at the TrackDraw timing marker whose `split_index` matches RotorHazard `split_id`
  - race stop freezes current positions and marks them no longer live
- Full-lap interpolation without split timers:
  - estimate route progress from elapsed time since last start/finish confirmation divided by expected full-lap duration
  - do not loop through start/finish without a real lap confirmation
  - when a real lap confirmation arrives while the marker is already just past start/finish, preserve that visual rollover instead of visibly resetting the marker onto the gate
  - ignore RotorHazard laps marked `deleted: true`; do not use invalid/min-lap/overtime crossings for motion or pace learning
  - continue accepting later valid laps after a stale period or battery swap so a pilot can rejoin the visual flow
  - fade or freeze when expected completion time is exceeded by the confidence window
- Sector interpolation with split timers:
  - estimate progress only inside the current segment between confirmed anchors
  - learn expected sector duration from previous split-to-split or split-to-finish observations
  - fall back to proportional route distance or equal sector duration until sector data exists
  - keep a stable segment key such as start/finish-to-split, split-to-split, or split-to-start/finish so learned sector timing does not bleed into the wrong part of the route
  - clamp interpolation at the next unconfirmed anchor; the marker must wait there instead of predicting through an unconfirmed split
  - ignore tiny anchor corrections visually so split updates do not create constant flicker or micro-jumps
- Correction behavior:
  - timing corrections snap to the confirmed anchor and briefly fade the marker back in
  - do not interpolate correction movement along route progress, especially back to start/finish
  - only show the correction fade when the confirmed anchor differs from the predicted position by a visible threshold
  - start/finish lap rollover should update timing and pace without a visible reset when the estimate is already close enough to the gate
  - large impossible jumps snap only when a real timing event arrives or the race resets
  - never advance a marker past the next unconfirmed anchor
- Confidence model:
  - high confidence immediately after a confirmed anchor
  - medium confidence during normal interpolation before expected next anchor
  - low confidence on first lap, after stale threshold, after reconnect, or when using default pace
  - no confidence when config/readiness is blocked, race is stopped, or pilot/node mapping is missing

Recommended first estimation defaults:

- use the last completed valid lap time per pilot as the preferred expected full-lap duration once available
- use a smoothed per-pilot pace such as an exponentially weighted moving average over recent valid laps rather than only the latest lap
- when `current_laps` delivers multiple newly observed valid laps at once, feed all of them into pace learning before anchoring visually to the latest lap
- exclude invalid/min-lap/obvious outlier laps from pace learning
- use class/heat median pace when the pilot has no valid completed lap but other pilots do
- use TrackDraw's `duration_estimate` overlay-package field as the first-lap baseline when available
- fall back to a conservative configurable default lap duration before any learned or calculated pace exists
- for split sectors, use the last observed sector duration when available, otherwise derive sector duration from route-distance share or divide expected lap duration by configured anchor sectors
- mark a pilot as stale when no confirming lap or split update arrives within 5 seconds after the expected next anchor time
- freeze stale markers instead of looping them through unconfirmed anchors

First-lap behavior:

- Before the first confirmed crossing, place pilots at start/finish and do not animate them from the heat-start event alone.
- After the first holeshot/current-lap entry, animate the first lap from a baseline expected lap duration.
- Mark first-lap markers as low confidence until a split or lap confirmation arrives.
- If a split timer exists, the first split confirmation immediately recalibrates that pilot's sector pace.
- If no split timer exists, the first full lap confirmation becomes the first reliable per-pilot pace sample.
- TrackDraw's route-duration estimate should feed this baseline so the first lap feels plausible instead of arbitrary.

Data learning priorities:

- Prefer real current-session data over historical or calculated data.
- Learn per pilot first, then per class/heat, then route/default.
- Keep a small rolling window or EWMA so one bad lap does not wreck the estimate.
- Persisting learned pace across sessions is optional and should only happen after real race validation proves it improves first-lap behavior.
- Surface confidence visually so viewers can understand uncertainty without reading logs or configuration.

Phase 4 implementation checklist:

- [x] Build pilot state from `current_heat`, `leaderboard`, `current_laps`, and `race_status`.
- [x] Detect new start/finish confirmations from changed lap snapshots per node.
- [ ] Build a `PilotPositionEstimator` module with anchor state, expected duration, confidence, correction, stale, and freeze behavior.
- [x] Interpolate route progress from the last confirmed anchor using a learned expected lap/sector duration.
- [x] Add first-lap baseline support in `rh-stream-overlays` from TrackDraw's `duration_estimate`, class/heat median pace, or a conservative default.
- [x] Exclude invalid/min-lap/outlier laps from learned pace.
- [x] Stop or fade movement when data is stale, the socket disconnects, or the race stops.
- [x] Detect new split confirmations from changed `current_laps.node_index[*].laps[*].splits[*]` entries and map `split_id` to TrackDraw `split_index`.
- [x] Add split anti-jitter behavior with per-segment timing, anchor clamping, and a visible correction threshold.
- [x] Validate with a real or replayed RotorHazard heat, including race start, lap updates, finish/stop, and reconnect.

### Phase 5: Make The Minimap Stream-Worthy

Start state:

- route rendering works
- live estimation works well enough to evaluate
- the feature may still look like a technical overlay rather than something that sells the stream

Work:

- redesign the map overlay presentation around motorsport broadcast and sim-racing map conventions
- tune route thickness, outline, marker size, label density, contrast, transparency, and safe-area position for real OBS scenes
- add label collision avoidance or label thinning for crowded tracks
- add pilot marker states for leader, selected/focused pilot, low confidence, stale, disconnected, and finished
- add theme variants for DDS first, then LCDR/APEX once the shared renderer is stable
- consider optional map modes only after the core corner map overlay is good: compact, expanded, overview, and focus-on-leader
- validate the visual result against real stream compositions, not only isolated browser screenshots

Done state:

- the map overlay looks like a deliberate race broadcast element
- pilot uncertainty is visible without making the overlay feel broken
- the team can honestly say the overlay is compelling enough to use in a livestream

Phase 5 implementation checklist:

- [x] Define a shared broadcast map visual language: route outline, route fill, split ticks, start/finish badge, marker labels, and stale/confidence states.
- [x] Tune DDS theme as the reference visual implementation.
- [x] Replace editor-like gate numbers with cleaner broadcast-style track markers.
- [x] Upgrade the route styling with layered shadow, casing, and a clean inner stroke.
- [x] Replace editor-style gate labels with compact broadcast gate markers.
- [x] Replace split labels/dots with cleaner race-map sector ticks.
- [x] Remove route direction chevrons and colored center highlights for a calmer race-map read.
- [x] Replace large pilot dots with smaller direction-aware pilot arrows.
- [x] Snap pilot corrections to confirmed anchors with a short fade instead of sprinting along the route.
- [x] Keep pilot labels consistent as callsign abbreviations before and during the race.
- [x] Add broadcast-style pilot labels with callsign, optional position chip, color accent, and connector.
- [x] Replace dynamic label collision slots with stable per-node label offsets.
- [x] Keep pilot label offsets near the direction arrow with enough spacing to avoid crowding the marker.
- [x] Use equal-radius pilot label placement and contrast-aware position chip text for pilot colors.
- [x] Use the same grey key background pattern as other stream overlays for OBS filtering.
- [x] Suppress generic RotorHazard alert/message overlays on the map overlay surface.
- [x] Keep the map overlay animation loop suitable for 60 fps OBS browser sources by limiting per-frame DOM work to marker position/rotation and caching label layout updates.
- [x] Add first-pass label offset behavior for crowded pilot markers.
- [x] Add responsive compact/tiny label-density behavior for smaller OBS browser sources.
- [x] Add responsive bounds/safe-area checks for 1920x1080 and 1280x720 OBS browser sources.
- [x] Add packed-grid label thinning for 7-8 pilots while keeping all pilot arrows visible.
- [ ] Validate readability over bright, dark, and busy race footage backgrounds.
- [ ] Validate crowded pilot-marker behavior with at least 4-8 pilots.
- [ ] Validate 60 fps OBS browser-source smoothness with 4-8 active pilots.
- [x] Add LCDR/APEX theme variants after DDS shared primitives are stable.
- [x] Decide whether `overview` should be built from the same renderer after the map overlay has proven value.

Phase 5 `overview` decision:

- Build `overview` from the same TrackDraw route renderer, theme tokens, timing marker renderer, pilot marker primitives, confidence states, and race-state adapter.
- Give `overview` a separate template/layout only for composition: larger framing, optional leaderboard/result side panels, and different label-density defaults.
- Do not fork geometry, split mapping, pace learning, stale handling, or theme primitives for `overview`; validate the map overlay first and then reuse the proven core.

### Phase 6: Add Overview Composition

Start state:

- the map renderer is visually credible enough to reuse
- TrackDraw package loading, readiness diagnostics, timing markers, and pilot estimation are already shared and stable
- overview is not a new geometry or timing implementation; it is a larger OBS composition built from the same core

Work:

- add an `overview` overlay route under the existing `/stream/overlay/<name>/...` pattern
- register the overview link on the RotorHazard streams page after the map overlay has proven value
- keep overview-specific composition code in separate template/CSS/JS files while the overview reuses the shared TrackDraw route renderer, pilot renderer, timing marker renderer, setup messaging, JSON cache, and theme tokens
- create an overview template/layout that can show the map larger than the corner map overlay, with room for race title/status, leader/focus information, and optional leaderboard/result panels
- define layout modes for common OBS uses: full-screen overview, side-panel overview, and break/intermission scene
- keep visual density different from the map overlay: more labels may be visible, but the same pilot marker rules and contrast logic should apply
- keep offline/stale/readiness states identical to the map overlay so operators do not have two different failure models
- suppress generic RotorHazard alert/message overlays in both map overlay and overview; only TrackDraw setup/readiness states should appear inside these map surfaces
- validate against real or replayed RotorHazard race sessions before treating the overview as stream-ready

Done state:

- overview is available as its own OBS browser-source route
- overview reuses the map renderer/race-state core instead of duplicating movement logic
- the overview can be used as a deliberate broadcast scene, not only as an enlarged map overlay
- map overlay behavior remains unchanged after overview extraction/reuse

Phase 6 implementation checklist:

- [x] Keep overview-specific composition code separate from the shared map renderer.
- [x] Add an `overview` Flask route and template using the same cached `trackdraw.overlay.v1` JSON endpoint.
- [x] Add an overview link to the RotorHazard streams page.
- [x] Reuse the same route renderer, gate/timing marker renderer, pilot marker renderer, label logic, contrast handling, confidence states, and setup-state renderer for the map surface.
- [x] Add first-pass overview-specific layout CSS using the existing theme tokens.
- [x] Add first-pass overview states for setup blocked, stale/offline cache, disconnected socket, race idle, race live, and race ended.
- [x] Ensure generic RotorHazard alerts such as next-race countdowns do not render over the map/overview surfaces.
- [x] Decide which optional panels are in v1: race status, leader/focus strip, and compact leaderboard.
- [ ] Validate full-screen and side-panel OBS compositions at 1920x1080 and 1280x720.
- [ ] Validate 4-8 pilot readability with real or replayed race data.
- [ ] Confirm map route still behaves the same after overview composition was added.

## Validation Expectations

Before the overlay-runtime work is implementation-ready, validate at least:

- REST overlay package output on at least one real TrackDraw course
- schema validation behavior for missing or bad timing markers
- track rendering readability at common stream resolutions
- readiness diagnostics in the overlay setup state and manual refresh notifications
- multi-pilot visibility on crowded layouts
- race-state behavior under delayed, missing, or stale updates

Before the live overview is release-ready, validate at least:

- one real or replayed RotorHazard-driven race session
- disconnect and reconnect handling
- end-of-heat behavior
- first-lap behavior before any pilot-specific pace exists
- no-split-timer behavior on start/finish-only data
- split-timer behavior using TrackDraw `split_index` anchors
- confidence/stale styling under delayed or missing timing updates
- that existing editor and share flows remain unaffected
