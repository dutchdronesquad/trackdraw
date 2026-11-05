# TrackDraw Tauri desktop development build

This alpha runs the shared TrackDraw editor in Tauri 2 with a Rust host and native SQLite storage. The system webview replaces Electron's bundled Chromium and Node runtime. The project library, document tabs, existing Studio layout, per-document undo history and portable JSON format stay shared with the accepted desktop foundation. Browser editing remains a full workspace. Accepted desktop changes land on `codex/desktop-integration`.

## Setup and run

Install the repository dependencies, stable Rust and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/). macOS requires Xcode command-line tools. Linux requires WebKitGTK 4.1 and the documented GTK/build dependencies; Windows requires the MSVC build tools and WebView2. This alpha declares macOS 14 or newer because the shared editor uses modern CSS and WebGL2. Windows/Linux GUI and minimum-version acceptance remain release gates.

From the repository root:

```bash
npm ci
npm --prefix experiments/tauri-desktop ci
npm --prefix experiments/tauri-desktop start
```

`start` builds the local Vite frontend and launches Tauri with embedded assets. No Next.js server, account, Cloudflare credentials or Node runtime is needed by a packaged app. Dependency installation and the initial catalog texture cache need internet. Subsequent builds reuse the ignored `.asset-cache/`. Optionally set `TRACKDRAW_POC_TEXTURES` to an existing MultiGP WebP texture directory during the build.

Build the platform bundle with:

```bash
npm --prefix experiments/tauri-desktop run package
```

For a local macOS debug application bundle:

```bash
npm --prefix experiments/tauri-desktop run package -- --debug --bundles app
```

Generated binaries and bundles live under `src-tauri/target/` and are ignored. The existing TrackDraw artwork generates the committed Windows `.ico` and PNG icons. The macOS `.icns` uses `src-tauri/icons/macos.svg`, with an 824 px icon body centered on a transparent 1024 px canvas so it matches the visual size of other Dock icons. From this directory, regenerate with `npx tauri icon src-tauri/icons/macos.svg --output out/macos-icons`, then copy only `out/macos-icons/icon.icns` to `src-tauri/icons/icon.icns`; keep the macOS padding separate from the web and other platform icons. The application and native menus identify as **TrackDraw Desktop Alpha**. Signing, notarization, release installers, updates and file associations remain later delivery work. An unsigned local build is not a distribution release.

## Offline workspace

Every project is local by default, with no preparation button, pin or login gate. Start at Home, browse/search recent or all projects, and create, import, rename, duplicate or delete projects. Opening an existing tab activates it. Closing a tab saves the document but retains the library project. Switching waits for the current save acknowledgement; failure retains the open work.

Each document owns the existing editor store and in-memory undo history. Only the active canvas is mounted. Tab IDs, recent order, selection, 2D viewport, 3D camera and view preferences use Zustand persistence under `trackdraw.desktopWorkspace`. Startup shows Home and restores available tabs. Undo history resets after closing a document or restarting the app; SQLite restore points provide durable recovery. Webview preferences start fresh during the runtime migration; project/history data is migrated separately.

The bundled editor, catalog textures, 2D/3D editing and supported exports require no website or login endpoint. The host denies remote navigation, new windows, permission prompts and uncontrolled webview downloads. CSP blocks remote network resources. Accounts, cloud sync, publishing, feedback and online map selection remain disabled in this alpha. Cloud-only projects cannot be downloaded offline. External map/appearance references remain in projects but their remote images may be unavailable.

## Files and native menus

- Cmd/Ctrl+N creates a track; Cmd/Ctrl+Shift+H opens the library.
- Cmd/Ctrl+O opens a project copy through a native JSON picker.
- Cmd/Ctrl+Shift+S saves a project copy; Cmd/Ctrl+S retains Studio's snapshot behavior.
- Cmd/Ctrl+W closes the current document; Cmd/Ctrl+Shift+W closes the window after pending saves.
- The shared Export dialog sends blob/data downloads, including detached PDF anchors, through a native save dialog. The byte bridge has a 128 MiB export limit.

Import creates an independent project ID and timestamps while retaining the track fields and item IDs. Saving a copy writes only that file; autosave never silently overwrites it. Native file paths come only from the OS dialog and are not exposed to the renderer. Project files are limited to 16 MiB and validated again by the shared parser. The renderer has no SQL or arbitrary filesystem API. Its narrow command bridge exposes repository operations, open/save dialogs, menu events and a save-before-close acknowledgement.

