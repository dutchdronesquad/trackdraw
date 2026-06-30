# RotorHazard Event Viewer Integration

**Date:** June 15, 2026
**Status:** Long-term product direction — not yet in PVA

---

## Concept

TrackDraw exports a self-contained **Track Viewer package** (`.tdviewer.zip`). RotorHazard imports it, stores it with the event, and serves it on the public event page. The viewer works on a race-day LAN without internet after import.

```
TrackDraw editor
  → export / publish Track Viewer package
  → RotorHazard imports or syncs package
  → RH serves viewer + data from local event server
  → public event page shows interactive 2D/3D course
```

**Ownership split:**

- TrackDraw owns: package schema, package generation, Track Viewer build, rendering, asset packaging.
- RotorHazard owns: event attachment, static file serving, admin import/sync UI, public page placement, optional live race context.

---

## Package Format

**File extension:** `.tdviewer.zip`

```
trackdraw-event-viewer/
  manifest.json
  track.json
  track-viewer/
    index.html
    assets/
      viewer.[hash].js
      viewer.[hash].css
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

**Two modes (future):**

- Phase 1 — self-contained: viewer JS + data + assets all in one zip. Easier to test offline.
- Phase 2 — split: RH installs Track Viewer separately, packages contain only data + assets. Smaller per-event files, safer for upload security.

### manifest.json

```json
{
  "type": "trackdraw_viewer_package",
  "schema": "trackdraw.viewer-package.v1",
  "generated_at": "2026-06-15T12:00:00.000Z",
  "trackdraw_version": "1.8.0",
  "required_track_viewer": {
    "name": "trackdraw-track-viewer",
    "api": "trackdraw.track-viewer.v1",
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
    "track_viewer": "track-viewer/index.html",
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

Normalized viewer-safe shape — not raw editor JSON.

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

**Excluded from package:** account email, API keys, private project history, autosave snapshots, editor selection state, private map source metadata.

---

## Track Viewer

Read-only app. Not the full editor.

**In scope:** 2D layout view, 3D orbit view, route + direction, object labels/numbers, start/finish + split markers, camera presets (overview, pilot approach, top-down, orbit), mobile controls, fullscreen, integration API.

**Out of scope:** editing, project manager, account sign-in, share publishing, export dialogs.

**Camera presets:**

- Overview — angled above field, all obstacles visible
- Pilot approach — low near start/finish for route review
- Top-down — for setup / briefing
- Orbit — free exploration

**Integration API (postMessage):**

```
trackdraw.track-viewer.ready
trackdraw.track-viewer.error
trackdraw.track-viewer.setView       // "2d" | "3d"
trackdraw.track-viewer.fit
trackdraw.track-viewer.setTheme
trackdraw.track-viewer.highlightObject
trackdraw.track-viewer.highlightTimingMarker
trackdraw.track-viewer.setLiveRaceState   // deferred to Phase 7
```

**Form factors:**

- Embedded panel on `/event/{eventId}` public page
- Standalone viewer at `/event/{eventId}/track` (for phones, tablets, briefing screens)

---

## Workflows

### Offline import (no account required)

1. Design track in TrackDraw Studio.
2. Export "Track Viewer package" → downloads `.tdviewer.zip`.
3. Open RotorHazard event → upload `.tdviewer.zip`.
4. RH validates, stores, serves locally.
5. Public event page shows viewer on LAN.

### API sync (account-backed)

1. Design track, publish project in TrackDraw.
2. Open RH event → paste share URL or project ID + API key.
3. RH fetches `GET /api/v1/projects/{id}/event-viewer-package` → stores local snapshot.
4. Admin clicks "Refresh from TrackDraw" before race day if needed.
5. During event: RH uses cached snapshot, no live dependency on TrackDraw.

**Auth:** bearer API key with `tracks:read` scope. Future: OAuth if adoption justifies it.

### Snapshot states in RH

```
No layout attached
Imported package
Synced package
Sync available
Sync failed
Package incompatible
Package missing assets
```

---

## Versioning

Schema names: `trackdraw.viewer-package.v1`, `trackdraw.event-track.v1`, `trackdraw.track-viewer.v1`

- Additive fields allowed within `v1`.
- Removing or renaming fields requires `v2`.
- Viewer ignores unknown fields, fails clearly on unsupported required capabilities.
- RH validates compatibility before attaching a package to an event.
- RH shows "exported with newer TrackDraw version" if `min_version` exceeds installed viewer.

---

## Implementation Phases

### Phase 0 — Align with RotorHazard

Open questions for RH maintainers (see below). No code yet.

### Phase 1 — Standalone viewer spike (TrackDraw side)

Extract read-only viewer from current share/embed renderer. Load `track.json` from a local relative path. Render 2D + 3D offline without server calls. Strip editor/account UI entirely.

**Success:** open `index.html` locally, load sample package, render 2D + 3D.

### Phase 2 — Package schema

Define `trackdraw.viewer-package.v1` and `trackdraw.event-track.v1` as TypeScript/JSON schemas. Add validator tests. Add sample packages in test fixtures.

**Success:** generate a valid package from a real TrackDraw design; invalid packages produce actionable errors.

### Phase 3 — Browser export

Add "Export Track Viewer package" action in TrackDraw. Generates manifest, track data, previews, assets, viewer. Shows route readiness warnings on export.

**Success:** export without account, open offline, no private data included.

### Phase 4 — RotorHazard import prototype

RH side: admin upload control, package validation, event attachment storage, static file serving, public page viewer placement, compatibility error states.

**Success:** upload to RH, public event page renders on local network without internet.

### Phase 5 — Account-backed API sync

Add server-side package generation endpoint. RH admin: enter API key + project/share ID, fetch, store snapshot, manual refresh, show last sync timestamp.

**Success:** RH fetches before race day, stores local copy, no live dependency during event.

### Phase 6 — Trusted viewer + asset deduplication

RH bundles a known TrackDraw Track Viewer build. Packages contain only data + assets. RH does not execute uploaded viewer JS.

**Success:** smaller packages, safer upload handling, compatibility errors still clear.

### Phase 7 — Optional live event hooks

Highlight current heat, active pilot progress on route, link route anchors to RH timing events. Static viewer must be stable first. Live state remains optional.

---

## Technical Risks

| Risk                                                                        | Mitigation                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Bundle size** — Three.js/R3F pulls in a lot                               | Lazy-load 3D; 2D fallback cheap; optimize textures; warn on large packages         |
| **Viewer extraction** — viewer is coupled to Next.js + Zustand editor store | Start with spike; extract read-only state boundary; reuse renderer components only |
| **Asset licensing** — MultiGP artwork may have constraints                  | Attribution where needed; generic fallback rendering available                     |
| **Package security** — self-contained zip includes JS                       | Use self-contained for prototype; move to RH-bundled viewer for production         |
| **Schema drift** — renderer evolves faster than RH can release              | Explicit schema versions; compatibility export target; conservative v1             |
| **Offline browser constraints** — WebGL, cross-origin, file://              | RH must serve over local HTTP, not file://; use relative asset paths               |

---

## Open Questions for RotorHazard

1. Core integration or plugin/extension?
2. Upload-only to start, or API sync from day one?
3. Can RH store and serve static asset packages per event?
4. Inline viewer panel, modal, or dedicated route — preference?
5. How does RH store per-event plugin data today?
6. Acceptable package size for typical race computers?
7. Should RH bundle the Track Viewer separately, or accept self-contained packages?
8. Should the package be downloadable from the public event page?
9. Which RotorHazard versions would be targetable?

---

## Go / No-Go

**Move to PVA if:**

- RH maintainers want a hosted/cached Track Viewer package on the event page.
- RH can provide an event attachment point and serve static files.
- TrackDraw can produce a standalone viewer without dragging in the full editor.
- Both teams accept a versioned package contract.

**Keep parked if:**

- RH cannot host static viewer assets per event.
- Viewer extraction would require destabilizing the editor.
- Offline/LAN reliability is not a priority for the expected user base.
