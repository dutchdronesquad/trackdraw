# Roadmap: Future Features for TrackDraw

This roadmap tracks the next product work for TrackDraw.

## Product Direction

- TrackDraw is a design tool first
- Solo workflow speed and clarity come before live collaboration
- Mobile should be practical and deliberate, not a reduced desktop clone
- Analysis should begin lightweight and visual before becoming simulation-heavy
- Race-day outputs should extend the editor instead of fragmenting it
- Local-first workflows should stay available without requiring an account
- Accounts should only unlock ownership, sync, and shared management where that clearly adds value

## Active Roadmap

Labels used below:

- `No account required` means the feature should remain usable without an account
- `Account-backed` means the meaningful version depends on ownership, sync, identity, or shared persistence
- `Research` means the work is still primarily exploratory

## Current Priority

- [ ] Velocidrone experimental export stabilization (`No account required`)
      The experimental `.trk` export now ships with best-effort prefab mapping, a centralized orientation model, and 2D/3D editor cues. The remaining work is validating the export across more layouts before treating it as a supported workflow.
  - [ ] Stabilize the experimental `.trk` export
        Validate the current export on more layouts and resolve any remaining prefab mapping or orientation edge cases.

- [ ] Map and field overlay (`No account required`)
      Support venue plans, field maps, or imagery behind the editor canvas.

## Engineering Foundation

- [ ] Test infrastructure
      Introduce Vitest as the baseline test runner and establish the first test coverage for core business logic and export paths.
  - [ ] Vitest setup and CI integration
        Add Vitest to the project and wire it into the CI pipeline so tests run on every pull request.
  - [ ] Unit tests for store and transforms
        Cover the core Zustand store actions and geometry/transform utilities.
  - [ ] Unit tests for export logic
        Add unit coverage for JSON, Race Pack, and Velocidrone export logic where that can run without a browser.
  - [ ] Component tests for critical editor paths
        Add focused component tests for the most fragile editor interactions.

- [x] File structure and module boundary pass
      Tightened folder ownership and internal API surfaces across the editor store, canvas interaction layer, inspector, editor shell, and mobile editor composition. This first structural pass is complete; follow-up cleanup can now happen incrementally as new features land instead of through one large refactor.
  - [x] Audit current module boundaries
        Identified the highest-value boundary problems across the editor store, canvas interactions, inspector, and editor shell, then used that audit to drive the first extraction pass.
  - [x] Remaining large-file splits
        Break up any remaining oversized files identified in the audit, especially where editor composition and mobile/desktop orchestration still live together.
  - [x] Reduce cross-module coupling in editor state
        Moved shared editor-store state shapes into dedicated types, centralized transient/session reset profiles, and reduced duplicated store wiring so state changes stay more local to the editor boundary.

## Follow-up

- [ ] Comments and review mode (`Account-backed`)
      Add anchored feedback without requiring live collaboration first.
  - [ ] Pinned obstacle notes
        Add simple notes attached to specific obstacles.
  - [ ] Route-section notes
        Let notes attach to route waypoints or path segments.
  - [ ] Read-only review surface
        Surface anchored notes clearly in read-only review.
  - [ ] Threaded comments follow-up
        Consider richer review threads only if simple notes prove useful.

- [ ] Venue library and constraints (`Account-backed`)
      Support reusable venue records with boundaries, constraints, and venue-specific profiles.

## Later Product Follow-up

- [ ] Race-day communication and briefing (`No account required`)
      The first race-day handoff release is shipped. Further work here is follow-up.
  - [ ] Shared view QR code in Race Pack
        Embed a QR code linking to the published shared view in the Race Pack PDF, so pilots can scan directly from a printed or on-screen briefing.
  - [ ] Timing gate markers
        Let specific gates be marked as timing points so race directors can identify start, finish, and split gates clearly in the layout and Race Pack.
  - [ ] Race director page in Race Pack
        Add a race-director-oriented page to the Race Pack.
    - [ ] Race-day ops elements around the existing start area
          Add pilot line, director position, and timing/start box placement.
    - [ ] Cable-run and ops-note metadata
          Capture cable routing, power/timing assumptions, and other ops notes.
    - [ ] Race Pack data model for race-day ops
          Define how race-day ops metadata lives in the project model.
    - [ ] Race director page layout
          Turn that metadata into a dedicated Race Pack page.

