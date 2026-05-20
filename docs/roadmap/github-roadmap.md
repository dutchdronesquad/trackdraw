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

The v1.7.0 release-sized work is archived below. The REST API, live race overlay preparation, UI/UX polish, and stability pass are now complete. The next TrackDraw priority is race-day workflow depth, editor reliability, and account-backed project lifecycle follow-up.

## Follow-up

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

- [ ] Usability and reliability pass (`No account required`, `Account-backed`)
      Harden shipped editor, mobile, export, share, and recovery workflows before starting another large product surface.
  - [ ] Editor recovery and failure states
        Improve autosave, import, export, share, account-sync, and runtime failure states so users know what happened and what to do next.
    - [x] Local autosave failure state
          Surface local persistence failures with a retry path instead of silently ignoring storage/quota errors.
    - [x] Import failure clarity
          Differentiate invalid JSON, wrong file type, unreadable files, and non-TrackDraw project data with visible recovery guidance.
    - [x] Project JSON export feedback
          Reuse one JSON download path and report Project Manager export failures instead of silently doing nothing when local project data cannot be loaded.
  - [ ] Mobile editor ergonomics pass
        Review Project Manager, inspector drawers, path builder, multi-select, map reference controls, and app/menu actions for venue-side use.
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
  - [ ] Selection and transform reliability pass
        Add targeted fixes and regression coverage for locked objects, grouped selections, route waypoint editing, snapping, rotation, resize handles, and undo/redo.
    - [x] Locked shape mutation guards
          Block store-level patch, batch patch, and route waypoint mutations for locked shapes so resize, inspector, and route-edit calls cannot bypass lock state.
    - [x] Locked destructive action guards
          Keep duplicate and delete actions from mutating selections that include locked shapes, including keyboard shortcuts, context menus, mobile overlays, and clear shortcut feedback.
  - [ ] Export/share confidence pass
        Clarify what each export/share output includes, what is intentionally excluded, and which limitations matter for race-day handoff.
    - [x] Export output purpose copy
          Clarify read-only visual outputs, editable JSON backups, PDF handoff intent, and experimental simulator limitations in export and share flows.
    - [x] Managed share limitation copy
          Clarify in Project Manager that managed shares are read-only review links and JSON export is the editable handoff path.
  - [ ] Performance and large-layout stability
        Stress-test larger layouts with dense obstacles, long routes, map references, 3D preview, and PDF/export, then apply targeted performance fixes.
    - [x] Bounded dense-grid export rendering
          Clamp very fine export grid spacing so SVG/PDF/PNG exports from large or dense layouts do not generate excessive grid markup.
    - [x] Long-route obstacle numbering coverage
          Precompute route segments and bound per-obstacle scans so numbering stays stable on long routes with many gates.

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
