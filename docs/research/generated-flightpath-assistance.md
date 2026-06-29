# Generated Flightpath Assistance Research

## Short Version

Generated flightpath should create an editable first-pass Race Line from the user's intended obstacle order. It should not try to infer the perfect racing line, simulate a drone, or replace manual route authoring.

Recommended first slice:

1. Make obstacle order easy to edit with drag-to-reorder in the track items list.
2. Add explicit generated-route metadata to the track item registry.
3. Generate a normal polyline draft from ordered pass-through obstacles.
4. Show a preview with warnings, then let the user accept or cancel.
5. Validate on real layouts before adding curvature optimization or simulation-heavy behavior.

## Context

TrackDraw already has manual Race Line authoring, elevation-aware 3D preview, obstacle numbering, route overlay preparation, flythrough/export consumers, and Catmull-Rom smoothing. Generated flightpath should build on that foundation by creating a suggested route that becomes a normal editable polyline.

The core product question is:

> Given my intended obstacle order, can TrackDraw create a reasonable editable first-pass Race Line?

Out of scope for the first version:

- fastest possible racing line
- automatic sequence inference from arbitrary geometry
- drone physics or turn-radius simulation
- replacing explicit Race Line editing

## Existing Foundation

Useful existing pieces:

- `TrackDesign.shapeOrder` stores the current item order.
- `useEditor.reorderShapes(fromId, beforeId)` already exists and is tested.
- `useEditor.addShape` / `updateShape` are the right commit paths for accepted generated routes.
- `obstacleNumbering.ts` can validate whether obstacles sit on a route.
- `polyline-derived.ts` and `geometry.ts` already provide the Catmull-Rom smoothing used by normal routes.

Important technical note: route projection math is currently duplicated in `obstacleNumbering.ts` and `overlay-prep.ts`. Before adding a third caller, extract shared projection helpers into something like `src/lib/track/route-projection.ts`.

## First Algorithm

Use obstacle order first, geometry second.

Input:

- ordered pass-through obstacles from `shapeOrder`
- optional start/finish or timing markers later
- optional existing route when regenerating

Output:

- a draft `PolylineShape`
- warnings/confidence report

Basic pipeline:

1. Collect supported route obstacles in `shapeOrder`.
2. Resolve each obstacle's anchor, heading, traversal type, and approach distance from registry metadata.
3. Add approach, center/pass-through, and exit waypoints for gate-like obstacles.
4. Create a normal open Race Line polyline with smoothing enabled.
5. Run obstacle numbering against the generated draft and show warnings.

This intentionally avoids nearest-neighbor, TSP-style ordering, Dubins paths, or simulation. The user already owns the sequence through item order.

## Registry Metadata Needed

Do not overload existing fields like `numberedObstacle` or raw `rotation`. They are related, but not specific enough for generation.

Add explicit route-generation capability metadata to `trackItemAdapters`:

- `routeAnchor(shape)`: defaults to `{ x: shape.x, y: shape.y }`
- `routeHeading(shape)`: pass-through direction for gate-like shapes
- `routeApproachDistance(shape)`: distance before/after an obstacle
- `routeTraversal`: `through`, `around`, `marker`, or `none`
- `supportsGeneratedRoute`: true for shapes the generator can use

Start with obstacles where traversal is clear: gates, ladders, towers, dive gates, and launch gates. Keep cones, barriers, labels, map references, and decorative items out of phase 1.

## UI Shape

Prerequisite:

- Drag-to-reorder in the track items list should ship first or alongside generation.

Suggested flow:

- Add `Generate Race Line` in the project layout / route-numbering inspector area.
- Show a preview route before committing.
- Actions: `Accept`, `Replace existing Race Line`, `Create as new Race Line`, `Cancel`.
- Keep warnings short and actionable:
  - "3 obstacles are not supported for route generation."
  - "2 gates are very close together; review the generated turn."
  - "No start/finish found; route starts at the first ordered obstacle."

Mobile should use the same inspector action and a compact accept/cancel sheet. It should not introduce a new canvas mode.

## Implementation Shape

Add a pure module first:

- `src/lib/track/generated-route.ts`

Suggested API:

```ts
generateRaceLineDraft(design, options): {
  draft: ShapeDraft<PolylineShape> | null;
  report: GeneratedRouteReport;
}
```

Keep generation logic out of React and out of the Zustand store. The store should only commit an accepted draft through existing shape mutation paths.

Tests to add:

- generated waypoint order and warnings
- no supported obstacles
- one/two obstacle edge cases
- overlapping obstacles and degenerate segments
- generated route maps source obstacles without off-route issues
- accepted route is undoable and behaves like a normal polyline
- replacing an existing route requires explicit user intent

## Why Not Dubins Or Simulation First

Dubins paths are useful for shortest bounded-curvature paths with known headings. That may become relevant later, but it is too heavy for the first product slice.

TrackDraw's first version should stay explainable: ordered obstacles produce editable waypoints, and existing Catmull-Rom smoothing makes the route look natural enough for review and manual adjustment.

## Recommendation

Do the practical version first:

1. Drag-to-reorder obstacles.
2. Registry metadata for route generation.
3. Pure obstacle-order generator.
4. Preview/accept UI.
5. Real-layout validation.

Only after that should TrackDraw consider ambiguity detection, curvature constraints, or simulation-style route optimization.

## References

- `docs/research/path-curve-ux.md`
- `docs/research/maneuver-curve-optimization.md`
- Centripetal Catmull-Rom splines: `https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline`
- Dubins paths: `https://en.wikipedia.org/wiki/Dubins_path`
- Ayala, Kirszenblat, Rubinstein, "A geometric approach to shortest bounded curvature paths": `https://arxiv.org/abs/1403.4899`
