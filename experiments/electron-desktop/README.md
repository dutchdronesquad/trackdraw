# TrackDraw Electron desktop development build

This desktop development build runs the shared TrackDraw editor from a local Vite bundle in Electron on the `codex/desktop-app` branch. It has a project library, document tabs, and native SQLite storage for projects, the current draft, and restore points. The existing web build and project storage remain in place.

## Run

Requires Node.js 22.12 or newer and the repository's normal dependencies. From the repository root:

```bash
npm ci
npm --prefix experiments/electron-desktop ci
npm --prefix experiments/electron-desktop start
```

If the root dependencies are already installed, only the last two commands are needed. `start` builds the local renderer and launches Electron. Initial setup requires internet for dependencies, the Electron binary, and the catalog texture cache. Subsequent starts can build from the cache and run offline. No Next.js server or Cloudflare credentials are needed.

The catalog texture preparation reads the current URLs in the shared catalog and downloads them into the ignored `.asset-cache/` directory. The bundle rewrites those URLs to local paths and includes the textures in `dist/`. To populate the cache from an existing asset checkout instead, set `TRACKDRAW_POC_TEXTURES` to its MultiGP WebP texture directory when building. No other repository is required.

## Try the desktop flow

1. Start at **Home**, browse **Recents** or **All projects**, and search by name. Choose **New track**, **Import project…**, or **Load sample** in an empty library.
2. Place and select obstacles, move them, and use undo and redo.
3. Switch between **2D** and **3D**.
4. Wait for **Saved locally** in the POC bar, quit, and reopen the app without internet.
5. Use the File menu's **Save project copy as…** and **Open project copy…** to round-trip a normal TrackDraw JSON project through native file dialogs. Imported copies open as independent documents. The shortcuts are Cmd/Ctrl+Shift+S and Cmd/Ctrl+O. Cmd/Ctrl+S retains the editor's existing snapshot behavior.
6. Use the normal **Export** dialog for SVG or Race Pack PDF. Downloads use a native save dialog.

Opening another project or loading the sample first saves the current project in the POC library. File save is an explicit copy operation: it writes the selected file without changing the active document or the database draft. Autosave does not keep overwriting the exported JSON file. Failed or cancelled file selection leaves the current project open.

## Storage and boundaries

- The development app stores `projects.sqlite` and its Electron profile in the operating system's application-data location under `TrackDraw Desktop Alpha`. Data survives replacing this checkout. The original POC's `.profile/` is not migrated or removed automatically; export JSON copies there and import them explicitly in this build.
- Native saves atomically update the working draft and project in SQLite. Restore points are retained per project. An asynchronous desktop adapter replaces the browser persistence hook in this build; browser persistence remains unchanged. The small shared import/new-project/cloud-open/save callbacks await preservation before advancing. The synchronous browser persistence API deliberately fails if accidentally used for a desktop write.
- The existing editor, store, geometry, renderers, and exports are imported directly from `src/`. There is no copied editor implementation.
- Build aliases provide local replacements for persistence, Next navigation, lazy imports, links, images, authentication, and the online map picker. History changes continue to drive editor dialogs.
- Accounts, cloud sync, publishing, website navigation, feedback, and online map selection are unavailable. The workspace and local notices identify this boundary. Remote map imagery or image URLs in an imported project are not guaranteed to display offline.
- Catalog textures and the repository's public assets are bundled locally. Product analytics are disabled in the POC profile. HTTP, HTTPS, and WebSocket requests are blocked by the Electron session.
- The renderer is sandboxed with context isolation and no Node.js integration. The preload bridge exposes only project file dialogs, a fixed set of repository commands, native menu actions, and a close/save handshake. It does not expose SQL or filesystem paths. File paths come from native dialogs, project payloads are limited to 16 MiB, and imports use the existing TrackDraw parser.
- Installers, code signing, automatic updates, multiple document windows, video export acceptance, and cross-platform release support remain outside this first POC.

## Verification

Run the desktop smoke checks from the repository root:

```bash
npm --prefix experiments/electron-desktop run smoke
```

The checks launch real Electron windows with a disposable `.smoke-profile/`, use the existing editor UI, and save output under ignored `artifacts/`. They simulate native dialog choices for deterministic file round-trips; the operating system's dialog interaction still needs a human check. Every run resets only the smoke profile and its generated files. Normal desktop projects remain in the separate application-data profile.

The smoke flow covers placement, selection and nudge, undo/redo, 3D canvas creation, native IPC project round-trip, SVG/PDF downloads, renderer isolation, pending-save flush on normal close/restart, and abrupt exit after confirmed autosave. Screenshots provide a separate visual check of 2D and 3D rendering; WebGL canvas creation alone does not establish visual correctness.

## Removing the experiment

Export projects you want to retain and close Electron before removing this checkout. Generated builds, texture caches, dependencies, and smoke output live here; the normal desktop database remains in the application-data profile. The branch also contains a few shared callbacks that await preservation, so retain or revert those through Git when abandoning this branch. Never delete the application-data profile as part of routine cleanup. Retain the [concept and evaluation](../../docs/research/in-progress/electron-desktop-concept.md) if the direction is parked.

## Native storage checks

```bash
npm --prefix experiments/electron-desktop test
```

These tests use disposable SQLite databases to exercise atomic write failure, interrupted transactions, reopen, unknown future schema rejection, restore pruning/recovery, inactive-copy behavior, and cascade deletion. The runtime uses Electron's bundled `node:sqlite`, avoiding a separately compiled SQLite addon. The schema currently has one initial migration; future incompatible schemas are refused without rewriting the database.

Each open document now has an independent editor store and undo/redo history; only the active editor/canvas is mounted. The account transport is still disabled, and authentication expiry, offline asset pinning, cloud continuity, platform installers, and updates remain later work in the PVA. In this increment the entire catalog texture set is locally bundled, not a per-project asset pinning system.

## Project library and document tabs

The Home tab opens the local project library with recent/all-project sorting, search, shared SVG previews, new/import actions, rename, duplicate, and confirmed deletion. Opening a project already in a tab activates that document. Closing a tab saves it and leaves its project in the library. File menu shortcuts include Cmd/Ctrl+N for a new track, Cmd/Ctrl+O for import, Cmd/Ctrl+W to close the current document, and Cmd/Ctrl+Shift+H for the library.

Each document owns a separate instance of the existing editor store and temporal history. Switching waits for the current document's save acknowledgement; failure leaves it open. Selection, 2D pan/zoom, 3D orbit camera/target, and view mode belong to that document. Finish an active gesture/path or close an editor dialog before switching. The renderer is briefly inert while changing documents to prevent edits during an asynchronous handoff.

Open tab IDs, recent ordering, selection and view preferences use Zustand persist under `trackdraw.desktopWorkspace`; project payloads stay in SQLite. Startup shows Home and restores open tabs from available local projects. View preferences survive close/reopen and application restart. Undo/redo history stays in memory for open tabs and resets when a document is closed or the app restarts; SQLite restore points provide durable recovery. Inactive canvases are unmounted rather than kept consuming GPU resources.

Desktop smoke coverage includes two independently edited documents, separate undo/redo histories, selection and 2D viewport preservation, a rendered-image comparison for 3D camera/pan restoration, close/reopen, library search/rename/duplicate/delete, persisted tabs, and save-on-close. The browser keeps its existing default editor store and starter experience.