- [ ] Build mode / setup sequence (`No account required`)
      Turn a finished layout into a dedicated build/setup surface instead of extending the Race Pack indefinitely.
  - [ ] Dedicated build-mode view
        Add a dedicated build-mode page or mode.
  - [ ] Map-linked setup steps
        Show setup steps with the relevant obstacles highlighted on the map.
  - [ ] Grouped build phases and check-off flow
        Organize setup into phases with practical check-off flow.
  - [ ] Crew and venue assumptions
        Let setup order and timing adapt to crew size and venue constraints.

## Backlog And Research

- [ ] Heatmap and flow analysis (`No account required`)
      Add lightweight visual feedback for rhythm, density, and bottlenecks.
  - [ ] Density overlay
        Highlight obstacle clusters and repeated-turn pressure zones.
  - [ ] Suspicious spacing cues
        Flag unusually tight or inconsistent spacing.
  - [ ] Route rhythm cues
        Add lightweight route rhythm cues.

- [ ] Competition rule validation (`Research`)
      Validate a layout against known rule sets such as FAI or MultiGP — minimum gate sizes, minimum obstacle distances, mandatory gate types. Useful for formal competition organizers.

- [ ] Lap simulator (`Research`)
      Estimate route timing and flow after the lighter analysis layers prove useful.

- [ ] Real-time collaboration (`Account-backed`)
      Allow multiple users to work on the same design concurrently.

- [ ] Desktop and mobile wrapper evaluation (`Research`)
      Evaluate whether Electron or Capacitor would materially improve local project handling, native file workflows, or offline resilience.
  - [ ] Product-problem validation
        Identify which user pain points would justify a wrapper over improving the web app.
  - [ ] Technical architecture evaluation
        Decide whether a wrapper should load the hosted app or require its own runtime.
  - [ ] Platform recommendation
        Recommend web-first, Electron, Capacitor, or no wrapper for now.

- [ ] PWA evaluation (`Research`)
      Evaluate whether TrackDraw should add a narrow PWA layer for installability and app-like launch behavior.
  - [ ] Installability and manifest pass
        Determine whether a proper manifest and installable app shell would help repeat venue-side use.
  - [ ] Service worker risk/benefit evaluation
        Decide whether offline caching creates more value than stale-cache risk.
  - [ ] PWA scope recommendation
        Recommend standard web app, narrow PWA, or deeper offline/app-shell work later.

- [ ] Template library product definition (`Research`)
      Decide whether TrackDraw should support reusable personal, club, or team-owned templates at all.
  - [ ] Template object definition
        Define whether a template is a full project, reusable section/group, race-day preset, or something else.
  - [ ] Ownership and visibility model
        Define person, club, team, private, shared, and published ownership/visibility.
  - [ ] Browse, duplicate, and fork flow
        Clarify browse, insert, duplicate, and fork behavior.
  - [ ] Relationship to starter layouts
        Keep templates distinct from starter layouts, project duplication, and saved projects.

## v1.3.0 Archive

<details>
<summary>Completed release work archived with v1.3.0</summary>

- [x] Velocidrone export compatibility research (`Research`)
      The core compatibility question is answered: TrackDraw can generate an experimental `.trk` export that imports into Velocidrone.

- [x] Velocidrone experimental export first pass (`No account required`)
      Ship the first importable Velocidrone `.trk` export with best-effort prefab mapping, a centralized orientation model, and first-pass 2D/3D editor cues.
  - [x] First experimental `.trk` export
        Ship the first importable Velocidrone `.trk` export from TrackDraw.
  - [x] First object mapping slice
        Export the core track items into a usable first-pass Velocidrone layout with best-effort prefab mapping.
  - [x] Experimental product framing
        Ship the export as an explicitly experimental workflow in the UI and product messaging.
  - [x] Gate front/back orientation model
        Centralize front-facing rules so export, 2D guides, and 3D guides use the same per-shape orientation mapping.
  - [x] Clear 2D front/back affordance
        Add a first-pass 2D front indicator by anchoring the `Front` cue to the rotation guide instead of the obstacle itself.
  - [x] Faster 3D orientation validation
        Add a first-pass 3D orientation guide pass so rotation handles follow the same central orientation mapping as the exporter.

