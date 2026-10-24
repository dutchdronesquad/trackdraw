# TrackDraw Desktop Workspace PVA

Date: October 24, 2026

Status: delivery plan revised after community feedback. The browser remains a full workspace; desktop primarily adds dependable offline work at event venues. Implementation has started on `codex/desktop-app` in an isolated worktree, including native SQLite persistence, a project library and document tabs. Cloud continuity and later release gates remain open.

## Direction

Keep browser and desktop as full editing workspaces around one shared editor. The browser supports complete track design without installation; desktop primarily supports creating and adjusting tracks offline at the field on macOS, Windows, and Linux. Use Figma's project-library, document-tab, automatic-saving and account-continuity workflow as a reference, with TrackDraw's own visual identity. Preserve the existing web routes. The [desktop concept](../research/in-progress/electron-desktop-concept.md) owns the product rationale and POC evidence.

The reference journey is **prepare at home, adjust at the field, continue at home**. Users can choose either host for complete design sessions; desktop adoption must not be achieved by reducing browser capabilities or making desktop installation a requirement for normal editing. Prioritize local startup, file handling, project preparation and recovery in desktop. Implement shared editing features for both hosts. Account-centered continuity remains useful, but any future account requirement is a separate product decision. Preserve the current guest contract while building this workflow.

## Account transition

The current homepage already distinguishes guest design/2D/3D/export and temporary sharing from account-backed continuity, durable publishing, embeds, gallery, sections, and REST access. The user reports a substantial anonymous audience. Start from this existing split and preserve completed anonymous work throughout the transition. MCP is also account-authorized, with its own delivery/acceptance status.

1. **Preserve the present entry path.** Ship desktop foundations without restricting existing guest editing, exports, temporary shares, or access to saved work. Keep public review links directly accessible.
2. **Make accounts the normal ongoing workspace.** In desktop and web, emphasize the account project library, cross-device continuity, recovery, and integrations. Offer sign-in at meaningful moments, such as continuing on another device. Preserve the active design through the entire login and deliberate attachment flow; cancellation or failed authentication returns to that design.
3. **Evaluate an account requirement for new authoring.** Before changing guest entitlements, inspect aggregate sign-in completion, continued editing after sign-in, guest abandonment, auth/support failures, and successful local-project imports. Establish a comparable baseline and acceptance thresholds before the experiment. Do not equate anonymous sessions with unique people or introduce fingerprinting to measure conversion.
4. **Roll out any authoring requirement separately.** If that gate is accepted, announce the boundary and transition period, update the homepage and editor consistently, and enable it through a reversible rollout. New authoring may then require an account on both desktop and web. Existing local tracks must remain openable and exportable, with a supported path into an account; sign-in must not retroactively lock their data away. Account-required authoring must still support offline editing of available projects after an initial authenticated setup.

Guest trial scope at any possible account-only stage remains a separate entitlement decision. Public gallery, published share viewing, and embeds stay accessible without login. Account requirements do not introduce pricing or paid subscriptions. Desktop development does not depend on deciding the final guest cutoff now. The venue feedback supports browser choice and offline desktop availability; it does not establish demand for mandatory accounts or authorize restricting browser authoring.

Exit gate for account-only authoring: working login/recovery, robust account sync, no-loss guest import, retained access to existing work, aligned user-facing copy, and observed adoption meeting the thresholds agreed before rollout. A rollback restores the prior guest entitlement without undoing users' new account projects. The current accountless core-editing repository convention remains in force until that separate product change explicitly updates it.

## Product contract

| Surface    | Primary role                                                                                          | Required behavior                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop    | Offline creation and venue-side changes, project preparation, exports, and local file integration     | Open a project library at startup, resume prepared/downloaded tracks, create local tracks, save locally before syncing, and support complete editing sessions without reachable website or login services.        |
| Web Studio | Full track design at home or elsewhere, including continued work after an event, without installation | Retain creation, 2D/3D editing, autosave, recovery, import/export and existing account project features. Keep direct browser editing available and preserve project compatibility and the current guest contract. |
| Mobile web | Venue-side access, review, and editing                                                                | Preserve the existing mobile editor. Shared links and account projects remain usable without a desktop app.                                                                                                       |
| Public web | Discovery, gallery, sharing, and embeds                                                               | Keep `/share/[token]` canonical and directly usable without installation. A shared link opens a published snapshot, not someone's unpublished working copy.                                                       |
| Cloud      | Identity, account project continuity, published snapshots, gallery, and existing APIs/MCP             | Synchronize account revisions and serve public content. Local design operations must not wait for cloud availability.                                                                                             |

