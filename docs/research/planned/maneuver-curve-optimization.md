# Maneuver Curve Optimization — Research

## Context

### Current state

TrackDraw routes are 2D polylines with optional per-waypoint Z values. The 2D canvas renders them as centripetal Catmull-Rom splines. The 3D preview converts those same waypoints to `THREE.Vector3` points and passes them to `THREE.CatmullRomCurve3`. The result is a smooth 3D tube that follows the waypoint positions in X/Y and interpolates Z between them.

This works well for normal route segments. It breaks for 3D maneuvers:

- A **powerloop** is a full vertical circle back through a gate. The pilot approaches, flies through the gate, loops straight up and over, and exits through the same gate. In 2D top-down the path circles back near the gate. In the current 3D renderer that loop becomes a flat horizontal circle at ground level — physically wrong and visually confusing.
- A **split-S** is an inverted half-loop. The pilot enters high, rolls inverted, and pulls through a downward arc, exiting lower and in the opposite direction. In 2D it looks like a tight U-turn. The 3D renderer shows that U-turn as a flat arc at the entry elevation — again physically wrong.

### Goal

Automatically generate physically plausible 3D curves for known maneuver patterns, without requiring the user to annotate anything. The user draws waypoints that describe the spatial intent — a loop near a gate, a tight U-turn with elevation change — and the optimizer detects the pattern and substitutes the correct 3D curve for that section.

The 2D canvas representation should stay honest: the top-down view shows what the projected footprint of the maneuver looks like. A small indicator on the 2D route marks detected maneuver sections so the user can see what the system recognized.

---

## Target maneuvers

### Powerloop

**What it is:** A full vertical 360° loop. The pilot performs a complete vertical circle; this can be through the same gate, the adjacent gate, or any gate near the loop section. The defining characteristic is the full-circle motion, not the gate identity.

**2D signature:**

- Accumulated heading change of roughly 360° (suggested tolerance: ≥ 300°) within a compact path-distance section.
- The path-distance of the section is consistent with a loop diameter plausible for FPV (roughly 3–15 m).
- The 2D shape forms a visually closed or near-closed curve — start and end of the section are close together in space.
- One or more gates lie within tolerance of the loop section (used for 3D plane alignment, not for detection).

**3D generation:**

- Identify the gate nearest to the loop section. Use its face normal to determine the vertical plane of the loop.
- If no gate is near, fall back to the approach tangent direction to define the loop plane.
- Fit a circle in that vertical plane to the drawn loop waypoints.
- Replace the loop section of the 3D curve with a smooth circular arc in that vertical plane.
- Entry and exit tangents of the circle should match the incoming and outgoing route tangents.

**Open questions:**

- How sensitive should the loop detection be to imperfectly drawn loops (oval, off-center)?
- Should the vertical diameter come from the drawn waypoint extent, or be inferred from the nearest gate's height?
- What happens when two gates are equidistant from the loop — which determines the loop plane?

---

### Split-S

**What it is:** Inverted half-loop. The pilot enters going one direction at altitude, rolls inverted, and pulls through a downward arc, exiting lower and going the opposite direction.

**2D signature:**

- Accumulated heading change of roughly 180° (± a tolerance, suggested ±40°) within a short path-distance section.
- Z value at the end of the section is meaningfully lower than at the start (suggested: at least 1 m drop).
- The section is tighter than a normal banked turn — the radius of the 2D arc is small relative to nearby straight segments.

**3D generation:**

- Identify entry point, entry tangent direction, entry Z, exit point, exit tangent direction, and exit Z.
- Construct a half-circle in the vertical plane that contains both the entry and exit tangent vectors.
- The arc goes downward: the peak of the half-circle is at entry altitude, the bottom is at exit altitude.
- The radius is set so the arc fits the vertical drop: `r = (z_entry - z_exit) / 2`.
- Replace the curve section with this downward half-circle, blending smoothly into the preceding and following route segments with matching tangents.

**Open questions:**

- A tight banked turn could match the 2D signature without being a split-S — the Z drop is the distinguishing factor, but how much Z delta is required?
- What if the user draws a split-S but forgets to set Z values? Should the optimizer infer a plausible Z drop from the gate height context, or fall back to the flat CatmullRom?
- How does this interact with the path's existing per-waypoint Z values? The optimizer should not silently override user-set Z values — it should only fill in the 3D arc between the Z-annotated entry and exit waypoints.

---

### Knife-edge (future)

