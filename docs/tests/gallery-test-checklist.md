# Gallery Test Checklist

Date: April 21, 2026

Use this checklist in `npm run preview`, not `npm run dev`.

## Setup

- [x] Run `npm run migrate:local`
- [x] Run `npm run preview`
- [x] Confirm account sign-in works
- [x] Confirm `MEDIA_BUCKET` is bound to `trackdraw-media`
- [x] Confirm the public media host is available when validating uploaded preview images

## Owner Flow

- [x] Open an account-backed project
- [x] Publish a share as `Link only`
      Expected:
      `gallery_state = unlisted`
      `expires_at` is a finite future date
- [x] Change visibility to `Show in gallery`
      Expected:
      confirmation step appears
      title, description, and display name are validated
      listing is blocked until 3D preview has been opened at least once
- [x] Confirm gallery listing
      Expected:
      success toast
      `gallery_state = listed`
      `expires_at = null`
      `gallery_preview_image` is populated
      `View in gallery` link is shown
- [x] Edit the title and description of a listed item
      Expected:
      current metadata is prefilled
      save is blocked until something changes
      success toast
      updated metadata appears in `/gallery`
- [x] Change visibility back to `Link only`
      Expected:
      `gallery_state = unlisted`
      `expires_at` gets a fresh future date
      item disappears from `/gallery`
- [x] Revoke the share
      Expected:
      `/share/[token]` no longer works
      gallery item is no longer visible

## Public Gallery

- [x] Open `/gallery` while signed out
      Expected:
      route is public
      listed items render as cards
      cards link to `/share/[token]`
- [x] Validate card contents
      Expected:
      preview image or fallback mark
      title
      author
      field size
      obstacle count
- [x] Validate empty state with no listed or featured entries
- [x] Validate low-content state with fewer than 3 entries
- [ ] Validate `Load more` when recent entries exceed 12

## Moderation And Dashboard

- [x] Open dashboard as moderator or admin
- [x] Open the gallery module
- [x] Feature a listed item
      Expected:
      state becomes `featured`
      item rises above normal listed items in `/gallery`
      `expires_at` stays `null`
- [x] Unfeature the item
      Expected:
      state returns to `listed`
- [ ] Hide a listed or featured item
      Expected:
      state becomes `hidden`
      item disappears from `/gallery`
      direct `/share/[token]` link still works
      `expires_at` becomes a fresh future date
- [ ] Restore a hidden item
      Expected:
      state returns to `listed`
      item reappears in `/gallery`
      `expires_at = null`
- [x] Log in as the owner of a hidden item
      Expected:
      owner cannot self-restore

## Retention And Lifecycle

- [x] Validate a listed item in the database
      Expected:
      `gallery_entries.gallery_state = listed`
      `shares.expires_at = null`
- [x] Validate an unlisted item after removal from gallery
      Expected:
      `shares.expires_at` is reintroduced from the current time
- [x] Validate a hidden item
      Expected:
      `shares.expires_at` is reintroduced from the current time
      `moderation_hidden_at` is set
- [x] Validate a revoked item
      Expected:
      `revoked_at` is set
      item is not shown publicly

## Preview Upload

- [x] List an item after opening the 3D preview
      Expected:
      preview upload succeeds
      `gallery_preview_image` matches `gallery/previews/{id}.webp`
- [x] Open the uploaded preview image via the public media URL
      Expected:
      image is reachable
      image is clearly compressed and not excessively large
- [x] Force a broken preview key
      Expected:
      card falls back to the TrackDraw mark
      card remains clickable

## Cleanup And Cron

- [ ] Create one `listed` share and one `unlisted` share
- [ ] Manually set the `unlisted` share to an expired `expires_at`
- [ ] Run cleanup
      Expected:
      expired `unlisted` share is removed
      pinned `listed` share remains

## Edge Cases

- [ ] Owner without display name cannot list
- [ ] Description shorter than 10 characters blocks listing
- [ ] Outdated share must be updated before listing
- [ ] Hidden item remains reachable by direct share link until expiry or revoke
- [ ] Featured item remains pinned
- [ ] Revoked shares never appear in `/gallery`

## Bug Notes

For each bug, capture:

- exact step
- expected behavior
- actual behavior
- relevant database state
- whether it reproduces in `npm run preview` only or also in `npm run dev`