- [x] Accounts and cross-device project evaluation (`Research`)
      Better Auth, magic-link sign-in, profile management, passkeys, and account entry points are now in place. The account model is established and validated across devices.
  - [x] Passkey sign-in
        Add passkeys as a follow-up to magic-link sign-in once the current account model feels stable.
    - [x] Passkey sign-in on the login screen
          Add passkey sign-in to the main login flow without replacing magic links.
    - [x] Passkey enrollment for existing accounts
          Let signed-in users add a passkey from account settings.
    - [x] Passkey management in account settings
          Support review, rename, and remove flows for registered passkeys.
    - [x] Fallback and recovery UX
          Keep magic link as the fallback and handle unsupported browsers and failed prompts cleanly.
    - [x] Cross-device and mobile validation
          Validated the passkey and account flow across practical desktop and mobile scenarios.

</details>

## v1.2.0 Archive

<details>
<summary>Completed release work archived with v1.2.0</summary>

- [x] Accounts and cross-device first pass (`Research`)
      Better Auth, magic-link sign-in, profile management, and account-backed projects now ship as the first account layer.
  - [x] First account foundation
        Ship email magic-link sign-in, profile management, account deletion, and account-aware Studio entry points.
  - [x] Account-backed project list first pass
        Show account-backed projects in the Projects dialog and support reopening them across devices.
  - [x] Existing local projects after sign-in first pass
        Keep existing device-local projects visible after sign-in without silently migrating them.
  - [x] Project visibility split first pass
        Separate account-backed projects from device-local projects in project management.
  - [x] Sync status visibility first pass
        Show sync states such as synced, device-only, syncing, conflict, and sync failed.
  - [x] Sign-out keeps local projects
        Keep ordinary device-local projects available after sign-out.
  - [x] Product model evaluation
        Establish the first working account/project model for v1.
    - [x] Shipped first-pass behavior
          Ship a first usable account-backed continuation flow.
    - [x] Local project vs account project model
          Clarify the first local-project vs account-project model.
    - [x] Cross-device continuation flow
          Ship the first cross-device continuation flow.
    - [x] Share ownership model
          Attach shares to the authenticated owner and active account project.
    - [x] Local-first fallback behavior
          Keep local-first editing, import/export, and one-off sharing usable without an account.
    - [x] First product-model recommendation
          Use that first recommendation as the working product model.
  - [x] Authentication and storage recommendation
        Keep TrackDraw local-first while treating the account-backed project as the signed-in durable state.

- [x] Share lifecycle management follow-up (`Account-backed`)
      Add account-owned share management, retention cleanup, local revoke, and replace/regenerate behavior.

</details>

## v1.1.0 Archive

<details>
<summary>Completed release work archived with v1.1.0</summary>

- [x] Layout acceleration (`No account required`)
      Ship obstacle presets, selection grouping, and starter layouts as the first layout acceleration pass.
  - [x] Obstacle-pack presets
        Ship the first curated obstacle-pack presets on desktop and mobile.
  - [x] Selection grouping
        Support grouping, moving, duplicating, naming, and ungrouping selections.
  - [x] Starter layouts
        Ship curated starter layouts in onboarding and new-project flow.

- [x] Cloudflare production rollout validation
      Validate the development and production Cloudflare rollout.

- [x] Obstacle inventory and setup estimate (`No account required`)
      Ship local inventory entry, buildability checks, and Race Pack setup estimates.
  - [x] My inventory
        Let users record available obstacle stock locally.
  - [x] Required vs available comparison
        Compare current layout counts against saved inventory.
  - [x] Buildability warnings
        Flag missing stock and simple buildable vs short status.
  - [x] Setup estimate summary
        Add a clearer Race Pack setup estimate summary.
  - [x] Rough setup complexity cues
        Add rough setup timing ranges and complexity cues.

