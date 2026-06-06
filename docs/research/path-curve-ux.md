# Path Curve Control — UX Research

## Context

### Current state (as of this document)

TrackDraw paths use a **centripetal Catmull-Rom spline** (alpha = 0.5) to smooth the waypoints the user places. The curve passes through every waypoint. There is no per-waypoint curve control — the user can only influence the curve shape by moving, adding, or removing waypoints.

The path has a `smooth` boolean flag. When smooth is on (the default), the Catmull-Rom spline is applied. When off, it renders as straight line segments between waypoints.

### Goal

Give users a way to adjust **how curved** the path is at individual waypoints, without forcing them to add extra waypoints as workarounds for sharp corners. The control should feel natural on both desktop and mobile.

### Explored implementation

We implemented and subsequently reverted a full per-waypoint tension system:

- Added a `tension` scalar (0–1) to both `PolylinePoint` and `PolylineShape`
- Scaled the Catmull-Rom Hermite tangent at each waypoint by `(1 + tension)` to widen arcs
- Added a path-level Curve slider in the inspector (default 25%)
- Added a per-waypoint Curve slider in the inspector when a waypoint is selected
- Attempted canvas bezier handles for on-canvas adjustment

All of this was reverted pending a better UX solution for the on-canvas interaction.

---

## What we've tried (and why it didn't work)

### Canvas bezier handles (rejected)

- Two symmetric dots along the tangent direction, connected by a line
- **Problems:**
  - Both dots do the same thing — confusing, no clear affordance
  - Hit area too small initially; after fix, still felt awkward
  - Path reset on release (bug in coordinate math at mouseup)
  - Mental model mismatch: bezier handles imply directional control, but our tension is a scalar
  - Cluttered canvas with handles on every waypoint

### Inspector slider for selected waypoint (implemented, reverted)

- Click a waypoint → inspector showed a "Waypoint N" panel with a Curve slider
- Also added a path-level Curve slider (25% default) in the inspector Race Line section
- **Problems:**
  - Not discoverable (buried in inspector, no canvas affordance)
  - Slow workflow: click waypoint, look right, drag slider, look back at canvas
  - Not available on mobile in a meaningful way
  - Works as a fallback but not as a primary interaction

---

## Key constraints

- Tension is a **single scalar per waypoint**, not a 2D vector — bezier handle metaphor is wrong
- Must work on **desktop** (primary) and **mobile** (secondary, touch)
- Live preview during adjustment is essential
- Should be discoverable without reading docs
- Should not clutter the canvas when not needed

---

## Patterns from other tools

### Adobe Illustrator

- Full bezier handles — two directional vectors per anchor
- Smooth/corner point toggle (double-click anchor)
- Handle drag is very precise but requires learning
- Not applicable 1:1 because our tension is symmetric and scalar, not directional

### Figma — corner radius handle

- Small circular handle appears inside rounded rect corners on hover/select
- Drag inward/outward to increase/decrease radius
- Only appears when the shape is selected — no clutter otherwise
- **Closest match to our use case**: single scalar control, on-canvas, context-sensitive

### Figma — vector pen editing

- Drag curve segment directly to adjust curvature
- Intuitive: you pull the curve where you want it
- Requires inverse kinematics (screen delta → tension value conversion)

### Vectornator / Linearity Curve

- Smooth node with a single curvature handle that affects both sides symmetrically
- Single dot, draggable, on the perpendicular to the path at that waypoint

### Road/route editors (e.g., Komoot, Strava)

- Drag waypoints only, no per-point curve control
- Curve emerges from waypoint placement

### Audio editors (Premiere Pro rubber-banding)

- Click a keyframe line, drag up/down to change value
- Very direct: the line IS the value, drag it where you want it
- **Applicable**: drag the curve segment itself to change tension at the nearest waypoint

---

## Candidate directions

### A — Drag the curve segment

User grabs the rendered curve (not a handle) between two waypoints and pulls it. The curve bends live. On release, the tension at the nearest waypoint is updated.

**Pros:**

- Most direct — you manipulate the visual result
- No extra UI elements on canvas
- Discoverable via cursor change on hover over path
- Works naturally on mobile (touch drag)

**Cons:**

- Math is complex: need to convert 2D screen delta to 1D tension scalar
- Ambiguous which waypoint's tension is being adjusted (nearest? both?)
- Hard to hit precisely on a thin path line

**Interaction detail:**

