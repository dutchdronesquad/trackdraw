# Published Gallery Evaluation

This document evaluates whether TrackDraw should support a browsable gallery of published user-made tracks.

Status: research only. This is not a build commitment.

## Current Fit

TrackDraw already has the beginnings of a publish model:

- local-first editing
- account-backed projects
- published read-only shares

That makes a gallery much more plausible than collaboration because it can build on snapshot publishing instead of live editing.

Relevant current boundaries:

- projects are saved as owned account-backed records in [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
- published shares are stored as read-only snapshots in [src/lib/server/shares.ts](../../src/lib/server/shares.ts)
- share creation already distinguishes owner, project, expiry, and revocation in [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)

## Why A Gallery Is More Plausible Than Collaboration

A gallery does not require TrackDraw to solve:

- live sync
- conflict handling
- shared undo/redo
- multi-user presence

Instead, it mainly requires stronger publishing, ownership, and moderation boundaries.

That is a much more natural extension of the current product.

## Concrete TrackDraw Changes Required

TrackDraw cannot expose a credible gallery by simply listing existing share links.

It would need at least the following:

### 1. A Distinct Published Gallery State

Current shares are private-by-default read-only snapshots that happen to be shareable.

A gallery likely needs a stronger distinction between:

- private project
- published share link
- gallery-visible published track

That suggests a dedicated gallery visibility state instead of assuming every publish becomes gallery content.

### 2. Opt-In Publishing Controls

Gallery visibility should be explicit.

TrackDraw would need controls for:

- publish privately via link only
- publish and allow gallery discovery
- remove from gallery without destroying the underlying project

That keeps the current share model intact while adding a public-facing layer more safely.

### 3. Better Published Metadata

The current share model stores:

- title
- description
- shape count
- field size
- owner and project relation

That is enough for private sharing, but a gallery likely needs more display metadata such as:

- cover image or preview frame
- category or track tags
- venue style or field type
- published author display rules

### 4. Ownership And Attribution Rules

If a gallery exists, TrackDraw needs clear answers for:

- whether anonymous uploads are allowed
- whether account ownership is required
- whether the gallery shows real profile names, nicknames, or neither
- whether a published gallery track can still be edited privately afterward

This is where the account model becomes more important.

### 5. Moderation And Reporting Basics

A gallery does not need a heavy social stack, but it still needs a minimum moderation model.

TrackDraw would need:

- report/remove flow
- private versus public publish defaults
- basic abuse boundaries
- some curation or visibility controls

Without those, a public gallery becomes operationally messy very quickly.

### 6. Discovery Scope Limits

The first gallery should probably not be a full social platform.

A practical first pass would likely keep discovery narrow:

- newest
- featured
- tags or categories
- maybe simple search

That is enough to validate whether gallery browsing has real product value.

## Good Direction Even Without A Public Gallery

Several gallery-oriented improvements are useful even if a public gallery never ships.

### 1. Stronger Publish States

Clearer publish states would improve the current product anyway:

- private project
- published share
- revoked share
- later gallery-visible publish

That would make sharing easier to understand.

### 2. Better Share Metadata

Even without a public gallery, stronger metadata improves:

- share cards
- project manager share lists
- future landing page examples
- published previews

### 3. Better Ownership Boundaries

Clearer ownership and attribution rules improve:

- account-backed projects
- published shares
- future team or club surfaces
- later community features

## Recommendation

Published gallery research is worth continuing.

It is a much more plausible extension of TrackDraw than live collaboration because it builds on the publish/share model that already exists.

Recommended first outcome:

1. define publish states more clearly
2. require explicit gallery opt-in
3. add richer published metadata before building public discovery
4. keep moderation and discovery narrow in any first pass

## References

- Current publish API: [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)
- Current share storage model: [src/lib/server/shares.ts](../../src/lib/server/shares.ts)
- Current project storage model: [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