### Home to field to home acceptance journey

1. **Prepare at home in the browser.** Create or edit a real track using the full Web Studio. With the current alpha, export a JSON copy and import it into desktop. With future account transport, open the same account project in desktop and explicitly prepare it for offline use. Keep the browser original and explain whether the transfer is a portable copy or the same synchronized project.
2. **Adjust at the field.** Cold-start desktop with no internet, or with TrackDraw and sign-in blocked while venue Wi-Fi still reports online. Open the prepared track, change the layout in 2D/3D, undo/redo, save, close/reopen and export a local copy. Also create a new local track. No website visit, successful login, token refresh or online entitlement check may be required for these local operations.
3. **Continue at home in the browser.** Before account transport exists, export the edited JSON from desktop and import it as a copy in Web Studio. Verify the layout, field settings and supported design data survive the round-trip, then continue editing and exporting in the browser without desktop running. After account transport lands, sync the same project identity and revision back to Web Studio; confirm pending field changes arrive and resolve any concurrent web/MCP revision through review while retaining both versions.

This is a required practical acceptance journey, not evidence that cloud sync already works. JSON transfer remains a supported fallback after synchronization is added. Validate the portable-copy journey first, then the account-continuity journey in Phase 3. Browser-only users must also be able to complete the full create/edit/save/reopen/export journey without installing desktop.

### Accounts and project ownership

Keep the existing [account model](../research/implemented/accounts-project-sync.md): new projects created while signed in synchronize by default; anonymous projects stay on the device. Existing local projects are offered for deliberate account attachment after sign-in rather than silently uploaded. Opening an existing account project retains its identity and revision relationship.

Use one project concept in the interface. Show understandable states such as saved on this device, syncing, synced, offline changes, and version review required. The account revision is the shared cross-device baseline; durable local changes may be newer and must survive disconnection or expired authentication. Local-first saving does not mean treating every device's copy as independently authoritative.

Signing in provides automatic project continuity without a cloud opt-in for every new project. Optional local-only account projects can be evaluated later; they are not a prerequisite for this plan.

An exported JSON is a portable copy. In the production desktop import flow, importing a copy creates a new project identity by default, with an explicit replacement flow if needed, so an old file cannot silently overwrite an account project. This is a proposed production rule, not the current POC's import behavior. Opening from the account library preserves account identity. Signing out stops sync and retains ordinary local data; account deletion and project archival retain the existing server lifecycle rules. Unlinking, archiving, and deleting local files must remain distinct actions.

### Online and offline work

Locally created projects and account projects explicitly downloaded or recently opened on this device can reopen offline. A cloud-only project that has never been downloaded requires a connection. Bundle required catalog resources and retain downloaded project assets; show unavailable online resources clearly. Do not promise unrestricted offline map imagery caching: inspect provider terms and the current map metadata contract before implementing a cache.

#### Venue availability requirement

The desktop app must remain usable at an event venue when the network blocks the TrackDraw website, cloud endpoints, or browser sign-in. A connection can appear online while these services are unreachable. Local startup and editing must therefore depend on locally available data rather than a successful network or authentication check.

After installation and any required initial account setup on a working connection, the user can cold-start the app at the venue, open prepared projects, create local drafts, import a project copy, edit in 2D/3D, undo/redo, save, reopen, and export supported locally validated formats. None of these operations may require loading the website, completing browser sign-in, refreshing a token, checking online entitlements, or contacting an update service. Account-required authoring must preserve this offline capability on an already provisioned device. Do not impose a recurring online check or offline expiry that can interrupt event work.

