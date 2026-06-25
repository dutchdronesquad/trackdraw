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

The completed release-sized work is archived below. The next TrackDraw priority is race-day workflow depth, editor reliability follow-up, remaining focused 3D item controls, generated flightpath assistance, multilingual-readiness for international users, account-backed project lifecycle depth beyond the shipped conflict/retry baseline, and powerloop 3D curve replacement in the route path.

## Follow-up

- [ ] Focused 3D item controls (`No account required`)
      Add direct 3D controls for common obstacle edits where they are faster than inspector-only editing and still respect lock state, undo/redo, and mobile constraints.
  - [x] Editable tower elevation handle
        Selected custom towers can now be lifted directly in the 3D view with the same live-preview, undo/redo, lock-state, mobile drag behavior, and bounded elevation range used by existing 3D elevation controls. Fixed-dimension catalog towers remain protected.
  - [ ] 3D transform gizmo and edit mode toolbar
        Draft PVA: [3D Transform Controls PVA](../pva/3d-transform-controls-pva.md). Prototype selected-item move and rotate controls with orbit-friendly camera behavior only where the interaction is predictable across 2D and 3D. Do not add dimension handles until move/rotate are accepted.

- [ ] Path editing UX (`No account required`)
      Make drawing and adjusting a path feel more natural, especially for curved layouts where the current waypoint model forces extra points to avoid sharp corners.
  - [x] Path drawing interaction improvements
        Removed the misleading straight rubber-band preview in favour of the live Catmull-Rom curve preview, added a persistent start-point ring so users can see where the path began during long-form drawing, and tightened the desktop minimum waypoint gap to 0.15 m to reduce accidental duplicate placements.
  - [x] Automatic curve smoothing
        Catmull-Rom splines (chord-length parameterized) were already the sole rendering path for committed polylines. The drawing overlay now also relies on the smooth preview exclusively, making the curve shape visible from the first waypoint onwards.
  - [ ] Per-waypoint curve strength (`Research`)
        Only pursue if automatic smoothing is not sufficient and if there is an interaction model that works on both desktop and mobile. Direct canvas handles are likely too fiddly on touch; validate an inspector- or gesture-based alternative first before committing to an approach.
  - [ ] 3D maneuver curve optimization (`Research`)
        Powerloops, split-S maneuvers, and similar moves are inherently 3D: a powerloop is a full vertical circle back through a gate, a split-S is a downward half-loop with a direction reversal. The current CatmullRom route renders these as flat horizontal curves, which is physically wrong. The goal is geometry-driven optimization with no manual annotation — the user just draws waypoints that describe the spatial intent (a tight loop near a gate, a 180° arc with elevation change), and the optimizer automatically detects the pattern and generates the correct 3D curve. The 2D canvas shows a recognizable indicator for the detected maneuver section; the 3D preview renders the actual vertical loop or half-loop. Research document: `docs/research/maneuver-curve-optimization.md`.
  - [x] Research note and first-pass maneuver signals
        Added the maneuver optimization research note, kept route geometry schema-compatible, made 3D route smoothing respect vertical waypoint distance, rendered warning colors on one continuous 3D route tube, and added first-pass powerloop/split-S detection signals in the elevation review.
  - [ ] True 3D curve replacement for detected maneuvers
        Replace detected maneuver sections with physically plausible vertical loop or half-loop curve geometry and blend cleanly into surrounding route segments. Keep this open until the 3D preview renders the corrected maneuver shape rather than only detecting and reviewing it.

- [ ] Generated flightpath assistance (`Research`, `No account required`)
      Research generated flightpaths from placed obstacles as an optional drafting aid. The intended race sequence is defined by the obstacle order in the track items list (backed by `shapeOrder`), which users can set via drag-to-reorder once this feature ships. The generator connects obstacles in that order and produces an editable race line — it assists authoring rather than replacing it.
  - [ ] Generated flightpath research
        Prototype flightpath generation from the ordered obstacle list as an assistive review/drafting feature. The output should be an editable race line, not a locked result. Validate that the sequence-based model (list order → path) is intuitive before committing to the full UI.
  - [ ] Drag-to-reorder obstacles (prerequisite)
        Wire up the drag handles in the track items list so users can explicitly set the intended race sequence before generating a path. The store action is ready; this is a UI-only change gated on the path generator being useful enough to justify the interaction.

