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

The next TrackDraw priority is generated flightpath validation first, translation management tooling second, and focused 3D item controls third. Selective race-day workflow depth can follow once those are stable. Keep larger account, community, billing, and platform expansion behind those unless a specific support or release risk forces it forward.

## Follow-up

- [ ] Generated flightpath validation follow-up (`Research`, `No account required`)
      Validate real layouts and tune warnings, route anchor heights, and unclear sequence feedback before treating generated routes as more than a first-pass drafting aid. Research document: `docs/research/generated-flightpath-assistance.md`.

- [ ] Translation management workflow (`Research`)
      Evaluate hosted Crowdin versus self-hosted Weblate so TrackDraw can keep English, Dutch, German, and upcoming contributor languages manageable without forcing translators to edit JSON by hand. Keep `dashboard` and `legal` English-only, preserve PR-based review, and keep locale catalogs out of the Worker bundle.
  - [ ] Hosted versus self-hosted decision
        Compare Crowdin plan eligibility/costs, especially if TrackDraw gains paid plans, against the operational ownership of self-hosted Weblate.
  - [ ] Weblate prototype if self-hosting remains preferred
        Stand up a private/staging Weblate instance, import only translatable namespaces, and validate one namespace end to end before committing to full migration.
  - [ ] Production deployment plan if Weblate is chosen
        Design a production-worthy Weblate deployment with pinned containers, TLS/reverse-proxy setup, SMTP, access control, backups, restore testing, monitoring, upgrade/rollback process, and a no-direct-push-to-main security boundary.
  - [ ] Repository sync workflow
        Prototype source upload and translation pull requests through GitHub Actions while preserving normal code review and existing locale validation checks.
  - [ ] Translator guidance
        Document the language-leader model, suggestion-first contributor flow, FPV terminology, placeholders/ICU syntax, compact UI label expectations, and the `dashboard`/`legal` English-only boundary before inviting broader contributor translation work.

- [ ] Focused 3D item controls (`No account required`)
      Add direct 3D controls for common obstacle edits where they are faster than inspector-only editing and still respect lock state, undo/redo, and mobile constraints.
  - [ ] 3D transform gizmo and edit mode toolbar
        Draft PVA: [3D Transform Controls PVA](../pva/3d-transform-controls-pva.md). Prototype selected-item move and rotate controls with orbit-friendly camera behavior only where the interaction is predictable across 2D and 3D. Do not add dimension handles until move/rotate are accepted.

- [x] Mobile Studio drawer smoothness pass (`No account required`)
      Reduced intermittent drawer stutter without changing the mobile workflow: Studio bottom drawers now keep drag work on a dedicated handle, contain momentum scrolling inside the drawer, avoid animating a full-screen backdrop blur, and keep expensive inspector callbacks stable. Added regression coverage for the specialized mobile drawer shell while leaving the shared drawer UI primitive stock.

- [ ] Path editing UX (`No account required`)
      Make drawing and adjusting a path feel more natural, especially for curved layouts where the current waypoint model forces extra points to avoid sharp corners.
  - [ ] Per-waypoint curve strength (`Research`)
        Only pursue if automatic smoothing is not sufficient and if there is an interaction model that works on both desktop and mobile. Direct canvas handles are likely too fiddly on touch; validate an inspector- or gesture-based alternative first before committing to an approach.
  - [ ] 3D maneuver curve optimization (`Research`)
        Powerloops, split-S maneuvers, and similar moves are inherently 3D: a powerloop is a full vertical circle back through a gate, a split-S is a downward half-loop with a direction reversal. The current CatmullRom route renders these as flat horizontal curves, which is physically wrong. The goal is geometry-driven optimization with no manual annotation — the user just draws waypoints that describe the spatial intent (a tight loop near a gate, a 180° arc with elevation change), and the optimizer automatically detects the pattern and generates the correct 3D curve. The 2D canvas shows a recognizable indicator for the detected maneuver section; the 3D preview renders the actual vertical loop or half-loop. Research document: `docs/research/maneuver-curve-optimization.md`.
  - [ ] True 3D curve replacement for detected maneuvers
        Replace detected maneuver sections with physically plausible vertical loop or half-loop curve geometry and blend cleanly into surrounding route segments. Keep this open until the 3D preview renders the corrected maneuver shape rather than only detecting and reviewing it.

## Later Product Follow-up

- [ ] VelociDrone experimental export stabilization (`Lower priority`, `No account required`)
      Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping/orientation edge cases.

- [ ] Share version history (`Lower priority`, `Account-backed`)
      Let owners update published shares with clear version history, current-version state, and rollback options once share lifecycle work becomes a priority again.

