# Roadmap: Future Features for TrackDraw

This issue tracks the current roadmap for TrackDraw as of March 25, 2026.

TrackDraw has moved well beyond the initial editor foundation. The near-term focus should now be faster layout creation, better project workflow and recovery, stronger sharing and handoff, lightweight path review, and more deliberate race-day outputs.

## Product Direction

- TrackDraw is a design tool first
- Solo workflow speed and clarity come before live collaboration
- Mobile should be practical and deliberate, not a reduced desktop clone
- Analysis should begin lightweight and visual before becoming simulation-heavy
- Race-day outputs should extend the editor instead of fragmenting it

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

- [ ] Layout acceleration
      Add reusable building blocks such as obstacle presets, starter layouts, selection grouping, and venue-aware field templates.

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

- [ ] Race-day communication and briefing
      Turn existing export, read-only, and fly-through capabilities into better pilot briefing, marshal pack, and numbered handoff workflows.

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
  - [ ] Cloudflare production rollout validation
        Finish the first successful end-to-end development deploy, validate `dev.trackdraw.app`, and then verify the release-gated production deploy path with the final GitHub environment secrets and domains.

- [x] Stable share links and share storage
      Move from payload-in-URL sharing toward durable stored share objects while preserving `/share/[token]` as the canonical public route.
  - [x] Persisted share object model
        Define the first database-backed share model for publish/read flows, using Cloudflare D1 initially.
  - [ ] Legacy share retirement plan
        Deprecate URL-embedded share payloads with a deliberate compatibility window and a safe failure path once the old decode logic is removed.
  - [x] Share metadata and OG storage integration
        Move share metadata and social image generation onto stored share state instead of URL payload decoding.
  - [ ] Share lifecycle management
        Expiry, retention cleanup, and calmer publish-link behavior are now in place. Remaining work is revoke, regenerate, and clearer controls for reviewing and managing published links.

- [ ] Velocidrone export compatibility research
      Investigate whether TrackDraw layouts can be exported into Velocidrone's track-builder workflow. This likely starts as reverse-engineering and format discovery work because there is no public API or official documentation to build against.

- [ ] Comments and review mode
      Anchor feedback to specific obstacles or route sections without requiring live collaboration first.

- [ ] Heatmap and flow analysis
      Add lightweight visual feedback for rhythm, density, and bottlenecks once validation basics are in place.

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

## Priority 3

- [ ] Obstacle inventory and setup estimate
      Summarize obstacle counts, key sections, and rough setup complexity so a finished layout translates more directly into race-day preparation.

- [ ] Venue library and constraints
      Support reusable venue records with field dimensions, recurring boundaries, fixed no-go zones, and known setup constraints.

- [ ] Revision compare
      Compare two layout states and show what changed between versions, snapshots, or variants.

- [ ] Marshal mode
      Create a race-day view focused on marshal readability, sectors, references, and obstacle clarity rather than editing.

- [ ] Build mode / setup sequence
      Turn a finished layout into a structured setup order so crews can build the course in a clearer sequence.

- [ ] Map and field overlay
      Support venue plans, field maps, or imagery as reference layers behind the editor canvas.

- [ ] Lap simulator
      Estimate route timing and flow once the lighter analysis layers have proven valuable.

- [ ] Real-time collaboration
      Allow multiple users to work on the same design concurrently.