- Hover path → cursor becomes `crosshair` or `grab`
- Mousedown on path segment → enters "bend" mode
- Drag perpendicular to the path → tension of the adjacent waypoint increases/decreases
- Release → commit
- Show tension % tooltip during drag

---

### B — Scroll wheel on waypoint (desktop only)

Hover over a waypoint → cursor changes to indicate scroll mode → scroll up/down adjusts tension for that waypoint. Mini tooltip shows current value.

**Pros:**

- Zero visual clutter
- Precise, fast
- Natural for power users

**Cons:**

- Not discoverable at all without a hint
- Conflicts with canvas pan/zoom if scroll is used for that
- Not applicable on mobile (no scroll wheel)

**Could be combined with another approach as a secondary affordance.**

---

### C — Single perpendicular handle per selected waypoint

When a waypoint is selected (clicked), ONE small handle appears — perpendicular to the path direction (not along the tangent). Drag it outward to increase tension, inward to decrease.

**Pros:**

- Single dot = no confusion about which to grab
- Perpendicular direction clearly signals "this controls the arc width"
- Only appears on selected waypoint = no clutter
- More intuitive direction than along-tangent handles

**Cons:**

- Still requires clicking the waypoint first
- Perpendicular direction might not always be obvious on curved sections

---

### D — Waypoint context menu / popover (mobile-first)

Long-press (mobile) or right-click (desktop) on a waypoint → small popover appears with a slider. Closes on outside tap.

**Pros:**

