# Obstacle Presets PVA

Date: March 20, 2026

Status: first pass shipped

## Purpose

This document defines the plan of approach for `Obstacle presets` before implementation starts. The earlier prototype direction did not yet feel right as a product experience. The goal here is to remove ambiguity around scope, UX shape, and technical boundaries before any new build work begins.

## Problem

TrackDraw is now strong enough that creating layouts manually is no longer the biggest technical problem. The next friction point is repetition:

- placing common gate sequences one object at a time
- rebuilding familiar start/finish setups over and over
- recreating training sections that have predictable structure

At the same time, presets can become a trap if they turn into a heavy library system, a hidden templating feature, or a smart auto-layout tool before the product is ready.

## Product Goal

Presets should make common layout building faster without changing the core mental model of TrackDraw.

That means:

- users still place normal editable objects on the canvas
- presets are a speed tool, not a new object type users need to manage forever
- the first version should feel lightweight, obvious, and reversible

## Non-Goals

The first release should not include:

- user-authored presets
- preset sharing
- preset versioning
- preset packs per venue or event type
- rules-aware fit checks
- smart auto-routing or auto-generation
- nested preset composition

## Recommended Product Shape

The best first version is a small curated library of multi-shape building blocks.

Each preset should:

- have a clear name
- show a simple visual preview
- describe the included obstacle pattern
- be placed in one action
- expand immediately into normal shapes after placement

This means a preset is an insertion workflow, not a persistent runtime object.

## Why The Earlier Direction Likely Felt Wrong

Based on the current product shape, the previous implementation was probably unsatisfying for one or more of these reasons:

- it likely introduced too much UI weight for too little speed gain
- it may have felt too technical instead of tactile
- it may have blurred the line between “template”, “group”, and “normal shapes”
- it may have required too many decisions before placement
- it likely tried to solve extensibility before proving the core use case

The next iteration should bias much harder toward simplicity.

## Shipped First-Pass Scope

The shipped first pass includes a deliberately small curated set:

- Start/finish setup
- Straight gate run
- Slalom run
- Ladder section

Each preset should support:

- placement from the tools flow
- one obvious anchor point
- rotation before or after placement
- normal editing after insertion

## UX Proposal

### Entry Point

Add a `Presets` section in the existing tool-selection flow instead of a separate product area.

Why:

- keeps the feature close to normal placement
- avoids introducing a second browsing model
- makes presets feel like an accelerated form of object insertion

Current implementation shape:

- desktop exposes `Presets` as its own tool entry in the main sidebar
- mobile gives `Presets` a separate section above ordinary drawing tools
- both desktop and mobile open a dedicated preset picker before placement mode begins

### Browsing Model

Use compact cards with:

- preset name
- tiny preview
- short description
- object count

The first release should avoid categories deeper than one level. A flat curated list or a very small grouped list is enough.

### Placement Flow

Recommended flow:

1. User opens `Presets`
2. User selects a preset card
3. Cursor enters preset placement mode
4. User clicks or taps to place
5. Preset expands into ordinary shapes
6. Selection remains on the inserted set for immediate move/rotate/adjust

Important:

- the inserted shapes should stay selected as a set
- placement should be cancellable exactly like normal tool placement
- mobile should follow the same flow with minimal extra chrome

### Editing Model After Placement

After insertion:

- shapes behave like any other shapes
- users can still multi-select, duplicate, lock, rotate, or regroup them
- there is no hidden dependency on the preset definition

This keeps the model understandable and avoids long-term preset complexity.

## Technical Proposal

## Data Model

Do not introduce a durable `preset instance` model in v1.

Instead:

- define a preset catalog in code or static data
- each preset resolves to a list of ordinary shape payloads
- placement creates normal shapes with generated ids
- optional metadata may be added transiently for analytics or future migration, but should not be required for core behavior

Possible definition shape:

- `id`
- `name`
- `description`
- `preview`
- `shapes`
- `anchor`
- `defaultRotation`

## Placement Rules

Presets should be authored in local preset coordinates.

At placement time:

- transform the preset relative to the clicked anchor point
- apply rotation if needed
- create ordinary shapes in the editor store
- select the inserted shapes

## Interaction With Future Grouping

Presets should not depend on `Selection grouping`.

However, they should be compatible with it:

- insert shapes normally now
- allow users to group them later if desired

That separation keeps both features cleaner.

## Risks

- Too many presets too early will make browsing noisy
- Over-configurable presets will feel heavy
- Persistent preset identity will complicate editing and undo history
- Weak previews will make the library feel abstract
- If mobile placement needs a special UX, the feature will stall

## Success Criteria

The feature is successful if:

- common sections are materially faster to create
- users understand placement without explanation
- inserted results feel like normal TrackDraw content
- mobile and desktop behavior remain conceptually the same
- no new long-term object complexity is introduced

## Proposed Delivery Sequence

### Phase 0

- Finalize catalog and UX decisions
- Define the preset data shape
- Decide whether previews are static assets or code-rendered miniatures

### Phase 1

- Ship 4 curated presets
- Desktop and mobile placement
- Normal insertion and selection behavior

### Phase 2

- Improve discoverability and polish
- Add a few more presets based on actual usage
- Consider lightweight filtering only if clearly needed

## Open Questions

- Should preset previews be image-based or rendered from the same shape definitions?
- Should placement allow pre-rotation before the first click, or only post-placement rotation?
- Should the initial set include full mini-layouts, or only sectional building blocks?
- Should preset insertion preserve a lightweight “inserted from preset” hint for future analytics/debugging, or stay fully anonymous?

## Recommendation

Keep the first pass small and polish-heavy.

The right next steps are:

- improve placement guidance while preset mode is active
- evaluate whether the current four presets are genuinely useful before adding more
- move on to selection grouping instead of widening the preset catalog too quickly