- [x] Race-day communication and briefing first pass (`No account required`)
      Ship the first race-day handoff release.
  - [x] Obstacle numbering overlay in 2D
        Add route-driven obstacle numbering in 2D.
  - [x] Obstacle numbering in export/read-only surfaces
        Carry obstacle numbering into export and read-only surfaces.
  - [x] Race Pack export foundation
        Add the first dedicated multi-page Race Pack export.

</details>

## v1.0.0 Archive

<details>
<summary>Completed v1 foundation work</summary>

## Recently Completed

- [x] Mobile editor UX foundation
      Added a dedicated mobile action flow, clearer inspector behavior, and cleaner small-screen editor chrome.

- [x] Mobile gesture model
      Improved one-finger editing, two-finger navigation, and touch interaction consistency.

- [x] Mobile multi-select and quick actions
      Added long-press multi-select, group movement, and contextual duplicate, lock, and delete actions.

- [x] Mobile venue editing first pass
      Added faster single-selection venue-side actions, compact mobile adjust controls, and undo/redo access in the mobile tools flow.

- [x] 2D drag and snap refinement
      Improved pointer-following drag behavior and made snap feedback more readable.

- [x] Shared view and read-only polish
      Improved the share dialog, read-only entry experience, and the return path into Studio.

- [x] Path authoring first pass
      Strengthened polyline editing, resume/close flows, inspector support, and the connection between route planning, elevation, and 3D preview.

- [x] Export and project portability
      Support now includes PNG, SVG, PDF, 3D render capture, and JSON project export/import.

## Release Cleanup

- [x] Share route deprecation before v1
      Removed legacy `/share?d=...` redirect and its query-param token normalization. `/share/[token]` is now the sole canonical read-only route.

## Priority 1

- [x] Project workflow and recovery
      Added a local project list, restore points, manual snapshots (Cmd+S + save button), periodic auto-snapshots, and a Projects dialog for managing and restoring saved states.
  - [x] Project list, restore points, and safer recovery first pass
        Added a local project list, automatic save-before-replace on new project, open, and import, restore points with open/delete, and a project manager dialog in the welcome style with inline rename support.
  - [x] Cmd+S shortcut for manual snapshots
        Cmd+S (or Ctrl+S) creates a restore point snapshot of the current design. A save button in the desktop header provides the same action. Last-save time is shown subtly under the title in the header.
  - [x] Periodic restore points
        A restore point is automatically created every 5 minutes during an active editing session if the design has changed since the last periodic snapshot.

- [x] Share and publish workflow
      Move sharing toward intentional published states with clearer invalid-link handling, better separation from working state, and a cleaner long-term share model.
  - [x] Distinct error pages for invalid vs oversized share links
        Oversized tokens now show a dedicated error page with JSON export guidance instead of a generic 404. Invalid or corrupt tokens still return 404 with a focused not-found page.
  - [x] Read-only view UX polish
        Improved overlay copy and title. View switching via the overlay now deep-links correctly without re-encoding the token. Fit-to-window is available in the read-only desktop view. The "draw a route in 2D" hint is suppressed in read-only mode. The mobile view drawer now matches the studio drawer style with active tab indicators, fly-through access, and a working Open Studio link.

- [x] Path and flow review
      Lightweight warnings and route-review cues on top of the current path, elevation, and 3D tooling.
  - [x] Route-review cues in the elevation panel
        Added lightweight warnings to the elevation profile panel: flat path (no elevation data set), steep grades, tight turns, and closely spaced waypoints. Warnings appear in the ElevationChart footer on desktop and inline above the waypoints list on mobile.
  - [x] 3D obstacle orientation controls
        Gates, ladders, and dive gates get interactive handles in the 3D view: a ring puck at ground level to drag-rotate (yaw) and, for dive gates, an orange puck at the top corner of the frame to drag-tilt. OrbitControls disable during drag; history is batched per gesture for clean undo.
  - [x] Path stub warning
        Paths with fewer than 2 waypoints now emit a "stub" route warning. The elevation panel shows "Path needs at least 2 waypoints to form a route" instead of silently producing no output.

