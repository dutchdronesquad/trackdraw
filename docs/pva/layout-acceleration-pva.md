# Layout Acceleration PVA

Date: March 31, 2026

Status: obstacle presets first pass shipped

## Purpose

This document defines the product shape for `Layout acceleration` as a whole.

TrackDraw already has a capable editor. The next step is not adding a new editing model, but reducing repetitive setup work without making the product feel heavier, more template-driven, or more account-dependent than it is today.

This document exists to clarify how the roadmap items under layout acceleration should relate:

- obstacle presets
- selection grouping
- starter layouts
- template browser
- venue-aware templates later

## Product Goal

Layout acceleration should make it materially faster to get from blank canvas to a usable draft layout.

That means:

- faster insertion of common track sections
- easier repetition of already-built sections
- clearer starting points for first-pass layout work
- no forced shift away from ordinary editable shapes

The feature family should feel like speed assistance for the existing editor, not like a separate templating product.

## Core Boundary

The first meaningful version of layout acceleration should remain account-free.

Keep it account-free:

- curated presets shipped with the product
- grouping and duplicate/move behavior inside a project
- starter layouts bundled with the product
- lightweight project-local reuse later if needed

Keep it out of scope for now:

- user-authored preset libraries
- cross-device preset sync
- shared club or team template libraries
- venue records tied to ownership or identity

Those are better treated as optional-account follow-up, not part of the first acceleration release.

## Problem Framing

TrackDraw currently has three different kinds of friction:

1. Rebuilding the same obstacle patterns repeatedly
2. Repeating sections after they already exist on the canvas
3. Starting from a blank page when users only need a reasonable first draft

Those are related, but they should not be solved by one oversized feature.

## Recommended Feature Split

### 1. Obstacle Presets

Use presets to solve repeated insertion of common multi-shape patterns.

Shipped first pass:

- start/finish setup
- straight gate run
- slalom section
- ladder section

Presets should stay lightweight:

- curated by TrackDraw
- inserted in one action
- expanded immediately into normal shapes
- no persistent preset identity after placement

This is the fastest path to visible value.

### 2. Selection Grouping

Use grouping to solve repeated manipulation of already-existing sections on the canvas.

Grouping should let users:

- treat several selected shapes as one unit
- move grouped sections together
- duplicate grouped sections together
- rotate or lock grouped sections together

Important boundary:

- grouping is not a preset system
- grouping is not a reusable library
- grouping should be project-local editor behavior first

Grouping becomes more valuable after presets exist, but it should not be required to ship presets.

### 3. Starter Layouts

Use starter layouts to solve blank-canvas hesitation.

Starter layouts should be:

- small in number
- clearly editable
- intentionally generic
- closer to “good starting draft” than “official field template”

Examples:

- compact training layout
- simple race layout shell
- open field draft with start/finish and early flow

These should help users start quickly without implying venue specificity or rules compliance.

### 4. Template Browser

The template browser should not come first.

A dedicated browse/apply surface is only justified after:

- the preset catalog proves useful
- grouping exists or is close behind
- starter layouts are clearly worth surfacing

Before that point, a heavyweight browser risks creating too much UI for too little real speed gain.

### 5. Venue-Aware Templates

Venue-aware templates are later and should stay separate from the first acceleration release.

Why:

- they are closer to venue records than to lightweight acceleration
- they imply constraints, dimensions, and recurring field context
- they are much more likely to benefit from ownership and optional accounts

Treat them as a bridge toward the later venue library roadmap item, not as part of the first preset/grouping release.

## UX Direction

The feature family should follow one simple mental model:

- presets insert ready-made sections
- grouping manipulates existing sections as one unit
- starter layouts open with a useful first draft
- templates become a broader browsing concept only after the first three prove value

This separation matters. If the product blurs those concepts together too early, users will struggle to understand whether TrackDraw is placing content, saving reusable content, or managing special objects.

## Recommended Delivery Sequence

### Phase 0: Lock the model

- finalize the acceleration boundary
- keep presets as insertion, not persistent objects
- define grouping as project-local editor behavior
- define starter layouts as curated drafts, not venue templates

### Phase 1: Ship obstacle presets

- 4 curated presets
- desktop and mobile placement
- inserted content remains ordinary editable shapes

This is the smallest slice with the clearest product value.

### Phase 2: Ship selection grouping

- select several shapes
- group them
- move, duplicate, rotate, and lock as one unit

This strengthens repeatability inside real projects without introducing accounts or libraries.

### Phase 3: Add starter layouts

- a small curated set
- entry from onboarding or new-project flow
- clearly framed as editable starting points

### Phase 4: Re-evaluate browse surfaces

- only add a dedicated template browser if presets and starter layouts demonstrably need it
- keep the first browse model close to the existing tool flow if possible

### Phase 5: Revisit venue-aware templates

- only after the optional-account boundary and venue model are clearer

## Recommended First Build Target

If only one layout-acceleration slice should move forward next, it should still be `Obstacle presets`.

Reason:

- highest direct speed gain
- clearest product boundary
- smallest risk of creating new long-term state complexity
- strongest fit with the current editor model

## Open Questions

- Should grouping ship with an explicit named-group concept, or only as lightweight project-local grouping first?
- Should starter layouts live in onboarding, new-project flow, or the normal tool flow?
- Should the first starter layouts include a route, or only obstacle drafts?
- At what point does “starter layout” become a venue template and therefore a different product category?

## Recommendation

Do not treat layout acceleration as one large feature.

Treat it as a sequence of narrowly defined accelerators:

1. presets for insertion
2. grouping for manipulation
3. starter layouts for blank-canvas entry
4. template browser only if usage proves it necessary
5. venue-aware templates later, likely near the optional-account boundary
