# RotorHazard Track Viewer Integration Research

**Date:** June 15, 2026
**Status:** Long-term product direction - not yet in PVA

---

## Short Version

TrackDraw could eventually provide a read-only track viewer that RotorHazard can show inside an event page. The main user-facing outcome is simple: open a RotorHazard event and see the TrackDraw project as a 2D/3D course preview for pilots, race directors, and spectators.

The integration should be offline-first. Race-day RotorHazard deployments often run on a local network where internet access is unavailable, unreliable, or intentionally avoided. RotorHazard should be able to serve the viewer and track data from its own local event server after import or sync.

Recommended first slice:

1. Build a standalone TrackDraw viewer runtime that can load a normalized read-only track file without the editor shell.
2. Distribute that viewer as an npm package and a static browser build.
3. Add a Track Viewer package export for offline event use.
4. Prototype a RotorHazard event-page embed that serves local viewer assets and local track data.
5. Keep online TrackDraw embeds as a convenience path, not as the race-day dependency.

## Product Goal

The goal is not to make RotorHazard an editor and not to require RotorHazard users to have a TrackDraw account. The goal is to let a RotorHazard event page include a faithful TrackDraw track preview:

- event overview page with an embedded 3D track preview
- dedicated `/event/{eventId}/track` style page for phones, tablets, briefing screens, or livestream overlays
- 2D fallback for low-powered race laptops or browsers without reliable WebGL
- optional event context later, such as current heat, start/finish marker, or active race state

The viewer should support the same basic track-reading job as the current shared/embed viewer, but with a different deployment model:

| Mode                    | Primary use                                                    | Dependency during event       |
| ----------------------- | -------------------------------------------------------------- | ----------------------------- |
| TrackDraw share/embed   | Website embed, quick sharing, always-current published link    | TrackDraw hosted app          |
| npm viewer package      | Third-party apps that want to render TrackDraw data themselves | Installed app bundle          |
| `.tdviewer.zip` package | Offline RotorHazard event attachment                           | RotorHazard local server only |

This makes the npm viewer package the reusable foundation. The offline event package can include that viewer build at first, and later RotorHazard can bundle a trusted viewer version itself.

## Integration Shape

```
TrackDraw project
  -> publish, export, or generate viewer-safe snapshot
  -> RotorHazard imports or syncs snapshot before race day
  -> RotorHazard stores viewer assets and track data with the event
  -> public event page renders a local TrackDraw viewer
  -> race-day clients use only the local RotorHazard server
```

**Ownership split:**

- TrackDraw owns: viewer runtime, viewer data schema, package generation, rendering, asset packaging, compatibility metadata.
- RotorHazard owns: event attachment, admin import/sync UI, static file serving, public page placement, plugin/core integration, optional live race context.

**Design principle:** RotorHazard should never need the full TrackDraw editor to display a track. It should load a stable, read-only viewer contract.

## Viewer Runtime

The viewer should be a small read-only application/runtime extracted from the existing share/embed experience. It should reuse proven renderer logic where safe, but it should not depend on editor state, account flows, autosave, project management, or export dialogs.

Potential package:

- npm name: `@trackdraw/viewer`
- browser global: `TrackDrawViewer`
- custom element: `<trackdraw-viewer>`
- optional React wrapper later if it helps TrackDraw's own app
- static build output for apps that do not use npm bundling

Suggested package outputs:

```
@trackdraw/viewer
  dist/
    index.js              # ESM API
    trackdraw-viewer.js   # browser/custom-element build
    trackdraw-viewer.css
    assets/
      ...
  schemas/
    event-track.schema.json
    viewer-package.schema.json
```

Minimal API:

```ts
import { createTrackDrawViewer } from "@trackdraw/viewer";

const viewer = createTrackDrawViewer(container, {
  track,
  assetsBaseUrl: "/event/123/trackdraw/assets/",
  defaultView: "3d",
  allowViewSwitching: true,
});

viewer.fit();
viewer.setView("2d");
viewer.highlightObject("gate_1");
viewer.destroy();
```

