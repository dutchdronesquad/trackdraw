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

The completed release-sized work is archived below. The REST API, live race overlay preparation, account project lifecycle polish, UI/UX polish, and stability pass are now complete. The next TrackDraw priority is race-day workflow depth, editor reliability follow-up, regional measurement support and multilingual-readiness for international users, account-backed project lifecycle depth beyond the shipped conflict/retry baseline, and better dashboard visibility over public and integration-sensitive surfaces.

## Follow-up

- [ ] Velocidrone experimental export stabilization (`No account required`)
      The first experimental `.trk` export is already shipped. Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping and orientation edge cases.
  - [ ] Validate the current `.trk` export on more layouts
        Test the shipped export across a wider range of real track layouts so the current best-effort mapping is grounded in repeatable validation instead of one-off success cases.
  - [ ] Resolve remaining mapping and orientation edge cases
        Tighten the current export where prefab substitutions, facing direction, or rotation assumptions still produce avoidable cleanup work after import.

- [ ] Venue library and constraints (`Account-backed`)
      Support reusable venue records with boundaries, constraints, and venue-specific profiles.

- [x] Regional measurement units (`No account required`)
      Support regional metric and imperial-style display and input without changing the internal meter-based design model.
  - [x] Unit preference model
        Add a project-safe and user-friendly unit preference for metric or imperial-style measurements, with a metric default that fits most international users and does not break existing projects.
  - [x] Locale-informed defaults
        Use browser locale signals to choose an initial measurement default when no explicit preference exists, while keeping the detected value transparent and manually overrideable.
  - [x] Editor display formatting
        Replace direct `m` labels in field size, rulers, inspectors, route/elevation summaries, gallery metadata, and export previews with shared unit formatting.
  - [x] Unit-aware numeric input
        Let users enter common metric and imperial-style values such as meters, feet, and inches while storing normalized meter values in the design.
  - [x] Export and share presentation
        Show the selected measurement system in PDF/Race Pack/share-facing summaries while keeping JSON/API geometry compatible and meter-based.

- [ ] Multilingual product experience (`Research`, `No account required`)
      Use the regional measurement work as a first locale-aware foundation, then evaluate a full i18n layer for the public site, editor, share pages, and exported handoff copy.
  - [ ] I18n architecture and text inventory
        Audit hard-coded UI, export, share, legal-adjacent, dashboard, and error/recovery copy so translatable product text can move behind a stable message catalog without weakening type safety.
  - [ ] Language detection and override
        Use browser language as an initial default when no explicit language preference exists, but keep language selection manually overrideable and independent from measurement units.
  - [ ] First language rollout
        Choose the first supported languages from actual user demand and translation-maintenance capacity, with English as the stable fallback for incomplete translations.
  - [ ] Translation QA boundary
        Define how translated UI, mobile layouts, export PDFs/Race Packs, share pages, and legal pages are reviewed so longer translated strings do not break core workflows.

- [ ] Share version history (`Account-backed`)
      Let owners update published shares while keeping clear version history, current-version state, and rollback options for account-backed projects.
  - [ ] Published version data model
        Store each deliberate publish/update as an immutable published-version record linked to the account-backed share and project, while keeping the existing share token as the stable public address.
  - [ ] Owner publish/update flow
        Make updating an already-published share an explicit action that creates a new version and shows the current published timestamp plus unpublished editor changes.
  - [ ] Version review and restore
        Let owners inspect recent versions with timestamp, gallery metadata, field size, and obstacle count, then restore a previous snapshot by publishing it as a new latest version.
  - [ ] Dashboard lifecycle visibility
        Surface current version, latest update time, version count, gallery state, and embed availability in the dashboard share lifecycle inspector.

