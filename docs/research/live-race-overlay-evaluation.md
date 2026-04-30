# Live Race Overlay Evaluation

This document evaluates the product shape and technical approach for a live race overlay feature built on top of TrackDraw's course design and route model.

Status: approved for TrackDraw-side preparation. The first REST-backed course-data contract and timing-marker setup are in place; see `docs/pva/live-race-overlay-pva.md` for the current implementation state and remaining overlay-runtime work.

## Purpose

TrackDraw already supports:

- track design on a scaled 2D field
- route definition through a polyline path
- read-only shared viewing
- export-oriented race-day handoff

What it does not yet support is a track-preparation workflow that can feed a live race-view layer with route-aware timing metadata.

The purpose of this feature is to turn TrackDraw from a static course reference into the authoritative course-definition layer for a live broadcast aid used during FPV race streaming.

## Product Goal

Live race overlay should make a race easier to follow for viewers and commentators.

That means:

- the overlay should show drones moving over the TrackDraw route in a way that feels believable
- TrackDraw should expose enough geometry and timing metadata for `rh-stream-overlays` to render a minimap overlay correctly
- live RotorHazard timing events should improve the visual understanding of battles, gaps, and track position
- the system should remain honest about what is estimated versus what is truly measured

## Core Boundary

The first meaningful version should remain:

- export- and mapping-focused on the TrackDraw side
- read-only on the overlay side
- 2D only
- focused on livestream consumption rather than race administration

Keep it in scope for the first release:

- one versioned overlay track package per account-backed TrackDraw project
- route-following pilot markers in `rh-stream-overlays`
- explicit timing roles such as start/finish and split anchors mapped to route distance
- RotorHazard integration through the existing overlay/plugin stack
- stale or unknown-data handling
- transparent-background OBS presentation through `rh-stream-overlays`

Keep it out of scope for now:

- exact XY telemetry
- manual live race control from TrackDraw
- 3D broadcast views
- replay timelines
- post-race analytics
- community overlay themes or template systems

## Problem Framing

RotorHazard timing data is not the same as live positional telemetry.

In practical terms, TrackDraw can know:

- which track layout is being used
- what the ideal route looks like
- where timing points are intended to sit on that route once they are mapped

TrackDraw usually cannot know:

- the pilot's precise position between two timing points
- whether the pilot took a wider or tighter line than expected
- whether the pilot crashed, slowed, or recovered unless timing behavior implies it later

So the product problem is not "draw drones on the track". The real problem is:

- how to estimate and present race position convincingly
- without overstating precision
- while staying stable enough for live broadcast use

## Recommended Product Model

### 1. TrackDraw Owns Course Definition

TrackDraw should own the parts of the system that describe the course:

- route geometry
- track bounds or viewport hints if needed
- timing roles such as start/finish and split anchors
- the REST overlay package consumed by the overlay runtime

That keeps TrackDraw focused on design truth, not live overlay execution.

### 2. The TrackDraw Route Is The Motion Path

The primary route polyline should be treated as the canonical movement path for the overlay.

That gives the feature a stable, track-bound coordinate system:

- split anchors can be mapped to route distance
- pilot markers can move by progress along the route
- the overlay can be rendered consistently across projects

The first version should not attempt freeform drone movement outside this route model.

### 3. Timing Roles Must Be Explicit

TrackDraw should not guess timing-point locations from obstacle order alone.

The product should support explicit timing-role markers that can map:

- a role such as `start_finish` or `split`
- a RotorHazard timing point identifier where applicable
- to a distance along the TrackDraw route

Why:

- not every obstacle is a timing point
- obstacle order is not always race order
- some layouts need race-day correction based on how timers are actually deployed

This mapping may be attached to dedicated route anchors or to existing obstacles when that obstacle is intentionally marked with a timing role.

Recommendation:

- add a route-bound timing-anchor model
- validate missing, duplicate, or out-of-order mappings
- keep the mapping visible enough that setup mistakes are catchable

### 4. `rh-stream-overlays` Should Be The Overlay Runtime

TrackDraw should not default to building a second live overlay runtime if `rh-stream-overlays` can own the OBS-facing surface.

Recommendation:

- TrackDraw serves track and timing metadata through the versioned REST API
- `rh-stream-overlays` consumes that package
- `rh-stream-overlays` combines imported track metadata with live RotorHazard events
- OBS consumes the overlay from the RotorHazard/plugin side

