# Live Race Overlay PVA

Date: April 17, 2026
Updated: May 1, 2026

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
  Builds markdown links for the RotorHazard streams page. New minimap and race-overview links should be registered here so the feature appears with the existing OBS overlay links.
- `custom_plugins/stream_overlays/pages/stream/*`
  Uses RotorHazard's `layout-basic.html` with plugin-owned CSS and JS assets. Existing overlays are organized around named themes such as `DDS`, `LCDR`, and `APEX`; the minimap should follow that model with shared logic and theme-specific presentation wrappers.
- `custom_plugins/stream_overlays/static/js/main/stream_topbar.js`
  Listens to `race_status`, `race_scheduled`, `leaderboard`, `prestage_ready`, `stage_ready`, and `stop_timer`.
- `custom_plugins/stream_overlays/static/js/overlay_node_shared.js`
  Listens to `current_heat`, `current_laps`, `race_status`, and `leaderboard`. It already reads lap snapshots and formats split data when present on lap records.
- `custom_plugins/stream_overlays/static/js/overlay_heat.js`
  Listens to `current_heat`, `heat_data`, `pilot_data`, `class_data`, `format_data`, and `frequency_data` for the upcoming-heat overlay.

Key findings:

- The plugin is currently browser-overlay first. It does not have a persistent server-side TrackDraw client, stored integration settings, or a custom Socket.IO publisher.
- Existing overlays rely on RotorHazard's built-in `data_dependencies` and browser Socket.IO events. A first live minimap can reuse browser-side race messages before adding backend event aggregation.
- The plugin should not expose a user-facing TrackDraw base URL. Use `https://trackdraw.app` as the code-level default production origin and build the overlay endpoint path from the configured project id.
- TrackDraw API keys should not be embedded in an OBS/browser URL or client JavaScript. The plugin should fetch TrackDraw overlay packages server-side, cache the last valid package, and expose only a local read endpoint to the overlay page.
- Offline race-day use is a first-version requirement: the operator should be able to fetch and validate the TrackDraw package while online, then use the cached package at a venue without internet access.
- RotorHazard emits current lap snapshots through `current_laps`. Each lap can include a `splits` array with `split_id`, `split_time`, `split_raw`, and `split_speed`. The `split_id` is the zero-based secondary split timer index, not a TrackDraw identifier.
- RotorHazard does not emit a dedicated browser `split_pass` event in the reviewed flow. Split pass handling updates `current_laps` and emits `phonetic_split_call`, so the minimap should detect split confirmations by diffing `current_laps` snapshots.
- RotorHazard's plugin API supports general settings through `rhapi.ui.register_panel`, `rhapi.fields.register_option`, `UIField`, `UIFieldType`, `rhapi.db.option`, and `rhapi.db.option_set`. The server runtime already uses `requests`, so a plugin-side TrackDraw fetch helper can use `requests.Session` with a short timeout.
- RotorHazard exposes lifecycle hooks such as `Evt.RACE_STAGE`, `Evt.RACE_START`, `Evt.RACE_STOP`, and `Evt.RACE_LAP_RECORDED` through `rhapi.events`, but the first minimap does not need a backend publisher if it reuses existing browser Socket.IO messages.
- There is no minimap renderer or geometry utility in the plugin today. The lowest-risk renderer is plugin-local SVG: convert TrackDraw field coordinates to an SVG viewBox, draw `route.sampled_points`, draw `timing_markers`, and place pilot markers by route progress.
- The plugin already has multiple visual themes. The minimap data, geometry, and race-state code should be theme-neutral. Theme-specific work should live in templates/CSS wrappers, starting with DDS presentation and adding LCDR/APEX variants after the data and estimation model is stable.

Required `rh-stream-overlays` slices:

1. Add TrackDraw integration settings and server-side fetch.
   Store one active project id and bearer API key in RotorHazard plugin settings. Do not ask the user for a TrackDraw base URL or split mapping. Fetch `GET /api/v1/projects/{projectId}/overlay` against the plugin's built-in `https://trackdraw.app` API origin with `requests.Session`, a short timeout, schema/readiness checks, and a durable last-good-ready cache. Do not pass the API key into templates.
2. Add local overlay-data endpoints.
   Add a plugin route such as `/stream/overlay/<name>/trackdraw/track.json` that returns the cached `trackdraw.overlay.v1` package and a setup-state payload when fetch, auth, schema, or readiness fails. If the system is offline but a ready cached package exists, return that package with stale/offline metadata instead of blocking the overlay.
3. Add OBS overlay routes and panel links.
   Add the `minimap` route under the existing `/stream/overlay/<name>/...` pattern, then expose it through `utils.py`. Keep `race-overview` as a post-minimap follow-up.
4. Add a shared minimap renderer.
   Create plugin-local HTML/CSS/JS for route rendering, timing markers, safe-area padding, transparent background, disconnected/setup states, and resolution checks at 1920x1080 and 1280x720. Keep geometry and race-state modules shared across themes; keep colors, typography, marker styling, panel chrome, and spacing in theme CSS.
5. Add browser-side race state adapter.
   Reuse `race_status`, `current_heat`, `leaderboard`, and `current_laps` to build pilot state without requiring a custom backend publisher for v1. Track node, callsign, color, lap, last confirmed anchor, last update time, estimated progress, and confidence.
