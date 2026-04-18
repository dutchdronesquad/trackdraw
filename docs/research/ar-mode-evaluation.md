# AR Mode Evaluation

This document evaluates whether TrackDraw should support AR-based venue projection.

Status: research only. This is not a build commitment.

## Current Fit

TrackDraw already has a meaningful 3D scene through Three.js and react-three-fiber. That makes AR more plausible here than in a purely 2D planning tool.

The product already knows:

- obstacle geometry
- route sections
- approximate scale
- how to present layouts in 3D for review

That means an AR experiment could build on existing scene logic instead of inventing a separate visual model from scratch.

## Primary Goal

The product goal is not just a lightweight AR preview.

The more meaningful use case is:

- stand in a gym or venue
- project the full track into the real space
- check scale, orientation, and spatial fit before setup

That is a stronger product idea than section-only AR, but it also raises the technical bar significantly.

## Platform Reality

AR on the web is not one implementation path.

Android:

- WebXR makes browser-based AR experiments plausible
- Three.js already supports WebXR-oriented integration patterns

iPhone and iPad:

- the practical path is more likely AR Quick Look than the same WebXR runtime
- this implies a separate preview/export path rather than one shared implementation

So the likely product shape is:

- Android WebXR for interactive in-browser AR
- iOS AR Quick Look or another separate fallback path if a full in-browser flow is not practical

## Concrete TrackDraw Changes Required

AR is more feasible than collaboration because TrackDraw already has a meaningful 3D preview stack.

The likely implementation work is still not trivial. TrackDraw would need:

### 1. A Reusable AR-Ready Full-Track Scene

The current 3D preview is optimized for in-app review, not for venue-scale AR runtime reuse.

TrackDraw would likely need a cleaner way to build an AR scene payload for:

- the full route
- the full obstacle layout
- a simplified field or ground reference
- stable origin and orientation cues

That would let the app reuse obstacle geometry and route context without trying to project the editor scene into AR unchanged.

### 2. Venue Anchoring And Alignment Rules

Full-track AR becomes useful only if TrackDraw can define:

- where the projected track starts
- how the track is rotated in the venue
- how scale is preserved in real space
- what the alignment reference is for the user

This is one of the most important product questions, because inaccurate anchoring would make full-track AR look impressive but be misleading.

### 3. An Android WebXR Prototype Path

TrackDraw already uses Three.js and react-three-fiber, so the most plausible Android-first prototype path is:

- dedicated AR entry point
- Three.js WebXR session setup
- full-track route and obstacle rendering
- simple floor placement and orientation flow
- real-world scale validation

This should be treated as a focused prototype rather than an extension of the normal editor canvas.

### 4. A Separate iOS Asset Path

iOS should be treated as a different product path.

If TrackDraw wants iPhone or iPad AR support, the likely practical option is:

- export a `.usdz`-based preview target
- launch it through AR Quick Look

That means iOS does not naturally fit the same implementation path as Android WebXR, especially for full-track placement.

### 5. Simpler AR Presentation Rules

The ordinary 3D preview contains more visual context than an AR prototype needs.

TrackDraw would likely need AR-specific display rules for:

- simplified materials
- stronger contrast against real environments
- clearer route visibility
- reduced visual clutter

## Good Direction Even Without AR

Some AR-oriented work would improve TrackDraw even if AR never ships.

### 1. Better Venue Alignment And Scale Cues

If TrackDraw gets better at expressing track origin, orientation, and scale, that helps:

- venue planning
- exports
- race-day setup communication
- future AR experiments

### 2. Cleaner Reuse Of 3D Scene Construction

If the current 3D preview logic becomes easier to reuse in dedicated AR-ready scenes, that improves:

- cinematic export consistency
- future scene presets
- venue-side presentation tooling
- any later AR experiment

### 3. Clearer Visual Layers In 3D

If route, obstacles, labels, and overlays can be toggled or simplified more deliberately, that helps:

- normal 3D readability
- mobile 3D review
- exported scenes
- AR viability

## What AR Could Help With

AR could be useful for:

- projecting a full track into a gym or venue before setup
- checking whether the layout fits the room as expected
- validating track orientation and spacing in real space
- walking the venue and spotting obvious placement issues earlier

AR is much less likely to be useful for:

- replacing the 2D editor
- replacing the ordinary 3D preview
- precision surveying without strong alignment rules

## Suggested Research Questions

1. Can TrackDraw project a full field-scale layout with stable enough placement in a gym or venue?
2. What origin, rotation, and scale flow would users need to align the projected track reliably?
3. Does iOS require AR Quick Look or another fallback instead of a shared browser runtime for this use case?
4. At what point does full-track AR become misleading because tracking or alignment accuracy is not good enough?

## Recommendation

AR is worth keeping as an active evaluation track.

Recommended first research outcome:

1. validate a narrow Android WebXR prototype
2. validate a practical iOS path separately
3. aim the prototype at full-track venue projection first
4. use section-based preview only as a fallback if full placement is not reliable enough
5. continue only if it helps real venue-side decision-making

Recommended product direction:

- treat Android and iOS as separate technical paths
- treat full-track venue projection as the primary goal
- use section-based preview only as a fallback scope
- improve venue alignment cues and 3D scene reuse even if AR itself stays experimental

## References

- MDN WebXR Device API: https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
- MDN XRSystem `requestSession`: https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession
- Three.js `ARButton`: https://threejs.org/docs/pages/ARButton.html
- Apple Augmented Reality overview: https://developer.apple.com/augmented-reality/
- Apple AR Quick Look model previewing: https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look
- Apple Quick Look overview: https://developer.apple.com/augmented-reality/quick-look/