This keeps responsibilities cleaner:

- TrackDraw: authoring and mapping
- RotorHazard: measured race events
- `rh-stream-overlays`: live broadcast rendering

### 5. Position Is Estimated, Not Claimed As Exact

The overlay should deliberately model `estimated race position`.

That means:

- when a split event arrives, the pilot snaps or quickly corrects to that anchor
- between anchors, the pilot moves based on time and expected sector progress
- when data becomes uncertain, the UI should communicate that uncertainty instead of pretending precision

The product language should reflect this boundary.

### 6. OBS Is The Primary Surface

The first version should be built for livestream production, not for general editing.

The main surface should be:

- a lightweight browser-source-friendly route
- transparent background
- minimal or optional labels
- stable aspect-ratio behavior

The editor can host configuration for mapping later, but the live visualization itself should stay separate.

## UX Direction

The overlay should feel broadcast-native:

- clean track rendering
- pilot markers that move smoothly and legibly
- readable labels and colors
- obvious stale or disconnected states

The main value is visual clarity. The overlay should help a commentator or viewer answer:

- who is leading
- where the field is spread out
- whether two pilots are close on track
- when someone is approaching a major track section or split

Recommended first-pass visual elements:

- track route
- optional split markers
- pilot marker color
- short callsign label
- optional running order badge
- subtle stale-state treatment

Do not start with:

- dense timing tables
- editor-style controls in the live surface
- decorative broadcast clutter that weakens readability

## Recommended Entry Points

The first version should expose the feature through TrackDraw preparation flows plus an overlay runtime in `rh-stream-overlays`, rather than through a full live overlay mode inside TrackDraw.

Recommended entry points:

- TrackDraw editor action later: `Configure timing points`
- TrackDraw export action later: `Export overlay package`
- `rh-stream-overlays` overlay URL for OBS usage

Do not start with:

- automatic live mode in every shared view
- a dependency on full sign-in-only project flows
- an editor-first implementation that carries too much TrackDraw runtime into OBS

## Screen-Level V1 Flow

### 1. Prepare The Track

The user creates or opens a normal TrackDraw design and defines the route polyline.

Before live race use, the track needs:

- a route that represents race flow
- timing-role markers such as start/finish and split points mapped to key timing positions

If mapping is incomplete, export should fail clearly rather than produce misleading overlay data.

### 2. Export The Overlay Package

The user exports track geometry and timing metadata from TrackDraw in a format that `rh-stream-overlays` can import.

The first version should prioritize:

- a compact and explicit schema
- predictable timing-point identifiers
- compatibility with cross-repo versioning

### 3. Import Into `rh-stream-overlays`

The overlay system imports the TrackDraw package and makes it available to a minimap overlay type.

At that point the overlay can:

- render the route
- place timing markers
- prepare pilot markers for live updates

### 4. Connect Live Race State

`rh-stream-overlays` receives translated RotorHazard race events through its existing live overlay stack.

The overlay then:

- creates pilot markers
- places them on the route
- updates marker progress when events arrive

### 5. Run During The Heat

During the race:

- pilot markers move continuously along the route
- split events correct position when new timing data arrives
- stale markers fade or hold in an obvious fail-safe state

### 6. Handle End Of Heat Or Disconnect

When the race ends or live data stops:

- the overlay should stop implying fresh movement
- pilot markers should move into a clear ended or disconnected state
- the route remains viewable without suggesting ongoing race activity

## Suggested V1 UI Copy Direction

The feature should use simple, truthful language:

- `Live overlay`
- `OBS overlay`
- `Timing points`
- `Start / finish`
- `Split`
- `Estimated position`
- `Waiting for race data`
- `Signal stale`
- `Disconnected`

Avoid copy that implies precision beyond the data model:

- `exact position`
- `real-time location`
- `telemetry tracking`

## Technical Shape

### Track Model

TrackDraw's first implementation stores timing intent on timing-capable gates through `shape.meta.timing`.

That timing metadata expresses:

- timing role
- timing point identifier
- display label

The REST overlay package then derives:

- distance along route
- projected route position
- route progress

The route polyline remains the source of geometric progress.

### REST Overlay Contract

TrackDraw and `rh-stream-overlays` need a shared contract that is small, explicit, and versioned.

The first integration contract is the bearer-authenticated project overlay endpoint:

```text
GET /api/v1/projects/{projectId}/overlay
```