Expired credentials or failed refresh pause cloud access and show a non-blocking connection/authentication status. They must not redirect startup to a login screen, lock the local editor, erase data, or discard queued work. This does not authorize server access with expired credentials: cloud reads/writes, remote MCP, publishing, and cloud-only project downloads remain unavailable until connectivity and valid authorization return. First installation, first account sign-in, or downloading an unprepared cloud project can still require a working connection.

Provide a preparation action such as **Make available offline** before venue use. Download the selected project's latest accepted revision and required assets, verify local availability, and show which revision was prepared. Explicitly prepared projects and their required assets must survive restart and must not be silently evicted. Show missing resources before departure and never label a project fully ready if required resources are absent. Where online map imagery cannot be stored under the accepted provider policy, identify that limitation and keep the editable track usable without the map.

Locally commit edits and pending sync operations while endpoints are blocked. When access returns, resume only for the matching authorized account and perform the normal revision checks. Preserve both versions if another device or MCP changed the cloud project during the event. Reauthentication must not discard the local branch of work.

Required acceptance scenarios, to be implemented as the relevant phases land:

| Scenario                                                                                  | Required result                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser-only use without desktop installed                                                | Complete creation, 2D/3D editing, save/reopen, recovery and import/export; existing account and public sharing flows remain usable.                                        |
| Browser preparation, offline desktop changes at the venue, then browser continuation      | Preserve track content through the explicit JSON-copy flow first, and through the same account project after sync lands. Continue browser editing without desktop running. |
| Internet fully disconnected before launch                                                 | Cold-start, open a prepared project, edit, save, export, quit, and reopen without data loss.                                                                               |
| Venue Wi-Fi reports online but TrackDraw domains are blocked                              | The same local workflow works without waiting for cloud requests to time out.                                                                                              |
| Website or sign-in flow is blocked and credentials expire before launch or during editing | The local editor remains usable; reauthentication is offered for cloud access without becoming a local-work prerequisite.                                                  |
| Update service is blocked or unreachable                                                  | The installed compatible editor starts and local work remains available.                                                                                                   |
| A project or required asset was not downloaded                                            | Explain exactly what is unavailable; retain access to other local projects and allow creating/importing a local track. Do not report complete offline readiness.           |
| Network access returns after offline edits and a concurrent desktop/web/MCP update        | Reconcile revisions through review, retain both versions, and avoid duplicate writes on retry.                                                                             |

Repeat the blocked-endpoint scenarios on each supported desktop platform. The current offline POC does not yet validate account-expiry behavior because it has no account integration.

Saving locally, syncing an account revision, and publishing a public snapshot are separate operations. Background sync must never publish changes. Reuse the current share lifecycle, including its account-project association behavior, rather than introducing a separate desktop sharing system.

## MCP and the desktop workspace

Keep remote MCP as an account-authorized cloud interface to the same project revisions used by desktop and web. An assistant can inspect or create account projects while the desktop app is closed. Existing OAuth consent remains separate from signing into the desktop app; a desktop session does not grant an assistant access automatically.

The implementation already includes account/project reads, analysis, project creation, and reviewed edits/recovery with revision checks. Reads concern saved account projects, not unsynchronized desktop memory or local files. Creation currently returns a `/studio/open/[projectId]` URL. Preserve that web destination and add an explicit open-in-desktop path after desktop project links exist. The [MCP guide](../mcp.md) and [validation record](../mcp-validation.md) own tool scope and hosted/client acceptance; source code presence is not production availability.

When MCP applies an authorized edit, desktop discovers the newer account revision through its normal refresh/sync mechanism. A clean local document can load it while preserving a recoverable prior state and informing the user. A dirty local document must retain its pending work and enter revision review rather than silently loading the remote edit. A preview against an older account revision must not be applied after a desktop save changes that revision. Publishing and deletion remain outside the current MCP permissions.

Include this in Phase 3: MCP creates a project that opens in desktop, a reviewed MCP edit arrives at a clean desktop document, and an MCP edit races with offline desktop changes. Preserve both revisions and recovery in the last case. A local MCP server for live selection, unsaved edits, or offline assistant access is a separate future feature, not a dependency of the desktop release.

