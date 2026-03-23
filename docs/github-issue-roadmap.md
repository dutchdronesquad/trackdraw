# Roadmap: Future Features for TrackDraw

This issue tracks the current roadmap for TrackDraw as of March 20, 2026.

TrackDraw has moved well beyond the initial editor foundation. The near-term focus should now be faster layout creation, better project workflow and recovery, stronger sharing and handoff, lightweight path review, and more deliberate race-day outputs.

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

- [x] Mobile venue editing first pass
      Added faster single-selection venue-side actions, compact mobile adjust controls, and undo/redo access in the mobile tools flow.

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

- [ ] Layout acceleration
      Add reusable building blocks such as obstacle presets, starter layouts, selection grouping, and venue-aware field templates.

- [ ] Project workflow and recovery
      Add a stronger local-first project model with a project list, safer recovery paths, and restore points beyond one implicit autosave state.

- [ ] Share and publish workflow
      Move sharing toward intentional published states with clearer invalid-link handling, better separation from working state, and a cleaner long-term share model.

- [ ] Path and flow review
      Add lightweight warnings and route-review cues on top of the current path, elevation, and 3D tooling.

- [ ] Race-day communication and briefing
      Turn existing export, read-only, and fly-through capabilities into better pilot briefing, marshal pack, and numbered handoff workflows.

- [ ] Studio onboarding and starter flows
      Reduce blank-canvas friction with a better first-use path, contextual hints, and a few lightweight starter options.

## Priority 2

- [ ] Velocidrone export compatibility research
      Investigate whether TrackDraw layouts can be exported into Velocidrone's track-builder workflow. This likely starts as reverse-engineering and format discovery work because there is no public API or official documentation to build against.

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
  - [ ] Rework file structure and split oversized files
        Introduce more focused subdirectories and break up broad components/modules so ownership and navigation stay manageable as the editor grows.

## Priority 3

- [ ] Stable share links and share storage
      Move from payload-in-URL sharing toward durable short links backed by stored share state once the publish model is clearer.

- [ ] Obstacle inventory and setup estimate
      Summarize obstacle counts, key sections, and rough setup complexity so a finished layout translates more directly into race-day preparation.

- [ ] Venue library and constraints
      Support reusable venue records with field dimensions, recurring boundaries, fixed no-go zones, and known setup constraints.

- [ ] Revision compare
      Compare two layout states and show what changed between versions, snapshots, or variants.

- [ ] Marshal mode
      Create a race-day view focused on marshal readability, sectors, references, and obstacle clarity rather than editing.

- [ ] Build mode / setup sequence
      Turn a finished layout into a structured setup order so crews can build the course in a clearer sequence.

- [ ] Map and field overlay
      Support venue plans, field maps, or imagery as reference layers behind the editor canvas.

- [ ] Lap simulator
      Estimate route timing and flow once the lighter analysis layers have proven valuable.

- [ ] Real-time collaboration
      Allow multiple users to work on the same design concurrently.
