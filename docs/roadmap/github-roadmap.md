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
      The first experimental `.trk` export is already shipped. The remaining work here is narrowing the gap between "importable" and "dependable" by validating more real layouts and tightening the remaining prefab mapping and orientation edge cases before this can be treated as a more supported workflow.
  - [ ] Validate the current `.trk` export on more layouts
        Test the shipped export across a wider range of real track layouts so the current best-effort mapping is grounded in repeatable validation instead of one-off success cases.
  - [ ] Resolve remaining mapping and orientation edge cases
        Tighten the current export where prefab substitutions, facing direction, or rotation assumptions still produce avoidable cleanup work after import.

- [ ] Editor workflow follow-up (`No account required`)
      Build on the shipped snapping, route warnings, and numbering handoff with stronger in-canvas guidance that stays lightweight, derived, and safe across desktop and mobile.
  - [ ] Obstacle numbering validation and controls
        Build on the shipped route-derived numbering with clearer issue states, missing-route/gap warnings, and explicit editor controls without replacing the current derived model.
  - [ ] Advanced snapping follow-up
        Build on the shipped grid-and-shape snap baseline with route-line alignment, stronger object-alignment guides, and useful angle targets while preserving drag responsiveness on larger layouts.

- [ ] Map and field overlay (`No account required`)
      Support venue plans, field maps, or imagery behind the editor canvas.

## Follow-up

- [ ] Embeddable shared views (`No account required`)
      Let published layouts be embedded on external sites through a lightweight read-only viewer that reuses the current share model instead of introducing a separate viewing stack.
  - [ ] Embed code in share flow
        Add a share-dialog path for iframe embed code with copy-to-clipboard and preview.
  - [ ] Lightweight embed viewer
        Reuse the existing share resolution and read-only viewer foundations so embeds keep pan, zoom, and basic route review without exposing editing controls.
  - [ ] Constrained-container validation
        Validate desktop and mobile behavior for embeds inside real third-party page containers, including sandboxing and failure states.

- [ ] Venue library and constraints (`Account-backed`)
      Support reusable venue records with boundaries, constraints, and venue-specific profiles.

- [ ] Real-time collaboration evaluation (`Research`)
      Evaluate whether TrackDraw should support shared real-time editing for race track design, but do not actively invest in enabling collaboration until the sync, presence, and conflict model clearly justifies the editor complexity.
  - [ ] Smallest credible live slice
        Decide whether the first live multi-user step should be presence-only, a host-led review session, or true co-editing.
  - [ ] Host-review-first recommendation
        Treat host-led review with optional presence as the strongest smaller step if TrackDraw wants live collaboration-adjacent value before full co-editing.
  - [ ] Sync model and conflict handling
        Define how collaborative edits, conflict resolution, and offline/local-first behavior should work together only if shared editing still looks strategically justified.
  - [ ] Re-evaluate after editor boundary improvements
        Only revisit active co-editing investment after the editor state, persistence, and undo boundaries are stronger for the solo workflow too.

- [ ] Published gallery evaluation (`Research`)
      Evaluate whether TrackDraw should support a browsable gallery of published user-made tracks, and define the ownership, moderation, and discovery model before exposing that surface publicly.
  - [ ] Publishing and consent model
        Decide how a private project becomes gallery-visible and what opt-in, attribution, or ownership controls are required.
  - [ ] Moderation and discovery model
        Define how gallery content is filtered, featured, searched, or curated without creating an unmanageable moderation burden.

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

## Backlog And Research

- [x] Bundle size reduction (`No account required`)
      Keep reducing startup weight now that the first lazy-loading and share-shell splits are in place. The next work here should stay measurement-led and focus on the heaviest remaining client chunks instead of treating bundle size as one broad cleanup bucket.
  - [x] Studio toolbar chunk reduction
        Reduce avoidable weight in the main Studio toolbar so rarely used controls or secondary tool surfaces do not all ship in the first editor load.
  - [x] TrackCanvas editor-only interaction split
        Keep separating editor-only interaction code from the base 2D rendering path where that meaningfully lowers the Studio startup chunk without regressing drawing and selection behavior.
  - [x] 3D preview hotspot audit
        Re-measure the shared 3D preview stack and only keep splitting it further if a specific scene, geometry, or overlay module proves to be a worthwhile remaining hotspot.
  - [x] Export dependency audit
        Confirm that heavier export dependencies stay fully behind the export flow and are not leaking back into normal editor or shared-view startup paths.

