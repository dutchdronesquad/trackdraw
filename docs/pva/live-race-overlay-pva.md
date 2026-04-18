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

This document is intended to make the product shape concrete enough for a build/no-build decision, not to keep the feature at idea level.

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

## Purpose

This document defines the intended product shape for `Live race overlay`.

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
- TrackDraw should export enough geometry and timing metadata for `rh-stream-overlays` to render a minimap overlay correctly
- live RotorHazard timing events should improve the visual understanding of battles, gaps, and track position
- the system should remain honest about what is estimated versus what is truly measured

## Core Boundary

The first meaningful version should remain:

- export- and mapping-focused on the TrackDraw side
- read-only on the overlay side
- 2D only
- focused on livestream consumption rather than race administration

Keep it in scope for the first release:

- one exportable overlay track package per TrackDraw design
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
- the export package consumed by the overlay runtime

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

- TrackDraw exports track and timing metadata
- `rh-stream-overlays` imports that package
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

TrackDraw should add a route-bound timing-anchor model that can express:

- timing role
- timing point identifier
- display label
- distance along route
- optional route point reference for editing convenience

The route polyline remains the source of geometric progress.

### Export / Import Contract

TrackDraw and `rh-stream-overlays` need a shared contract that is small, explicit, and versioned.

The exported package should likely include:

- schema version
- track identifier
- title
- route polyline points
- route length
- timing anchors with roles and identifiers
- optional viewport or bounds hints for minimap framing

The first version should favor a plain JSON contract over tightly coupled direct database access.

### Reuse The Existing Project JSON First

TrackDraw already has a practical JSON portability format for full project export and import.

Recommendation:

- use the existing TrackDraw project JSON as the first import source for `rh-stream-overlays`
- avoid inventing a second export file immediately
- treat the current project JSON as the transport container for early minimap integration

This is the lowest-risk path because:

- TrackDraw already exports project JSON today
- TrackDraw already imports project JSON today
- the route polyline and field geometry are already present in that file
- the team can validate cross-repo rendering before locking a dedicated overlay-specific schema

This does not mean the current JSON automatically becomes the forever-contract. It means the existing JSON should be the first proving ground.

### Preferred Evolution Path

The export/import path should evolve in this order:

1. existing TrackDraw JSON as the initial import format
2. add timing metadata to that JSON in a backward-compatible way
3. validate that `rh-stream-overlays` can reliably consume it
4. only then decide whether a dedicated overlay export format is worth the extra maintenance

This keeps the first integration slice practical:

- first prove course rendering
- then prove timing-role mapping
- then prove live RotorHazard-driven movement

### Timing Metadata Placement Options

There are two realistic places to store timing metadata inside TrackDraw data.

Option A: attach timing metadata to existing shapes through `meta`

Example uses:

- mark a `startfinish` shape as the active `start_finish` timing point
- mark a gate or other obstacle as a `split`
- attach a RotorHazard timing identifier to that shape

Example shape concept:

```json
{
  "id": "shape_start_1",
  "kind": "startfinish",
  "x": 12,
  "y": 8,
  "rotation": 90,
  "width": 2.4,
  "meta": {
    "timing": {
      "role": "start_finish",
      "timingPointId": "holeshot",
      "label": "Holeshot"
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
      "timingPointId": "holeshot",
      "label": "Holeshot",
      "distanceAlongRoute": 0
    },
    {
      "id": "tp_split_1",
      "role": "split",
      "timingPointId": "split-1",
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

The recommended first choice is:

- keep the existing TrackDraw JSON as the container
- store timing metadata on shapes through `meta` first
- derive route anchors for export or import processing

Why this is the best first move:

- the repo already supports `meta` on shapes
- it keeps changes additive and low-risk
- it allows the team to mark an existing `startfinish` shape or selected gate as a timing point without first inventing a new editor subsystem

This is especially attractive for:

- `startfinish` shapes marked as `start_finish`
- gates or other deliberate track features marked as `split`

### Route Mapping Still Needs To Be Explicit

Even if timing metadata starts on shapes, the minimap still needs route progress.

That means TrackDraw or `rh-stream-overlays` must still resolve:

- which route polyline is the active race path
- where a timing-marked shape sits along that route
- what `distanceAlongRoute` corresponds to each timing point

So the product should not confuse `shape-marked timing role` with `ready-for-overlay route anchor`.

The first integration can derive route anchors from shapes. A later phase may persist explicit route anchors once the team knows that derivation is stable enough.

### Recommended V1 Contract Shape

For the first cross-repo integration, the minimum useful contract should be:

- existing TrackDraw JSON project file
- one primary route polyline
- field dimensions
- shape list
- optional timing metadata on relevant shapes via `meta.timing`

Expected `meta.timing` fields:

- `role`: `start_finish` or `split`
- `timingPointId`: string identifier used by the overlay side
- `label`: optional human-readable label

The overlay side should initially be responsible for:

- reading the TrackDraw JSON
- finding the primary route polyline
- extracting timing-marked shapes
- resolving those timing points onto route distance

### When To Graduate To A Dedicated Overlay Schema

TrackDraw should only move to a dedicated overlay-specific export if one or more of these become true:

- `rh-stream-overlays` needs a smaller, cleaner payload than the full project JSON
- route-distance derivation becomes too expensive or too ambiguous on the overlay side
- timing points no longer map well to existing shapes
- multiple overlay runtimes need a stable public contract

Until then, keeping everything inside the existing project JSON is the more disciplined choice.

### JSON Hardening Checklist

If the existing TrackDraw JSON is used as a cross-repo contract, it should be tightened in a few targeted ways first.

Recommended minimum changes:

- make JSON export always write the serialized design shape, not the raw in-memory editor object
- make JSON import always parse through the shared design parser instead of ad hoc file checks
- define and validate the allowed `meta.timing` fields
- define how the active race route is identified when more than one polyline exists
- document what parts of the JSON are considered stable for `rh-stream-overlays`

Recommended implementation notes:

- export should be based on `serializeDesign(design)`
- import should be based on `parseDesign(value)`
- timing metadata should start as a documented subset of `shape.meta`
- overlay consumers should avoid depending on unrelated editor-only details

This is still a small cleanup pass, not a format redesign.

### Why This Also Helps TrackDraw Itself

These JSON improvements are not only for the overlay integration. They are also good for TrackDraw's own import and export behavior.

Benefits inside TrackDraw:

- exported files become more predictable and stable across versions
- imported files are validated through one shared path instead of multiple slightly different assumptions
- old and new JSON variants become easier to support without accidental regressions
- external backups and project handoff become more reliable
- future features that build on project JSON do not each invent their own parsing rules

So yes: hardening the JSON export/import path is useful for the overlay work, but it is also good maintenance for TrackDraw itself.

### Concrete TrackDraw Code Checklist

The following TrackDraw files are the primary places that should be reviewed or adjusted for the JSON-hardening work.

Export and serialization:

- [src/components/dialogs/ExportDialog.tsx](/Users/klaas/Projecten/trackdraw/src/components/dialogs/ExportDialog.tsx)
  Change JSON export to write `serializeDesign(design)` rather than the raw editor object.
- [src/components/editor/EditorShell.tsx](/Users/klaas/Projecten/trackdraw/src/components/editor/EditorShell.tsx)
  Update project-manager JSON export to use the same serialized path so all JSON downloads are consistent.
- [src/lib/track/design.ts](/Users/klaas/Projecten/trackdraw/src/lib/track/design.ts)
  Treat `serializeDesign()` as the canonical export shape and keep `parseDesign()` as the canonical import path.

Import and validation:

- [src/components/dialogs/ImportDialog.tsx](/Users/klaas/Projecten/trackdraw/src/components/dialogs/ImportDialog.tsx)
  Replace the current ad hoc `data.shapes` gate with `parseDesign()` so import preview and actual import use the same validation rules.
- [src/app/api/projects/route.ts](/Users/klaas/Projecten/trackdraw/src/app/api/projects/route.ts)
  Confirm project-save APIs continue to accept the same normalized serialized form.
- [src/app/api/shares/route.ts](/Users/klaas/Projecten/trackdraw/src/app/api/shares/route.ts)
  Confirm share-publish APIs continue to accept the same normalized serialized form.

Timing metadata and typing:

- [src/lib/types.ts](/Users/klaas/Projecten/trackdraw/src/lib/types.ts)
  Decide whether timing metadata remains documented under `shape.meta` only or gets a more explicit typed helper shape in TrackDraw types.
- [src/lib/track/design.ts](/Users/klaas/Projecten/trackdraw/src/lib/track/design.ts)
  Add any normalization needed for timing metadata if TrackDraw starts persisting `meta.timing`.
- [src/lib/schema.d.ts](/Users/klaas/Projecten/trackdraw/src/lib/schema.d.ts)
  Review whether the existing schema helpers need to recognize newer shape kinds and any timing metadata contract.

Primary route behavior:

- [src/store/selectors.ts](/Users/klaas/Projecten/trackdraw/src/store/selectors.ts)
  Today `selectPrimaryPolyline()` falls back to the first polyline. Decide whether that remains acceptable for overlay export or whether TrackDraw needs an explicit active race route marker.
- [src/lib/track/polyline-derived.ts](/Users/klaas/Projecten/trackdraw/src/lib/track/polyline-derived.ts)
  Reuse this layer for route length and progress calculations rather than duplicating geometry logic elsewhere.

Editor UX follow-up for timing roles:

- [src/components/inspector/views/single.tsx](/Users/klaas/Projecten/trackdraw/src/components/inspector/views/single.tsx)
  Likely place for shape-level timing-role controls if timing starts attached to obstacles.
- [src/components/inspector/Inspector.tsx](/Users/klaas/Projecten/trackdraw/src/components/inspector/Inspector.tsx)
  Likely integration point for exposing timing metadata editing without creating a separate editor mode immediately.

Recommended implementation order:

1. Standardize JSON export on `serializeDesign()`.
2. Standardize JSON import on `parseDesign()`.
3. Define and document `meta.timing`.
4. Decide how TrackDraw identifies the active race route.
5. Only then begin cross-repo import work in `rh-stream-overlays`.

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

## Phase Plan

## Top-Level Checklist

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
