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

The completed release-sized work is archived below. The next TrackDraw priority is race-day workflow depth, editor reliability follow-up, focused 3D item controls, generated flightpath assistance, multilingual-readiness for international users, and account-backed project lifecycle depth beyond the shipped conflict/retry baseline.

## Follow-up

- [x] MultiGP obstacle catalog expansion (`No account required`)
      Extended the catalog with official MultiGP flags and ladders. Users can place and identify standard competition obstacles with the same catalog-backed identity, visual rendering, inspector treatment, and in-place type switching already in place for gates.
  - [x] MultiGP flag and marker entries
        Added the MultiGP Corner Flag (10 ft feather flag) with realistic 3D rendering, catalog identity, inspector type switching, and an official source link.
  - [x] MultiGP ladder and other obstacle entries
        Added MultiGP Standard Ladder 5x5 and Championship Ladder 7x6 with panel-frame 3D rendering matching the real obstacle, and the same catalog pipeline as gates and flags.

- [x] Flag real-time rotation in 3D (`No account required`)
      Flags now rotate visually in real-time during 3D drag, matching gates and ladders. The fix was passing `outerRef` from `Shape3D` through `Flag3D` and `CornerMarkerFlag3D` to their root groups, so the rotation drag handler can mutate the group transform directly each animation frame.

- [ ] Track items list improvements (`No account required`)
      The layout track items list currently uses internal shape kind labels. Two improvements: use the placed element's catalog name or custom name so the list is more meaningful, and add a drag handle per item so users can reorder track elements directly in the list.
  - [ ] Catalog-aware item names
        Show the catalog entry name (e.g. "MultiGP Standard Gate 5x5") or the user-assigned name instead of the generic kind label in the track items list.
  - [ ] Drag-to-reorder items
        Add a drag handle to each row in the track items list so users can change the draw/render order of elements without deleting and re-placing them.

- [ ] Focused 3D item controls (`No account required`)
      Add direct 3D controls for common obstacle edits where they are faster than inspector-only editing and still respect lock state, undo/redo, and mobile constraints.
  - [ ] 3D transform handles
        Prototype selected-item controls for elevation, rotation, scale, and orientation only where the behavior is predictable across 2D and 3D.

- [ ] Generated flightpath assistance (`Research`, `No account required`)
      Research generated flightpaths from placed elements as an optional drafting/review aid that users can accept and edit.
  - [ ] Generated flightpath research
        Prototype flightpath generation from placed elements as an assistive review/drafting feature that can be accepted or edited, not as a replacement for explicit race-line authoring.

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

- [ ] Desktop and mobile wrapper evaluation (`Research`)
      Evaluate whether Electron or Capacitor would materially improve local project handling, native file workflows, or offline resilience.
  - [ ] Product-problem validation
        Identify which user pain points would justify a wrapper over improving the web app.
  - [ ] Technical architecture evaluation
        Decide whether a wrapper should load the hosted app or require its own runtime.
  - [ ] Platform recommendation
        Recommend web-first, Electron, Capacitor, or no wrapper for now.

## v1.8.0 Archive

<details>
<summary>Completed release work archived with v1.8.0</summary>

- [x] Track element catalog (`Research`, `No account required`)
      Built a catalog-backed element model for official gates with typed entries for names, dimensions, source references, 2D/3D rendering, and export compatibility. Includes placement selection, inspector identity display, in-place type switching, and catalog-driven visual rendering across 2D, 3D, and export paths.
  - [x] Local element catalog foundation
        Define typed catalog entries for official names, dimensions, source references, 2D defaults, 3D render hints, and export compatibility while keeping saved project geometry meter-based.
  - [x] Official gate and obstacle entries
        Covered by the placement selector, catalog identity in inspector, and in-place type switching sub-items. MultiGP-style gates are accessible through deliberate placement and inspector UI, custom sizing remains on the standard TrackDraw Gate, and no existing projects were migrated.
  - [x] MultiGP gate placement selector
        Keep Gate as the primary placement tool while letting users switch the active gate type between the generic TrackDraw gate and catalog-backed MultiGP-style 5x5 and 7x6 variants through compact desktop and mobile type pickers.
  - [x] Catalog identity in inspector
        Show placed catalog-backed elements with their official type, source, official size, and dimension status while keeping official gate width and height fixed in normal editing.
  - [x] In-place catalog type switching (`No account required`)
        Let users change the catalog type of an already-placed gate directly from the inspector without needing to delete and re-place. The type picker uses the shadcn Select and shows for all placed gates, including frame-only TrackDraw gates. Switching resets to the target entry's defaults while preserving position, rotation, and route connections, and preserves non-catalog meta such as timing markers. The source organization links to the entry's first source URL. getCatalogEntriesByKind replaces the gate-specific helper to support future element types.

- [x] 3D preview realism and lighting (`Research`, `No account required`)
      Improved the 3D preview's readability and realism with stronger contrast, sun/directional lighting, shadows, and more recognizable gates/flags while keeping mobile performance safe. Catalog metadata drives official variant rendering, including a realistic MultiGP Standard Gate 5x5.
  - [x] 3D readability and realism pass
        Tuned directional lighting with a warm sun tint, lowered ambient intensity for stronger shadow contrast, raised shadow map resolution to 2048, set shadow camera frustum to track bounds to eliminate shadow coverage gaps on large tracks, added shadow-bias to prevent acne, and removed polyline shadow casting to reduce visual noise. Unified the lighting theme across editor, share, and gallery into a single shared constant.
  - [x] Catalog-aware 3D element rendering
        Use catalog-owned visual metadata to render catalog-backed MultiGP-style 5x5 and 7x6 gates with recognizable panel sizes, PVC frame placement, colors, and branding treatment across 2D canvas/SVG output, the live preview, and flythrough export while keeping generic gates lightweight.

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

</details>
