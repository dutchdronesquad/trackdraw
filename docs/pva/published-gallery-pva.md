# Published Gallery PVA

Date: April 18, 2026

Status: approved

## Build Summary

The gallery is approved as a small, opt-in, account-backed discovery surface.

This document is the implementation source of truth. For product rationale and positioning see the [Published Gallery Evaluation](../research/published-gallery-evaluation.md). For the visual design and page structure see the [Published Gallery Design](../research/published-gallery-design.md).

Locked decisions:

- gallery visibility is a second decision after share publishing, not the default result of it
- gallery state lives in a dedicated `gallery_entry` record, not on the share record
- the canonical destination stays `/share/[token]`; the gallery at `/gallery` is browse and discovery only
- the visible author label is the account display name
- preview images are generated automatically at gallery opt-in time and stored in R2 object storage
- the opt-in flow lives in the existing share dialog, not a separate publishing surface
- opting into the gallery pins the underlying share — passive expiry is suspended as long as the entry is gallery-visible; the owner can still manually revoke the share at any time
- removing an entry from the gallery returns the share to normal expiry-based retention
- a moderator hide also returns the share to normal expiry-based retention; hidden entries are removed from gallery discovery, but direct share links continue to work until the share expires or is revoked
- the roles and authorization foundation is already shipped and should be consumed here, not redesigned
- v1 stays discovery-first: no comments, likes, profiles, or social behavior
- gallery entries are managed through the admin dashboard

Out of scope for v1:

- comments, likes, ratings, public profiles
- anonymous gallery publishing
- broad search, ranking, or algorithmic behavior
- social or community mechanics
- remix or fork lineage
- gallery detail page at `/gallery/[id]`
- landing page gallery section (Phase 5 decision)

## Delivery Checklist

- [x] Phase 0: lock the gallery model
- [ ] Phase 1: gallery entry record and storage
- [ ] Phase 2: owner-facing gallery controls and opt-in flow
- [ ] Phase 3: public gallery browse surface
- [ ] Phase 4: moderation and dashboard management
- [ ] Phase 5: launch-readiness pass

## Build Sequence

### Phase 0: Lock the Gallery Model

Start: gallery is still framed as evaluation work

Done:

- TrackDraw has accepted the first gallery product shape
- roles and authorization is treated as shipped foundation, not open design work

Checklist:

- [x] Confirm gallery visibility is a second decision after share publishing
- [x] Confirm gallery remains opt-in and account-backed
- [x] Confirm browse and discovery are the v1 goal, not social behavior
- [x] Confirm the canonical share view remains the card destination
- [x] Confirm the roles/authorization foundation is consumed rather than redesigned here

### Phase 1: Gallery Entry Record and Storage

Start: TrackDraw has stored published shares but no gallery state attached to them

Done:

- the `gallery_entry` record shape is defined and migrated
- the state model is explicit and stored
- the R2 key structure and cleanup lifecycle for preview images are defined

State model:

| State             | Meaning                                                      |
| ----------------- | ------------------------------------------------------------ |
| `link_only`       | share exists, not browseable in the gallery                  |
| `gallery_visible` | entry is browseable in the normal gallery surface            |
| `featured`        | gallery-visible and selected for the primary curated section |
| `hidden`          | removed from gallery discovery through moderation            |

`gallery_entry` fields:

| Field                   | Source                                                      |
| ----------------------- | ----------------------------------------------------------- |
| `share_token`           | the linked published share                                  |
| `owner_user_id`         | the account that opted in                                   |
| `gallery_state`         | `link_only` \| `gallery_visible` \| `featured` \| `hidden`  |
| `gallery_title`         | user-entered at opt-in, pre-filled from project title       |
| `gallery_description`   | user-entered at opt-in, pre-filled from project description |
| `gallery_preview_image` | R2 object key, generated at opt-in                          |
| `gallery_published_at`  | set when state first moves to `gallery_visible`             |
| `moderation_hidden_at`  | set when a moderator moves state to `hidden`                |

Derived fields (not stored on `gallery_entry`, read from the share or project at query time):

- field size
- obstacle count

R2 preview image:

- key structure: `gallery/previews/{gallery_entry_id}.webp`
- generated at opt-in using the same 3D render pipeline as the existing share preview
- cleanup: delete the R2 object when the entry is permanently removed; keep the object when the entry is hidden (in case the hide is reversed); delete when the share is permanently revoked or eventually cleaned up after expiry

