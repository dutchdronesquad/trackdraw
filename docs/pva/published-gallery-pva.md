# Published Gallery Evaluation PVA

Date: April 18, 2026

Status: proposed

## Decision Summary

Recommended decision:

- approve continued product-definition work
- do not approve implementation yet
- treat gallery as a small, opt-in, account-backed discovery surface if it moves forward
- treat roles, moderation authority, and platform authorization as a separate foundation decision

This document is meant to be concrete enough to decide whether the gallery deserves implementation planning at all.

## Approval Recommendation

TrackDraw should approve the gallery for a later build only if the team accepts this product shape:

- signed-in owners only
- opt-in on top of a published share
- discovery-first, not social-first
- example discovery is the primary goal
- Featured as the primary browse model
- Recent is also part of v1, but remains visually secondary to Featured
- owner unlist plus moderator or admin hide as the minimum control model

TrackDraw should not approve implementation yet if the team expects any of these in v1:

- comments
- likes
- public profiles
- open anonymous gallery publishing
- broad search/ranking/social behavior

## Delivery Checklist

- [ ] Phase 0: lock the gallery model
- [ ] Phase 1: define publish and gallery visibility states
- [ ] Phase 2: define gallery entry fields and browse surface
- [ ] Phase 3: define moderation and control minimum
- [ ] Phase 4: decide whether to build or keep parked

## Go / No-Go Criteria

Go for implementation planning if:

- the team accepts that gallery visibility is a second decision after share publishing
- account-backed ownership is a hard requirement
- minimum moderation is considered non-optional
- the product is comfortable with a very small first browse surface
- the team accepts that gallery curation depends on a separate roles/authorization model

No-go or keep parked if:

- TrackDraw wants anonymous gallery entries
- moderation ownership is still unclear
- attribution rules are still unresolved
- the team expects a social product rather than a narrow discovery surface

## Purpose

This document defines the intended product shape for `Published gallery evaluation`.

TrackDraw already has published read-only shares. A gallery would be a different product surface:

- shares are direct-link publishing
- a gallery is browseable discovery

That sounds simple, but it changes the product meaning of publishing. The gallery cannot be treated as “list all public links” without creating consent, moderation, and attribution problems.

This document exists to make the decision concrete enough that TrackDraw can either:

- commit to a small gallery with clear rules
- or explicitly keep it parked

## Product Goal

If TrackDraw adds a gallery, it should help users discover strong public track examples without turning TrackDraw into a social platform.

That means:

- gallery visibility is explicit and opt-in
- authorship is visible and trustworthy
- moderation remains small but real
- the gallery opens published tracks, not editable project state
- the first version stays discovery-first rather than community-first

More specifically, the gallery should help users discover beautiful, useful example tracks.

## Core Product Position

TrackDraw should treat gallery visibility as a second publishing decision, not as the default result of sharing.

The product model should be:

- project: editable working state
- published share: read-only snapshot by direct link
- gallery entry: intentionally browseable published share

The gallery should build on the existing share model, but it should not erase the distinction between private-by-link publishing and public discovery.

## Recommended Gallery Model

### 1. Accounts Required

Gallery-visible entries should require an account-backed owner.

Why:

- gallery entries need attributable ownership
- removal and unlisting need a stable control model
- moderation becomes much harder without identity

Recommendation:

- anonymous share publishing can remain for direct links
- anonymous publishing should not be gallery-eligible

### 2. Explicit Opt-In

The key rule should be:

- publishing a share does not automatically place it in the gallery

Instead:

1. create or update a published share
2. choose whether that share is `link only` or `gallery visible`

This keeps ordinary sharing safe and deliberate.

### 3. Gallery Entry Tied To A Published Share

The first gallery should not invent a separate content model beyond what is necessary.

Preferred first direction:

- a gallery entry points at one published share
- the published share remains the canonical read-only viewer destination
- removing gallery visibility should not require deleting the share itself

That keeps the public route model clean:

- gallery is browse and discovery
- share page is the actual track view

## Concrete First-Version Rules

### Gallery Eligibility

A track can become gallery-visible only if:

- the user is signed in
- the project has a valid published share
- the share is not expired
- the project has a non-empty title
- the project has a short description or summary
- the share has a usable preview image
- the account has a visible display name
- the user explicitly opts in to gallery visibility

Optional later rules:

- minimum preview quality
- minimum metadata completeness
- curator approval

### Gallery Entry Fields

The first gallery entry should include only the fields needed for believable discovery:

- track title
- author display name
- published preview image
- short description or summary
- field size
- shape count
- publish date
- token or share reference

Required for gallery opt-in in v1:

- track title
- short description or summary
- author display name
- published preview image

Derived rather than separately entered:

- field size
- shape count
- publish date

Optional later fields:

- track tags
- venue type
- difficulty or style labels
- club attribution

### Gallery Controls For Owners

The owner should be able to:

- make an entry gallery-visible
- remove it from the gallery without deleting the share
- update entry metadata by republishing or editing gallery-facing fields
- revoke the underlying share, which also removes gallery visibility

That is the minimum believable control surface.

## Recommended User Flow

The intended first flow should be:

1. user designs a track
2. user publishes a normal read-only share
3. user sees an explicit secondary option such as `Show in gallery`
4. user confirms gallery-facing metadata
5. gallery card links into the canonical share view

Important product behavior:

- direct-link sharing remains simple
- gallery participation feels intentional
- the user can leave the gallery later without destroying their ordinary share flow

## Recommended Entry Points

The first version should keep gallery controls close to the existing publish flow instead of creating a second disconnected publishing surface.

Recommended owner entry points:

- Share dialog: after a share exists, show a secondary `Show in gallery` action
- Projects or shares management surface: show gallery state for an existing published share
- Gallery entry management later: allow unlisting from the same owner-facing management area

Recommended public entry points:

- a dedicated gallery browse route
- optional landing-page link into the gallery once the surface is good enough to represent the product publicly

Do not start with:

- gallery controls hidden deep in account settings
- a separate “publish to gallery” flow that bypasses normal share creation
- gallery visibility as a default toggle during first share creation

## Screen-Level V1 Flow

### 1. Share Dialog Follow-Up

When a user has a valid published share:

- show current share state
- show whether the share is `Link only` or `Gallery visible`
- if it is `Link only`, offer `Show in gallery`
- if it is already gallery-visible, offer `Remove from gallery`

If the user chooses `Show in gallery`, open a small confirmation surface rather than toggling it immediately.

### 2. Gallery Publish Confirmation

The first gallery confirmation step should ask only for the minimum metadata needed:

- title
- short description
- confirmation of visible author display name

Optional preview handling can stay automatic in v1 if the share already has a suitable generated preview.

The confirmation surface should explicitly explain:

- this track becomes browseable by others
- the read-only share remains the thing people open
- the user can remove it from the gallery later

### 3. Gallery Browse Page

The first gallery page should support:

- featured section
- recent section
- simple cards

Each card should show:

- preview image
- title
- author
- compact metadata row such as field size and obstacle count

Opening a card should go to the existing canonical shared view, not to a special gallery-only detail page.

### 4. Owner Control Flow

The first owner control flow should allow:

- unlist from gallery
- keep the share active
- revoke the share entirely if desired

Those should remain separate actions.

## Suggested V1 UI Copy Direction

The product language should make the distinction visible:

- `Publish share`
- `Show in gallery`
- `Remove from gallery`
- `Link only`
- `Gallery visible`

Avoid copy that blurs those together, such as:

- `Make public`
- `Publish publicly`
- `Community post`

Those phrases imply a broader social model than the first version actually supports.

## Browse Surface Recommendation

The first gallery should be small and structured.

Recommended first browse groups:

- Featured
- Recent as a clearly secondary group in v1

Recommended first browse card contents:

- preview image
- title
- author
- short metadata row

Recommended first open behavior:

- clicking a gallery card opens the existing read-only shared track view

Do not start with:

- infinite-scroll feed behavior
- heavy search
- ranking algorithms
- public remix trees

## Showcase Positioning Recommendation

The gallery should be positioned more like a curated example showcase than a broad public publishing feed.

That means:

- quality matters more than volume
- not every published share needs to be gallery-worthy
- browse should feel intentional rather than noisy
- cards should help users quickly find inspiring layouts rather than exhaustively index every public track

This positioning should shape product decisions throughout the feature:

- Featured matters more than Recent
- Featured is manually curated
- metadata should stay compact and useful
- social mechanics should stay out
- moderation should protect quality and trust, not just policy compliance

## Data Model Direction

The first gallery model should stay as close as possible to existing published-share concepts.

Recommended first entities:

- project
- published share
- gallery visibility state attached to a published share

That can be implemented either as:

- extra gallery fields on the published share record
- or a narrow `gallery_entry` record keyed to one published share

Product-wise, the important thing is not the storage table shape. The important thing is that the model supports:

- share can exist without gallery visibility
- gallery visibility can be removed without revoking the share
- gallery browse results open a specific share

Recommended first gallery-facing fields:

- `share_token`
- `owner_user_id`
- `gallery_state`
- `gallery_title`
- `gallery_description`
- `gallery_preview_image`
- `gallery_published_at`
- `gallery_hidden_at` or equivalent moderation state

Recommended first state direction:

- `link_only`
- `gallery_visible`
- `featured`
- `hidden`

Intent:

