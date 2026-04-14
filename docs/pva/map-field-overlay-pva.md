# Map And Field Overlay PVA

Date: April 14, 2026

Status: proposed

## Delivery Checklist

- [ ] Phase 0: lock the product model
- [ ] Phase 1: ship a single image overlay first pass
- [ ] Phase 2: add practical editor controls
- [ ] Phase 3: define export and share behavior
- [ ] Phase 4: revisit richer transforms later

## Purpose

This document defines the product shape for `Map and field overlay`.

TrackDraw already lets users build layouts on a clean field with precise scale, snapping, and route editing. The missing layer is real venue context. Users sometimes want to draft on top of:

- a field map
- a satellite or drone image
- a floor plan
- a club venue sketch

The goal is to add that context without turning TrackDraw into a GIS tool, image editor, or calibration-heavy mapping product.

## Product Goal

Map and field overlay should make it easier to position a layout against real venue context.

That means:

- users can place one background image behind the editor canvas
- the image can be positioned and scaled until it roughly matches the TrackDraw field
- the overlay helps placement decisions without becoming the source of truth for measurement accuracy
- the feature remains practical on desktop and mobile

## Core Boundary

The first meaningful version should remain:

- usable without an account
- local-first
- project-bound rather than library-bound

Keep it in scope for the first release:

- one overlay image per project
- image import from the current device
- position, scale, opacity, visibility, and lock state
- editor-only overlay support first

Keep it out of scope for now:

- multiple layered overlays
- perspective correction
- image warping
- georeferencing
- account-backed venue libraries
- collaborative overlay annotation

## Problem Framing

TrackDraw currently asks users to translate real venue context mentally.

That causes friction in a few common cases:

1. Outdoor field planning against a real grass area or park boundary
2. Indoor layout work against a hall floor plan
3. Club reuse of a familiar venue where obstacle placement depends on known landmarks

The first version should solve those cases through a simple visual underlay, not through advanced mapping tools.

## Recommended Product Model

### 1. One Project-Level Overlay

Each project can optionally carry one overlay image.

That keeps the model simple:

- no overlay gallery
- no overlay stack
- no ambiguity about which image is active

If TrackDraw needs richer overlay behavior later, that should be a follow-up.

### 2. Overlay Is Context, Not Measurement Truth

The TrackDraw field dimensions remain the measurement model.

The overlay helps align the design visually, but the product should not imply:

- survey-grade accuracy
- automatic real-world calibration
- rules validation from the image alone

This needs to stay explicit in the UX.

### 3. Local-First Asset Handling

The first pass should treat the overlay like project-local working media.

Preferred first direction:

- load an image from the device
- keep it tied to the project state on this device
- preserve it in normal project continuity where practical

Do not let the first pass depend on accounts, cloud asset storage, or a new media backend.

## UX Direction

The feature should feel like a practical editor aid:

- add overlay
- align it roughly
- lower opacity if needed
- lock it
- keep building normally

The overlay should not compete with obstacle editing for attention.

Recommended controls:

- add or replace overlay
- show or hide overlay
- opacity slider
- lock or unlock overlay interaction
- reset transform
- remove overlay

Recommended interaction behavior:

- overlay sits behind normal shapes and route content
- when unlocked, it can be moved and scaled
- when locked, it cannot intercept normal editor actions

## Recommended Entry Points

The first version should expose overlay controls inside the normal editor workflow rather than as a separate project-management feature.

Recommended entry points:

- editor toolbar or contextual canvas controls: `Add overlay`
- inspector or canvas settings panel: overlay controls when an overlay exists
- replacement action from the same overlay control area

Recommended persistent controls once an overlay exists:

- show or hide
- lock or unlock
- opacity
- replace image
- remove overlay

Do not start with:

- a dedicated venue-management screen
- account-level overlay libraries
- multi-step setup wizards before the first image can even be placed

## Screen-Level V1 Flow

### 1. Add Overlay

The user chooses `Add overlay` from the editor.

The first version should support:

- choosing an image from the current device

After import:

- the overlay appears behind the field
- it starts visible and unlocked
- TrackDraw surfaces the main transform controls immediately

### 2. Align Overlay

The user should then be able to:

- move the overlay
- scale the overlay
- reduce opacity
- lock it once it is roughly aligned

This step should feel lightweight. The product should support rough alignment, not force precision calibration.

### 3. Edit With Overlay

Once locked:

- normal obstacle and route editing stays primary
- the overlay remains visible as context
- the overlay should not intercept selection or drag actions

### 4. Replace Or Remove Overlay

The user should be able to:

- replace the image without deleting the rest of the project
- remove the overlay entirely
- restore a cleaner editor state without side effects on the design

## Suggested V1 UI Copy Direction

The feature should use practical, non-technical language:

- `Add overlay`
- `Replace overlay`
- `Hide overlay`
- `Lock overlay`
- `Opacity`
- `Reset overlay`
- `Remove overlay`

Avoid copy that implies advanced mapping behavior, such as:

- `Calibrate map`
- `Georeference image`
- `Anchor to world`

That would overpromise what the first version actually does.

## Editor Behavior Recommendation

### First Pass Controls

The first version should support:

- move
- uniform scale
- opacity
- lock
- visibility toggle

Do not require rotation in the first pass unless implementation turns out to be very cheap. Most real value comes from rough position and scale.