- [ ] Track DNA and layout analysis (`Research`)
      Evaluate whether route and layout analysis should become reusable signals that help compare tracks, explain style, and support later recommendation or assistive tooling.
  - [ ] Product usefulness test
        Validate whether any track-character summary actually helps decisions instead of adding decorative scoring.
  - [ ] Rule-based pattern recognition
        Detect route patterns such as S-turns, hairpins, or figure-8 sections only if the labels stay explainable and stable under normal edits.
  - [ ] Derived section tags
        Turn useful detected patterns into lightweight route tags or labels only if they speed up review without creating noisy false positives.

- [ ] Heatmap and flow analysis (`No account required`)
      Add lightweight visual feedback for rhythm, density, and bottlenecks.
  - [ ] Density overlay
        Highlight obstacle clusters and repeated-turn pressure zones.
  - [ ] Suspicious spacing cues
        Flag unusually tight or inconsistent spacing.
  - [ ] Route rhythm cues
        Add lightweight route rhythm cues.

- [ ] AR mode evaluation (`Research`)
      Keep AR parked as a later research track until real product demand appears from venue-side workflows or user feedback.
  - [ ] Platform feasibility if demand appears
        Validate a practical Android WebXR path and a separate iOS fallback before committing to product work.
  - [ ] Full-track placement usefulness if demand appears
        Test whether full-track venue projection is accurate and useful enough to help real setup decisions without creating misleading precision.

- [ ] Competition rule validation (`Research`)
      Validate a layout against known rule sets such as FAI or MultiGP — minimum gate sizes, minimum obstacle distances, mandatory gate types. Useful for formal competition organizers.

- [ ] Track challenges evaluation (`Research`)
      Evaluate whether TrackDraw should support recurring design challenges, submissions, and lightweight participation loops without creating a heavy moderation or identity burden.
  - [ ] Submission and voting model
        Define how challenge entries, featured picks, or community voting would work if this becomes a real product surface.

- [ ] Build mode / setup sequence (`No account required`)
      Turn a finished layout into a dedicated build/setup surface instead of extending the Race Pack indefinitely, but keep it as a later workflow track rather than a near-term follow-up.
  - [ ] Dedicated build-mode view
        Add a dedicated build-mode page or mode.
  - [ ] Map-linked setup steps
        Show setup steps with the relevant obstacles highlighted on the map.
  - [ ] Grouped build phases and check-off flow
        Organize setup into phases with practical check-off flow.
  - [ ] Crew and venue assumptions
        Let setup order and timing adapt to crew size and venue constraints.

- [ ] Comments and review mode (`Account-backed`)
      Add anchored feedback around obstacles or route sections, but keep it as a later follow-up behind the more pressing design, handoff, and collaboration research tracks.
  - [ ] Pinned obstacle notes
        Add simple notes attached to specific obstacles.
  - [ ] Route-section notes
        Let notes attach to route waypoints or path segments.
  - [ ] Read-only review surface
        Surface anchored notes clearly in read-only review.
  - [ ] Threaded comments follow-up
        Consider richer review threads only if simple notes prove useful.

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

## v1.4.0 Archive

<details>
<summary>Completed release work archived with v1.4.0</summary>

- [x] Share page polish (`No account required`)
      Give the shared read-only track view a more deliberate mobile and 3D review experience so it feels like a real review surface, not just Studio in read-only mode.
  - [x] Mobile 3D control pass
        Bottom bars, drawers, safe-area spacing, and fly-through controls now behave more cleanly on shared links, including the mobile fly-through start flow.
  - [x] Clearer read-only review framing
        Shared tracks now explain themselves faster with stronger first-load context, persistent shared-track context, and a clearer editable-copy path into Studio.