Custom element shape:

```html
<trackdraw-viewer
  src="/event/123/trackdraw/track.json"
  assets-base-url="/event/123/trackdraw/assets/"
  default-view="3d"
></trackdraw-viewer>
```

**In scope:**

- 2D layout view
- 3D orbit view
- route and direction display
- object labels and numbers
- start/finish and split markers
- camera presets: overview, pilot approach, top-down, orbit
- mobile controls
- fullscreen
- offline asset loading from relative URLs
- small integration API for host apps

**Out of scope:**

- editing
- account sign-in
- autosave and project restore points
- share publishing
- export dialogs
- RotorHazard race control logic
- live race overlays in the first version

## Offline Event Package

File extension: `.tdviewer.zip`

The package is an event snapshot, not an editor project backup. It should contain only the viewer-safe data and assets needed to display the course.

```
trackdraw-event-viewer/
  manifest.json
  track.json
  viewer/
    index.html
    assets/
      trackdraw-viewer.[hash].js
      trackdraw-viewer.[hash].css
  assets/
    textures/
      multigp-gate-panel.webp
    models/
      optional-model.glb
  preview/
    thumbnail.png
    poster-3d.png
  checksums.json
```

Two package modes are useful:

- Phase 1 self-contained package: viewer JS, CSS, data, and assets in one zip. This is easiest to test and proves the offline workflow.
- Phase 2 data-only package: RotorHazard installs or bundles `@trackdraw/viewer`; uploaded packages contain only `manifest.json`, `track.json`, preview media, and assets. This is smaller and avoids executing uploaded JS.

RotorHazard should serve unpacked package files over local HTTP. The package should not depend on `file://`, CDN URLs, external fonts, external images, or TrackDraw API calls during the event.

### manifest.json

```json
{
  "type": "trackdraw_viewer_package",
  "schema": "trackdraw.viewer-package.v1",
  "generated_at": "2026-06-15T12:00:00.000Z",
  "trackdraw_version": "1.8.0",
  "required_viewer": {
    "package": "@trackdraw/viewer",
    "api": "trackdraw.viewer.v1",
    "min_version": "1.8.0"
  },
  "source": {
    "type": "project",
    "project_id": "project_123",
    "share_token": "share_abc",
    "published_version_id": "share_version_456"
  },
  "display": {
    "title": "DDS Sportpaleis Race Layout",
    "description": "Public event layout for pilot briefing and spectator review.",
    "default_view": "3d",
    "allow_view_switching": true
  },
  "files": {
    "track": "track.json",
    "viewer_entry": "viewer/index.html",
    "thumbnail": "preview/thumbnail.png",
    "poster_3d": "preview/poster-3d.png"
  },
  "capabilities": {
    "views": ["2d", "3d"],
    "route": true,
    "timing_markers": true,
    "catalog_assets": true,
    "map_reference": false,
    "live_race_overlay": false
  }
}
```

### track.json

`track.json` should be a normalized viewer-safe shape, not raw editor JSON.

```json
{
  "type": "trackdraw_event_track",
  "schema": "trackdraw.event-track.v1",
  "title": "DDS Sportpaleis Race Layout",
  "field": { "width": 60, "height": 40, "origin": "tl", "unit": "m" },
  "units": { "display": "metric", "geometry": "m" },
  "objects": [
    {
      "id": "gate_1",
      "kind": "gate",
      "name": "Gate 1",
      "catalog_id": "multigp-standard-gate-5x5",
      "position": { "x": 12, "y": 18, "z": 0 },
      "rotation": { "yaw": 90 },
      "dimensions": { "width": 1.52, "height": 1.52, "depth": 0.4 },
      "route_number": 1,
      "visual": {
        "renderer": "catalog-gate",
        "asset_set": "multigp-obstacles-v1"
      }
    }
  ],
  "route": {
    "id": "route_1",
    "closed": false,
    "length_m": 126.4,
    "waypoints": [{ "x": 8, "y": 20, "z": 0 }],
    "sampled_points": [{ "x": 8, "y": 20, "z": 0 }]
  },
  "timing_markers": [
    {
      "object_id": "gate_1",
      "role": "start_finish",
      "route_distance_m": 14.2
    }
  ]
}
```