6. Add estimation and correction behavior.
   Start with start/finish-only lap anchors. Move markers between anchors using deterministic elapsed-time interpolation, then snap or ease to confirmed anchors when a lap update arrives. Stop advancing and fade markers when the confidence window expires.
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

- add plugin-owned TrackDraw settings for one active project id and bearer API key
- map RotorHazard `split_id` values to TrackDraw-provided route-ordered `split_index` values; do not expose this as a normal setup field
- use `https://trackdraw.app` as the built-in production TrackDraw API origin in plugin code; do not expose base URL as a normal setup field
- allow a hidden dev/test origin override only through config or environment
- fetch the TrackDraw overlay package server-side, never from OBS/browser JavaScript with the bearer key
- cache the last valid ready `trackdraw.overlay.v1` package durably and expose it through a local plugin JSON route
- support offline race-day use from cached course data after an earlier successful online refresh
- render the minimap route and timing markers from `route.sampled_points` and `timing_markers`
- derive first-pass viewport framing from the TrackDraw field and sampled route; open a TrackDraw follow-up for `bounds`/`viewport` hints only if real-course validation proves the plugin cannot frame reliably
- expose setup states for missing config, auth failure, network failure, blocked readiness, unsupported schema, and stale cached data
- validate OBS browser-source behavior, transparency, and safe-area framing

Done state:

- the overlay runtime can display TrackDraw-authored course data
- the visual surface is validated separately from live race estimation
- missing, invalid, or blocked packages produce a clear setup state instead of a broken overlay

Recommended first visual surface:

- ship `minimap` first as a small transparent corner overlay that can be layered over existing scenes
- add `race-overview` only after the minimap renderer, setup states, and live estimation model are validated
- keep both variants on the same imported route renderer and theme tokens when `race-overview` is added

Phase 3 implementation checklist:

- [ ] Add TrackDraw config storage for one active project id and API key through RotorHazard plugin settings; do not expose base URL as a normal setup field.
- [ ] Add a copyable project id surface in TrackDraw for account-backed projects.
- [ ] Add a safe server-side fetch helper using `requests.Session` and the plugin's built-in `https://trackdraw.app` API origin.
- [ ] Use TrackDraw-provided zero-based `split_index` values for RotorHazard `split_id` mapping.
- [ ] Add durable last-good-ready overlay-package caching for offline venue use.
- [ ] Add local cached overlay-package JSON endpoint without exposing the TrackDraw bearer key.
- [ ] Show cache status in plugin setup: never fetched, fresh, stale/offline, blocked, or auth failed.
- [ ] Treat cache as fresh for 24 hours after successful refresh; after that, keep it usable as stale/offline if it was last-good-ready.
- [ ] Keep stale/offline cached course data usable even if the API key later expires; require a valid key only for refresh.
- [ ] Register the `minimap` link on the RotorHazard streams page; defer `race-overview` until the minimap is proven.
- [ ] Add shared SVG route renderer, timing marker renderer, setup-state renderer, and theme-aware OBS-safe CSS.
- [ ] Keep the first DDS minimap theme as the reference implementation without hardcoding DDS assumptions into shared data or race-state modules.
- [ ] Validate one real TrackDraw REST payload and one blocked-readiness payload.

### Phase 4: Connect RotorHazard Live Data And Harden Estimation

Start state:

- REST-backed minimap rendering works
- live position behavior is not yet connected or not yet robust

Work:

- add a browser-side race adapter that listens to the same RotorHazard Socket.IO path the existing overlays already use
- map RotorHazard pilot/node data into a small overlay state: pilot id, node, callsign, color, lap, last timing anchor, last event time, estimated route progress, and confidence
- start with start/finish lap events as the reliable v1 signal
- enable split anchors through TrackDraw-provided route-order `split_index` mapping
- detect split confirmations by diffing updated `current_laps` snapshots because RotorHazard updates split state through current laps rather than a dedicated browser split event
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
- blocked readiness or missing TrackDraw config: show a setup state and do not animate pilot dots
- race start: place all active pilots at the start/finish anchor
- lap recorded from `current_laps`: confirm a pilot at start/finish and advance lap/progress state
- split recorded from `current_laps`: confirm a pilot at the TrackDraw split anchor whose `split_index` matches that split's RotorHazard `split_id`
- stale pilot: continue interpolation only inside a short confidence window, then fade the dot and stop advancing
- race finish/stop: freeze final positions and keep the result panel readable for OBS

Recommended first estimation defaults:

- use the last completed lap time per pilot as the preferred expected full-lap duration once available
- fall back to a configurable default lap duration before a pilot has completed a lap
- for split sectors, use the last observed sector duration when available, otherwise divide the expected lap duration by the number of configured anchor sectors
- mark a pilot as stale when no confirming lap or split update arrives within 5 seconds after the expected next anchor time
- freeze stale markers instead of looping them through unconfirmed anchors

Phase 4 implementation checklist:

- [ ] Build pilot state from `current_heat`, `leaderboard`, `current_laps`, and `race_status`.
- [ ] Detect new start/finish confirmations from changed lap snapshots per node.
- [ ] Interpolate route progress from the last confirmed anchor using a configured or learned expected sector duration.
- [ ] Stop or fade movement when data is stale, the socket disconnects, or the race stops.
- [ ] Detect new split confirmations from changed `current_laps.node_index[*].laps[*].splits[*]` entries and map `split_id` to TrackDraw `split_index`.
- [ ] Validate with a real or replayed RotorHazard heat, including race start, lap updates, finish/stop, and reconnect.

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
