# Layout Acceleration PVA

Date: March 31, 2026

Status: obstacle presets, selection grouping, and starter layouts first pass shipped

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

The first meaningful version of layout acceleration should remain usable without an account.

Keep it usable without an account:

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

Shipped first pass:

- multi-select can be grouped and ungrouped
- grouped sections move and duplicate as one unit
- group controls are available in desktop/mobile selection flows
- a group can carry an optional project-local name

Grouping should let users:

- treat several selected shapes as one unit
- move grouped sections together
- duplicate grouped sections together
- rotate or lock grouped sections together

Important boundary:

- grouping is not a preset system
- grouping is not a reusable library
- grouping should be project-local editor behavior first

Grouping now exists as project-local editor behavior and remains intentionally separate from any reusable library model.

### 3. Starter Layouts

Use starter layouts to solve blank-canvas hesitation.

Shipped first pass:

- Open practice
- Compact race start
- Technical ladder line
- surfaced from onboarding and new-project flow
- created as ordinary editable projects, not as template objects

Starter layouts should stay:

- small in number
- clearly editable
- intentionally generic
- closer to “good starting draft” than “official field template”

Examples:

- compact training layout
- simple race layout shell
- open field draft with start/finish and early flow

These should help users start quickly without implying venue specificity or rules compliance.

### 4. Shared Template Libraries

A broader template-browsing surface should not come first.

Without accounts, it risks becoming a second curated content surface that overlaps awkwardly with presets and starter layouts.

If TrackDraw goes broader here later, it should be as an account-backed library model:

- personal templates
- shared club or team templates
- clearer ownership and management

That is a different product category from layout acceleration first-pass work.

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
- shared template libraries only become relevant once ownership and account boundaries are clearer

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
- add lightweight naming only if it stays project-local

This strengthens repeatability inside real projects without introducing accounts or libraries.

### Phase 3: Add starter layouts

- a small curated set
- entry from onboarding or new-project flow
- clearly framed as editable starting points

### Phase 4: Revisit shared libraries later

- only revisit broader template browsing once optional accounts can support ownership
- treat personal or shared template libraries as a separate account-backed track

### Phase 5: Revisit venue-aware templates

- only after the optional-account boundary and venue model are clearer

## Recommended Next Build Target

The next layout-acceleration work should now be polish rather than a new category.

Reason:

- presets, grouping, and starter layouts now cover insertion, manipulation, and blank-canvas entry
- the main remaining questions are about which starters get used and what deserves refinement
- this keeps the acceleration work usable without an account and avoids inventing a broader template surface too early

## Open Questions

- Should the first starter layouts include a route, or only obstacle drafts?
- At what point does “starter layout” become a venue template and therefore a different product category?

## Recommendation

Do not treat layout acceleration as one large feature.

Treat it as a sequence of narrowly defined accelerators:

1. presets for insertion
2. grouping for manipulation
3. starter layouts for blank-canvas entry
4. starter-layout and preset polish based on real use
5. shared template libraries later, likely on the account-backed side
6. venue-aware templates later, likely near the optional-account boundary