- `link_only` means the share exists but is not browseable in the gallery
- `gallery_visible` means the entry is browseable in the normal gallery surface
- `featured` means the entry is still gallery-visible and also selected for the primary curated section
- `hidden` means the entry is removed from gallery discovery through moderation state

### Share Revocation And Expiry Behavior

If the underlying share is revoked or expires while a gallery entry is active, gallery visibility should not survive independently.

Recommended first direction:

- a revoked share removes gallery visibility immediately
- an expired share removes gallery visibility at the point of expiry
- the gallery entry record may be kept for auditability, but should not be surfaced in browse results
- the owner does not need to separately unlist before revoking

This means gallery visibility is always contingent on an active, non-expired share. A gallery entry without a valid underlying share is not a valid gallery entry.

Do not allow a gallery entry to remain browseable after its share has been revoked or expired. That would break the core promise that a gallery card opens a working track view.

## Required Preconditions Before Build

Before implementation starts, TrackDraw should lock:

- exact owner flow from `publish share` to `gallery visible`
- minimum metadata fields required for a gallery entry
- visible author field source
- gallery-specific owner/admin controls
- whether gallery entries need manual featuring tools from day one
- dependency on a separate roles and authorization model

Avoid first-pass fields that imply a larger social model:

- likes count
- comment count
- follower counts
- ranking scores

## API Direction

The first API shape should stay narrow and product-specific.

Expected owner-facing operations:

- create or update published share
- mark share as gallery-visible
- update gallery-facing metadata
- remove gallery visibility
- revoke share

Expected public operations:

- list featured gallery entries
- list recent gallery entries
- open an entry through its canonical shared view

Expected moderation operations:

- hide gallery entry
- remove gallery entry from browse surfaces

Do not start with a generic “social content” API model. Keep the API centered on:

- published shares
- gallery visibility
- basic moderation state

## Attribution Recommendation

The gallery needs a stable visible author label.

Recommended first rule:

- show the account display name

Do not start with:

- anonymous gallery entries
- per-entry arbitrary author aliases
- organization ownership before person ownership is solved cleanly

That would make moderation and trust harder than necessary.

## Moderation Minimum

Even a very small gallery needs explicit moderation.

The first version should define:

- owner can unlist own entry
- moderator or admin can hide an entry
- user can report an entry

Recommended minimum report reasons:

- `inappropriate`
- `spam`
- `copyright / stolen`
- `broken / low quality`

The first version does not need:

- full discussion tooling
- policy automation
- community moderation

But it does need a clear operational answer to:

- how an entry is removed
- who can remove it
- what happens to the underlying share afterward

Recommended first behavior:

- moderator or admin hide removes the item from gallery discovery
- underlying share may remain active unless separately revoked

The gallery PVA intentionally does not define how admin or moderator authority is assigned.

That should be handled in a separate roles and authorization decision, because it is broader than the gallery itself.

## Operational Assumptions

The first gallery should assume manual moderation and limited scale.

That means:

- featured entries can be manually selected
- hidden entries can be handled with lightweight admin actions
- reports can enter a simple review queue or equivalent internal process

This is acceptable only if TrackDraw keeps the first gallery intentionally small.

## Discovery Scope Limits

The first gallery should stay narrow enough that it can be judged honestly.

Keep first-pass discovery limited to:

- featured
- recent
- maybe one lightweight tag system later

Avoid starting with:

- free-text public search
- algorithmic ranking
- likes, comments, ratings, follows
- challenge integration

Those are separate product categories.

## Out Of Scope For The First Version

Keep these out of scope:

- comments
- likes
- ratings
- public profile pages as a destination
- remix/fork lineage
- social activity feeds
- advanced search and ranking
- team or club gallery ownership

If TrackDraw ever wants those later, they should come after the gallery proves useful on its own.

## Risks

- low-quality entries may weaken the value of the gallery quickly
- moderation work may outweigh discovery value
- the gallery may duplicate what strong landing-page examples already do
- attribution may feel weak if account display names are inconsistent or incomplete
- users may confuse `published` with `publicly discoverable` if the opt-in step is not explicit enough

## Recommended Delivery Sequence

### Top-Level Checklist

- [ ] Phase 0 complete: gallery model and showcase positioning are locked
- [ ] Phase 1 complete: publish-to-gallery state transitions are defined
- [ ] Phase 2 complete: gallery metadata and browse surface are concrete
- [ ] Phase 3 complete: owner/admin/report controls are defined
- [ ] Phase 4 complete: TrackDraw has a clear build-or-park decision

### Phase 0: Lock the gallery model

Start:

- gallery exists only as a roadmap idea

Done:

- TrackDraw treats `project`, `published share`, and `gallery entry` as separate concepts
- account requirement for gallery visibility is explicit
- opt-in gallery visibility is explicit

Checklist:

- [ ] Confirm the gallery is a discovery/showcase surface, not a social publishing feed
- [ ] Confirm gallery visibility is always a second decision after share publishing
- [ ] Confirm signed-in ownership is required for gallery eligibility
- [ ] Confirm `Featured` is the primary browse model
- [ ] Confirm `Recent` ships in v1 as a secondary browse group
- [ ] Confirm gallery entry and published share remain distinct concepts

### Phase 1: Define publish and gallery visibility states

Start:

- ordinary share publishing already exists

Done:

- the user flow from share publish to gallery opt-in is concrete
- TrackDraw defines what `link only` versus `gallery visible` means
- removing a gallery entry without deleting the share is supported by the model

Checklist:

- [ ] Define the exact state model for `link only`, `gallery visible`, and optional `featured`
- [ ] Lock the first state direction for `link_only`, `gallery_visible`, `featured`, and `hidden`
- [ ] Define whether a revoked or expired share can remain gallery-visible
- [ ] Define whether republishing updates the existing gallery entry or changes only its share snapshot
- [ ] Define where the owner sees gallery status in the share flow
- [ ] Define the explicit confirmation step for `Show in gallery`
- [ ] Define the owner action for `Remove from gallery` without revoking the share

### Phase 2: Define gallery entry fields and browse surface

Start:

- gallery eligibility rules are clear

Done:

- entry fields are explicitly defined
- first browse groups are defined
- the open path into the shared viewer is fixed
- the first version is concrete enough to mock or implement

Checklist:

- [ ] Lock the minimum required gallery metadata fields
- [ ] Confirm title, short description, author display name, and preview image are required for opt-in
- [ ] Confirm whether preview image generation is automatic in v1
- [ ] Confirm the visible author field source
- [ ] Confirm the exact gallery card contents
- [ ] Confirm the browse route structure
- [ ] Confirm `Recent` ships in v1 as a secondary group
- [ ] Confirm cards always open the canonical share view
- [ ] Confirm landing-page exposure is launch-day or later

### Phase 3: Define moderation and control minimum

Start:

- browse and ownership model are clear

Done:

- owner unlist behavior is defined
- admin hide/remove behavior is defined
- minimum report flow is defined

Checklist:

- [ ] Define owner unlist behavior and resulting gallery state
- [ ] Define moderator or admin hide behavior and whether the underlying share stays active
- [ ] Define whether moderator remove differs from moderator or admin hide in v1
- [ ] Lock the minimum report reasons exposed to users
- [ ] Define where reported entries are reviewed operationally
- [ ] Confirm that authority assignment depends on the separate roles/authorization foundation
- [ ] Confirm featuring is manual only in v1

### Phase 4: Decide whether to build or keep parked

Start:

- the product shape is specific enough to judge honestly

Done:

- TrackDraw either commits to a small gallery build
- or keeps the idea parked until demand, moderation readiness, or ownership surfaces become stronger

Checklist:

- [ ] Re-evaluate whether the gallery still feels meaningfully different from ordinary sharing
- [ ] Re-evaluate whether the browse surface is strong enough to justify public discovery
- [ ] Re-evaluate whether moderation remains small enough to operate manually
- [ ] Re-evaluate whether the separate roles/authorization work is sufficiently ready
- [ ] Decide `build next`, `build later`, or `keep parked`

## First Engineering Slice

If TrackDraw chooses to build this later, the first engineering slice should be:

1. add gallery visibility state to the publish model
2. add owner controls in the share flow
3. add a tiny browse surface with Featured and Recent
4. route cards into the existing shared view
5. support owner unlist and admin hide

That is the smallest slice that proves whether the gallery adds value without dragging in a larger community platform.

## Next Steps After A Go Decision

If Phase 4 resolves to `build next`, the first implementation work should follow the engineering slice defined above.

Before starting implementation, confirm that:

- the roles and authorization foundation has been approved and is either implemented or ready to implement alongside the gallery
- the share flow supports gallery visibility state without a second disconnected publish surface
- the preview image generation approach is settled

If any of those dependencies are unclear, the gallery should remain parked until they are resolved.

## Smallest Credible V1

If TrackDraw decides to build this, the smallest credible version is:

- signed-in owners only
- one published share can optionally become one gallery entry
- gallery has `Featured`
- `Recent` ships in v1 but is visually secondary to Featured
- cards open the existing share view
- owner can unlist without revoking the share
- moderator or admin can hide entries

Anything larger than that should require a second product decision rather than silently expanding the first release.

## Success Criteria

The first version is successful if:

- gallery participation feels clearly separate from ordinary sharing
- users can understand how a track becomes browseable
- the browse surface contains enough quality to justify itself
- moderation remains operationally manageable
- the gallery helps discovery without creating pressure for full social features
