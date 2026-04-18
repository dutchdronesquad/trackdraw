# Map And Field Overlay PVA

Date: April 14, 2026

Status: proposed

## Decision Summary

Recommended decision:

- approve `Map and field overlay` for implementation planning
- choose hybrid storage for v1: device-local for logged-out, synced asset storage for signed-in
- keep overlay out of share/export in v1
- treat this as an editor-first feature with signed-in cross-device continuity

For the full product evaluation and UX rationale, see [docs/research/map-field-overlay-evaluation.md](../research/map-field-overlay-evaluation.md).

## Approval Recommendation

TrackDraw should approve this feature for build preparation if the team is comfortable with the following scope:

- one overlay per project
- move, scale, opacity, visibility, lock
- logged-out local storage
- signed-in synced overlay asset storage
- no export/share inclusion

TrackDraw should not approve this feature yet if the team expects any of these to be part of v1:

- multiple overlays
- export inclusion
- share inclusion
- perspective correction
- venue library behavior

## Delivery Checklist

- [ ] Phase 0: lock the product model
- [ ] Phase 1: ship a single image overlay first pass
- [ ] Phase 2: add practical editor controls
- [ ] Phase 3: define export and share behavior
- [ ] Phase 4: revisit richer transforms later

## Go / No-Go Criteria

Go for implementation if:

- the team accepts the hybrid storage model
- the team accepts editor-only overlay behavior in v1
- the existing media/storage path is considered good enough for signed-in project assets
- mobile can ship with a simpler interaction model than desktop if needed

No-go or delay if:

- the team wants export/share inclusion immediately
- the team wants multiple overlays immediately
- the media/storage path cannot support project-owned image assets cleanly
- the product does not want logged-out and signed-in behavior to differ

## Required Preconditions Before Build

Before implementation starts, TrackDraw should lock:

- accepted image formats
- maximum upload size
- signed-in upload ownership rules
- overlay missing/failure UX
- whether project duplication reuses or clones the overlay asset reference

## Technical Direction

The v1 implementation should follow these technical rules:

- keep overlay metadata in `TrackDesign`
- keep raw image payloads out of the core project JSON
- use browser-local blob storage for logged-out assets
- use the existing media/storage path for signed-in synced assets
- keep share and export flows unaware of overlays in v1

## Current Codebase Fit

Relevant current boundaries:

- project document types: [src/lib/types.ts](../../src/lib/types.ts)
- design normalization and serialization: [src/lib/track/design.ts](../../src/lib/track/design.ts)
- local project persistence: [src/lib/projects.ts](../../src/lib/projects.ts)
- cloud project save/load: [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts) and [src/lib/server/projects.ts](../../src/lib/server/projects.ts)
- account sync orchestration: [src/components/editor/useAccountProjectSync.ts](../../src/components/editor/useAccountProjectSync.ts)
- editor store and track mutations: [src/store/editor.ts](../../src/store/editor.ts)

Important current behavior:

- projects are saved as serialized design JSON
- local and cloud persistence both treat the design as a single object
- there is no current project-scoped asset model

So the first implementation should add a narrow overlay asset model rather than a broad reusable media system.

## Technical Model

### Overlay Metadata In `TrackDesign`

Add one optional `overlay` field to `TrackDesign`.

Recommended v1 fields:

- `assetId: string | null`
- `x: number`
- `y: number`
- `scale: number`
- `opacity: number`
- `visible: boolean`
- `locked: boolean`
- `width?: number`
- `height?: number`
- `source: "local" | "account"`

This keeps the project document responsible for:

- transform state
- visibility
- lock state
- asset reference

But not for:

- raw image bytes
- large embedded payloads

### Narrow Overlay Asset Model

Do not store image payloads inside `TrackDesign`.

Instead:

- logged-out mode stores the image in browser-local storage keyed by `assetId`
- signed-in mode uploads the image through the existing media/storage path and stores a returned asset reference

Expected first asset record shape:

- `id`
- `projectId`
- `ownerUserId | null`
- `storageKind: "local" | "account"`
- `mimeType`
- `byteSize`
- `width`
- `height`
- `createdAt`
- `updatedAt`
- `localObjectKey | remoteKey`

## Data Model Changes

Update these boundaries first:

- [src/lib/types.ts](../../src/lib/types.ts)
- [src/lib/schema.d.ts](../../src/lib/schema.d.ts)
- [src/lib/track/design.ts](../../src/lib/track/design.ts)

Important normalization defaults:

- `scale: 1`
- `opacity: 0.5` or similar
- `visible: true`
- `locked: false`

For signed-in sync, add a small overlay asset record or table keyed to:

- `asset_id`
- `project_id`
- `owner_user_id`

That record only needs to support:

- create asset
- resolve asset by project and owner
- replace asset
- delete asset

## API Direction

### Project Save API Stays Narrow

Keep [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts) focused on saving project JSON.

Do not send raw image payloads through the normal project save route.

The project payload should carry only overlay metadata and asset reference.

### Overlay Asset Upload API

Add a narrow authenticated route for signed-in uploads.

Recommended first route:

- `POST /api/project-assets/overlay`

Responsibilities:

- validate signed-in user
- validate project ownership where needed
- validate file type and size
- store object in media/R2 path
- create or update overlay asset record
- return asset reference metadata

Recommended matching delete path:

- `DELETE /api/project-assets/overlay?projectId=...`

### Share Flow Unchanged In V1

Do not teach share routes or share storage about overlays in v1.

The share payload can ignore overlay assets safely.

## Editor Integration

### Store Actions

Extend the editor track actions in [src/store/editor.ts](../../src/store/editor.ts) with narrow overlay actions such as:

- `setOverlayMeta`
- `clearOverlay`
- `setOverlayVisibility`
- `setOverlayLocked`
- `setOverlayTransform`

These should mutate `track.design.overlay` and call `touchTrackDesign`.

### Canvas Rendering

Render the overlay behind normal shapes and route content.

Most likely target:

- [src/components/canvas/editor/TrackCanvas.tsx](../../src/components/canvas/editor/TrackCanvas.tsx)

Recommended behavior:

- if no overlay metadata or resolved asset URL, render nothing
- if visible, render below shapes
- if unlocked, allow transform interactions
- if locked, do not intercept normal editing

### Keep Overlay Interaction Isolated

Avoid folding overlay manipulation into ordinary obstacle selection.

Preferred interaction model:

- explicit overlay-adjust mode or focused overlay controls
- only when overlay is unlocked

That reduces risk to existing selection and transform behavior.

## Local And Signed-In Storage Behavior

### Logged-Out

For logged-out or local-only projects:

- keep using current local project save path for project JSON
- persist overlay blob separately in IndexedDB

Recommended local helper boundary:

- `src/lib/overlay-assets/local.ts`

Responsibilities:

- save local overlay blob
- load local overlay blob by id
- delete local overlay blob
- return object URL for rendering

Recommended local keying:

- `overlay:${assetId}`

### Signed-In

For signed-in projects:

1. upload overlay asset if it changed
2. update `design.overlay.assetId`
3. save project JSON through the normal project route

When opening a signed-in project:

1. load project JSON
2. inspect `design.overlay`
3. if `assetId` exists and source is `account`, resolve asset URL
4. render overlay if it resolves
5. if it fails, open the project normally and show a lightweight warning

The likely coordination point is [src/components/editor/useAccountProjectSync.ts](../../src/components/editor/useAccountProjectSync.ts).

## Failure Behavior

The implementation should explicitly support these failure modes:

### Upload Failure

- show error
- keep project open
- do not block normal editing
- preserve unsaved local overlay state where possible

### Missing Asset On Load

- open project normally
- do not render overlay
- show a lightweight non-blocking warning

### Oversized File

- reject before upload
- explain size limit clearly

### Unsupported Format

- reject clearly
- do not mutate project overlay metadata

## File And Module Impact

Likely first-pass additions:

- `src/lib/overlay-assets/types.ts`
- `src/lib/overlay-assets/local.ts`
- `src/lib/server/overlay-assets.ts`
- `src/app/api/project-assets/overlay/route.ts`
- `src/components/editor/useOverlayAssetSync.ts`

Likely existing files to update:

- [src/lib/types.ts](../../src/lib/types.ts)
- [src/lib/schema.d.ts](../../src/lib/schema.d.ts)
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
- [src/store/editor.ts](../../src/store/editor.ts)
- [src/components/canvas/editor/TrackCanvas.tsx](../../src/components/canvas/editor/TrackCanvas.tsx)
- [src/components/editor/useAccountProjectSync.ts](../../src/components/editor/useAccountProjectSync.ts)
- [src/lib/projects.ts](../../src/lib/projects.ts)

## First Build Order

The first engineering order should be:

1. add `design.overlay` to `TrackDesign` and update types
2. add local overlay blob helpers (`src/lib/overlay-assets/local.ts`)
3. render one overlay in the editor behind existing shapes
4. support local add/replace/remove/move/scale/opacity/lock
5. keep export/share unaware of overlays
6. wire signed-in asset upload and restore

## Open Implementation Questions

These still need explicit answers before build:

- accepted image formats
- maximum upload size
- whether asset URLs are public, signed, or proxied
- whether project duplication reuses or clones the overlay asset reference
- how orphaned remote overlay assets are cleaned up
- whether sign-out should leave cached synced overlay blobs on-device
