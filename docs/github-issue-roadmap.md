# Roadmap: Future Features for TrackDraw

This issue tracks the current roadmap for TrackDraw as of March 20, 2026.

TrackDraw has moved well beyond the initial editor foundation. The near-term focus should now be faster layout creation, better iteration inside a single project, lightweight design validation, and stronger race-day outputs.

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

- [x] 2D drag and snap refinement
      Improved pointer-following drag behavior and made snap feedback more readable.

- [x] Shared view and read-only polish
      Improved the share dialog, read-only entry experience, and the return path into Studio.

- [x] Path authoring first pass
      Strengthened polyline editing, resume/close flows, inspector support, and the connection between route planning, elevation, and 3D preview.

- [x] Export and project portability
      Support now includes PNG, SVG, PDF, 3D render capture, and JSON project export/import.

## Release Cleanup

- [ ] Share route deprecation before v1
      Keep `/share/[token]` as the canonical read-only route for v1, remove legacy `/share?d=...` support before release, and update docs and product copy to match.

## Priority 1

- [ ] Obstacle presets
      Add a curated preset library for reusable obstacle groupings such as gate runs, slaloms, start/finish setups, and compact training layouts.

- [ ] Snapshots and layout variants
      Let users save named snapshots and compare multiple layout options inside a single project instead of splitting work across separate files.

- [ ] Project manager and local project management
      Add a local-first project manager so users can keep, reopen, rename, duplicate, and delete multiple TrackDraw projects over time. The model should stay compatible with a possible future cross-device sync direction, without requiring accounts in v1.

- [ ] Share snapshots
      Allow a specific named snapshot or variant to be shared through a stable read-only link, separate from the current working state.

- [ ] Lightweight course validation
      Warn about issues such as tight turns, suspicious spacing, incomplete routes, or abrupt elevation changes without turning the app into a heavy rules engine.

- [ ] Studio onboarding and starter flows
      Reduce blank-canvas friction with a better first-use path, contextual hints, and a few lightweight starter options.

- [ ] Canvas display controls
      Unify rulers, helper overlays, labels, and 3D gizmo toggles into a coherent display-control system.

- [ ] Selection grouping
      Let users turn a multi-selection into a movable and duplicable logical group without introducing a heavy compound-object system.

- [ ] Touch-friendly transform and path handles
      Improve precision and affordances for touch editing of small obstacles and polyline points.

## Priority 2

- [ ] Printable marshal pack
      Generate race-day documents with obstacle counts, dimensions, sectors, setup notes, and a practical build sheet for crews.

- [ ] Obstacle numbering
      Support automatic and manual numbering for gates, sectors, or other key references so setup, briefings, and marshal coordination become clearer.

- [ ] Pilot briefing mode
      Create a presentation-friendly track view for pilot meetings, larger screens, and cleaner briefings.

- [ ] Velocidrone export compatibility research
      Investigate whether TrackDraw layouts can be exported into Velocidrone's track-builder workflow. This likely starts as reverse-engineering and format discovery work because there is no public API or official documentation to build against.

- [ ] Field templates and venue constraints
      Support reusable venue setups with field dimensions, no-go areas, and recurring setup structure.

- [ ] Comments and review mode
      Anchor feedback to specific obstacles or route sections without requiring live collaboration first.

- [ ] Heatmap and flow analysis
      Add lightweight visual feedback for rhythm, density, and bottlenecks once validation basics are in place.

- [ ] Adaptive mobile UI
      Let portrait and landscape diverge where that clearly improves editing and navigation.

- [ ] Codebase architecture and performance refactor
      Continue improving maintainability, state-flow clarity, and runtime efficiency as the editor grows, without turning the effort into a rewrite.
      - [x] Lightweight performance instrumentation
            Add internal render and autosave instrumentation so editor hotspots can be observed during development without introducing heavyweight profiling infrastructure.
      - [x] Targeted editor and canvas modularisation
            Split large interaction and rendering responsibilities into more focused hooks and modules around the editor shell, track canvas, selectors, and performance utilities.
      - [ ] Complete targeted maintainability and state-flow refactor pass
            Continue refining internal boundaries, large rendering surfaces, persistence flow, and editor state structure.

## Priority 3

- [ ] Map and field overlay
      Support venue plans, field maps, or imagery as reference layers behind the editor canvas.

- [ ] Lap simulator
      Estimate route timing and flow once the lighter analysis layers have proven valuable.

- [ ] Real-time collaboration
      Allow multiple users to work on the same design concurrently.