- Works on both platforms
- No canvas clutter
- Familiar pattern (like Figma's text style popover)

**Cons:**

- Extra interaction step
- Breaks flow for rapid editing
- Slider in a popover still feels like a workaround

---

### E — Double-tap/click waypoint to toggle curve mode

Double-click waypoint cycles through preset tension levels: 0% → 25% → 50% → 75% → 100% → 0%. Visual indicator on the waypoint shows the current level.

**Pros:**

- Fast for discrete adjustments
- Works on both desktop and mobile
- Discoverable

**Cons:**

- No fine-grained control
- Preset levels might not be what the user wants

---

## Recommendations

### Desktop

**Primary: single perpendicular handle on selected waypoint (Option C)**

Option A (drag curve segment) is the most intuitive in theory but has a practical problem: the hit target is the path line itself (thin), the direction to drag is ambiguous, and it's unclear which waypoint's tension changes. Option C avoids all of this by tying the handle to an already-selected waypoint.

Proposed interaction:

1. User clicks a waypoint to select it (existing behavior)
2. A single small handle dot appears perpendicular to the path at that waypoint, at a distance proportional to the current tension
3. Cursor changes to `grab` on hover over the dot
4. User drags outward → curve widens live; drag inward → curve tightens
5. Release commits the value
6. Clicking away deselects the waypoint and the handle disappears

The perpendicular direction is intentional: it maps directly to "how wide is this corner" — pulling the handle outward makes the curve bulge outward at that point. This is more legible than along-tangent handles which suggest directional influence rather than arc width.

**Secondary: scroll wheel on the selected waypoint (Option B)**

Once a waypoint is selected and the handle is visible, scrolling up/down on the waypoint dot also adjusts tension in discrete steps (e.g., 5% per tick). This gives precise keyboard-friendly control and feels natural for users who already use scroll to zoom. A small tooltip showing the current % value appears during scroll.

Scroll should only activate when hovering directly over the waypoint dot, not over the path, to avoid conflicting with canvas pan/zoom.

**Fallback: inspector slider**

Re-add the path-level Curve slider to the inspector (for setting a global default across all waypoints) and the per-waypoint slider when a waypoint is selected. This is not the primary interaction but gives exact numeric entry and is always accessible. It should be clearly labeled as a secondary control.

**Discoverability**

Without a handle visible at rest, new users won't know the feature exists. Options:

- Show a faint hint handle on path hover (not on waypoint hover) that disappears when not interacting
- Add a tooltip on the waypoint dot when selected: "Drag handle to adjust curve" or show a small curved arrow icon on the waypoint when selected
- Mention in an empty-state or first-use tip

---

### Mobile

**Primary: long-press waypoint → inline popover (Option D)**

On touch, a long-press on a waypoint opens a compact popover anchored to the waypoint with a horizontal slider labeled "Curve" and the current percentage. Tapping outside dismisses it and commits the change. No canvas handle dot — touch targets for small handles are unreliable.

The long-press is already an established pattern in TrackDraw for context actions (similar to the segment insert marker), so it fits the existing mental model.

**Secondary: inspector slider**

Same as desktop — available in the inspector panel when a waypoint is selected via tap.

**Discoverability on mobile**

The waypoint dot could briefly show a small curved indicator when first tapped (single tap selects, then a subtle pulse or ring animation hints that long-press is available). This is a lightweight hint that doesn't require permanent UI.

---

### Path-level vs. per-waypoint tension

Keep both, but make the relationship explicit in the UI:

- Path-level slider sets the **default** for all waypoints that have no override
- Per-waypoint override only appears in the inspector when a waypoint is selected; the handle on canvas always reflects the effective value (path default or override)
- A waypoint with an override gets a small visual indicator in the waypoint list (e.g., the blue dot in the index badge we had previously)
- "Reset to path default" removes the override — this was already implemented and worked well

---

## Open questions

### Interaction model

1. Should the perpendicular handle be shown for ALL waypoints when the path is selected, or only for the ONE currently selected waypoint? All-at-once gives a better overview but clutters the canvas on long paths.
2. When dragging the perpendicular handle, should the waypoint position stay fixed, or should it move slightly to maintain a consistent arc shape? (Probably fixed — moving the waypoint is a separate action.)
3. Should tension = 0 mean a smooth Catmull-Rom curve with no amplification (current base behavior), or a fully sharp corner? Defining this changes how the slider range feels.

### Visual design

4. How do we visually communicate that a waypoint has a tension override vs. using the path default — without adding persistent clutter? The blue ring we tried was noisy. Maybe a small badge or color shift on the waypoint dot itself.
5. What does the perpendicular handle look like when tension = 0? It would be very close to the waypoint (minimum distance of ~20px). Should we show it at all when tension = 0, or only when tension > 0?
6. If the handle is only visible on the selected waypoint, how does a user discover that different waypoints have different tensions? They would need to click through each one.

### Scope

7. Should dragging a path segment (option A) INSERT a new waypoint (like Illustrator) or be reserved for a future feature? Inserting a waypoint on drag is powerful but changes the scope significantly.
8. Do we need a "smooth all" / "sharpen all" action at the path level, or is the path-level tension slider enough?
9. What happens at the first and last waypoint of an open path? The tangent direction there is only one-sided. The perpendicular direction is well-defined regardless, so the handle still works.

### Technical

10. The scroll wheel on the canvas is currently used for zoom (pinch/scroll). Does hovering over a waypoint and scrolling conflict with zoom? This needs to be tested — it may require `event.preventDefault()` on the scroll event when the cursor is over a waypoint, which has accessibility implications.
11. When path tension changes during a drag, the curve re-renders on every frame. At high waypoint counts this could cause jank. Is debouncing or coarser preview acceptable?

---

## Next steps

### Before building anything

- Answer open question 3 (what does tension = 0 mean?) — this affects the entire data model and the slider range feel
- Decide on all-waypoints vs. selected-waypoint-only for handle visibility (open question 1) — this is a fundamental UX direction choice
- Test scroll-wheel conflict with canvas zoom (open question 10) — if it conflicts, option B is not viable and should be dropped

### Prototype order (desktop)

1. Re-implement the tension data model (types, geometry, polyline-derived cache key) — this is pure backend and can be done independently of the UX
2. Re-add the path-level inspector slider as a minimal working control, to validate the curve math feels right
3. Implement the perpendicular handle for the selected waypoint only — this is the lowest-risk on-canvas interaction to prototype
4. If the perpendicular handle feels good, add it to all waypoints when selected (not just the clicked one) and evaluate whether the visual noise is acceptable
5. Add scroll wheel support on waypoints if open question 10 is resolved favorably

### Prototype order (mobile)

1. Implement the long-press popover on waypoints — this is independent of the desktop handle work and can be done in parallel
2. Test the long-press threshold to make sure it doesn't conflict with the existing tap-to-select and drag-to-move behaviors

### Definition of done

- Per-waypoint tension works on desktop via the perpendicular handle (primary) and inspector slider (fallback)
- Per-waypoint tension works on mobile via long-press popover (primary) and inspector slider (fallback)
- Path-level tension slider sets the default for all waypoints without overrides
- Waypoints with overrides are visually distinguished in the waypoint list
- Resetting a waypoint to path default is a one-click action
- No regression in existing path rendering, waypoint drag, or snap behavior
