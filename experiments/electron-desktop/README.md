# TrackDraw Electron desktop POC

This removable experiment runs the existing TrackDraw editor from a local Vite bundle in Electron. It evaluates offline editing, local project continuity, and desktop file handling without moving production code or changing web build commands.

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

1. Select **Load sample** in the POC bar, or use the normal starter flow.
2. Place and select obstacles, move them, and use undo and redo.
3. Switch between **2D** and **3D**.
4. Wait for **Saved locally** in the POC bar, quit, and reopen the app without internet.
5. Use **Save project copy as…** and **Open project copy…** to round-trip a normal TrackDraw JSON project through native file dialogs. The shortcuts are Cmd/Ctrl+Shift+S and Cmd/Ctrl+O. Cmd/Ctrl+S retains the editor's existing snapshot behavior.
6. Use the normal **Export** dialog for SVG or Race Pack PDF. Downloads use a native save dialog.

Opening another project or loading the sample first saves the current project in the POC library. File save is an explicit copy operation: autosave does not keep overwriting the exported JSON file. Failed or cancelled file selection leaves the current project open.

## Storage and boundaries

- `.profile/` contains the normal POC's persistent Electron profile. It is separate from browser projects and login sessions.
- Local autosave, the project library, and restore points use the unchanged `src/lib/projects.ts` implementation in that profile. No SQLite migration is included.
- The existing editor, store, geometry, renderers, and exports are imported directly from `src/`. There is no copied editor implementation.
- Build aliases provide local replacements for Next navigation, lazy imports, links, images, authentication, and the online map picker. History changes continue to drive editor dialogs.
- Accounts, cloud sync, publishing, website navigation, feedback, and online map selection are unavailable. The desktop bar and local notices identify this boundary. Remote map imagery or image URLs in an imported project are not guaranteed to display offline.
- Catalog textures and the repository's public assets are bundled locally. Product analytics are disabled in the POC profile. HTTP, HTTPS, and WebSocket requests are blocked by the Electron session.
- The renderer is sandboxed with context isolation and no Node.js integration. The preload bridge exposes only project open/save and native menu actions. File paths come from native dialogs, project payloads are limited to 16 MiB, and imports use the existing TrackDraw parser.
- Installers, code signing, automatic updates, multiple document windows, video export acceptance, and cross-platform release support remain outside this first POC.

## Verification

Run the desktop smoke checks from the repository root:

```bash
npm --prefix experiments/electron-desktop run smoke
```

The checks launch real Electron windows with a disposable `.smoke-profile/`, use the existing editor UI, and save output under ignored `artifacts/`. They simulate native dialog choices for deterministic file round-trips; the operating system's dialog interaction still needs a human check. Every run resets only the smoke profile and its generated files. Normal POC projects remain in `.profile/`.

The smoke flow covers placement, selection and nudge, undo/redo, 3D canvas creation, native IPC project round-trip, SVG/PDF downloads, renderer isolation, normal restart, and abrupt exit after confirmed autosave. Screenshots provide a separate visual check of 2D and 3D rendering; WebGL canvas creation alone does not establish visual correctness.

## Removing the experiment

Export any POC projects you want to retain, close Electron, then remove this directory. Its generated bundle, dependencies, caches, profiles, and smoke output are all contained here. No production source changes need to be reverted. Retain the [concept and evaluation](../../docs/research/in-progress/electron-desktop-concept.md) if the direction is parked.