The package includes:

- schema version
- track identifier
- title
- field dimensions and origin
- route polyline points
- route length
- numbered route obstacles
- timing markers with roles, identifiers, positions, and route projections
- route status
- optional viewport or bounds hints for minimap framing

The first version favors a plain JSON REST contract over direct database access, share-page scraping, or manual file handoff.

### Superseded Early Transport Assumption

Earlier planning considered using the existing TrackDraw project JSON as the first import source for `rh-stream-overlays`.

That is no longer the preferred integration path.

Current recommendation:

- keep project JSON as the backup/import format for TrackDraw itself
- keep `/api/v1/projects/{projectId}/track` as the broader integration package
- use `/api/v1/projects/{projectId}/overlay` as the compact livestream minimap package
- do not require manual JSON export/import for the first `rh-stream-overlays` integration

Why:

- the API key model gives account-owned consumers a revocable integration surface
- the overlay package can stay smaller and cleaner than full editor JSON
- OpenAPI can document the contract directly
- `rh-stream-overlays` can fetch the latest account project without a manual handoff step

### Preferred Evolution Path

The integration path should evolve in this order:

1. consume `trackdraw.overlay.v1` from the REST API
2. validate that `rh-stream-overlays` can reliably render the route, obstacles, timing markers, and `readiness` report
3. add minimap viewport or bounds hints if consumer-side framing needs them
4. add explicit route selection only if real multi-route projects need it

### Timing Metadata Placement Options

There are two realistic places to store timing metadata inside TrackDraw data.

Option A: attach timing metadata to existing shapes through `meta`

Example uses:

- mark a gate as the active `start_finish` timing point
- mark a gate as a `split`
- attach a RotorHazard timing identifier to that shape

Example shape concept:

```json
{
  "id": "shape_start_1",
  "kind": "gate",
  "x": 12,
  "y": 8,
  "rotation": 90,
  "width": 2.4,
  "height": 1.8,
  "meta": {
    "timing": {
      "role": "start_finish",
      "timingId": "holeshot"
    }
  }
}
```

Pros:

- no new top-level design structures needed immediately
- backward-compatible with current shape model
- works well when the timing point corresponds to a visible obstacle

Cons:

- not every timing point cleanly belongs to an obstacle
- route-distance still needs to be derived separately
- `meta` is flexible but less self-documenting than explicit typed fields

Option B: add explicit route-bound timing anchors

Example concept:

```json
{
  "routeTiming": [
    {
      "id": "tp_start",
      "role": "start_finish",
      "timingId": "holeshot",
      "label": "Holeshot",
      "distanceAlongRoute": 0
    },
    {
      "id": "tp_split_1",
      "role": "split",
      "timingId": "split-1",
      "label": "Split 1",
      "distanceAlongRoute": 47.2
    }
  ]
}
```

Pros:

- cleaner contract for overlay consumers
- directly expresses the thing the minimap actually needs
- does not depend on timing points being represented by obstacles

Cons:

- requires new typed design structure
- needs new editor UX immediately
- increases implementation scope before the first integration is even proven

### Recommended First Modeling Choice

The implemented first choice is:

- store timing metadata on shapes through `meta` first
- derive route anchors for API package generation and overlay preparation

Why this is the best first move:

- the repo already supports `meta` on shapes
- it keeps changes additive and low-risk
- it allows the team to mark selected gates as timing points without first inventing a new editor subsystem

This is especially attractive for:

- gates marked as `start_finish`
- gates marked as `split`

### Route Mapping

Even if timing metadata starts on shapes, the minimap still needs route progress.

That means TrackDraw or `rh-stream-overlays` must still resolve:

- which route polyline is the active race path
- where a timing-marked shape sits along that route
- what `distanceAlongRoute` corresponds to each timing point

So the product should not confuse `shape-marked timing role` with `ready-for-overlay route anchor`.

The first integration can derive route anchors from shapes. A later phase may persist explicit route anchors once the team knows that derivation is stable enough.

### Recommended V1 Contract Shape

For the first cross-repo integration, the minimum useful contract should be `trackdraw.overlay.v1`:

- `schema`: `trackdraw.overlay.v1`
- `contractVersion`: `1`
- `generatedAt`: ISO timestamp
- `coordinateSystem`: field origin and meter-based route/field units
- `route`: route waypoints, sampled route points, and route length
- `routeObstacles`: numbered route obstacles with route positions
- `timingMarkers`: timing roles and identifiers with route positions
- `readiness`: validation and route-progress mapping data