Excluded from package:

- account email
- API keys
- private project history
- autosave snapshots
- editor selection state
- unpublished comments or notes
- private map source metadata

## RotorHazard Workflows

### Offline import, no TrackDraw account required

1. Design track in TrackDraw Studio.
2. Export `Track Viewer package`.
3. Open RotorHazard event admin.
4. Upload `.tdviewer.zip`.
5. RotorHazard validates schema, compatibility, size, checksums, and required assets.
6. RotorHazard stores the package with the event.
7. Public event page shows the local TrackDraw viewer on the race-day LAN.

This should be the baseline workflow because it works without account setup and without internet.

### Pre-race API sync, account-backed

1. Design track and publish a TrackDraw project/share.
2. Open RotorHazard event admin.
3. Paste share URL or project ID and an API key.
4. RotorHazard fetches `GET /api/v1/projects/{id}/event-viewer-package`.
5. RotorHazard stores the returned package as a local event snapshot.
6. Admin can refresh before race day.
7. During the event, RotorHazard serves the cached snapshot only.

Auth: bearer API key with a narrow `tracks:read` or `viewer-packages:read` scope. OAuth can wait until adoption justifies it.

### Existing online embed, convenience only

RotorHazard could optionally allow a normal TrackDraw embed URL for events that have reliable internet. This should not be the primary integration because it creates a live dependency on TrackDraw availability, the public internet, and the published share route during race day.

Useful copy distinction:

- "Embed TrackDraw share" = fastest online setup
- "Import Track Viewer package" = recommended offline race-day setup
- "Sync from TrackDraw" = pre-race convenience that still stores a local snapshot

### RotorHazard attachment states

```
No track attached
Imported package
Synced package
Online embed configured
Refresh available
Refresh failed
Package incompatible
Package missing assets
Viewer version unsupported
```

## Host Integration API

For iframe or custom-element integration, keep the API small and event-page oriented.

Suggested `postMessage` events:

```
trackdraw.viewer.ready
trackdraw.viewer.error
trackdraw.viewer.setView
trackdraw.viewer.fit
trackdraw.viewer.setTheme
trackdraw.viewer.highlightObject
trackdraw.viewer.highlightTimingMarker
trackdraw.viewer.setLiveRaceState
```

Suggested direct runtime methods:

```ts
viewer.setView("2d" | "3d");
viewer.fit();
viewer.setTheme("light" | "dark" | "system");
viewer.highlightObject(objectId);
viewer.highlightTimingMarker(markerId);
viewer.setLiveRaceState(state);
```

`setLiveRaceState` should stay optional until the static viewer is stable.

## Versioning

Schema names:

- `trackdraw.viewer-package.v1`
- `trackdraw.event-track.v1`
- `trackdraw.viewer.v1`

Rules:

- Additive fields are allowed within `v1`.
- Removing or renaming fields requires `v2`.
- Viewer ignores unknown optional fields.
- Viewer fails clearly on unsupported required capabilities.
- RotorHazard validates compatibility before attaching a package to an event.
- RotorHazard shows "exported with newer TrackDraw version" if `min_version` exceeds its installed viewer.
- TrackDraw export should allow targeting an older supported viewer version once RotorHazard integration exists.

## Implementation Phases

### Phase 0: Align with RotorHazard

Confirm whether this belongs in RotorHazard core or a plugin, and whether the event page can host local static viewer assets per event.

Success: both projects agree on integration surface, storage expectations, and offline-first goals.

### Phase 1: Standalone viewer spike

Extract a read-only viewer from the current share/embed renderer. Load a local `track.json`, render 2D and 3D without server calls, and remove editor/account UI.