## Architecture boundary

Keep `src/` in place and continue importing the editor into a separate local frontend. Keep Next.js for web routes and backend services, Electron for desktop integration, and the existing track/render/export code for both. No new rendering engine, repository split, root workspace conversion, or mass move into `apps/` and `packages/` is required.

The POC's aliases are temporary integration points. Replace only the required runtime seams with small explicit interfaces for project persistence, navigation, and native file actions. Start with persistence; introduce other interfaces when their production behavior is implemented. Do not build a general plugin framework.

| Existing owner                                                          | Bounded change                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `experiments/electron-desktop/`                                         | Keep the working POC reproducible while production behavior is introduced incrementally. Promote it to a dedicated desktop directory only after the storage and runtime boundaries are accepted; moving this small folder must not require moving `src/`. |
| `src/components/editor/EditorShell.tsx` and `StudioDialogsProvider.tsx` | Introduce the minimum host/navigation integration needed to retain web behavior and remove production dependence on history monkey patches.                                                                                                               |
| `src/hooks/editor/useEditorProjects.ts` and `src/lib/projects.ts`       | Retain the browser persistence path and introduce an awaited desktop repository for loading, autosave, restore points, and project management. Audit synchronous callers before changing signatures.                                                      |
| `src/store/editor.ts` and editor action hooks                           | Preserve current editing semantics. Document tabs require isolated project state and history; do not mount several shells against the current singleton store.                                                                                            |
| `src/components/editor/useAccountProjectSync.ts`                        | Separate the project transport from browser-relative fetches while retaining revision conflicts and recovery.                                                                                                                                             |
| `src/lib/server/projects.ts`, project/share routes, and auth helpers    | Reuse ownership and revision rules. Add only the authentication/API changes required for an installed client.                                                                                                                                             |
| `src/lib/track/`, canvas renderers, and `src/lib/export/`               | Continue sharing behavior. Add native file output at the boundary without duplicating geometry or export implementations.                                                                                                                                 |

Use SQLite as the proposed durable desktop project store, with transactions for the working design, project metadata, restore points, and eventual pending sync operations. Put binary assets in an application-managed directory. Database migration and packaging must work on all supported platforms. Keep normal JSON import/export compatibility; do not introduce a mandatory new archive format in the first release.

The production desktop profile lives in the operating system's application-data location and survives application upgrades. Offer an explicit import of POC/browser project copies, without reading raw browser profiles or deleting the POC's data. Removing the experiment must remain independent from production data.

## Delivery phases

### Phase 0 Confirm the POC baseline

- [x] Run the shared editor locally in Electron without a Next.js server.
- [x] Demonstrate local continuity, 2D/3D rendering, and representative exports on macOS arm64.
- [x] Obtain initial hands-on feedback from the user.

The POC's existing test results establish this baseline. The first native-storage increment also has repository tests for write rollback, interrupted transactions, future-schema rejection, and restoration, plus desktop smoke acceptance against SQLite. They do not establish cross-platform support, complete export acceptance, or cloud integration.

### Phase 1 Make local work durable

- [x] Inventory POC aliases and synchronous persistence callers; record the small production seams before editing them.
- [x] Add the desktop project repository and versioned SQLite migrations. Keep the existing browser repository behavior.
- [ ] Support project create/open/rename/duplicate/archive, autosave, restore points, and recovery after interruption.
- [x] Flush or report pending saves on close; serialize concurrent writes and prevent independent application instances from racing the same project store.
- [ ] Preserve native open/save cancellation and invalid-file recovery. Save a disk backup even when local autosave fails.
- [ ] Bundle catalog assets reproducibly and identify network-dependent features. Persist downloaded assets needed by the accepted offline workflow.
- [ ] Add explicit offline preparation with verified project/assets, a prepared revision indicator, and retention of pinned data. Verify cold startup with all TrackDraw network access blocked while the operating system still reports online.
- [ ] Define the explicit import flow from POC/browser JSON copies and retain their originals.
- [ ] Run the portable-copy home-to-field-to-home journey: browser JSON export, desktop import/offline changes/reopen/export, then browser import and continued editing. Record content compatibility and which offline assets/formats were accepted.

