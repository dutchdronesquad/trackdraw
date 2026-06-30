# Presets Store Research

## Short Version

TrackDraw already has private, account-backed user presets. The presets store should be the next layer: a community/published store where users can publish reusable presets and other users can browse, inspect, and save a copy into `My presets`.

Recommended first slice:

1. Add publishable preset snapshots.
2. Keep private `layout_presets` and public store records separate.
3. Add an admin-visible/publication list before building a full browse UI.
4. Replace the existing `Store` placeholder tab once publish/save semantics are proven.

## Context

Existing foundation:

- `LayoutPreset` stores `{ id, name, description, shapes }`.
- `shapesToPreset` saves selected non-path shapes relative to a centroid anchor.
- `placeLayoutPreset` places those saved offsets at a drop point.
- Private presets are synced through `useAccountPresetSync`.
- Private preset API routes live under `/api/layout-presets`.
- `migrations/0010_layout_presets.sql` stores private presets in `layout_presets`.
- `LayoutPresetPicker` already has `My presets` and a placeholder `Store` tab.

The store item is not the same thing as a private preset. A store item needs publication metadata, moderation state, preview media, and snapshot semantics.

## Product Shape

Use the existing product language:

- `My presets`: the user's private account-backed presets.
- `Store` or `Community presets`: published presets users can browse and save.
- `LayoutPreset`: acceptable internal type name for now.

Primary user jobs:

- Find a reusable setup quickly, such as a start box, slalom, ladder, dive-gate sequence, or timing-area layout.
- Inspect size, element counts, catalog-backed parts, and setup notes before saving.
- Save a community preset into `My presets`.
- Publish one of my presets when it is clean and reusable.

The first store should feel like curation and reuse, not like a marketplace.

## Recommended Phases

### Phase 1: Publishable Preset Snapshots

Add the ability to publish a snapshot of a private preset.

Prefer a separate `preset_publications` table over adding public fields directly to `layout_presets`.

Why:

- private preset edits should not silently change a published store item
- owners should be able to unpublish without deleting the private preset
- public browse/moderation fields do not belong in the private sync model
- TrackDraw already uses a similar separate-publication pattern for gallery entries

Minimum publication fields:

- `id`
- `owner_user_id`
- `source_preset_id`
- `title`
- `description`
- `status`: align with gallery-style states such as `unlisted`, `listed`, `featured`, `hidden`
- `preset_json`: snapshot payload needed for placement
- `summary_json`: shape count, kind counts, bounds, catalog ids, official element flags
- `preview_media_key`
- `created_at`, `updated_at`, `published_at`

### Phase 2: Store Browse And Save

Replace the placeholder `Store` tab in `LayoutPresetPicker`.

Start small:

- featured presets
- search by title
- filter by obstacle family or official/catalog-backed elements
- compact cards with preview, counts, and bounds
- detail sheet with notes and element summary
- `Save to My presets`

Do not support direct placement from the store in the first browse version. Saving a copy first keeps ownership and editing expectations clear.

### Phase 3: Moderation And Collections

Add curation only after public browse is useful.

Candidates:

- admin status controls
- featured collections
- abuse/report flow
- duplicate/fork metadata
- source attribution

## Technical Notes

Keep responsibilities separate:

- private presets: `/api/layout-presets`, `useAccountPresetSync`, `layout_presets`
- public store: new server module and API routes, likely `/api/preset-store/*`

Existing private-preset helpers:

- `src/lib/planning/layout-presets.ts` already owns basic preset counts and bounds.

Future helper candidate:

- Extract `src/lib/planning/preset-summary.ts` only if public-store summaries need a shared module for counts, bounds, catalog ids, official element flags, and display metadata.

Do not put public store browsing inside `useAccountPresetSync`. That hook should stay focused on the signed-in user's own presets.

## Risks

- Public presets can imply quality or officialness, so store UI needs clear source and official-size labels.
- Snapshot semantics need clear copy, otherwise owners may expect private edits to update the public item.
- Preview media may add R2/Cloudflare and moderation work; a placeholder preview is acceptable for phase 1.
- Saving from the store should create a private copy, not a live dependency on someone else's preset.

## Recommendation

Start with publishable preset snapshots and a small management/admin surface. Build the public `Store` tab only after the data model and save-to-private-copy behavior are proven.
