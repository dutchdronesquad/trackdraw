# 3D Transform Controls PVA

Date: June 9, 2026

Status: draft, not approved for full build

## Decision Summary

Recommended direction:

- keep 3D direct manipulation as a focused editor feature, not a full modeling surface
- keep an explicit `Select`, `Move`, and `Rotate` mode in the 3D preview
- keep orbit camera controls available in normal navigation and disabled only while a transform drag is active
- use a visible transform gizmo for selected unlocked obstacles
- support move by axis and by plane, but persist only TrackDraw's supported object placement data: `x`, `y`, and `rotation`
- keep height/elevation edits separate from move/rotate because TrackDraw shapes do not have one generic vertical position field
- treat the current `TransformControls` implementation as an exploration spike, not as accepted UX

The desired result is closer to TrackForge-style direct manipulation: clear camera orbit, clear selected-object move handles, and a rotation ring that feels predictable. The current implementation proves the integration path is possible, but it is not stable or useful enough yet.

## Approval Recommendation

Approve a narrow follow-up only if TrackDraw accepts:

- 3D controls remain single-selection only in v1
- locked objects and read-only/share/embed views remain non-editable
- the gizmo cannot write `null`, `NaN`, or unsupported fields into live patches or saved shapes
- undo/redo records one action per completed drag, not every intermediate pointer move
- 2D editor behavior remains the source of truth for broad editing, selection, snapping, export, and mobile reliability
- mobile can ship with a reduced version if desktop quality is reached first

Do not approve dimension, scale, or multi-object 3D transforms until move/rotate are stable.

## Go / No-Go Criteria

Go for implementation if:

- selecting one unlocked object shows one obvious transform target
- camera orbit works normally when not dragging a gizmo
- dragging a move axis updates only the intended ground-plane coordinate
- dragging a move plane feels free within the ground plane and respects grid snapping when enabled
- dragging rotate updates only yaw rotation
- releasing a drag never flashes back to the previous value before showing the committed value
- inspector values remain valid during live dragging
- undo/redo returns the object to the pre-drag and post-drag states cleanly
- switching tools or selection during a drag cancels safely

No-go or delay if:

- transform controls can still produce invalid `x`, `y`, `rotation`, `null`, or `NaN` values
- camera orbit and object transform compete for the same pointer gesture
- plane handles imply vertical movement that TrackDraw cannot persist
- mobile interaction requires tiny handles or fragile gestures
- the implementation requires broad changes to the canvas store, shape schema, or shared UI primitives

## Product Flow

### Select Mode

Purpose:

- navigate and inspect the 3D scene
- keep existing focused item controls visible, such as route elevation, tower elevation, ladder elevation, dive-gate tilt, and legacy rotate helpers if still needed

Expected behavior:

1. User clicks an object to select it.
2. User orbits, pans, and zooms the camera with existing controls.
3. No move/rotate gizmo is shown unless the user switches mode.

### Move Mode

Purpose:

- quickly reposition a selected obstacle in the 3D preview.

Expected behavior:

1. User selects a single unlocked non-polyline obstacle.
2. User switches to `Move`.
3. A transform gizmo appears at the object's ground anchor.
4. X/Z axis handles move along one ground axis.
5. A ground-plane handle moves freely over the field.
6. Grid snapping follows the editor snap setting.
7. Live preview updates the object and inspector without committing history.
8. Mouse/touch release commits one store update.

Important constraint:

- TrackDraw stores 2D placement as `shape.x` and `shape.y`, rendered as Three.js X/Z. Generic vertical Y movement should not be persisted from this mode.

### Rotate Mode

Purpose:

- quickly adjust yaw orientation in 3D.

Expected behavior:

1. User selects a single unlocked rotatable obstacle.
2. User switches to `Rotate`.
3. A visible yaw rotation ring appears at the object anchor.
4. Dragging the ring updates `shape.rotation`.
5. Rotation snaps to the existing 5 degree step unless a future UX decision changes snapping behavior.
6. Mouse/touch release commits one store update.

## Codebase Anchor

Current relevant files:

- [src/components/canvas/editor/TrackPreview3D.tsx](../../src/components/canvas/editor/TrackPreview3D.tsx) — 3D preview shell, selection, orbit controls, tool overlay, live patch integration
- [src/components/canvas/editor/edit-scene-content.tsx](../../src/components/canvas/editor/edit-scene-content.tsx) — direct 3D handles and the current transform-control spike
- [src/components/canvas/editor/useTrackPreview3DInteractions.ts](../../src/components/canvas/editor/useTrackPreview3DInteractions.ts) — existing direct drag sessions for elevation, tilt, and legacy rotate behavior
- [src/components/canvas/preview3d/shared-scene.tsx](../../src/components/canvas/preview3d/shared-scene.tsx) — selected shape rendering and shared scene helpers
- [src/store/editor.ts](../../src/store/editor.ts) — live shape patch state and core editor actions
- [src/components/inspector/Inspector.tsx](../../src/components/inspector/Inspector.tsx) — merges live shape patches into the selected inspector view
- [src/components/inspector/shared.tsx](../../src/components/inspector/shared.tsx) — numeric formatting and inspector inputs