Exit gate: complete real track design sessions offline, including close/reopen, process interruption after confirmed save, full-disk/write failure recovery, schema migration, and JSON round-trip. Web editing and persistence checks remain green. Stop for reassessment if this requires moving the editor or replacing its state architecture.

### Phase 2 Add the desktop workspace

- [x] Open a project library with recent projects, search, and a clear continue-working action. Keep TrackDraw's visual language.
- [x] Add normal application menus, native file handling, shortcuts, recent-project recovery, and explicit local storage status. Add sync status when cloud transport is implemented.
- [x] Add document tabs only after each project can retain its own selection, viewport, undo/redo history, and pending-save state.
- [x] Validate switching, closing, and reopening documents with unsaved changes, including importing a copy while another document is open.

Implemented on the desktop branch: a Home library with previews, recent/all-project views and search, plus independent per-document stores created from the existing editor factory. Browser consumers keep the original singleton. Document tabs save before switching/closing; workspace preferences restore tabs, selections and 2D/3D views. Runtime undo/redo is isolated per open document and is not persisted across close/restart. The Electron smoke flow exercises independent histories and 2D/3D viewport restoration. Cloud accounts, multiple windows and cross-platform acceptance remain later work.

Exit gate: use several real projects across repeated sessions without lost state or history crossing between tracks. A library with one active editor can ship as an intermediate alpha. If safe tabs require a broad store rewrite, defer tabs to a separately scoped change; do not simulate independent documents with one shared history. Multiple concurrent windows are deferred.

### Phase 3 Connect the same account projects

- [ ] Implement sign-in through the system browser with a safe return to desktop and revocable credentials held outside renderer code. Preserve the existing web sign-in flow.
- [ ] Confirm the existing auth provider's installed-client flow and token lifecycle before choosing transport endpoints. Register a desktop client with an appropriate audience; keep browser CSRF/origin protection and server authorization intact rather than bypassing them for Electron.
- [ ] Implement a desktop project transport against the existing ownership/revision model. Do not expose or repurpose users' personal API keys as an implicit login session.
- [ ] Add a durable sync queue. Coalesce superseded pending saves, retry with backoff, preserve idempotency, and pause on conflict or expired authentication.
- [ ] Offer existing device projects for explicit account attachment; synchronize new signed-in projects automatically.
- [ ] Resolve stale revisions by retaining both versions and offering review or a separate copy. Never silently use last-write-wins.
- [ ] Preserve offline reopening for downloaded projects and resume sync after reauthentication without losing edits.
- [ ] Keep local startup, editing, new drafts, saving, and exports usable when website/sign-in endpoints are blocked or credentials expire. Run the venue availability scenarios above without successful refresh or entitlement calls.
- [ ] Reuse publish/revoke/gallery flows and keep public snapshots separate from current working revisions.
- [ ] Let a project link open the matching desktop project when installed, with a normal web fallback and no automatic editing rights derived from a public share token.
- [ ] Validate the MCP-to-desktop flows: create/open, reviewed remote edit with a clean local document, and conflicting MCP/offline desktop edits. Keep assistant consent separate from desktop login and retain the hosted MCP/client acceptance gate.

Exit gate: prepare an account project in the browser, make it available offline in desktop, edit at the venue with endpoints blocked, then reopen and continue the same project in the browser after sync. Also create in desktop, open/edit in web, return to desktop and edit on mobile. Exercise simultaneous offline edits, lost responses/retries, archive/delete conflicts, sign-out, and expired credentials. Keep the JSON-copy fallback working. Check runtime deployment guidance and legal text for any changed data flows. Use Cloudflare preview for server/auth acceptance.

### Phase 4 Deliver macOS Windows and Linux builds

