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

The completed release-sized work is archived below. The REST API, live race overlay preparation, account project lifecycle polish, UI/UX polish, and stability pass are now complete. The next TrackDraw priority is race-day workflow depth, editor reliability follow-up, catalog-backed official track elements, 3D preview improvements, generated flightpath assistance, regional measurement support and multilingual-readiness for international users, and account-backed project lifecycle depth beyond the shipped conflict/retry baseline.

## Follow-up

- [ ] Track element catalog (`Research`, `No account required`)
      Build a catalog-backed element model for official gates, richer placement defaults, and future equipment/library expansion before changing default race-gate sizing. This track owns element identity, source metadata, dimensions, and placement selection, not high-fidelity 3D rendering.
  - [x] Local element catalog foundation
        Define typed catalog entries for official names, dimensions, source references, 2D defaults, 3D render hints, and export compatibility while keeping saved project geometry meter-based.
  - [ ] Official gate and obstacle entries
        Expose entries such as the cataloged MultiGP-style standard gate through deliberate placement/library UI, with custom sizing kept on the standard TrackDraw Gate and no automatic migration of existing projects.
  - [x] MultiGP gate placement selector
        Keep Gate as the primary placement tool while letting users switch the active gate type between the generic TrackDraw gate and catalog-backed MultiGP-style 5x5 and 7x6 variants through compact desktop and mobile type pickers.
  - [x] Catalog identity in inspector
        Show placed catalog-backed elements with their official type, source, official size, and dimension status while keeping official gate width and height fixed in normal editing.

- [ ] 3D preview realism and lighting (`Research`, `No account required`)
      Improve the 3D preview's readability and realism with stronger contrast, sun/directional lighting, shadows, and more recognizable gates/flags while keeping mobile performance safe. Use catalog metadata to render official variants differently where helpful, such as a more realistic MultiGP Standard Gate 5x5.
  - [ ] 3D readability and realism pass
        Evaluate sun/directional lighting, stronger contrast, more realistic gates/flags, and shadow treatment without making the scene visually noisy.
  - [ ] Catalog-aware 3D element rendering
        Use `meta.catalog` and catalog render hints to choose more realistic 3D treatments for official elements, starting with the MultiGP Standard Gate 5x5, while keeping generic gates lightweight.

- [ ] Focused 3D item controls (`No account required`)
      Add direct 3D controls for common obstacle edits where they are faster than inspector-only editing and still respect lock state, undo/redo, and mobile constraints.
  - [ ] 3D transform handles
        Prototype selected-item controls for elevation, rotation, scale, and orientation only where the behavior is predictable across 2D and 3D.

- [ ] Generated flightpath assistance (`Research`, `No account required`)
      Research generated flightpaths from placed elements as an optional drafting/review aid that users can accept and edit.
  - [ ] Generated flightpath research
        Prototype flightpath generation from placed elements as an assistive review/drafting feature that can be accepted or edited, not as a replacement for explicit race-line authoring.

- [x] Collapsible inspector workspace (`No account required`)
      Let desktop/tablet users collapse the inspector sidebar to reclaim canvas space during dense editing while preserving selection context.
  - [x] Collapsible inspector workspace
        Add the collapse control to the inspector header, keep a reopen control in the collapsed rail, persist desktop workspace density locally, and verify it does not regress mobile drawer behavior.

- [x] Regional measurement units (`No account required`)
      Support regional Metric and Imperial display/input presets without changing the internal meter-based design model.
  - [x] Unit preference model
        Add a project-safe and user-friendly Metric/Imperial preference, with a Metric default that fits most international users and does not break existing projects.
  - [x] Locale-informed defaults
        Use browser locale signals to choose an initial measurement default when no explicit preference exists, while keeping the detected value transparent and manually overrideable.
  - [x] Editor display formatting
        Replace direct `m` labels in field size, rulers, inspectors, route/elevation summaries, gallery metadata, and export previews with shared unit formatting.
  - [x] Unit-aware numeric input
        Let users enter common Metric and Imperial values such as meters, feet, and inches while storing normalized meter values in the design.
  - [x] Export and share presentation
        Show the selected measurement preset in PDF/Race Pack/share-facing summaries while keeping JSON/API geometry and speed values compatible and meter-based/SI.

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

## Later Product Follow-up

- [ ] Velocidrone experimental export stabilization (`Lower priority`, `No account required`)
      Keep this parked until there is appetite to validate more real layouts and tighten prefab mapping/orientation edge cases.

- [ ] Share version history (`Lower priority`, `Account-backed`)
      Let owners update published shares with clear version history, current-version state, and rollback options once share lifecycle work becomes a priority again.

- [ ] Gallery featured collections (`Lower priority`, `Account-backed`)
      Let admins curate small gallery collections such as indoor practice, beginner friendly, technical layouts, and race-day examples when gallery growth warrants it.

- [ ] Dashboard operator tooling (`Lower priority`, `Account-backed`)
      Improve dashboard visibility for public gallery tracks, published shares, contextual diagnostics, and API usage after higher-priority editor and catalog work settles.

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
