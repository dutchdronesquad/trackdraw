# AR Mode PVA

Date: April 16, 2026

Status: proposed

## Delivery Checklist

- [ ] Phase 0: lock the AR product goal
- [ ] Phase 1: define the smallest credible Android prototype
- [ ] Phase 2: define anchoring and alignment flow
- [ ] Phase 3: define iOS fallback path
- [ ] Phase 4: decide whether to build or keep parked

## Purpose

This document defines the intended product shape for `AR mode`.

TrackDraw already has a meaningful 3D model of the track through:

- obstacle geometry
- route geometry
- scale-aware scene logic
- in-app 3D review

That makes AR plausible, but not automatic. The product still needs a concrete answer to what AR is actually for.

## Product Goal

If TrackDraw adds AR, the goal should be:

- project the full track into a real venue
- let the user judge fit, orientation, and obvious placement issues
- support venue-side decision-making before setup starts

The goal should not be:

- a novelty 3D viewer
- a replacement for the 2D editor
- precision surveying

## Core Product Position

TrackDraw should treat AR as a venue-side validation and communication tool, not as an always-on editing mode.

The strongest first direction is:

- Android-first interactive AR prototype
- full-track placement as the primary use case
- iOS treated as a separate fallback path

## Recommended AR Model

### 1. Full-Track Projection First

The primary product promise should be:

- “see the whole planned layout in the real venue”

That is stronger than a section-only preview and better aligned with TrackDraw's planning workflow.

If full-track projection is not reliable enough, TrackDraw can fall back later to smaller section previews.

### 2. Android And iOS Are Different Products Technically

The first AR model should not pretend there is one identical implementation path.

Recommended direction:

- Android: WebXR prototype path
- iOS: separate fallback path such as AR Quick Look

That keeps the product honest about platform reality.

### 3. AR Is A Separate Review Surface

AR should not be treated as “the normal 3D preview, but floating in camera view”.

It needs:

- a dedicated entry point
- AR-ready scene simplification
- clear venue alignment flow

## Problem Framing

AR could help with a few real problems:

1. check whether a full layout plausibly fits a gym or venue
2. validate rough orientation and spacing against real walls, boundaries, or landmarks
3. spot obvious layout problems earlier before crew setup starts

The first version should solve those “fit and orientation” questions before promising fine-grained precision.

## Recommended First-Version Rules

### AR Entry Should Be Deliberate

The first version should use a clear action such as:

- `Open in AR`
- or `Preview in AR`

AR should not be a default part of the editor shell.

### Alignment Must Be User-Led

The first version should require a simple human alignment step.

Recommended first model:

- place the track origin
- rotate to match venue orientation
- preserve TrackDraw scale

This is safer than implying automatic perfect anchoring.

### Scene Simplification Is Required

The AR scene should prioritize:

- readable obstacles
- clear route visibility
- strong contrast
- minimal clutter

The first AR scene does not need every visual detail from the normal 3D preview.

## Recommended Entry Points

Owner-facing entry points:

- 3D review area: `Open in AR`
- export or presentation surface later if AR becomes more stable

Public/share entry points should stay out of scope for now.

Do not start with:

- AR as a mode inside the main editor canvas
- AR embedded into ordinary share links
- AR exposed on every device regardless of support

## Screen-Level V1 Flow

### 1. AR Availability Check

The user chooses `Open in AR`.

TrackDraw should first determine:

- whether the device supports the intended path
- whether the browser/runtime is compatible

If not:

- fail clearly
- optionally offer a fallback path later

### 2. Venue Placement Setup

Before full projection starts, the user should:

- place the track origin on the floor
- rotate the layout to match the venue
- confirm the rough alignment

This is the core product step. If this flow is weak, the rest of AR becomes misleading.

### 3. Full-Track AR Review

Once placed:

- the user can walk around the projected layout
- see overall fit and route direction
- inspect obvious spacing or placement problems

The first version should bias toward stability and clarity, not feature richness.

### 4. Exit Back To Ordinary Review

AR should remain a temporary review surface.

When the session ends:

- the user returns to the ordinary TrackDraw project flow
- AR does not become a second persistent editing environment

## Suggested V1 UI Copy Direction

Recommended product language:

- `Open in AR`
- `Place track`
- `Rotate layout`
- `Confirm placement`
- `AR preview unavailable`

Avoid copy that overpromises:

- `Place accurately`
- `Survey venue`
- `Auto-align track`

Those phrases imply precision the first version likely cannot guarantee.

## Data And Scene Direction

The first AR model should reuse TrackDraw's existing geometry and route knowledge, but not the whole editor scene unchanged.

Recommended AR payload contents:

- route
- obstacles
- scale-preserving origin
- simplified materials
- minimal reference cues

The first version should avoid:

- full editor UI overlays
- excessive labels
- clutter-heavy decorative scene content

## Platform Direction

### Android

The first credible build path is:

- WebXR
- dedicated AR session setup
- full-track placement and review

Android should be the primary prototype target.

### iOS

The first product should define iOS as a separate path rather than forcing parity immediately.

Recommended fallback direction:

- evaluate AR Quick Look or equivalent model-preview path

That may support a different level of interaction than Android WebXR, and that is acceptable if the product communicates it honestly.

## API And Runtime Boundary

The first AR prototype should not require collaboration, sharing, or publishing changes.

Recommended first boundary:

- project-local launch into AR review
- no AR-specific share route
- no AR-backed persistence model beyond the ordinary project

This keeps the work focused on scene reuse, platform support, and placement UX.

## Out Of Scope For The First Version

Keep these out of scope:

- precision surveying
- AR-based editing of shapes in place
- public share links that launch directly into AR
- universal browser parity across all devices
- multi-user AR sessions

## Risks

- placement may look impressive but be too unstable to support real decisions
- iOS and Android may diverge enough that the product feels uneven
- anchoring and alignment may be harder than the rendering itself
- AR may distract from stronger, lower-risk review tools if the prototype does not prove useful quickly

## Recommended Delivery Sequence

### Phase 0: Lock the AR product goal

Start:

- AR exists only as a broad research idea

Done:

- full-track venue projection is the primary goal
- TrackDraw treats AR as a review surface, not an editor mode
- Android-first prototype direction is explicit

### Phase 1: Define the smallest credible Android prototype

Start:

- product goal is fixed

Done:

- Android WebXR prototype scope is concrete
- AR-ready scene contents are defined
- success criteria for usefulness are explicit

### Phase 2: Define anchoring and alignment flow

Start:

- scene scope is clear enough

Done:

- origin placement model is explicit
- rotation and scale flow are explicit
- TrackDraw can test whether alignment is good enough to be useful

### Phase 3: Define iOS fallback path

Start:

- Android path is believable enough to compare against

Done:

- iOS fallback is explicitly chosen or rejected
- parity expectations are documented honestly

### Phase 4: Decide whether to build or keep parked

Start:

- the product shape is specific enough to judge honestly

Done:

- TrackDraw either commits to an Android-first AR prototype
- or keeps AR parked until demand and platform confidence justify it

## Smallest Credible V1

If TrackDraw builds AR, the smallest credible version is:

- Android-first AR prototype
- full-track projection
- user-led origin placement and rotation
- simplified AR scene
- no AR editing
- no AR sharing

Anything larger than that should require a second product decision.
