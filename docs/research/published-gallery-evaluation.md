# Published Gallery Evaluation

Date: April 18, 2026

Status: approved for build — see [Published Gallery PVA](../pva/published-gallery-pva.md) for the implementation plan and [Published Gallery Design](published-gallery-design.md) for the page structure

## Decisions Made

These points are locked and treated as current product direction:

- gallery visibility is explicit opt-in, not the default result of publishing a share
- gallery builds on published shares — it is not a separate content model
- gallery state lives in a dedicated `gallery_entry` record, not on the share record
- the gallery browse surface lives at `/gallery`; the canonical destination for each entry stays `/share/[token]`
- v1 is discovery-first: Featured (manual curation, primary) and Recent (secondary)
- gallery entries require a signed-in, account-backed owner
- the visible author label is the account display name
- preview images are generated automatically at gallery opt-in time and stored in R2 object storage at `gallery/previews/{gallery_entry_id}.webp`
- preview generation uses a fixed 3D camera — a stable, slightly angled, product-defined viewpoint consistent across all entries
- the opt-in flow lives inside the existing share dialog, not a separate publish surface
- opting into the gallery pins the underlying share: passive expiry is suspended as long as the entry is gallery-visible; the owner can still manually revoke the share at any time
- removing an entry from the gallery does not reinstate a share expiry — the share stays active until manually revoked
- the first version stays narrow: no comments, likes, profiles, or social behavior
- the shipped roles and authorization foundation is consumed here, not redesigned
- gallery items are managed through the admin dashboard with full operator visibility and moderation actions

## Remaining Open Questions

One question remains open at this point:

- should the gallery be linked from the landing page at launch, or stay quieter until the surface is sufficiently populated and moderated?

This is a Phase 5 launch-readiness decision and does not block implementation.

## Current Fit

TrackDraw already has the foundations a gallery can build on:

- local-first editing
- account-backed projects
- published read-only shares

That makes a gallery much more plausible than collaboration, because it extends snapshot publishing rather than requiring live sync.

Relevant implementation anchors:

- project storage: [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
- share storage: [src/lib/server/shares.ts](../../src/lib/server/shares.ts)
- share creation API: [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)

## Why A Gallery Over Other Features

A gallery avoids the hardest parts of other roadmap items. Unlike live collaboration, it does not require:

- live sync
- conflict handling
- shared undo or redo
- multi-user presence

Instead, it requires stronger publishing, ownership, and moderation boundaries — a natural extension of the existing product.

## Product Model

Three distinct concepts that must stay separate:

| Concept | Description |
|---|---|
| Project | editable working state, private by default |
| Published share | read-only snapshot accessible by direct link |
| Gallery entry | intentionally browseable published share |

Key rules:

- a share can exist without a gallery entry
- a gallery entry can be removed without revoking the share
- a gallery card always opens the canonical `/share/[token]` route
- gallery visibility is removed when the owner manually revokes the underlying share
- opting into the gallery suspends passive share expiry — the share is pinned active for as long as the entry is gallery-visible
- removing from the gallery does not reinstate a share expiry

## Gallery vs Social Platform Positioning

The gallery should be positioned as a curated showcase, not a publishing feed.

That means:

- Featured matters more than Recent
- quality matters more than volume
- browse should feel intentional rather than noisy
- social mechanics stay out in v1
- moderation protects quality and trust, not just policy compliance

This positioning shapes every scope decision: keep it close to "curated example showcase" and away from "open community platform."

## Preview Image Storage

Gallery preview images are generated automatically when an owner opts into gallery visibility.

Decisions:

- generation happens at opt-in time
- images are stored in R2 at `gallery/previews/{gallery_entry_id}.webp`
- the render uses a fixed 3D camera: a stable, slightly angled, product-defined viewpoint consistent across all gallery entries
- owners do not select or tune the preview in v1

Cleanup lifecycle:

- delete the R2 object when the entry is permanently removed
- keep the object when the entry is hidden (in case the hide is reversed)
- delete when the share is permanently revoked

Keeping the viewpoint consistent means the browse surface feels curated and avoids turning preview generation into a second creative workflow for owners.

## What Changes TrackDraw Needs

### 1. A dedicated `gallery_entry` record

A separate record keyed to one published share. This keeps gallery state, moderation state, preview image reference, and gallery metadata cleanly separated from the share record.

### 2. Opt-in publishing controls in the share dialog

A `Share visibility` radio group in the share dialog: `Link only` or `Show in gallery`. Selecting gallery opens a confirmation step with editable title and description (pre-filled from project data) and a read-only author name. Ordinary sharing remains unchanged.

### 3. Gallery-facing metadata

Required at opt-in:

- title (pre-filled from project title, editable)
- short description (pre-filled, editable, minimum 10 characters)
- author display name (from account, read-only)
- preview image (generated automatically)

Derived, read at query time from the share or project:

- field size
- obstacle count

### 4. Moderation and dashboard visibility

Gallery entries are managed through the admin dashboard. Operators see all entries, their state, owner, and report count, and can feature, unfeature, hide, restore, or permanently remove entries. Owners can remove their own entries. Users can report entries.

Report reasons: `inappropriate`, `spam`, `copyright / stolen`, `broken / low quality`

### 5. Public gallery browse surface

A public page at `/gallery` with a Featured section (manually curated, primary) and a Recent section (secondary, load more in batches of 12). Cards link to `/share/[token]`. The page is server-rendered, publicly accessible, and indexable. See the [Published Gallery Design](published-gallery-design.md) for the full page structure and card specs.

## What Is Worth Doing Even Without A Gallery

- clearer publish states improve ordinary sharing today
- better share metadata improves share cards and future landing-page examples
- stronger ownership boundaries improve account-backed projects and future team or club surfaces

## Risks

- low-quality entries may weaken gallery value quickly if eligibility rules are too loose
- moderation work may outweigh discovery value at low traffic
- the gallery may duplicate what strong landing-page examples already do
- attribution may feel weak if account display names are inconsistent or incomplete
- users may confuse "published" with "publicly discoverable" if the opt-in step is not explicit enough

## References

- Implementation plan: [Published Gallery PVA](../pva/published-gallery-pva.md)
- Page design: [Published Gallery Design](published-gallery-design.md)
- Share API: [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)
- Share storage: [src/lib/server/shares.ts](../../src/lib/server/shares.ts)
- Project storage: [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