A knife-edge is a roll to 90° while flying straight through a gap. It does not change the 2D path shape but changes the 3D bank angle during that segment. This is a rendering concern (bank/roll visualization) more than a curve-shape concern. Flagging for future consideration once maneuver shape optimization is established.

---

## Architecture

### Proposed layer

A new module `src/lib/track/polyline-maneuver-detection.ts` sits between the existing 2D derived data and the 3D renderer:

```
polyline-derived-3d.ts   ← 3D curve construction (modified to accept maneuver overrides)
         ↑
polyline-maneuver-detection.ts   ← new: detect patterns, output ManeuverSection[]
         ↑
polyline-derived.ts      ← 2D smooth path (unchanged)
         ↑
PolylineShape.points     ← user waypoints (unchanged)
```

### ManeuverSection type

```typescript
type ManeuverKind = "powerloop" | "split-s";

interface ManeuverSection {
  kind: ManeuverKind;
  // Indices into the smooth path point array bounding this section
  startPathIndex: number;
  endPathIndex: number;
  // Pre-computed 3D curve override for this section
  curve3: THREE.CatmullRomCurve3;
}
```

The detection function returns `ManeuverSection[]`. The 3D renderer replaces the curve segment for each detected section with the pre-computed `curve3` and blends the tangents at the join points.

### Detection pipeline

1. Get smooth 2D path points from `getPolyline2DDerived`.
2. Compute per-point heading and accumulated heading change over a sliding window.
3. For powerloop: scan for windows where accumulated heading change ≥ 300° and the 2D path forms a near-closed loop within a plausible diameter range. Gate proximity is used afterward to determine the vertical loop plane, not as a detection criterion.
4. For split-S: scan for windows where accumulated heading change is 140°–220°, the 2D arc radius is tight, and the Z delta across the window is above threshold.
5. For each detected window, compute the 3D curve override.
6. Return as `ManeuverSection[]`, deduplicated and sorted by start index.

### 2D visual representation

Detected maneuver sections should be rendered differently in the 2D canvas:

- **Route line color**: use a distinct color for the maneuver section (amber or a separate maneuver palette color), keeping the normal route color for everything else. The existing per-segment coloring pipeline in `polyline-shape.tsx` already supports this via `warningKindBySegment`.
- **Label**: a small text indicator (`↻` for powerloop, `S` for split-S) at the midpoint of the section on the canvas. This helps the user verify what the system recognized.
- **No extra UI controls**: the user does not need to interact with the maneuver detection. If the system misidentifies a section, the user adjusts the waypoints.

---

## Validation approach

Before integrating into the renderer, prototype the detection and curve generation in isolation:

1. **Unit tests for detection**: given a known set of smooth path points + gate positions, assert that the correct `ManeuverSection[]` is returned. Test with:
   - A clean powerloop drawn as a near-perfect circle near a gate
   - A sloppily drawn powerloop (oval, not centered on the gate)
   - A split-S with clear Z delta
   - A tight normal banked turn that should NOT be classified as a split-S
   - A route with no maneuvers
2. **Visual prototype**: render the `curve3` overrides in the 3D preview for a few known test layouts and verify the loop and half-loop look correct.
3. **Regression**: ensure existing routes without maneuvers are unaffected — the optimizer must be a no-op when no maneuver signatures are detected.

---

## Relationship to existing work

- `path-curve-ux.md`: per-waypoint tension was explored for smoothness control and reverted. Maneuver curve optimization is orthogonal — it is not about tension, it is about replacing specific curve sections with geometrically correct 3D arcs.
- `obstacleNumbering.ts`: powerloop detection was added and reverted from there. The right place for detecting repeated gate passes is in `polyline-maneuver-detection.ts`, not in the numbering module. Once a `ManeuverSection` of kind `powerloop` is known, the numbering module can consume that information rather than re-deriving it.

---

## Open questions summary

1. What drawn-loop quality threshold is "good enough" to trigger powerloop detection vs. falling back to CatmullRom? The loop does not need to be a perfect circle, but how much tolerance is acceptable before false positives appear on tight chicanes?
2. What is the minimum required Z drop to distinguish a split-S from a flat banked turn?
3. Should the optimizer infer missing Z values from gate height context, or require the user to set them explicitly?
4. How should the 2D top-down projection of a vertical loop be presented — show the projected ellipse, or show a special symbol that replaces the drawn loop?
5. Is the segment index approach sufficient for blending tangents at join points, or does the curve substitution need a more sophisticated blend zone?
6. Should detected maneuvers be exposed in the Race Pack output (e.g., "Gate 3 — powerloop") or only in the 3D preview and 2D indicator?