Expected `meta.timing` fields:

- `role`: `start_finish` or `split`
- `timingId`: string identifier used by the overlay side

The overlay side should initially be responsible for:

- reading the `trackdraw.overlay.v1` payload
- rejecting or clearly blocking setup when readiness status is blocked
- rendering the route, route obstacles, and timing markers
- using route-position data for route distance/progress anchors

TrackDraw should expose this as the dedicated REST overlay package rather than merging it into normal project JSON. Project JSON remains the TrackDraw backup/import format; the overlay package is the external runtime contract.

### When To Expand Beyond The First Overlay Schema

TrackDraw already has a compact `trackdraw.overlay.v1` REST package. It should only expand beyond that first schema if one or more of these become true:

- route-distance derivation becomes too expensive or too ambiguous on the overlay side
- timing points no longer map well to existing shapes
- multiple overlay runtimes need a stable public contract

### Why JSON Hardening Also Helps TrackDraw Itself

These JSON improvements are not only for the overlay integration. They are also good for TrackDraw's own import and export behavior.

Benefits inside TrackDraw:

- exported files become more predictable and stable across versions
- imported files are validated through one shared path instead of multiple slightly different assumptions
- old and new JSON variants become easier to support without accidental regressions
- external backups and project handoff become more reliable
- future features that build on project JSON do not each invent their own parsing rules

### Race Adapter

RotorHazard integration should remain isolated behind the overlay/plugin side rather than pulling live race handling into TrackDraw.

That layer should translate external event details into an internal overlay model such as:

- pilot id
- callsign
- display color
- current lap
- last known split anchor
- last event timestamp
- estimated route distance
- state such as active, stale, finished, or disconnected

This avoids coupling TrackDraw too tightly to RotorHazard event formats.

### Position Estimator

The estimator should:

- place a pilot exactly at the last confirmed split anchor
- estimate progress toward the next anchor using elapsed time
- correct to the confirmed anchor when the next split event arrives
- stop or downgrade confidence when timing data becomes too old

The first version should prefer simple, deterministic estimation over aggressive smoothing logic.

### Overlay Renderer

The renderer in `rh-stream-overlays` should:

- import TrackDraw geometry and timing metadata cleanly
- avoid editor controls and non-essential UI
- keep DOM and canvas churn low enough for browser-source stability

## Product Risks

### 1. Precision Expectations Drift

The visual effect may cause users to believe the overlay shows exact drone location.

Mitigation:

- product copy must call it estimated
- stale states must be visible
- the first version should avoid fake precision in labels or legends

### 2. Split Mapping Errors Cause Misleading Position

If anchors are mapped incorrectly, the overlay will look polished but be wrong.

Mitigation:

- explicit validation
- a visible mapping workflow
- safe failure when anchors are incomplete or inconsistent

### 3. RotorHazard Event Quality May Vary

Dropped events, delayed updates, or race-state edge cases may create bad movement.

Mitigation:

- adapter isolation
- reconnect handling
- stale-state logic
- controlled first-pass support for only the race states TrackDraw can represent well

### 4. Scope Expansion Into A Full Timing Product

This feature could drift from overlay into race control, timing dashboards, and analytics.

Mitigation:

- keep OBS overlay as the primary use case
- treat richer timing UX as future follow-up work
- avoid feature creep in the first implementation plan

### 5. Cross-Repo Contract Drift

If TrackDraw exports one shape of data and `rh-stream-overlays` evolves differently, the integration may become fragile.

Mitigation:

- define a versioned schema
- keep the first contract intentionally small
- document ownership of contract changes across both repos

## Recommendation

TrackDraw should approve `Live race overlay` for implementation planning if the team accepts two core truths:

- the first version is a broadcast-oriented estimate layer built on timing events, not an exact telemetry system
- TrackDraw should prepare and export course intelligence, while `rh-stream-overlays` should render the live OBS-facing overlay

Those boundaries make the feature practical.

They let TrackDraw build something genuinely useful without turning this repo into a second live overlay runtime:

- compatible with the existing route model
- realistic in scope for a first implementation
- better aligned with the existing RotorHazard overlay ecosystem

If the team wants exact position tracking or full race-control tooling immediately, this should not be approved as a v1 TrackDraw feature yet.