- [ ] Multilingual product experience (`No account required`)
      Use the regional measurement work as a first locale-aware foundation, then evaluate a full i18n layer for the public site, editor, share pages, and exported handoff copy. Architecture PVA: [I18n Multilingual PVA](../pva/i18n-multilingual-pva.md).
  - [ ] I18n architecture + editor pilot
        Install next-intl (without routing), add a Zustand locale store, wire the NextIntlClientProvider into the root layout, and convert the editor Toolbar and StatusBar as the pilot namespace. Language picker stub in account menu. See PVA phase 1.
  - [ ] Inspector + dialogs namespace
        Migrate inspector panels and the share, account, project, and import/export dialogs to the message catalog (~200 strings).
  - [ ] Landing page namespace
        Migrate all hard-coded marketing copy to the message catalog (~500+ strings).
  - [ ] Dashboard + remaining surfaces
        Migrate admin dashboard and any remaining hard-coded copy.
  - [ ] First language rollout
        Choose the first supported languages from actual user demand and translation-maintenance capacity, with English as the stable fallback for incomplete translations.
  - [ ] Translation QA boundary
        Define how translated UI, mobile layouts, export PDFs/Race Packs, share pages, and legal pages are reviewed so longer translated strings do not break core workflows.

## Later Product Follow-up

- [ ] Remove legacy localStorage migration shims (`Lower priority`, `No account required`)
      Two migration shims were added in v1.11.0 to preserve existing user preferences after the Zustand persist migration. Remove them once enough releases have passed that the old keys are no longer realistically present. The shims live in `src/store/measurement-unit.ts` (legacy raw-string format for `trackdraw.measurementUnitSystem`) and `src/store/editor-hints.ts` (legacy `trackdraw-hint-*-dismissed` per-key format). Safe to remove no earlier than v1.13.0.

- [ ] VelociDrone experimental export stabilization (`Lower priority`, `No account required`)
      Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping/orientation edge cases.

- [ ] Share version history (`Lower priority`, `Account-backed`)
      Let owners update published shares with clear version history, current-version state, and rollback options once share lifecycle work becomes a priority again.

