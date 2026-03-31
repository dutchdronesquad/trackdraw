# Roadmap: Future Features for TrackDraw

This discussion tracks the current roadmap for TrackDraw after the v1 release.

TrackDraw's core planning workflow is now in place. The roadmap should now focus on post-v1 feature depth: faster layout building, richer race-day outputs, better review tooling, and the remaining operational follow-up around deployment and published-link management.

## Product Direction

- TrackDraw is a design tool first
- Solo workflow speed and clarity come before live collaboration
- Mobile should be practical and deliberate, not a reduced desktop clone
- Analysis should begin lightweight and visual before becoming simulation-heavy
- Race-day outputs should extend the editor instead of fragmenting it
- Local-first workflows should stay available without requiring an account
- Accounts should remain optional and only unlock ownership, sync, and shared management where that clearly adds value

## Active Post-v1 Focus

Labels used below:

- `No account required` means the feature should remain usable without an account
- `Account-backed` means the meaningful version depends on ownership, sync, identity, or shared persistence
- `Research` means the work is still primarily exploratory
- `Blocked` means the item depends on another roadmap decision or capability first

## Priority 1

- [ ] Layout acceleration (`No account required`)
      Add reusable building blocks such as obstacle presets, selection grouping, and starter layouts.
      Keep this account-free for curated and project-local acceleration only. Shared libraries, sync, and team template management belong on the optional-account side.
      Current state: obstacle presets, selection grouping, and starter layouts now all ship as first-pass slices. The next work here should be polish and learning, not a broader template system.
  - [x] Obstacle-pack presets first pass
        A first curated preset picker now ships on desktop and mobile with four presets: Start/finish setup, Straight gate run, Slalom run, and Ladder section. Presets expand into ordinary editable shapes after placement.
  - [x] Selection grouping first pass
        Selected shapes can now be grouped, duplicated, moved, ungrouped, and named as one project-local section. Group controls are available from the context menu, inspector, and mobile multi-select flow.
  - [x] Starter layouts first pass
        TrackDraw now ships three curated starter layouts in onboarding and new-project flow: Open practice, Compact race start, and Technical ladder line. Choosing one creates an ordinary editable project rather than a separate template object.

- [ ] Race-day communication and briefing (`No account required`)
      Turn existing export, read-only, and fly-through capabilities into better pilot briefing, marshal pack, and numbered handoff workflows.
  - [x] Obstacle numbering overlay in 2D
        Route-driven numbering is now available on the 2D canvas and in the inspector item list for gates, ladders, and dive gates.
  - [x] Obstacle numbering in export/read-only surfaces
        Obstacle numbering now carries across 2D exports and the read-only share surface, using the same route-driven numbering model as the editor canvas.
  - [x] Race Pack export foundation
        PDF export now includes a dedicated multi-page Race Pack with a cover page, track map, material list, stock status, setup sequence, numbering context, and first-pass timing/build guidance.
  - [ ] Race director page in Race Pack
        Add a race-director-oriented page within the Race Pack once TrackDraw can capture practical start-area metadata such as director position, timing/start box position, cable run, and related ops notes.

- [ ] Heatmap and flow analysis (`No account required`)
      Add lightweight visual feedback for rhythm, density, and bottlenecks once validation basics are in place.
  - [ ] Density overlay
        Highlight obstacle clusters and repeated-turn pressure zones.
  - [ ] Suspicious spacing cues
        Flag obstacle or route spacing that looks unusually tight or inconsistent.
  - [ ] Route rhythm cues
        Add lightweight flow cues before any heavier timing or simulation layer.

## Priority 2

- [ ] Optional accounts and cross-device project evaluation (`Research`)
      Evaluate whether optional user accounts should unlock cloud backup, project libraries, cross-device continuation, and clearer ownership of shares and future venue/inventory records without turning TrackDraw into an auth-first product.
  - [ ] User-value validation
        Determine whether cross-device continuation, safer project storage, and durable ownership are meaningful enough to justify cloud-backed project models.
  - [ ] Product model evaluation
        Define how local projects, cloud-backed projects, published shares, and local-first feature fallbacks should relate without confusing users, with optional sign-in and no login wall for core design use.
  - [ ] Authentication and storage recommendation
        Decide whether TrackDraw should remain local-first only, add optional auth-backed sync for ownership and cross-device management, or stop before account work entirely. Current technical direction to evaluate first: `Auth.js`.
  - [ ] Shared template libraries
        Revisit broader template browsing only once accounts can support personal, club, or team-owned template libraries with clear ownership and management.

- [x] Cloudflare production rollout validation
      Development and production Cloudflare domains are now live, and the release-gated production deploy path has been validated with the final GitHub environment secrets and domains.

- [ ] Share lifecycle management follow-up (`Account-backed`, `Blocked`)
      Expiry, retention cleanup, calmer publish-link behavior, and local revoke are now in place. Remaining work is clearer repeated-use management in Studio and a cleaner ownership model once optional accounts are evaluated. Local-first publish flows should stay simple for one-off use.

