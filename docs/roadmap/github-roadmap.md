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

The next TrackDraw priority is export and handoff workflow polish first, generated flightpath assistance second, and editor reliability polish third. Keep larger race-day, account, community, billing, and platform expansion behind those unless a specific support or release risk forces it forward.

## Follow-up

- [ ] Export and handoff workflow polish (`No account required`)
      Rework the export dialog around the same clear structure as the Project Manager and Share dialogs. The goal is to make every handoff path easier to choose, explain what each export is for, and make export errors or limitations visible before users rely on the output.
  - [x] Export dialog information architecture
        Group exports by category in the sidebar, then let users choose the concrete output and show only the filename, theme, route-number, and limitation details that apply to it.
  - [ ] Export purpose and limitations copy
        Make each export explain whether it is read-only, editable, race-day handoff, backup, simulator-oriented, or experimental.
  - [ ] Race Pack positioning
        Present Race Pack as the race-day handoff export inside the refreshed dialog without starting a larger race-day-ops feature first.
  - [ ] Export validation and feedback states
        Show relevant missing-data, unsupported-output, disabled-action, and failure states consistently before and after export.
  - [x] Mobile export drawer refresh
        Bring the mobile export flow closer to the same structure while preserving compact touch-friendly controls.

- [ ] Generated flightpath assistance (`Research`, `No account required`)
      Prototype generated flightpaths from placed obstacles as an optional drafting aid. The intended race sequence is defined by the obstacle order in the track items list (backed by `shapeOrder`), which users can set via drag-to-reorder once this feature ships. The generator connects obstacles in that order and produces an editable race line — it assists authoring rather than replacing it. Research document: `docs/research/generated-flightpath-assistance.md`.
  - [ ] Generated flightpath prototype
        Build the smallest useful route-generation prototype from the ordered obstacle list. The output should be a normal editable race line, not a locked result. Validate that the sequence-based model (list order → path) is intuitive before committing to the full UI.
  - [ ] Drag-to-reorder obstacles (prerequisite)
        Wire up the drag handles in the track items list so users can explicitly set the intended race sequence before generating a path. The store action is ready; this is a UI-only change gated on the path generator being useful enough to justify the interaction.

- [ ] Editor reliability polish (`No account required`, `Account-backed`)
      Run a focused stability pass over shipped workflows before adding another large surface. Prioritize recovery states, mobile ergonomics, selection/transforms, autosave/account sync edge cases, imports/exports, sharing, read-only viewing, and larger layouts.
  - [ ] Recovery and failure states
        Make autosave, import, export, share, account sync, and runtime failures explain what happened and what the user can do next.
  - [ ] Mobile editor ergonomics pass
        Tighten drawers, touch targets, compact labels, Project Manager flows, path tools, multi-select actions, map reference controls, and inspector panels.
  - [ ] Selection and transform regression pass
        Harden locked objects, grouped selections, route waypoint editing, snapping, rotation, resize handles, undo/redo, shortcuts, and mobile overlays.

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
  - [ ] Interactive elevation profile dialog
        Improve the Elevation Profile dialog as a route-review surface, not just a static chart. Add clearer dialog structure, hover/selection links between the profile and route, obstacle/timing/warning markers, and jump-to-segment behavior for warnings. Keep direct elevation editing in the chart out of the first slice until navigation and review interactions feel solid.
  - [ ] 3D maneuver curve optimization (`Research`)
        Powerloops, split-S maneuvers, and similar moves are inherently 3D: a powerloop is a full vertical circle back through a gate, a split-S is a downward half-loop with a direction reversal. The current CatmullRom route renders these as flat horizontal curves, which is physically wrong. The goal is geometry-driven optimization with no manual annotation — the user just draws waypoints that describe the spatial intent (a tight loop near a gate, a 180° arc with elevation change), and the optimizer automatically detects the pattern and generates the correct 3D curve. The 2D canvas shows a recognizable indicator for the detected maneuver section; the 3D preview renders the actual vertical loop or half-loop. Research document: `docs/research/maneuver-curve-optimization.md`.
  - [x] Research note and first-pass maneuver signals
        Added the maneuver optimization research note, kept route geometry schema-compatible, made 3D route smoothing respect vertical waypoint distance, rendered warning colors on one continuous 3D route tube, and added first-pass powerloop/split-S detection signals in the elevation review.
  - [ ] True 3D curve replacement for detected maneuvers
        Replace detected maneuver sections with physically plausible vertical loop or half-loop curve geometry and blend cleanly into surrounding route segments. Keep this open until the 3D preview renders the corrected maneuver shape rather than only detecting and reviewing it.

## Later Product Follow-up