Success: open a sample viewer over local HTTP and render a real TrackDraw design without the editor app.

### Phase 2: npm package and static build

Create `@trackdraw/viewer` with an ESM API, custom element build, CSS, and schemas. Keep the viewer runtime independent from Next.js routes.

Success: a plain HTML page and a small bundled app can both render the same sample track using the package.

### Phase 3: Viewer-safe schema and package export

Define `trackdraw.viewer-package.v1` and `trackdraw.event-track.v1` as TypeScript/JSON schemas. Add browser export for `.tdviewer.zip` with manifest, track data, previews, assets, and self-contained viewer files.

Success: export without an account, serve locally, no private data included.

### Phase 4: RotorHazard import prototype

RotorHazard side: admin upload control, package validation, event attachment storage, static file serving, public event-page viewer placement, and compatibility error states.

Success: upload to RotorHazard and view the track from another device on the local network without internet.

### Phase 5: Trusted viewer and data-only packages

RotorHazard installs or bundles a known `@trackdraw/viewer` version. TrackDraw can export data-only packages for that viewer version.

Success: smaller packages, no uploaded JS execution, compatibility errors remain clear.

### Phase 6: Account-backed pre-race sync

Add server-side package generation endpoint. RotorHazard admin enters API key and project/share ID, fetches a local snapshot, manually refreshes before race day, and sees the last sync timestamp.

Success: sync improves setup convenience but event display still works fully offline after sync.

### Phase 7: Optional live event hooks

Highlight current heat, start/finish, active pilot state, or route-relevant timing markers from RotorHazard. Static display remains the stable baseline.

Success: live context enriches the event page without coupling TrackDraw viewer rendering to race control.

## Technical Risks

| Risk                                                              | Mitigation                                                                                                        |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Viewer extraction is coupled to Next.js, Zustand, or editor state | Start with a spike; define a read-only data boundary; reuse renderers only where they do not pull editor behavior |
| Bundle size is high because of Three.js/R3F                       | Lazy-load 3D; keep 2D fallback cheap; optimize textures; set package size warnings                                |
| Uploaded package includes executable JS                           | Allow only for prototype; move production toward RotorHazard-bundled `@trackdraw/viewer` and data-only packages   |
| Offline assets fail because of CDN or absolute URLs               | Require relative asset URLs; include fonts/textures/models in package or viewer bundle                            |
| Schema drift breaks older RotorHazard installs                    | Version schemas; support export target versions; make compatibility errors actionable                             |
| WebGL is unreliable on race laptops                               | Ship 2D fallback and poster preview; do not require 3D for event page usefulness                                  |
| Asset licensing is unclear                                        | Provide generic fallback rendering; include attribution metadata where needed                                     |

## Open Questions for RotorHazard

1. Should this be RotorHazard core, a plugin, or both?
2. Can RotorHazard store and serve static files per event?
3. What is the preferred public placement: inline event panel, modal, dedicated track page, or all three?
4. What package size is acceptable for typical race computers and SD card deployments?
5. Should RotorHazard bundle `@trackdraw/viewer`, accept self-contained packages, or support both?
6. Can plugin data include checksums, package metadata, and extracted asset folders?
7. Which RotorHazard versions would be realistic targets?
8. Should the public event page allow downloading the attached TrackDraw viewer package?
9. What live race state, if any, is worth exposing to the viewer after the static display works?

## Go / No-Go

Move to PVA if:

- RotorHazard maintainers want local track preview support on event pages.
- RotorHazard can host static viewer assets and event-specific track data.
- TrackDraw can produce a standalone viewer without destabilizing the editor.
- Both projects accept a versioned viewer/data contract.
- Offline/LAN reliability is treated as a first-class requirement.

Keep parked if:

- RotorHazard cannot host local static viewer assets per event.
- Viewer extraction would require large editor rewrites.
- Online embed is considered sufficient for the expected RotorHazard use case.
- The integration cannot avoid race-day dependency on TrackDraw hosted services.