- [ ] Build and test separate platform artifacts in CI while preserving the current web deployment pipeline.
- [ ] Begin the alpha on the proven macOS environment; validate macOS arm64/x64, Windows x64, and a declared Linux x64 distribution/format matrix before claiming support. Other architectures are follow-up work.
- [ ] Verify the same core scenario matrix on every supported target: install, open/import, edit, undo/redo, 3D, offline restart, native file output, account sync, upgrade, and recovery.
- [ ] Complete the export matrix, including PNG, SVG, PDF, supported simulator exports, viewer archives, and video. Document any format not yet accepted on a platform.
- [ ] Select maintained packaging/update tooling; implement platform-appropriate signing, macOS notarization, and verification of update artifacts before external beta distribution. Confirm permission to redistribute bundled artwork in the chosen distribution.
- [ ] Separate application version, project schema version, and cloud API compatibility. Reject unsupported project formats without overwriting them and offer a safe update/export path.
- [ ] Test update interruption and database compatibility. Never roll an old executable back onto an unreadable upgraded database; restore a compatible backup or apply a forward fix.

Exit gate: a user installs and upgrades without Node.js or a source checkout, and existing projects remain usable. A platform stays explicitly experimental until its declared matrix passes. Use a minimum supported client policy that retains offline access to local work when cloud access requires an update.

### Phase 5 Validate the browser and offline desktop workflow

- [ ] Run a small beta with regular designers and venue-side users. Track issues by workflow and platform.
- [ ] Add optional desktop download/open actions to the website and account project library alongside a clear continue-in-browser action. Explain offline venue use; do not route browser users through an install requirement.
- [ ] Document the storage model, offline availability, project-copy import, device switching, and published-share behavior in user-facing help.
- [ ] Introduce the account-first entry and no-loss guest-to-account flow while retaining current guest capabilities. Evaluate any account-only authoring rollout against the separate transition gate above.
- [ ] Prioritize desktop offline reliability and native file handling while implementing shared track features once for both runtimes. Validate full browser editing without desktop installed alongside the venue journey.
- [ ] Review actual cloud requests, bytes, storage, recovery issues, support effort, and whether users successfully move between home and field. Do not reduce browser scope to encourage desktop adoption or assume infrastructure savings.

Exit gate: users who prefer the browser can complete their projects there, while venue users can prepare, work offline and resume at home without losing content or being blocked by authentication. Account continuity works when selected, and public/mobile web access remains dependable. Evaluate desktop by the usefulness and reliability of offline venue work, not by how many users migrate away from the browser. Rescope or park desktop if its maintenance cost outweighs that value.

## Cloud load and maintenance

Canvas interaction, 3D rendering, and many exports already run on the user's device in the browser. Electron does not automatically remove that work from the backend. Figma-like automatic account sync also means the cloud remains a core part of the product.

Establish a baseline before changing sync behavior: project writes and bytes per active editing session, read traffic per project open, asset transfer, public share/gallery traffic, stored project/history bytes, and operational support effort. Use existing aggregate metrics where possible and respect the existing analytics preference. Compare equivalent sessions and projects rather than total traffic alone.

Candidate reductions are coalescing pending revisions, using cached assets, avoiding repeated reads for unchanged account revisions, and generating exports/previews locally where the existing trust boundary allows it. Use server revision checks for any conditional-read optimization. Keep share revocation, ownership checks, and public snapshot integrity authoritative on the server. Do not lower durability or conflict protection to meet a traffic target.

Evaluate product reliability and maintenance cost separately from infrastructure savings. If desktop improves the main workflow but backend traffic remains similar, report that result explicitly. Desktop investment must stand on that evidence rather than an assumed hosting reduction.

## Change discipline and stopping points

### Branch and pull request workflow

Use `codex/desktop-integration` as the review destination for desktop development, separate from `main`. While the initial review stack is outstanding, `codex/desktop-identity` is the complete runnable preview. The earlier `codex/desktop-app` branch can be removed after verifying all of its commits are ancestors of that stack tip and the complete preview still works. Removing the redundant branch must not remove the worktree, application-data database or exported projects. Do not reset or force-push branches to manufacture smaller diffs. After the stack lands, create each new feature branch from the accepted integration tip and open a bounded PR back to that integration branch.