- [ ] Remove legacy localStorage migration shims (`Lower priority`, `No account required`)
      Two migration shims were added in v1.11.0 to preserve existing user preferences after the Zustand persist migration. Remove them once enough releases have passed that the old keys are no longer realistically present. The shims live in `src/store/measurement-unit.ts` (legacy raw-string format for `trackdraw.measurementUnitSystem`) and `src/store/editor-hints.ts` (legacy `trackdraw-hint-*-dismissed` per-key format). Safe to remove no earlier than v1.13.0.

- [ ] VelociDrone experimental export stabilization (`Lower priority`, `No account required`)
      Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping/orientation edge cases.

- [ ] Share version history (`Lower priority`, `Account-backed`)
      Let owners update published shares with clear version history, current-version state, and rollback options once share lifecycle work becomes a priority again.

- [ ] Gallery featured collections (`Lower priority`, `Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples when gallery growth warrants it.

- [ ] Presets store (`Lower priority`, `Account-backed`)
      Let users publish a preset to a community store where others can browse and save it. Keep out of scope until account-backed preset storage is proven in practice. Research document: `docs/research/presets-store.md`.

- [ ] Race-day workflow depth (`No account required`)
      Keep this behind export/handoff polish. The first future slice should deepen the existing Race Pack and event-preparation flow only once the current export surface is clearer.
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
  - [ ] Route duration estimate follow-up
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

## v1.12.0 Archive

<details>
<summary>Completed release work to archive with v1.12.0</summary>

- [x] Multilingual product experience (`No account required`)
      TrackDraw now has a full multilingual product layer across the public site, Studio, share/embed/gallery surfaces, dashboard, dialogs, inspector, exported handoff copy, and metadata/API docs. English, Dutch, and German are supported through explicit language choice and browser-language first-run defaults, while existing routes such as `/studio`, `/gallery`, `/share/[token]`, and `/embed/[token]` stay unchanged.
  - [x] I18n architecture
        Added next-intl without locale routing, route-scoped message loading, a persisted locale preference, server-side locale/message resolution, and a language picker that works without an account.
  - [x] Dutch rollout and copy QA
        Migrated the editor, dialogs, inspector, dashboard, gallery, share/embed views, export/PDF/Race Pack copy, and shared shape/tool vocabulary to message catalogs. Follow-up QA tightened Dutch FPV terminology, fixed missed strings, and corrected account/delete/export copy issues surfaced by the rollout.
  - [x] German locale
        Added German message catalogs on the same route-stable i18n foundation, with follow-up copy tightening across Dutch and German.
  - [x] Translation guardrails
        Centralized the i18n catalog policy, added locale parity and unresolved-key checks, kept hardcoded-copy scanning in CI, and reduced the hardcoded allowlist to intentional exceptions such as brand alt text, shortcuts, units, technical tokens, and design-system primitive defaults.

- [x] Open-source licensing update
      Relicensed the source code under AGPL-3.0-only, updated package metadata and README license copy, and added NOTICE guidance clarifying source-code licensing versus TrackDraw name, logo, brand assets, hosted service, and user-created content.

- [x] Research and roadmap alignment (`Research`)
      Added product-shape research for generated flightpath assistance, the presets store, and RotorHazard event viewer integration, then refreshed roadmap/research references so those future tracks are documented without turning them into the current build target.

- [x] User account moderation (`Account-backed`)
      Admins can now temporarily ban or permanently delete a user account from the Users dashboard, alongside the existing role-change action. Ban and deletion are separate, individually confirmed, individually audited actions, and both block targeting your own account the same way role changes already do.
  - [x] Temporary ban
        Blocks sign-in via `banned_at` plus a reason chosen from a predefined list (with a free-text "Other" option), ends active sessions immediately, and is fully reversible without touching any owned data.
  - [x] Permanent deletion
        Removes a user and cascade-deletes owned projects, shares, gallery entries (including R2 preview images), and API keys, following the app's existing explicit-cascade pattern rather than relying on DB-level FK cascades. The confirmation dialog requires typing the account's email, shows live counts of what will be removed, and explicitly warns that published gallery tracks and embeds disappear too.

</details>

## v1.11.0 Archive

<details>
<summary>Completed release work archived with v1.11.0</summary>

- [x] Barriers (`No account required`)
      Dedicated barrier category for obstacles that block sightlines, mark field boundaries, or serve as physical separators. Includes the MultiGP Hurdle with official dimensions and artwork, plus TrackDraw banner, fence panel, and net entries. Catalog-backed placement, 2D/3D rendering, inspector type switching, inventory counts, and Race Pack material output.

- [x] User-defined presets (`Account-backed`)
      The hard-coded preset list is replaced with an account-backed preset library. Users select non-path shapes on the canvas, name the selection, and save it as a reusable preset. Presets sync with the account on sign-in and are cleared on sign-out or account switch. The preset picker is hidden when not signed in. Rename, delete, and empty-state guidance are included. "Save preset" is available from both the canvas context menu and the multi-selection inspector. Local-first storage and migration were intentionally deferred.

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
