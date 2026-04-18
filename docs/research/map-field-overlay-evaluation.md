# Map And Field Overlay Evaluation

This document evaluates the product shape and UX approach for a map and field overlay feature in TrackDraw.

Status: proposed. See `docs/pva/map-field-overlay-pva.md` for the implementation plan once approved.

## Purpose

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

### 3. Overlay Asset Handling Needs A Chosen Direction

Map and field overlay is straightforward as an editor feature, but less straightforward as a storage feature.

The main product question is:

- should overlay images remain device-local only
- or should signed-in account-backed projects sync overlay assets across devices

This document recommends choosing the second path for v1. See Storage Options below.

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

## Storage Options

The first overlay implementation needs a concrete storage answer before the rest of the feature is locked.

TrackDraw already has existing media-oriented infrastructure and available bucket capacity through the current media path. That makes account-backed overlay sync a realistic option, but it still should not be treated as free.

### Option A: Device-Local Only

Model:

- overlay image stays on the current device
- project stores overlay metadata plus a local asset reference
- opening the same project on another device may not restore the image

Pros:

- smallest implementation slice
- no backend dependency
- easier to ship quickly

Cons:

- weak cross-device continuity
- signed-in users may reasonably expect the overlay to follow the project
- the feature may feel incomplete for home-planning to race-day-mobile workflows

### Option B: Hybrid Model With Signed-In Asset Sync

Model:

- logged-out projects keep overlay assets on-device
- signed-in account-backed projects store overlay assets through the existing media/storage path
- project metadata stores transform state plus an asset reference
- opening the same signed-in project on another device restores the overlay if sync succeeded

Pros:

- matches the value proposition of account-backed projects better
- supports real cross-device venue workflows
- avoids treating overlay as a throwaway local-only aid for signed-in users

Cons:

- adds upload, replace, cleanup, and sync-state complexity immediately
- requires payload limits, accepted format rules, and failure-state UX from day one
- increases the implementation scope from editor feature to editor-plus-asset-sync feature

### Chosen V1 Direction

V1 should use the hybrid model.

That means:

- logged-out projects keep overlay assets on-device
- signed-in account-backed projects sync overlay assets through the existing media/storage path
- project metadata stores transform state plus an asset reference
- export/share inclusion stays out of scope for v1

This is the strongest product direction because the feature is meant to support:

- desktop planning at home
- mobile reopening on site
- continuity across devices for signed-in projects

## Export And Share Behavior

Even if the first version keeps overlays out of export and share by default, the editor should explain that cleanly.

Recommended first behavior:

- overlay is visible in the editor
- standard exports and shares continue to represent the TrackDraw design itself
- TrackDraw does not silently include venue imagery in published output

This avoids:

- surprising users with accidental third-party imagery in exports
- copyright and privacy questions from published venue images
- turning a practical editor aid into a publishing commitment immediately

If the product later revisits export inclusion, that should be a separate user decision per export path.

## Risks

- Users may over-trust visual alignment and assume real-world accuracy that the app does not guarantee
- Image payload handling may create local-storage pressure if the implementation stores large overlays directly in project state
- Mobile transform behavior may become frustrating if overlay gestures fight canvas gestures
- Export/share expectations may become confused if the overlay appears in the editor but disappears elsewhere without clear messaging

## Success Criteria

The first version is successful if:

- a user can align an overlay quickly without fighting the editor
- a signed-in user can reopen the same project on another device and still see the overlay
- overlay failures do not block project open
- the feature helps placement decisions without confusing users about measurement accuracy