The initial work is split along its existing commit boundaries:

| Review slice                     | Head branch                | Initial PR base             | Scope                                                                                                    |
| -------------------------------- | -------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| Desktop foundation               | `codex/desktop-foundation` | `codex/desktop-integration` | Isolated Electron runtime, native JSON files, durable SQLite projects, restore points and awaited saves. |
| Project workspace                | `codex/desktop-workspace`  | `codex/desktop-foundation`  | Project library, isolated document stores, tabs and per-document view/history behavior.                  |
| TrackDraw identity and direction | `codex/desktop-identity`   | `codex/desktop-workspace`   | TrackDraw visual styling, browser/offline role clarification and this review workflow.                   |

Open these as dependent draft PRs so each diff contains only its own slice. Review and merge from foundation upward. Use merge commits for this initial stack to preserve ancestry, then retarget the next PR to `codex/desktop-integration` after its predecessor lands. Do not squash a parent and retarget a child without first rebuilding the child's base; that would reintroduce already-reviewed changes into its diff. No merges or automatic merges are part of setting up this review stack.

The initial integration seed is `a780c72d`, the existing pre-desktop baseline. It predates newer `main` changes and contains MCP callback history inherited from the original checkout; that history is not part of the desktop review slices. Bring current `main` into the integration branch in a separately reviewed compatibility change before a release candidate. Recheck browser/team project flows and desktop persistence after resolving any conflicts. Preserve unrelated working checkouts.

Keep future PRs to one behavior or boundary, for example offline preparation, storage-failure recovery, browser/desktop JSON round-trip, desktop sign-in, or sync conflict recovery. Record dependencies and validation for the exact head under review. Root CI runs on these branches, but the native repository tests and real Electron smoke flow still require explicit validation; a green web pipeline alone does not establish desktop acceptance. Before external distribution, add repeatable desktop CI for the declared platform matrix.

Keep production delivery incremental too: identify small reusable changes suitable for `main` separately, and retain the isolated desktop runtime until its release gates pass. Do not use a single final merge of the long-lived branch as a substitute for reviewing shared-code changes and compatibility with current `main`.

Deliver small changes in this order: persistence seam, durable desktop repository, workspace/library, document isolation, desktop auth/transport, sync recovery, platform delivery, then website entry points. Each change must have a bounded diff and relevant behavior checks. Shared-code changes run the normal lint, tests, type, and build checks; copy changes also run the i18n checks.

Phase 1 is the next build scope. Do not bundle tabs, cloud sign-in, installers, and a repository restructure into that change. Phase exit gates determine whether to continue, rescope, or park the direction. Production persistence migrations require an export/backup path; later abandonment must not depend on retaining Electron to recover users' tracks.

The first native-storage increment uses a desktop persistence adapter behind the existing build aliases, avoiding a wholesale async rewrite of the browser repository. Shared changes are limited to awaiting preservation during import, new-project creation, manual snapshot save, and account project opening. The adapter hydrates an in-memory read cache from SQLite; writes await native acknowledgement. Its initial state response loads the project library in full, so paged/lazy loading remains a later scaling task. Cloud persistence is deliberately unavailable in this increment.

The implementation sequence remains:

1. Inventory persistence callers and introduce the smallest repository seam, with the current browser implementation as the default. Validate browser load, autosave, snapshots, and recovery without changing their storage format.
2. Implement the desktop SQLite repository and migrations behind the native bridge. Validate atomic design/metadata writes, interrupted transactions, reopen, migration failure recovery, and binary asset references using disposable data.
3. Connect the desktop editor to that repository, add explicit POC/JSON import, and run complete offline sessions with a simple track, a mixed-obstacle track, and a project with a background reference. Record which background resources remain unavailable offline. Complete the normal web checks before closing Phase 1.

This plan does not authorize immediately forcing accounts, removing web editing, replacing the engine, introducing realtime collaboration, adding a new billing model, or merging the viewer/assets repositories. Any account-only authoring rollout follows the transition gate above as a separate product change.