Share pinning: when an entry moves to `gallery_visible` or `featured`, the underlying share's `expires_at` is set to `null`. This suspends passive expiry for as long as the entry remains in the gallery. The owner can still revoke the share explicitly at any time, which also removes gallery visibility.

Retention outside the gallery: when an entry moves from `gallery_visible` or `featured` to `link_only` or `hidden`, the underlying share returns to normal expiry-based retention. The direct `/share/[token]` link remains available until that share expires or is manually revoked.

Gallery visibility rule: an entry is surfaced in browse results if its `gallery_state` is `gallery_visible` or `featured` AND the underlying share has not been manually revoked.

Checklist:

- [x] Define and migrate the `gallery_entry` table
- [x] Confirm the state model: `link_only`, `gallery_visible`, `featured`, `hidden`
- [x] Confirm gallery visibility is removed when the share is manually revoked
- [ ] Confirm that passive share expiry is suspended (set `expires_at` to `null`) when an entry becomes gallery-visible
- [ ] Confirm that removing from the gallery returns the share to normal expiry-based retention
- [ ] Confirm that moderator hide also returns the share to normal expiry-based retention
- [x] Define the R2 key structure: `gallery/previews/{gallery_entry_id}.webp`
- [ ] Define R2 cleanup lifecycle: delete on permanent removal, keep on hide, delete on share revocation
- [ ] Confirm derived fields (field size, obstacle count) are read at query time, not stored

### Phase 2: Owner-Facing Gallery Controls

Start: stored share publishing already exists

Done: a signed-in owner with a valid share can opt into gallery visibility through the existing share dialog

Eligibility rules — all must be true before a track can become gallery-visible:

- user is signed in
- project has a valid, non-expired published share
- account has a visible display name set
- gallery title is non-empty (pre-filled from project title, editable at opt-in)
- gallery description is non-empty and at least 10 characters (pre-filled, editable at opt-in)

On opt-in: generate preview image and upload to R2, create or update the `gallery_entry` record with state `gallery_visible`.

Owner controls:

- opt in to gallery visibility through the share dialog
- remove from gallery through the share dialog (state returns to `link_only`)
- revoke the underlying share, which also removes gallery visibility

Share dialog changes:

- add a `Share visibility` radio group: `Link only` / `Show in gallery`
- selecting `Show in gallery` opens a confirmation step within the dialog: editable title, editable description, read-only author name with note, preview image note
- after opt-in: dialog shows `Gallery visible` state with a `View in gallery →` link and a `Remove from gallery` secondary action

Checklist:

- [ ] Add `Share visibility` radio group to the share dialog
- [ ] Implement the gallery opt-in confirmation step (title, description, display name review)
- [ ] Validate title, description (min 10 chars), and display name before allowing opt-in
- [ ] Trigger preview image generation and R2 upload on opt-in
- [ ] Set share `expires_at` to `null` on opt-in (pin the share)
- [ ] Implement `Remove from gallery` action in the share dialog with confirmation
- [ ] Confirm revoking the underlying share also removes gallery visibility
- [ ] Confirm that removing from the gallery starts normal expiry-based retention again
- [ ] Show `View in gallery →` link in the share dialog after successful opt-in

### Phase 3: Public Gallery Browse Surface

Start: owner controls exist or are sufficiently defined

Done: TrackDraw has a public browse surface at `/gallery` that opens the canonical read-only share view

Page structure:

- route: `/gallery`
- same sticky header and footer as the landing page
- same `max-w-6xl` content width
- page header: eyebrow `Gallery`, heading `Community tracks.`, subtext
- Featured section: 3-column card grid (2 on tablet, 1 on mobile), only shown if at least one featured entry exists
- Recent section: same grid, `Load more` button loading 12 entries at a time
- empty state if no entries exist

Card anatomy:

- 16:9 preview image with `Featured` badge (pill, top-left) if featured
- title: `text-sm font-semibold`, one line, truncated
- author: `text-xs text-muted-foreground`
- metadata row: field size and obstacle count
- entire card is a link to `/share/[token]`
- hover: `scale-[1.015]` + border lightens

Empty state: TrackDraw mark, `No tracks yet.`, brief explanation. No opt-in CTA on the gallery page itself.

SEO:

- title: `Gallery — TrackDraw`
- description: `Browse FPV drone race track designs shared by the TrackDraw community.`
- canonical: `/gallery`
- publicly indexable

Checklist:

- [ ] Implement the `/gallery` route and page layout
- [ ] Add `Gallery` link to the landing page navigation
- [ ] Implement the `GalleryCard` component with preview image, title, author, metadata row, Featured badge
- [ ] Implement the Featured section (hidden if no featured entries)
- [ ] Implement the Recent section with `Load more` (12 per page)
- [ ] Implement the empty state
- [ ] Implement the low-content state (no section labels if fewer than 3 entries)
- [ ] Implement preview image fallback (TrackDraw mark placeholder on load failure)
- [ ] Add page metadata and canonical tag

### Phase 4: Moderation and Dashboard Management

Start: gallery entries can become public

Done:

- TrackDraw has the minimum believable control model for public discovery
- operators can see and act on all gallery entries through the admin dashboard

Minimum moderation controls:

- owner can remove their entry from the gallery (state → `link_only`) without revoking the share
- moderator or admin can hide an entry (state → `hidden`); the entry is removed from gallery discovery and the direct share link remains active until the share expires or is revoked
- moderator or admin can feature (state → `featured`) or unfeature (state → `gallery_visible`) an entry
- user can report an entry

Minimum report reasons:

- `inappropriate`
- `spam`
- `copyright / stolen`
- `broken / low quality`

State transition matrix:

| Actor             | From                            | To                | Allowed |
| ----------------- | ------------------------------- | ----------------- | ------- |
| Owner             | `link_only`                     | `gallery_visible` | Yes     |
| Owner             | `gallery_visible`               | `link_only`       | Yes     |
| Owner             | `gallery_visible`               | `hidden`          | No      |
| Owner             | `hidden`                        | `gallery_visible` | No      |
| Moderator / Admin | `gallery_visible`               | `featured`        | Yes     |
| Moderator / Admin | `featured`                      | `gallery_visible` | Yes     |
| Moderator / Admin | `gallery_visible` or `featured` | `hidden`          | Yes     |
| Moderator / Admin | `hidden`                        | `gallery_visible` | Yes     |

Rules: owners cannot self-feature. Owners cannot reverse a moderator hide. Moderation state overrides owner controls while `hidden`.

Lifecycle rule: only `gallery_visible` and `featured` suspend passive expiry. `link_only` and `hidden` follow the normal share-retention path.

Dashboard gallery module:

- list all gallery entries with state, owner, title, publish date, and report count
- filter by state: gallery-visible, featured, hidden
- actions per entry: feature, unfeature, hide, restore, view reports, remove
- report queue for reviewing flagged entries with report reason and reporter info

Audit visibility:

- moderator hide, restore, and permanent removal should produce audit events
- owner opt-in and opt-out do not need to be audited in v1

Checklist:

- [ ] Implement owner remove from gallery (state → `link_only`) in the share dialog
- [ ] Implement user report flow with minimum report reasons
- [ ] Implement moderator hide (state → `hidden`) and restore (state → `gallery_visible`)
- [ ] Implement moderator feature and unfeature
- [ ] Add gallery entries module to the admin dashboard (list, filter, actions)
- [ ] Add report queue to the admin dashboard
- [ ] Confirm state transition matrix is enforced in the API
- [ ] Confirm moderation actions produce audit events

### Phase 5: Launch-Readiness Pass

Start: the feature exists in a buildable form

Done: TrackDraw knows whether the first gallery is safe and coherent enough to expose publicly

Checklist:

- [ ] Re-check attribution: confirm account display name is shown consistently and correctly
- [ ] Re-check empty-state and low-content browse experience
- [ ] Decide: add a `Gallery` or `Showcase` section to the landing page, or keep the gallery quieter at launch
- [ ] Re-check moderation and operator burden — is manual curation sustainable at expected scale?
- [ ] Confirm preview image quality across a sample of real track designs
- [ ] Decide: `launch now`, `keep dark`, or `refine before launch`

## Go / No-Go Criteria

Go for implementation if:

- gallery visibility is accepted as a second decision after share publishing
- account-backed ownership is a hard requirement
- minimum moderation is non-optional
- the product is comfortable with a very small first browse surface
- the roles and authorization foundation is ready to consume

No-go or keep parked if:

- TrackDraw wants anonymous gallery entries
- moderation ownership is still unclear
- attribution rules are unresolved
- the team expects a social product rather than a narrow discovery surface

## Success Criteria

- gallery participation feels clearly separate from ordinary sharing
- the opt-in flow in the share dialog is understandable without explanation
- the browse surface contains enough quality to justify itself
- moderation remains operationally manageable
- the gallery helps discovery without creating pressure for full social features