- [x] Studio onboarding and starter flows
      First-use starter surface, contextual hints (gate, path, preview, 3D review, post-path nudge), and new-project confirmation flow. Starter field presets descoped — the guided StarterFlow provides enough direction without prescribing a specific field layout.
  - [x] First-use starter flow and project reset first pass
        Added first-use starter guidance, a clearer blank-canvas entry path, and a dedicated new-project confirmation flow that works across desktop and mobile.
  - [x] Contextual hints
        Dismissible hints for gate placement, path drawing, 3D preview, 3D review, and a post-path nudge toward 3D preview — all localStorage-persisted.

## Priority 2

- [x] Runtime and deployment migration
      Move TrackDraw off GitHub Pages and onto a real app runtime that supports dynamic routes, OG image generation, and backend-backed share flows.
  - [x] Hybrid runtime setup
        Keep Vercel for pull request previews, deploy `main` to a Cloudflare development environment, and deploy production on `release.published`.
  - [x] Cloudflare/OpenNext integration
        Add the configuration and workflows needed to run the existing Next.js app on Cloudflare Workers without breaking the current review flow.
  - [x] Backend portability guardrails
        Introduce the backend-facing share/publish layer in a way that keeps the first storage choice replaceable rather than turning Cloudflare D1 into a permanent platform assumption.
  - [x] Workers-to-database connectivity decision
        Replace the earlier home-hosted PostgreSQL plan with a Cloudflare-native D1 setup that removes private network connectivity from the share storage path.

- [x] Stable share links and share storage
      Move from payload-in-URL sharing toward durable stored share objects while preserving `/share/[token]` as the canonical public route.
  - [x] Persisted share object model
        Define the first database-backed share model for publish/read flows, using Cloudflare D1 initially.
  - [x] Legacy share retirement plan
        Retired URL-embedded share payload support. Older links now fail through a deliberate fallback screen that asks the sender to publish a fresh link or provide a JSON export.
  - [x] Share metadata and OG storage integration
        Move share metadata and social image generation onto stored share state instead of URL payload decoding.
  - [x] Local revoke control
        Published links can now be revoked from the current Studio session. This is intentionally scoped to local publish management, not account-backed share administration.

- [x] Adaptive mobile UI
      Let portrait and landscape diverge where that clearly improves editing and navigation.
  - [x] Mobile dialog-to-drawer conversion pass
        Convert the remaining desktop-style dialogs that still feel awkward on phones into bottom-drawer flows where that improves reach, focus handling, and small-screen usability.
        Targets:
        `ExportDialog`, `ImportDialog`, and the studio keyboard-shortcuts dialog should move to the newer modal style on desktop and bottom-drawer presentation on mobile.

- [x] Codebase architecture and performance refactor
      Continue improving maintainability, state-flow clarity, and runtime efficiency as the editor grows, without turning the effort into a rewrite.
  - [x] Lightweight performance instrumentation
        Add internal render and autosave instrumentation so editor hotspots can be observed during development without introducing heavyweight profiling infrastructure.
  - [x] Targeted editor and canvas modularisation
        Split large interaction and rendering responsibilities into more focused hooks and modules around the editor shell, track canvas, selectors, and performance utilities.
  - [x] Complete targeted maintainability and state-flow refactor pass
        Continue refining internal boundaries, large rendering surfaces, persistence flow, and editor state structure.
  - [x] Initial file structure and oversized-file split pass
        Moved 16 root-level components into canvas/, editor/, inspector/, and a new dialogs/ folder. Split canvas/renderers.tsx and inspector/views.tsx into per-responsibility modules. Root components reduced from 19 files to 3.
  - [x] Remaining file structure and large-file decomposition pass
        Continue tightening folder ownership and splitting broad components and modules where internal navigation and safe iteration are still harder than they should be.

</details>