- [x] Flow analysis follow-up (`No account required`)
      Extend the current warning layer with clearer flow-break, spacing, and rhythm-oriented feedback where that proves actionable.
  - [x] Rhythm and spacing cues first pass
        Added first route-review cues for abrupt spacing shifts and short rhythm-breaking corrections in the existing route warning layer.
  - [x] Alignment follow-up
        Added first alignment-kink cues for small off-line bends in otherwise straighter route sections.

- [x] Snap UX improvements (`No account required`)
      Make snapping more visible, predictable, and mobile-friendly so placement and drag behavior stay consistent across the editor.
  - [x] Visible snap toggle first pass
        Added a persistent snap toggle in the editor UI for desktop and mobile, with Alt kept as a temporary bypass.
  - [x] Snap to shapes for shape dragging
        Let dragging placed obstacles or grouped selections snap to nearby shapes before falling back to the grid.
  - [x] Unified snap resolver
        Consolidate the current snap logic into one shared resolver so placement, drag, and waypoint editing follow the same rules.

- [x] Landing page proof follow-up (`No account required`)
      Show the strongest shipped review and handoff workflows more directly on the marketing site, especially cinematic FPV export, route review, and the draw-review-share loop.
  - [x] Cinematic proof block
        Added a stronger homepage FPV export proof section with a dedicated visual slot that can later take video or motion-led media.
  - [x] Core workflow framing
        Tightened the homepage story around draw in 2D, review in 3D, and share read-only.

- [x] Cinematic FPV export first pass (`No account required`)
      Shipped a share-ready cinematic FPV WebM export with theme-aware controls, stronger FPV camera motion, and background progress handling.
  - [x] FPV camera polish first pass
        Improved the fly-through camera feel so preview and export both read more like FPV flight instead of a neutral path rail.
  - [x] Background export handling first pass
        Moved the export into a background-friendly flow with clearer progress and time-remaining feedback.

- [x] Editor state and persistence boundary pass (`No account required`)
      Improve core editor boundaries so TrackDraw stays easier to reason about, autosave and project continuity become clearer, and future collaboration or review work does not require a full reset of the editor model.
  - [x] Separate document state from local UI state
        Split persistent track data more clearly from local interaction state such as tool mode, hover state, drag previews, and temporary selections.
  - [x] Introduce clearer editor action boundaries
        Move toward more explicit editor actions for meaningful changes so undo, testing, analysis hooks, and future sync-related work all have cleaner integration points.
  - [x] Clarify persistence layers
        Tighten the boundaries between local autosave, restore points, saved projects, account-backed projects, and published shares so the user model stays easier to understand.
  - [x] Make undo and redo more intention-aware
        Group meaningful edit sessions more deliberately so history feels cleaner during drag, rotate, and route editing work.

- [x] Test infrastructure
      Introduce Vitest as the baseline test runner and establish the first test coverage for core business logic and export paths.
  - [x] Vitest setup and CI integration
        Added Vitest to the project, introduced baseline test scripts, and wired a dedicated GitHub Actions `tests.yaml` workflow so the Vitest suite runs on push and pull request.
  - [x] Unit tests for store and transforms
        Added first coverage for core Zustand store actions plus geometry, orientation, shape, planning, and share-related transform helpers.
  - [x] Unit tests for export logic
        Added unit coverage for SVG and Velocidrone export builders where that logic can run without a browser runtime.
  - [x] Component tests for critical editor paths
        Added first `happy-dom` component coverage for editor shell actions around read-only review framing, tab switching, and undo/redo controls.

- [x] File structure and module boundary pass
      Tightened folder ownership and internal API surfaces across the editor store, canvas interaction layer, inspector, editor shell, and mobile editor composition. This first structural pass is complete; follow-up cleanup can now happen incrementally as new features land instead of through one large refactor.
  - [x] Audit current module boundaries
        Identified the highest-value boundary problems across the editor store, canvas interactions, inspector, and editor shell, then used that audit to drive the first extraction pass.
  - [x] Remaining large-file splits
        Break up any remaining oversized files identified in the audit, especially where editor composition and mobile/desktop orchestration still live together.
  - [x] Reduce cross-module coupling in editor state
        Moved shared editor-store state shapes into dedicated types, centralized UI/session reset profiles, and reduced duplicated store wiring so state changes stay more local to the editor boundary.

</details>

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