- [ ] Venue library and constraints (`Account-backed`, `Blocked`)
      Support reusable venue records with field dimensions, recurring boundaries, fixed no-go zones, known setup constraints, and eventually venue-specific inventory profiles. This is most valuable as an account-backed feature tied to a person, club, or event context.

- [ ] Velocidrone export compatibility research (`Research`)
      Investigate whether TrackDraw layouts can be exported into Velocidrone's track-builder workflow. This likely starts as reverse-engineering and format discovery work because there is no public API or official documentation to build against.

## Priority 3

- [ ] Comments and review mode (`Account-backed`, `Blocked`)
      Anchor feedback to specific obstacles or route sections without requiring live collaboration first. This now sits behind the optional-accounts decision because richer review workflows become much clearer once identity and ownership are better defined.
  - [ ] Pinned obstacle notes
        Add simple notes attached to specific obstacles as a local-first first pass.
  - [ ] Route-section notes
        Let notes attach to a route waypoint or path segment without requiring identity first.
  - [ ] Read-only review surface
        Surface anchored notes clearly in read-only review without exposing editing actions.
  - [ ] Threaded comments follow-up
        Consider richer review threads only if simple anchored notes prove useful and an account-backed identity model exists.

- [x] Obstacle inventory and setup estimate (`No account required`)
      Local inventory entry, required-vs-available comparison, buildability warnings, and Race Pack setup estimates now ship as the completed first pass for this track.
  - [x] My inventory
        Users can now record how many gates, ladders, dive gates, start/finish elements, flags, and cones are available as a local-first profile stored in the project.
  - [x] Required vs available comparison
        The design inspector now compares current layout counts against the saved inventory so shortages are visible without an account.
  - [x] Buildability warnings
        The inventory section now flags missing stock per obstacle type and surfaces a simple buildable vs short status.
  - [x] Setup estimate summary
        The Race Pack now turns raw inventory and obstacle data into a clearer race-day setup summary with material counts, grouped setup steps, and first-pass build guidance.
  - [x] Rough setup complexity cues
        The Race Pack now includes first-pass setup timing ranges and lightweight complexity cues based on obstacle mix and setup steps.

- [ ] Build mode / setup sequence (`No account required`, `Blocked`)
      Turn a finished layout into a dedicated operational build surface for race-day setup, rather than extending the Race Pack document indefinitely. This is now the follow-up epic after the completed inventory and setup-estimate first pass.
  - [ ] Dedicated build-mode view
        Add a separate build-mode page or mode with its own information hierarchy for on-field setup, instead of treating setup sequence as only a document section.
  - [ ] Map-linked setup steps
        Let crews move through setup phases and steps while keeping the relevant obstacles highlighted on the map.
  - [ ] Grouped build phases and check-off flow
        Organize setup into clearer phases such as unload, prep, anchors/heavy structures, numbered obstacle line, and final walk, with practical completion tracking.
  - [ ] Crew and venue assumptions
        Allow setup order and timing to adapt better to crew size, venue constraints, and rigging assumptions beyond the current generalized Race Pack heuristic.

- [ ] Map and field overlay (`No account required`)
      Support venue plans, field maps, or imagery as reference layers behind the editor canvas.

- [ ] Lap simulator (`Research`)
      Estimate route timing and flow once the lighter analysis layers have proven valuable.

- [ ] Real-time collaboration (`Account-backed`)
      Allow multiple users to work on the same design concurrently.

- [ ] Desktop and mobile wrapper evaluation (`Research`)
      Evaluate whether an Electron desktop wrapper or a Capacitor mobile wrapper would materially improve local project handling, native file workflows, offline resilience, or venue-side usability beyond the web app.
  - [ ] Product-problem validation
        Identify which concrete user pain points would justify a wrapper instead of improving the web app directly.
  - [ ] Technical architecture evaluation
        Decide whether any wrapper should load the hosted app first or require its own local runtime strategy.
  - [ ] Platform recommendation
        Conclude whether TrackDraw should stay web-first, explore Electron first, explore Capacitor first, or avoid wrappers entirely for now.

- [ ] PWA evaluation (`Research`)
      Evaluate whether TrackDraw should add a deliberate Progressive Web App layer for installability, app-like launch behavior, and narrowly scoped offline resilience.
  - [ ] Installability and manifest pass
        Determine whether a proper manifest and installable app shell would materially help repeat venue-side use.
  - [ ] Service worker risk/benefit evaluation
        Decide whether any offline caching layer would create more value than deployment and stale-cache risk.
  - [ ] PWA scope recommendation
        Conclude whether TrackDraw should remain a standard web app, add a narrow installable PWA layer, or invest further in offline/app-shell behavior later.

## v1 Archive

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