- [ ] Gallery featured collections (`Lower priority`, `Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples when gallery growth warrants it.

- [ ] Presets store (`Lower priority`, `Account-backed`)
      Let users publish a preset to a community store where others can browse and save it. Keep out of scope until account-backed preset storage is proven in practice. Research document: `docs/research/presets-store.md`.

- [ ] Race-day workflow depth (`No account required`)
      Keep this behind generated flightpath validation and focused 3D controls. The first future slice should deepen the existing Race Pack and event-preparation flow only where it improves practical setup and handoff.
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

## v1.13.0 Archive

<details>
<summary>Completed release work to archive with v1.13.0</summary>

- [x] Generated flightpath assistance (`Research`, `No account required`)
      Shipped the first generated flightpath slice as an optional drafting aid. The intended race sequence is defined by the obstacle order in the track items list, and users can drag-to-reorder track items before generating a normal editable race line. Generated routes remain assistive, editable, and non-authoritative.
  - [x] Generated flightpath prototype
        Built the smallest useful route-generation prototype from the ordered obstacle list. The output is a normal editable race line, and the layout inspector surfaces warnings when the generated line is likely to need extra attention.
  - [x] Drag-to-reorder obstacles
        Wired up drag handles in the track items list so users can explicitly set the intended race sequence before generating a path, while keeping race lines out of the track-item stack ordering.

- [x] Interactive elevation profile dialog (`No account required`)
      Turned the Elevation Profile into a route-review surface with focusable waypoint markers, obstacle/timing/warning markers, warning-segment jump actions, and profile-to-canvas selection/hover links. Direct elevation editing remains out of scope until navigation and review interactions have settled.

- [x] Export and handoff workflow polish (`No account required`)
      Reworked the export dialog around the same clear structure as the Project Manager and Share dialogs, with categories, formats, filename fields, theme controls, route-number settings, and readiness warnings scoped to the selected output.
  - [x] Export dialog information architecture
        Grouped exports by category in the sidebar, then let users choose the concrete output and show only the options and limitation details that apply to it.
  - [x] Race Pack positioning
        Presented Race Pack as the race-day handoff export inside the refreshed dialog without starting a larger race-day-ops feature first.
  - [x] Export validation and feedback states
        Show relevant missing-data, unsupported-output, disabled-action, and failure states consistently before and after export.
  - [x] Mobile export drawer refresh
        Brought the mobile export flow closer to the same structure while preserving compact touch-friendly controls.

- [x] Editor reliability polish (`No account required`, `Account-backed`)
      Ran focused stability passes over shipped editor workflows without changing the product model.
  - [x] Locked selection action safeguards
        Locked selections consistently block destructive or confusing actions such as duplicate, delete, route join, and route close across store actions, shortcuts, context menus, inspector controls, item lists, and mobile overlays, while group organization remains available.
  - [x] Route editing regression pass
        Hardened waypoint insert, delete, drag, segment and vertex selection clearing, route close/join, snapping, undo/redo, and mobile path controls.
  - [x] Transform and snapping regression pass
        Validated move, nudge, rotate, resize handles, snapping, grouped selections, mixed locked/editable selections, and no-op history behavior.
  - [x] Mobile editor ergonomics pass
        Tightened drawers, touch targets, compact labels, Project Manager flows, path tools, multi-select actions, map reference controls, and inspector panels.
  - [x] Recovery and failure states
        Made autosave, import, export, share, account sync, and runtime failures explain what happened and what the user can do next.
  - [x] Magic-link handoff reliability
        Added a protected confirmation step for one-time magic links so automatic email security checks are less likely to consume a sign-in link before the user opens TrackDraw.
  - [x] Project save observability
        Improved account project save diagnostics by treating malformed/invalid save payloads as bad requests and logging unexpected save failures with more useful server-side detail.
  - [x] Large-layout stability pass
        Stress-tested dense layouts, long routes, map references, 3D preview, PDF/export, and made targeted performance or debounce fixes.

- [x] Locale catalog asset loading (`No account required`, `Account-backed`)
      Moved English, Dutch, German, and future locale JSON catalogs out of static server imports and into generated OpenNext assets, while keeping local dev/tests able to read from `lang/{locale}`. Dashboard and legal namespaces remain English-only.

- [x] Remove legacy localStorage migration shims (`No account required`)
      Removed the v1.11.0 one-time migration shims for the old raw-string `trackdraw.measurementUnitSystem` value and the old per-key `trackdraw-hint-*-dismissed` hint flags. The active Zustand persist keys remain unchanged.

</details>

## v1.12.0 Archive

<details>
<summary>Completed release work to archive with v1.12.0</summary>

- [x] Multilingual product experience (`No account required`)
      TrackDraw now has a multilingual product layer across the public site, Studio, share/embed/gallery surfaces, dialogs, inspector, exported handoff copy, and shared product vocabulary. Dashboard and legal surfaces remain English-only. English, Dutch, and German are supported through explicit language choice and browser-language first-run defaults, while existing routes such as `/studio`, `/gallery`, `/share/[token]`, and `/embed/[token]` stay unchanged.
  - [x] I18n architecture
        Added next-intl without locale routing, route-scoped message loading, a persisted locale preference, server-side locale/message resolution, and a language picker that works without an account.
  - [x] Dutch rollout and copy QA
        Migrated the editor, dialogs, inspector, gallery, share/embed views, export/PDF/Race Pack copy, and shared shape/tool vocabulary to message catalogs. Follow-up QA tightened Dutch FPV terminology, fixed missed strings, and corrected account/delete/export copy issues surfaced by the rollout.
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