### Mobile Recommendation

Mobile should support overlay visibility and lock state cleanly from ordinary controls.

Direct transform manipulation on mobile is acceptable only if it remains reliable and does not conflict with canvas pan/zoom. If needed, the first mobile pass can bias toward:

- visibility toggle
- opacity
- lock
- simpler slider-based scale adjustment

That is better than forcing desktop-style transform handles into a cramped mobile interaction model.

## Suggested Desktop Interaction Model

The first desktop pass should support direct manipulation.

Recommended controls:

- drag to move
- handles or a simple focused control to scale uniformly
- opacity slider in a side panel or compact control strip
- lock toggle to exit overlay-adjustment mode cleanly

Desktop can carry the richer interaction model first because it has more room and lower gesture conflict.

## Suggested Mobile Interaction Model

The first mobile pass should favor safety and clarity over gesture richness.

Recommended first direction:

- visibility toggle
- opacity slider
- lock toggle
- simple scale control
- optional reposition mode only if it remains reliable

If mobile direct manipulation feels fragile, it is acceptable for v1 mobile to be more limited than desktop as long as the overlay remains usable.

## Data Model Direction

The project should store lightweight overlay metadata plus a reference to the image payload.

The exact storage mechanism can vary, but the product model should assume:

- overlay exists inside one project
- overlay has transform state
- overlay can be removed or replaced without affecting the rest of the design

Expected project-level overlay fields:

- image source reference
- width and height metadata if needed
- x offset
- y offset
- scale
- opacity
- visible flag
- locked flag

Avoid introducing a broader reusable `venue asset` concept in the first pass.

## Storage Direction

The first overlay implementation needs a practical answer for image payload storage.

Product-wise, the preferred direction is:

- overlay belongs to one project
- overlay persists with that project on the same device
- replacement and removal are cheap operations from the user's perspective

Technical direction should favor:

- local-first storage
- explicit payload-size guardrails
- no account or remote media dependency in the first pass

The product should also define failure behavior:

- if an image is too large, fail clearly
- if an overlay cannot be restored, the project itself should still open safely

## Export And Share UX

Even if the first version keeps overlays out of export and share by default, the editor should explain that cleanly.

Recommended first behavior:

- overlay is visible in the editor
- standard exports and shares continue to represent the TrackDraw design itself
- TrackDraw does not silently include venue imagery in published output

If the product later revisits export inclusion, that should be a separate user decision per export path.

## Export And Share Boundary

This needs an explicit decision before implementation expands.

Recommended first direction:

- editor overlay first
- do not include the overlay in normal exports or published shares by default

Why:

- it avoids surprising users with accidental third-party imagery in exports
- it keeps copyright and privacy questions smaller
- it avoids turning a practical editor aid into a publishing commitment immediately

Later, TrackDraw can revisit:

- optional inclusion in PNG/PDF export
- optional inclusion in published shares
- asset sanitization and payload-size handling

## Risks

- Users may over-trust visual alignment and assume real-world accuracy that the app does not guarantee
- Image payload handling may create local-storage pressure if the implementation stores large overlays directly in project state
- Mobile transform behavior may become frustrating if overlay gestures fight canvas gestures
- Export/share expectations may become confused if the overlay appears in the editor but disappears elsewhere without clear messaging

## API And Runtime Boundary

The first version should avoid any backend dependency.

Recommended first direction:

- no upload API
- no image hosting
- no share-time overlay asset fetch path

This keeps the first version in the current local-first editor boundary and avoids turning a useful editor aid into a storage platform project.

## Recommended Delivery Sequence

### Phase 0: Lock the model

Start:

- the roadmap item exists
- no implementation assumptions are locked

Done:

- one-overlay-per-project direction is explicit
- local-first asset handling is chosen
- export/share behavior is explicitly first-pass out of scope or opt-in later
- mobile interaction boundary is clear

### Phase 1: Ship a single image overlay first pass

Start:

- project model for one overlay is agreed

Done:

- user can add one overlay image
- overlay renders behind the editor canvas
- overlay can be shown or hidden
- overlay can be removed or replaced

### Phase 2: Add practical editor controls

Start:

- overlay can already render reliably

Done:

- overlay can be moved
- overlay can be uniformly scaled
- opacity is adjustable
- overlay can be locked so normal editing stays safe

### Phase 3: Define export and share behavior

Start:

- overlay is useful inside the editor

Done:

- TrackDraw explicitly decides whether overlay stays editor-only
- if any export inclusion is added, it is deliberate and explained
- share behavior is documented and fail-safe

### Phase 4: Revisit richer transforms later

Start:

- first pass is shipped and users have real usage feedback

Done:

- rotation, perspective controls, or richer calibration are only considered if simple overlay placement proves genuinely valuable

## Recommended Next Build Target

The next build target should be a first editor-only slice:

- one image overlay
- local-first
- move, scale, opacity, lock
- no export/share inclusion yet

That is the smallest version with clear venue-side value and manageable product risk.

## Smallest Credible V1

If TrackDraw decides to build this, the smallest credible version is:

- one image overlay per project
- add, replace, remove
- visible behind the editor canvas
- move, uniform scale, opacity, lock
- local-first only
- no export or share inclusion

Anything beyond that should be treated as a second product decision rather than part of the first pass by default.