- [ ] Gallery featured collections (`Lower priority`, `Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples when gallery growth warrants it.

- [ ] Section store (`Lower priority`, `Account-backed`)
      Let users publish a track section to a community store where others can browse and save it. Keep out of scope until account-backed section storage is proven in practice.

- [ ] Race-day communication and briefing (`No account required`)
      The first Race Pack release and immediate QR/timing-marker slice are shipped. The remaining work here is larger race-day operations follow-up.
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

- [ ] Route duration estimate follow-up (`No account required`)
  - [ ] Race Pack and setup copy
        Surface the estimate only where it helps race-day setup, such as timing/overlay preparation notes, and avoid presenting it as a guaranteed race result prediction.
  - [ ] Validation against real heats
        Compare the first-lap estimate with actual RotorHazard lap data across a few real tracks before relying on it as the preferred baseline.

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
      Add anchored feedback around obstacles or route sections, but keep it as a later follow-up behind the more pressing design, handoff, account, and publishing tracks.
  - [ ] Pinned obstacle notes
        Add simple notes attached to specific obstacles.
  - [ ] Route-section notes
        Let notes attach to route waypoints or path segments.
  - [ ] Read-only review surface
        Surface anchored notes clearly in read-only review.
  - [ ] Threaded comments follow-up
        Consider richer review threads only if simple notes prove useful.

- [ ] Usage analytics and event tracking (`Account-backed`)
      TrackDraw has Tier 1 internal metrics derived from existing tables. Tier 2 requires a lightweight `product_events` table to track share views, export format usage, and editor interactions. This table is kept separate from `audit_events` — audit events are identity-linked and security-sensitive, product events can be anonymous and have a different retention lifecycle. Research document: `docs/research/admin-metrics-analytics.md`.
  - [ ] `product_events` table and schema
        Add a narrow D1 table with event name, nullable session ID, nullable user ID, nullable project/share reference, and timestamp. No IP addresses or device fingerprints. Purgeable per user on account deletion.
  - [ ] First event instrumentation
        Instrument the highest-value events: `share.viewed` (public share page), `export.completed` (PDF/PNG/SVG/JSON), `editor.3d_opened` (first open per session), `editor.element_placed` (element type), `project.imported`.
  - [ ] Tier 2 metrics in admin dashboard
        Surface aggregate event data alongside existing Tier 1 query metrics in the admin Metrics page: share view counts, dead link detection, export format distribution, 3D preview adoption rate.

- [ ] Desktop and mobile wrapper evaluation (`Research`)
      Evaluate whether Electron or Capacitor would materially improve local project handling, native file workflows, or offline resilience.
  - [ ] Product-problem validation
        Identify which user pain points would justify a wrapper over improving the web app.
  - [ ] Technical architecture evaluation
        Decide whether a wrapper should load the hosted app or require its own runtime.
  - [ ] Platform recommendation
        Recommend web-first, Electron, Capacitor, or no wrapper for now.

## v1.11.0 Archive

<details>
<summary>Completed release work archived with v1.11.0</summary>

- [x] Barriers (`No account required`)
      Dedicated barrier category for obstacles that block sightlines, mark field boundaries, or serve as physical separators. Includes the MultiGP Hurdle with official dimensions and artwork, plus TrackDraw banner, fence panel, and net entries. Catalog-backed placement, 2D/3D rendering, inspector type switching, inventory counts, and Race Pack material output.

- [x] User-defined track sections (`Account-backed`)
      The hard-coded section list is replaced with an account-backed section library. Users select non-path shapes on the canvas, name the selection, and save it as a reusable section. Sections sync with the account on sign-in and are cleared on sign-out or account switch. The section picker is hidden when not signed in. Rename, delete, and empty-state guidance are included. "Save section" is available from both the canvas context menu and the multi-selection inspector. Local-first storage and migration were intentionally deferred.

- [x] 3D route maneuver review (`No account required`)
      The 3D route review surface now surfaces maneuver quality for powerloops, split-S, and similar moves through geometry-driven signals. Route curves are rendered more accurately and consistently across elevation changes, with first-pass powerloop and split-S detection visible in the elevation review.

- [x] Admin metrics dashboard (`Account-backed`)
      Admin Metrics page with KPI strip (total users, active users, active projects, active shares, active API keys), user population cohort donut, content overview bar chart, weekly new user growth area chart, plan limit simulation grouped bar chart, and detail stat rows. All metrics derived from existing D1 tables.

- [x] Dashboard operator tooling (`Account-backed`)
      Admins can inspect the state of specific accounts, shares, and API keys from existing dashboard surfaces without digging through database records. Users table rows open an inspect sheet with stats strip, role badge, last login, recent audit events, and change-role actions. Gallery rows open an inspect sheet with share type, embed availability, project ID, dates, and expiry/revocation detail. New `/dashboard/api-keys` page lists all keys across accounts with status, request count, last-used timestamp, and expiry; rows open an inspect sheet with rate limit config, permissions, and owner details.

- [x] Client-state persistence consolidation (`No account required`)
      Migrated `useMeasurementUnitSystem` from a manual `useSyncExternalStore` + custom event pattern to a Zustand `persist` store (`src/store/measurement-unit.ts`). Migrated `useEditorHints` from five separate localStorage keys to a single Zustand `persist` store (`src/store/editor-hints.ts`) under `trackdraw.editorHints`. Both hook interfaces unchanged. Legacy storage formats are migrated transparently on first read.

</details>

## v1.10.0 Archive

<details>
<summary>Completed release work archived with v1.10.0</summary>

- [x] MultiGP Dive Gate 7x6 (`No account required`)
      Catalog-backed gate variant with official 7×6 ft dimensions and a 3D arch rendering. Shares the gate shape kind and inspector pipeline. Arch panels cast and receive shadows correctly, and texture placement is fully configurable via the `ArchDiveGateVisualSpec` banner placement API.

- [x] MultiGP Launch Gate 7x6 (`No account required`)
      Catalog-backed gate variant with official 7×6 ft dimensions and a 3D box-frame rendering with four configurable banner panels. Banner panels cast and receive shadows correctly with accurate texture orientations.

- [x] MultiGP Double Gate Tower 5x5 and 7x6 (`No account required`)
      Catalog-backed tower variants covering MultiGP Tower and Double Gate Tower 5x5 and 7x6 sizes with 2D placement, 3D rendering, texture placement, inspector support, and flythrough coverage.

- [x] 3D scene improvements (`No account required`)
      Added a gradient sky for more depth and a cleaner backdrop. Improved directional lighting consistency across track layouts. Eliminated fog artifacts in dark and light export themes. Tower and ladder 3D rendering is more refined with better proportions and placement behavior.

- [x] MultiGP Corner Flag double-sided textures (`No account required`)
      Corner Flag feather banners now render correctly on both sides in 3D, with double-sided textures applied across all color variants.

- [x] Red variant textures for MultiGP gates (`No account required`)
      Added red color variants for standard and championship MultiGP gate types so clubs can represent their own gate artwork in the 3D preview and exports.

- [x] Tower elevation handle (`No account required`)
      Selected custom towers can now be lifted directly in the 3D view with live preview, undo/redo, lock-state, and mobile drag behavior. Fixed-dimension catalog towers remain protected.

- [x] Path drawing interaction improvements (`No account required`)
      Replaced the straight rubber-band preview with a live Catmull-Rom curve preview, added a persistent start-point ring during long-form drawing, and tightened the desktop minimum waypoint gap to reduce accidental duplicate placements.

- [x] Automatic curve smoothing (`No account required`)
      Catmull-Rom splines (chord-length parameterized) are now the sole rendering path for committed polylines. The drawing overlay also uses the smooth preview exclusively, making the curve shape visible from the first waypoint.

</details>

## v1.9.0 Archive

<details>
<summary>Completed release work archived with v1.9.0</summary>

- [x] MultiGP obstacle catalog expansion (`No account required`)
      Extended the catalog with official MultiGP Corner Flags, Standard Ladder 5x5, Championship Ladder 7x6, and Topless Ladder 7x6. These entries use the same catalog-backed identity, source references, inspector treatment, in-place type switching, and export/share compatibility as the existing official gates.
  - [x] MultiGP Corner Flag
        Added a 10 ft feather flag with realistic textured 3D rendering, catalog identity, inspector type switching, and an official source link.
  - [x] MultiGP ladder variants
        Added Standard Ladder 5x5, Championship Ladder 7x6, and Topless Ladder 7x6 with panel-frame 3D rendering that matches the real obstacles.

- [x] 3D obstacle realism and loading (`No account required`)
      Improved catalog-backed 3D rendering with texture-backed panels and more dependable direct manipulation around official obstacles. The 3D view now warms only the textures used by the current design so textured obstacles load more smoothly without delaying lighter scene details.
  - [x] Texture-backed MultiGP obstacles
        Render catalog-backed gates, ladders, and corner flags with panel artwork and shared layout helpers in the live 3D preview and flythrough export.
  - [x] Focused 3D reliability fixes
        Restored real-time flag rotation updates and improved selection, rotation, and ladder elevation behavior around catalog obstacles.

- [x] Catalog editing and track item list improvements (`No account required`)
      Catalog type switching now works better after placement, including batch edits. The track items list shows catalog-aware names and supports filters that make placed elements easier to find and inspect.
  - [x] Batch catalog type editing
        Let users change sets of gates, flags, or ladders without deleting and rebuilding them.
  - [x] Catalog-aware item names and filters
        Show clearer item names and let users focus the list on race obstacles or all elements.

- [x] Path and route reliability follow-up (`No account required`)
      Improved waypoint and path selection reliability, especially on mobile and when adjusting route elevation in 3D. Route warning geometry now shares the same 3D height offset as the visible route line and preview points.

</details>
