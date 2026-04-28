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

- [ ] Race-day handoff next slice (`No account required`)
      Build on the shipped Race Pack, published shares, and editor numbering work with small release-sized improvements that make briefing and setup easier without turning TrackDraw into a race-control product.
  - [x] Shared view QR code in Race Pack
        Embed a QR code linking to the canonical published shared view in the Race Pack PDF, so pilots and crew can scan directly from a printed or on-screen briefing.
  - [x] Timing gate markers
        Let specific gates be marked as start/finish or split timing points so race directors can identify timing hardware placement clearly in the editor, Race Pack, and future overlay preparation.

## Follow-up

- [ ] Velocidrone experimental export stabilization (`No account required`)
      The first experimental `.trk` export is already shipped. Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping and orientation edge cases.
  - [ ] Validate the current `.trk` export on more layouts
        Test the shipped export across a wider range of real track layouts so the current best-effort mapping is grounded in repeatable validation instead of one-off success cases.
  - [ ] Resolve remaining mapping and orientation edge cases
        Tighten the current export where prefab substitutions, facing direction, or rotation assumptions still produce avoidable cleanup work after import.

- [ ] Venue library and constraints (`Account-backed`)
      Support reusable venue records with boundaries, constraints, and venue-specific profiles.

- [ ] Share version history (`Account-backed`)
      Let owners update published shares while keeping clear version history and rollback options for account-backed projects.
  - [ ] Published version snapshots
        Store each deliberate publish/update as a named or timestamped version instead of silently replacing the visible share state.
  - [ ] Rollback and current-version controls
        Let owners inspect previous published versions and restore one when a shared track was updated by mistake.

- [ ] Gallery featured collections (`Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples without adding social feeds or voting.
  - [ ] Collection management
        Add dashboard controls for creating, ordering, and publishing curated gallery collections.
  - [ ] Public collection sections
        Surface curated collections on `/gallery` while keeping individual gallery cards pointed at `/share/[token]`.

- [ ] Admin dashboard operations follow-up (`Account-backed`)
      Improve operator visibility for shipped account, share, and gallery surfaces without adding public reporting flows for now.
  - [ ] Gallery management filters
        Add practical dashboard filters for gallery state, featured entries, hidden entries, and recent updates.
  - [x] Share lifecycle visibility
        Give operators a clearer view of active, expired, revoked, and gallery-linked shares for support and debugging.
  - [x] Audit log usability
        Add filters and detail views that make account, role, share, and gallery actions easier to inspect.

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

## Later Product Follow-up

- [ ] Race-day communication and briefing (`No account required`)
      The first Race Pack release is shipped, and the immediate QR/timing-marker slice now lives in Current Priority. The remaining work here is larger race-day operations follow-up.
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

- [ ] Live race overlay preparation (`No account required`)
      Prepare TrackDraw projects for a future `rh-stream-overlays` minimap integration without making TrackDraw the live OBS overlay runtime.
  - [ ] Active race route marker
        Let a project identify which polyline is the race route instead of relying on the current first-polyline fallback.
  - [ ] Timing role metadata
        Reuse the race-day timing marker model for overlay preparation, including start/finish and split timing identifiers on relevant shapes.
  - [ ] Timing setup validation
        Warn or block overlay-oriented export when the race route is missing, timing roles are duplicated, or marked timing points cannot be mapped onto route progress.
  - [ ] TrackDraw JSON contract pass
        Keep the existing serialized project JSON as the first integration format and document the fields `rh-stream-overlays` should consume.
  - [ ] Overlay package export decision
        Only add a dedicated overlay package export if the RH plugin proves the full project JSON is too broad or ambiguous.

## Backlog And Research

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

## v1.5.0 Archive

<details>
<summary>Completed release work archived with v1.5.0</summary>

- [x] Published gallery (`Account-backed`)
      Shipped opt-in public gallery discovery for account-published tracks, including owner-managed listings and moderator/admin dashboard controls.

- [x] Embeddable shared views (`Account-backed`)
      Shipped account-only published embeds through `/embed/[token]`, including iframe copy, 2D/3D start modes, unavailable states, and lifecycle rules that keep anonymous shares temporary and non-embeddable.

- [x] Editor workflow follow-up (`No account required`)
      Shipped route-derived numbering validation, route-line and waypoint-aware snapping, x/y object-alignment snapping, and lightweight inspector cues without replacing the current derived workflow model.
  - [x] Obstacle numbering validation and controls
        Added shared route-derived numbering validation, layout inspector status, missing-route/off-route issue states, and item-list cues without replacing the current derived model.
  - [x] Advanced snapping follow-up
        Added route-line snapping, waypoint-aware snapping, x/y object-alignment snapping, and kept the existing angle/grid behavior on the same lightweight snap resolver.

- [x] Map field reference (`No account required`)
      Shipped an editor-only satellite map reference for lining a project up with a real venue. Users can search for a location, choose the field center, align rotation, adjust opacity, and render the saved reference behind the 2D layout through a non-interactive Konva tile layer.
  - [x] Map picker and field footprint
        Added a desktop dialog and mobile drawer with Esri World Imagery tiles, typeahead location search, current-location jump, center selection, touch/pointer panning, pinch/wheel zoom, and a field footprint derived from project dimensions.
  - [x] Editor rendering and inspector controls
        Added a locked, non-interactive Konva tile renderer plus Layout inspector controls for add/edit, show/hide, opacity, rotation, and remove.
  - [x] Persistence and share/export boundary
        Persisted map reference metadata in project JSON and stripped it from share/export serialization so public outputs do not expose map references in v1.

- [x] Bundle size reduction (`No account required`)
      Shipped measured startup-weight reductions and verified that heavier editor, 3D, and export paths stay behind the workflows that need them.
  - [x] Studio toolbar chunk reduction
        Reduced avoidable weight in the main Studio toolbar so secondary controls do not all ship in the first editor load.
  - [x] TrackCanvas editor-only interaction split
        Kept editor-only interaction code separated from the base 2D canvas path where that lowers startup cost without risking core viewing behavior.
  - [x] 3D preview hotspot audit
        Re-measured the shared 3D preview stack and kept further splitting limited to concrete hotspots.
  - [x] Export dependency audit
        Confirmed that heavier export dependencies stay fully deferred behind export flows.

</details>

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
