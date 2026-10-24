# TrackDraw Electron desktop concept

Date: October 24, 2026

Status: an isolated Electron POC exists in `experiments/electron-desktop/` and received positive hands-on feedback. Community feedback refines the direction: retain the browser as a full workspace and focus desktop on reliable offline creation and venue-side changes. The [Desktop Workspace PVA](../../pva/desktop-workspace-pva.md) defines the next delivery phases; production release and broader platform acceptance remain open.

## Desktop and web product direction

Use Figma as the reference for project organization and continuity: a desktop project library, recent documents, document tabs, automatic saving, and the same account projects available through the browser. Retain TrackDraw's own visual identity. Web Studio remains a full editor for complete design sessions without installation. Desktop primarily adds dependable offline creation, changes to downloaded tracks, and local file handling at the field. Users may choose either host for regular design. Public shares, gallery, embeds, and mobile access retain their web role.

Figma documents equivalent core functionality between desktop and browser, with a desktop file browser and document tabs. Its product remains cloud-based and has limited offline availability. TrackDraw adopts that workspace and account model while retaining anonymous editing and strengthening offline reopening for projects already stored on the device. Linux is also a TrackDraw delivery goal rather than an assumption about Figma's supported desktop platforms. See [Figma's desktop guide](https://help.figma.com/hc/en-us/articles/5601429983767-Guide-to-the-Figma-desktop-app) and [offline behavior](https://help.figma.com/hc/en-us/articles/360040328553-What-can-I-do-offline-in-Figma).

Keep the existing account direction: new projects created while signed in synchronize automatically, and pre-existing device projects require deliberate attachment. The desktop plan does not introduce a per-project cloud opt-in for every new signed-in project. Saving locally remains the durability layer; the account revision remains the shared baseline across devices. Importing a portable project copy must not silently replace an account revision.

The target is one editor with two full workspaces. Shared editing features belong to both; desktop-specific priority concerns offline reliability, preparation, recovery and native file integration. Do not reduce browser functionality or require installation to encourage desktop adoption. Heavy editing already runs locally in the web version, so any reduction in cloud load must come from measured changes in sync, reads, or asset traffic. Default account sync remains part of the intended continuity experience when the user is signed in.

Account-centered authoring is a gradual product direction. The homepage's existing guest/account split is the starting contract, and the reported anonymous audience needs a no-loss path into account projects. The PVA separates desktop delivery from a later account-only authoring gate, preserving existing local work and public review access. Initial anonymous editing remains supported during this transition; the plan does not promise a permanently identical guest feature set.

## Product goal

Explore whether an installable TrackDraw app makes regular track design more convenient, particularly when working without a reliable connection. Keep the browser editor, mobile access, gallery, and canonical shared links available.

The first question is whether the existing editor can run locally in Electron with a small, removable integration. A successful experiment does not commit TrackDraw to a desktop release, a monorepo migration, a new engine, or a new persistence system.

## Proposed user experience

A user opens TrackDraw from their computer, creates or imports a track, edits in 2D and 3D, and exports the result. After quitting and restarting without internet, the saved track is available again. Core editing remains usable without an account.

Cloud accounts, synchronization, and publishing remain a possible second stage. Existing web links continue to work for recipients who have not installed the app.

The value to evaluate is convenient access, reliable local continuity, and desktop file handling. Faster rendering is not an assumed benefit of Electron.

### Feedback from event venues

Community feedback identifies venue website blockers as a practical barrier to using TrackDraw during events. Venue Wi-Fi may otherwise work while TrackDraw or its sign-in flow is blocked. Offline desktop operation must cover this situation as well as a complete loss of internet.

Further feedback explicitly favors keeping the browser for general use and values an app for creating tracks offline or altering downloaded tracks at the field. It also supports the journey of preparing a track at home and adjusting it at the event. This refines the earlier desktop-primary direction; it is qualitative feedback, not evidence that all users want desktop or mandatory accounts.

The reference journey is **prepare at home in the browser, adjust offline in desktop at the field, continue in the browser at home**. Validate it first through explicit JSON copies, retaining the originals and comparing track content rather than expecting imported copies to share an identity. Later validate the same journey through account synchronization, preserving project identity and reviewing concurrent revisions. Keep the portable-copy fallback and the ability to create a new local track at the venue. A browser-only user must still be able to complete a full design session without installing desktop.

Prepare a device and its projects beforehand, then allow cold startup, local design/import, 2D/3D editing, saving, reopening, and supported exports without contacting TrackDraw or completing sign-in at the venue. A previously configured account becoming expired must pause cloud operations rather than block local work. This venue requirement remains part of any future account-only authoring model.

The PVA's venue availability requirement defines project/asset preparation, non-blocking authentication failure, and the blocked-endpoint acceptance matrix. First installation/sign-in and projects never downloaded can still require a working connection. The existing offline POC is useful evidence for a local runtime; authentication-expiry acceptance remains future work.

## Existing foundations

| Owner                                            | Current foundation                                                                          | Desktop question                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/app/studio/page.tsx`                        | Loads the client editor through `EditorShell` with server rendering disabled                | Which route and provider dependencies need a small desktop substitute?                                 |
| `src/components/editor/EditorShell.tsx`          | Existing editor entry point                                                                 | Can a separate local frontend reuse it without moving editor code?                                     |
| `src/lib/projects.ts`                            | Local drafts, named projects, restore points, and serialization using browser local storage | Does the same project layer provide sufficient persistence for the experiment?                         |
| `src/components/editor/useAccountProjectSync.ts` | Account project access, sync states, and revision conflict handling                         | Which network calls must be disabled for an offline experiment and adapted for a later desktop client? |
| `src/lib/server/projects.ts`                     | Cloud project storage and revision checks                                                   | Can a later desktop client reuse the project contract safely?                                          |
| `src/lib/track/` and `src/lib/export/`           | Track rules, geometry, and export implementations                                           | Do existing behaviors work in a locally bundled Electron renderer?                                     |

## Experiment boundary

Use the same repository and preserve its current structure. A future experiment can live under `experiments/electron-desktop/`, with its own package manifest, lockfile, build scripts, and ignored generated output. Do not register a root workspace or change existing web build and deployment commands for this trial.

The POC implements this boundary with a separate Vite build, local aliases for Next.js and authentication integration, and direct imports of the existing editor. Production source files remain in place. If further work requires broad production changes, stop and record the dependency blockers before proceeding.

Allow only small, documented changes outside the experiment when required for reuse. Do not move production directories, extract shared packages, replace the routing system, or redesign the editor. A later PVA should identify any proposed production edits before implementation.

Bundle the renderer and required assets locally. Merely opening the hosted TrackDraw website in an Electron window does not satisfy the offline goal. Next.js server routes remain on the web backend; packaging the whole server is outside the experiment.

Keep Node.js access out of the renderer, enable context isolation and sandboxing, and expose only specific file operations through a preload bridge. Treat imported project files as untrusted input and use the existing parser. The offline POC blocks external navigation. A production version should open supported external web links in the system browser.

## Smallest useful prototype

1. Start a local Electron window with a frontend that reuses the existing editor. Supply only the routing and provider integrations required for that entry point.
2. Include a local sample track and the assets necessary for the selected test flow. Make unavailable cloud and network-dependent functions clear without changing their behavior in the web app.
3. Use the existing local project and restore-point layer in Electron's persistent application profile. This profile is separate from the user's browser data. Import an existing project explicitly; do not read browser profiles.
4. Add native open and save dialogs for the existing serialized project format. Keep autosave in the project layer and keep explicit file export separate from autosave.
5. Exercise 2D editing, undo and redo, 3D preview, and representative SVG/PDF exports with the network disconnected. Evaluate video export separately because it may reveal additional media runtime constraints.
6. Quit and restart the app, reopen the project, compare the saved track with the original, and record failures and required changes.

Use disposable project copies during the trial. Background maps, remotely loaded textures, and other online resources require an explicit asset audit; full offline availability must not be inferred from an offline canvas test.

SQLite, a new project archive format, and a generalized storage abstraction are deferred. The experiment should first demonstrate whether those investments are needed.

## Evaluation criteria

| Question                                   | Evidence required before expanding scope                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does desktop add useful convenience?       | A complete design session shows a concrete benefit over using the browser, such as offline reopening or normal desktop file handling.               |
| Can the editor be reused cheaply?          | An inventory of production changes shows small integration seams, with no copied editor and no broad restructure.                                   |
| Does local continuity work?                | A saved disposable project survives normal quit, forced termination after confirmed save, and offline restart.                                      |
| Does the editor retain essential behavior? | Placement, selection, transforms, undo/redo, 2D/3D consistency, import, and representative exports pass the agreed scenarios.                       |
| What actually works offline?               | A list of bundled, cached, and unavailable assets and features accompanies the results.                                                             |
| Does the web product remain intact?        | Existing relevant tests and web validation pass after any shared source changes.                                                                    |
| Is distribution affordable to maintain?    | A separate follow-up identifies platform testing, signing, update delivery, security maintenance, and release ownership before public distribution. |

Choose the first operating system before building the prototype. Success on one system does not establish Windows, macOS, and Linux compatibility.

## Reasons to park the concept

Park the desktop direction if loading the editor requires a major refactor, the desktop flow offers little benefit over the browser, important rendering or export behavior fails, or maintaining desktop releases outweighs the expected value. Record the specific blocker and what would make revisiting worthwhile.

If the trial is stopped, remove its isolated folder and revert only its explicitly recorded integration edits. Preserve the concept and findings. No user projects, server schema, public routes, or web deployment should depend on the experiment.

## Follow up after a successful experiment

The [Desktop Workspace PVA](../../pva/desktop-workspace-pva.md) now defines the proposed production integration. It sequences durable desktop storage, the project workspace, browser-based sign-in with a safe desktop return flow, sync recovery, and compatibility between desktop clients and the cloud API.

Keep cloud project synchronization separate from public share publication. Reuse the existing revision protection where suitable. Do not assume the current browser session and relative API calls work unchanged from an Electron origin.

Only then decide whether shared packages or an `apps/` structure reduce maintenance enough to justify moving code. Signed installers, automatic updates, and broader platform support belong to the production plan.

## Technical references

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model): separation between the desktop main process, renderer, and preload bridge.
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): renderer isolation and restrictions for native capabilities.

## First POC scope

The [POC runbook](../../../experiments/electron-desktop/README.md) covers setup, storage isolation, manual scenarios, automated desktop checks, and removal. The implementation includes a locally bundled editor, an independent Electron profile, native project copy dialogs, offline catalog textures, and an offline-only runtime. It changes no production editor code or root dependency manifest.

This establishes a candidate for hands-on evaluation, not a released desktop product. Cloud sign-in and synchronization, installer/update delivery, video export acceptance, and support beyond the initial development platform remain open. Decide whether the desktop workflow is useful before extracting packages or replacing storage.

### Initial validation

Validated on macOS arm64 with Node.js 26.11.1 and Electron 45.0.0 on October 24, 2026:

- A local sample track renders in 2D and 3D; both views were visually inspected.
- Automated desktop checks exercise gate placement, selection and nudge, undo/redo, native IPC project round-trip with simulated dialog choices, SVG and Race Pack PDF downloads, renderer isolation, normal restart, and abrupt exit after confirmed autosave.
- The existing web checks pass: lint, TypeScript, 243 test files with 1,581 tests, production build, translation integrity, and the hardcoded copy scan.

Native file chooser interaction, Windows/Linux behavior, full catalog visual acceptance, and wider export coverage remain manual or follow-up checks. These results establish technical feasibility for a local editor; they do not establish user demand or production readiness.

## Desktop branch implementation

Development began on `codex/desktop-app` in a separate managed worktree and now continues through the PR stack into `codex/desktop-integration`. Until that stack lands, `codex/desktop-identity` holds the complete preview and supersedes the original branch. The first increment adds SQLite-backed projects, working drafts and restore points, an awaited desktop persistence adapter, single-instance protection, and a close/save handshake. The original POC profile and unrelated web changes are not migrated automatically.

The browser persistence implementation remains in place. A few shared callbacks now await preservation before replacing a design or advancing a save. The desktop still imports the existing editor, geometry, and renderers; the repository has not been converted into a monorepo. Cloud transport and account login remain disabled in this development build.

Nine native repository tests cover atomic write rollback, interrupted transactions, reopen, unknown future schema rejection, copy/rename isolation, restore pruning/recovery, deletion and invalid commands. Desktop smoke checks use SQLite and include close-before-autosave recovery. On this branch, 241 web test files with 1,569 tests, lint, TypeScript, web build and translation checks pass. These are local development checks, not a desktop release or cross-platform acceptance.

The broader Phase 1 gate remains open, including per-project offline preparation, more complete storage-failure UX, library scaling, and full asset acceptance. Account-expiry venue acceptance follows when authentication is implemented. See the PVA for the remaining phases.

### Project library and document tabs

The desktop branch now opens a Home library with recent/all-project lists, shared SVG previews, search, creation/import and project management. Open projects appear as document tabs, with separate editor stores and temporal histories. Only the active editor is mounted. The web editor continues to use its existing default store and first-use flow.

Tab switching acknowledges the current save before activating the next document. Selection, 2D pan/zoom, 3D camera/target and view mode are kept per document. Workspace metadata restores tabs and view preferences after restart; undo/redo remains in memory while documents are open, with SQLite restore points for durable recovery. The smoke flow checks independent edits/history, 2D restoration, rendered 3D camera restoration, library operations and restart behavior. Broader venue/auth and platform release gates remain open.

Validation for this increment: 243 web test files with 1,573 tests, nine native repository tests, the real Electron smoke flow, lint, TypeScript, web and desktop builds, and both translation checks pass locally. Windows/Linux execution and native file-dialog interaction still require platform acceptance.

The desktop visual direction uses TrackDraw's existing color logo, blue navigation and primary actions, an orange active-document accent, system typography and shared light/dark tokens. Library previews retain the actual track layout and include field dimensions, item counts and update dates. Home, recent projects and independent document tabs are workflow references; Figma's visual assets, copy and exact screen styling are not implementation sources. Keep this identity work inside the desktop shell so the shared editor and browser UI remain stable.