Current spike concerns:

- `TransformControls` emits object state through Three.js primitives, which can produce invalid intermediate values if the adapter is not strict.
- Drei's `TransformControls` can disable default orbit controls, but TrackDraw still needs explicit state so wheel, middle-mouse panning, and hints stay coherent.
- Showing only the ground-plane move affordance may require either a custom wrapper around `TransformControls` or a custom TrackDraw gizmo, because generic 3D controls include axes/planes that imply unsupported vertical movement.

## Technical Model

### Transform Adapter

Create a dedicated adapter between Three.js controls and TrackDraw shape patches.

Responsibilities:

- own one invisible `THREE.Object3D` target per selected shape
- sync target from the selected shape only when not dragging
- convert target position from Three.js X/Z into TrackDraw `x/y`
- convert target yaw into TrackDraw `rotation`
- reject non-finite values before writing live patches
- clamp unsupported axes back to the TrackDraw ground plane
- expose `onStart`, `onLivePatch`, `onCommit`, and `onCancel`

The adapter should be testable without rendering the full 3D scene where possible.

### Interaction Session

Use the same session model as existing direct 3D controls:

- `startSession` on transform drag start
- pause history during live drag
- write live patch during drag
- commit one `updateShape` on mouse/touch release
- clear live patch after commit
- cancel and clear live patch on blur, tool switch, selection switch, or unmount

### Camera Controls

Orbit controls should be treated as a sibling interaction, not a fallback:

- enabled when no transform drag is active
- disabled while transform dragging
- still available in Select mode
- not blocked merely because a selected object has a gizmo visible

### Gizmo Choice

Two implementation options should be compared in a small spike:

1. Keep Drei `TransformControls` and restrict it with an adapter.
2. Build a lightweight custom TrackDraw gizmo for move X, move Z, move XZ plane, and yaw rotation.

The custom gizmo may be preferable if Drei's generic controls keep implying vertical movement or produce confusing hit targets.

## Phase Plan

### Phase 0: Stabilize Current Spike

Goal: make the current implementation safe enough to keep behind the toolbar while evaluating UX.

Checklist:

- [ ] prevent transform live patches from writing invalid values
- [ ] prevent inspector crashes during transform drag
- [ ] verify orbit controls are disabled only during active drag
- [ ] verify undo/redo creates one history entry per drag
- [ ] verify switching away from Move/Rotate clears any live patch
- [ ] verify locked/read-only states hide or disable controls

### Phase 1: UX Spike With Acceptance Notes

Goal: decide whether Drei `TransformControls` can meet TrackDraw's UX needs.

Checklist:

- [ ] test move X axis, Z axis, and XZ plane on desktop
- [ ] test rotate yaw ring on desktop
- [ ] test pointer release, pointer cancel, blur, and selection change
- [ ] test grid snapping on and off
- [ ] test small objects, large towers, gates, ladders, flags, cones, labels, and start/finish
- [ ] capture notes on confusing or unsupported handles
- [ ] decide: keep Drei, wrap/customize Drei, or build custom gizmo

### Phase 2: Productionize Chosen Gizmo

Goal: make the chosen interaction reliable enough for normal editing.

Checklist:

- [ ] move transform adapter into a focused module or hook
- [ ] remove any dead legacy transform code
- [ ] keep existing elevation/tilt controls in Select mode
- [ ] add focused tests for transform patch sanitization and commit behavior
- [ ] verify no shape schema or export behavior changes
- [ ] update changelog only after the behavior is accepted

### Phase 3: Mobile Decision

Goal: decide whether mobile gets full transform controls or a reduced version.

Checklist:

- [ ] test touch hit targets on phone-sized viewport
- [ ] confirm one-finger orbit vs transform drag does not conflict
- [ ] decide whether mobile starts with Select-only plus existing elevation handles
- [ ] document any deferred mobile behavior in the roadmap

## Validation Plan

Run when Node/npm are available:

- `npm run lint`
- `npm run type`
- `npm run test`

Manual validation:

- desktop Chrome: select, move axis, move plane, rotate, undo, redo
- desktop Safari: select, move axis, move plane, rotate, undo, redo
- mobile viewport: select, orbit, accidental drag resistance
- inspector: no crashes or invalid values while dragging
- read-only/share/embed: no editable gizmo visible

## Open Questions

- Should Move mode show only ground-plane controls, or also show the vertical axis visually while clamping it away?
- Should Rotate mode use Drei's full rotation control or a custom single yaw ring?
- Should grid snapping apply while dragging the plane only, or also while dragging a single axis?
- Should holding a modifier temporarily disable snapping?
- Should mobile get the same gizmo or a simpler inspector-assisted direct control?

## Current Recommendation

Do not continue adding dimension handles yet.

First decide whether Drei `TransformControls` can be made to feel good enough. If not, build a TrackDraw-specific gizmo with only the controls the data model can safely persist:

- move X
- move Z
- move XZ plane
- rotate yaw