- [ ] Gallery featured collections (`Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples without adding social feeds or voting.
  - [ ] Collection management
        Add dashboard controls for creating, ordering, and publishing curated gallery collections.
  - [ ] Public collection sections
        Surface curated collections on `/gallery` while keeping individual gallery cards pointed at `/share/[token]`.

- [ ] Dashboard operator tooling (`Account-backed`)
      Improve dashboard visibility for public gallery tracks, published shares, contextual diagnostics, and API usage without turning TrackDraw into a social platform or broad support console.
  - [ ] Gallery collections management
        Add dashboard controls for creating, ordering, publishing, and assigning curated gallery collections.
  - [ ] Public track quality review
        Give moderators a review list with preview, title, description, field size, obstacle count, public indexing status, owner context, and feature/hide/restore/open actions.
  - [ ] Share lifecycle inspector
        Show share owner, project, token state, expiry/revocation, gallery listing, embed availability, and latest publish/update metadata in one operator view.
  - [ ] Contextual account/project diagnostics
        Add inspect affordances inside existing Users, Gallery, Share, API, and Audit surfaces instead of a standalone diagnostics page.
    - [x] Gallery/share inspect drawer
          Started with a read-only Inspect action on dashboard gallery rows that shows owner, share token, share lifecycle, gallery state, description, share title, field size, element count, preview media state, publish/update dates, and copy/open share actions.
    - [ ] User context panel
          Show role, created/updated dates, account-backed project count, active share count, gallery entry count, API key count, and recent account audit events from the Users table.
    - [ ] Project context panel
          Show project owner, title, updated timestamp, active share state, gallery state, API project ID, overlay readiness, field size, obstacle count, route presence, and timing-marker readiness.
    - [ ] Entity timeline links
          Link users, gallery entries, share tokens, projects, and API keys into filtered audit context when audit events already exist.
    - [ ] Diagnostics boundary
          Keep diagnostics contextual and read-focused: no standalone diagnostics page, project impersonation, private project editing, API key secrets, local-only browser projects, raw project JSON, or account takeover/session controls in the first slice.
  - [ ] API usage dashboard
        Show API key activity, last-used timestamps, rate-limit hits, endpoint error patterns, and overlay readiness/API usage signals for account projects.

## Later Product Follow-up

- [ ] Race-day communication and briefing (`No account required`)
      The first Race Pack release is shipped, and the immediate QR/timing-marker slice is archived with v1.6.0. The remaining work here is larger race-day operations follow-up.
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

- [ ] Desktop and mobile wrapper evaluation (`Research`)
      Evaluate whether Electron or Capacitor would materially improve local project handling, native file workflows, or offline resilience.
  - [ ] Product-problem validation
        Identify which user pain points would justify a wrapper over improving the web app.
  - [ ] Technical architecture evaluation
        Decide whether a wrapper should load the hosted app or require its own runtime.
  - [ ] Platform recommendation
        Recommend web-first, Electron, Capacitor, or no wrapper for now.

## v1.7.1 Archive

<details>
<summary>Completed release work archived with v1.7.1</summary>

- [x] Account project lifecycle polish (`Account-backed`)
      Keep signed-in project continuity trustworthy while preserving local-first editing.
  - [x] Stale save conflict protection
        Detect when another device has changed the account copy and route the user into version review instead of silently overwriting newer account work.
  - [x] Failed sync retry paths
        Let users retry failed account sync directly from the editor status indicator and autosync failure toast.
  - [x] Last-known-good local fallback
        Save the latest local copy when account sync fails and show that fallback state in project management.
  - [x] Account and device project clarity
        Clarify account copies, local copies, and device-only projects in Project Manager without turning them into separate product concepts.

- [x] Usability and reliability pass (`No account required`, `Account-backed`)
      Finite release-hardening pass for the next release candidate. Keep the completed work below as a record, but use the remaining checklist as the stop condition; do not add after-the-fact checked items to keep this pass alive.
  - [x] Desktop editor smoke
        Manual browser smoke gate. Verify create/edit/select/transform, route waypoint editing, snapping, rotation, resize handles, duplicate/delete, lock behavior, undo/redo, autosave reload, and Project Manager actions from `/studio`.
  - [x] Mobile editor smoke
        Manual browser smoke gate. Verify the mobile app menu, Project Manager, inspector drawers, path builder, multi-select overlay, map reference controls, and import/export actions at phone-width and tablet-width layouts.
  - [x] Recovery and failure-flow drill
        Exercised invalid import files, unreadable/non-TrackDraw JSON, local storage failure, failed JSON export, share publish failure, and account sync failure through targeted regression tests. Fix only cases where the user cannot understand what happened or recover safely.
  - [x] Export and share handoff drill
        Covered JSON, SVG, PNG, PDF, and Velocidrone `.trk` export paths, JSON re-import, share publishing, managed share limitation copy, and `/share/[token]` read-only handoff behavior through targeted regression tests.
  - [x] Selection and transform edge-case drill
        Tested locked objects, mixed locked/unlocked selections, grouped selections, route waypoint mutations, keyboard shortcuts, context menus, mobile overlay actions, and undo/redo after mutation paths through targeted store and component coverage.
  - [x] Large-layout stability drill
        Stressed dense practical layouts with many obstacles, a long route, map reference, 3D preview component rendering, obstacle numbering, and PDF/SVG/PNG export through targeted regression tests.
  - [x] Release triage cutoff
        Automated hardening found no remaining release-blocking issues to keep in this pass. The only open items are the explicit manual desktop and mobile browser smoke gates.
  - [x] Final release validation
        `npm run lint`, `npm run type`, `npm run test`, and `npm run build` pass after the fixes from this pass.
  - [x] Automated validation baseline
        `npm run lint`, `npm run type`, `npm run test`, and `npm run build` pass before the remaining release checklist starts.
  - [x] Editor recovery and failure states
        Must-fix scope: make the common autosave, import, export, and share/account-sync failures visible and recoverable enough for release. Defer rare runtime edge cases unless they risk data loss.
    - [x] Local autosave failure state
          Surface local persistence failures with a retry path instead of silently ignoring storage/quota errors.
    - [x] Import failure clarity
          Differentiate invalid JSON, wrong file type, unreadable files, and non-TrackDraw project data with visible recovery guidance.
    - [x] Project JSON export feedback
          Reuse one JSON download path and report Project Manager export failures instead of silently doing nothing when local project data cannot be loaded.
  - [x] Mobile editor ergonomics pass
        Must-fix scope: touch targets and flows that block venue-side editing on small screens. Defer broader responsive redesign.
    - [x] Mobile app menu touch targets
          Make project, share, import, export, account, dashboard, and sign-out actions easier to hit and scan in the mobile app menu.
    - [x] Mobile editing overlay touch targets
          Give path builder, quick adjust, and multi-select overlay actions steadier tap targets for venue-side editing on small screens.
    - [x] Mobile map reference controls
          Make map reference actions and opacity adjustment easier to use from the mobile layout inspector.
    - [x] Mobile inspector section targets
          Make collapsible inspector sections easier to open and close on touch screens while preserving compact desktop density.
    - [x] Mobile Project Manager action targets
          Make local-project action menus easier to open and scan from the mobile Project Manager.
  - [x] Selection and transform reliability pass
        Must-fix scope: regressions that can mutate locked objects, lose selection intent, break route editing, or leave undo/redo inconsistent. Defer speculative transform polish unless a real bug is found during smoke testing.
    - [x] Locked shape mutation guards
          Block store-level patch, batch patch, and route waypoint mutations for locked shapes so resize, inspector, and route-edit calls cannot bypass lock state.
    - [x] Locked destructive action guards
          Keep duplicate and delete actions from mutating selections that include locked shapes, including keyboard shortcuts, context menus, mobile overlays, and clear shortcut feedback.
  - [x] Export/share confidence pass
        Must-fix scope: users should understand which outputs are editable backups, visual handoffs, read-only review links, or experimental simulator exports. Defer new export formats or share-management features.
    - [x] Export output purpose copy
          Clarify read-only visual outputs, editable JSON backups, PDF handoff intent, and experimental simulator limitations in export and share flows.
    - [x] Managed share limitation copy
          Clarify in Project Manager that managed shares are read-only review links and JSON export is the editable handoff path.
  - [x] Performance and large-layout stability
        Must-fix scope: prevent obvious hangs, runaway export output, or numbering/export instability on large practical layouts. Defer deep profiling unless release smoke testing exposes a blocking slowdown.
    - [x] Bounded dense-grid export rendering
          Clamp very fine export grid spacing so SVG/PDF/PNG exports from large or dense layouts do not generate excessive grid markup.
    - [x] Long-route obstacle numbering coverage
          Precompute route segments and bound per-obstacle scans so numbering stays stable on long routes with many gates.

</details>

## v1.7.0 Archive

<details>
<summary>Completed release work archived with v1.7.0</summary>

- [x] UI/UX polish and reliability pass (`No account required`)
      Fine-tuned editor, mobile, share, export, and account/project flows. Includes Project Manager and Account dialog states, locked inspector feedback, mobile multi-select and path-builder polish, export/share confidence copy, and focus/accessibility improvements.

- [x] Stability and usability pass (`No account required`)
      Improved reliability across editor, share, export, mobile, and account-backed project flows. Includes regression coverage for selection, route editing, export smoke tests, mobile workflow cleanup, and account/project/share state clarity.

- [x] TrackDraw REST API (`Account-backed`)
      Versioned read-only REST API for external tools with expiring API keys, rate limiting, and OpenAPI docs.
  - [x] API key management: create, list, and revoke expiring keys with scoped permissions
  - [x] Authenticated endpoints: `/api/v1/me`, `/api/v1/projects`, `/api/v1/projects/[projectId]`, `/api/v1/projects/[projectId]/track`
  - [x] RotorHazard overlay endpoint: `/api/v1/projects/[projectId]/overlay` with route, obstacles, timing markers, split indices, readiness status, and optional lap duration estimate
  - [x] OpenAPI docs at `/api/v1/openapi.json` and `/api/docs`

- [x] Live race overlay preparation (`Account-backed`)
      TrackDraw projects are now ready for use with [rh-stream-overlays](https://github.com/dutchdronesquad/rh-stream-overlays). Includes overlay readiness validation, split index support, and optional route duration estimate in the overlay package.

- [x] Base UI to Radix UI migration
      Replaced `@base-ui/react` with Radix UI primitives across all UI components to fix mobile touch handling inside dialogs.

</details>

## v1.6.0 Archive

<details>
<summary>Completed release work archived with v1.6.0</summary>

- [x] Race-day handoff next slice (`No account required`)
      Built on the shipped Race Pack, published shares, and editor numbering work with small release-sized improvements that make briefing and setup easier without turning TrackDraw into a race-control product.
  - [x] Shared view QR code in Race Pack
        Embedded a QR code linking to the canonical published shared view in the Race Pack PDF, so pilots and crew can scan directly from a printed or on-screen briefing.
  - [x] Timing gate markers
        Let specific gates be marked as start/finish or split timing points so race directors can identify timing hardware placement clearly in the editor, Race Pack, and future overlay preparation.

- [x] Admin dashboard operations follow-up (`Account-backed`)
      Improved operator visibility for shipped account, share, and gallery surfaces without adding public reporting flows.
  - [x] Dashboard table facet filters
        Added a consistent search-and-facet toolbar across gallery, users, and audit tables, including gallery state/share lifecycle, user role, and audit category/action filters.
  - [x] Share lifecycle visibility
        Gave operators a clearer view of active, expired, revoked, and gallery-linked shares for support and debugging.
  - [x] Audit log usability
        Added filters, clearer entity labels, and detail views that make account, role, share, and gallery actions easier to inspect.

</details>