For the browser-to-desktop-to-browser journey, export **Project File** from **Project Data** in the browser, import in desktop, edit and save a copy, then import that JSON back into the browser. Retain the original file/project. Portable data includes all current track/item fields, inventory, map metadata, groups, timing, catalog snapshots, appearances, route altitudes and arbitrary item metadata. Device preferences, undo history, restore points, account rights and cached image bytes are not part of the file. Version-one files use the existing rotation migration; invalid/future schemas are rejected by the shared parser.

## Storage and migration

The Tauri app stores `projects.sqlite` in its platform application-data directory under the bundle identifier `app.trackdraw.desktop.alpha`; webview preferences use its `webview/` subdirectory. On macOS this is the Application Support directory. Set `TRACKDRAW_DESKTOP_PROFILE` to a disposable directory for isolated QA. This override skips automatic legacy import. Never point test cleanup at the normal profile.

At the first normal Tauri start, if its database does not yet exist, the host copies the previous Electron database from the platform configuration directory named `TrackDraw Desktop Alpha` (Application Support on macOS). The SQLite backup API includes committed WAL data. The original database is neither moved nor rewritten, and an existing Tauri database is never overwritten. Close Electron before moving over to avoid later edits diverging into two databases. Earlier checkout-local `.profile/` data requires explicit JSON transfer; it is not imported automatically.

The schema stays at version two: projects, current draft, restore points and legacy offline-preparation records. Prepared records are retained for compatibility; the current runtime verifies its embedded asset manifest instead of keeping another runtime cache. Legacy Electron cache files remain untouched and are not required to edit local tracks. SQLite uses WAL, FULL synchronization, bounded busy waits and transactions. A future database version is refused without reset or downgrade. A corrupt or inaccessible startup database is not silently replaced; startup repair remains outside this increment.

## Save failures and recovery

Failed writes keep the latest in-memory edits and show **Unsaved projects**. **Retry save** persists the current content, including edits since the failure. Reading the library or saving another project does not clear its failure. Switching/closing waits for success.

**Export JSON backup** bypasses SQLite through the native file dialog. Cancellation or failure does not acknowledge a backup. Backup/export replacement writes and syncs a temporary file in the destination directory before atomic replacement; failure retains the previous destination. **Close with exported backups** requires a successfully exported copy of every unsaved document's current content. Further edits invalidate that acknowledgement. Import those files later to recover independent project copies. Close flushing blocks editor input/menu work until saving succeeds or fails.

## Verification

```bash
npm --prefix experiments/tauri-desktop test
npx vitest run tests/desktop tests/components/json-desktop-roundtrip.test.tsx
cargo check --manifest-path experiments/tauri-desktop/src-tauri/Cargo.toml --locked
```

Rust storage/file tests use temporary databases and cover rich JSON preservation, schema migration, live Electron WAL import, transaction rollback, restore history, pruning, cascade deletion, invalid inputs and failed backup writes/sync/replacement. CI runs these headless tests on macOS, Windows and Linux. The browser/desktop integration test uses real browser export/import dialogs, JSON files and the Rust repository binary, comparing the complete fixture across save/restart/edit/reimport. The helper binary is test tooling, not the desktop application. Download tests cover immediately revoked blob URLs and detached anchors.

The previous Electron/Playwright smoke runner is removed; Chromium automation is not proof of WKWebView behavior. Native acceptance must launch the real Tauri app in a disposable profile, create/select/move/undo items, switch 2D/3D and tabs, use OS open/save/export dialogs, then quit/reopen after edits. Repeat on each supported platform and include unavailable TrackDraw/login endpoints, failed-save recovery and external-resource cases. Storage CI does not establish native rendering, OS-dialog, physical power-loss or full venue acceptance.

## Removing the experiment

Export tracks you want to retain before removing the checkout. Generated builds, dependencies and caches live here, while normal application data remains outside the checkout. Never delete application-data profiles during routine cleanup. Keep the [Desktop Workspace PVA](../../docs/pva/desktop-workspace-pva.md) and the [original desktop concept](../../docs/research/in-progress/electron-desktop-concept.md) for rationale and remaining gates.
