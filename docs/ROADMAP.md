# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw as of March 20, 2026. The product has moved beyond "basic editor prototype" territory. The core design loop is now credible across desktop, shared read-only viewing, and practical mobile use. The next phase should focus less on generic polish and more on workflow acceleration, design confidence, and race-day usefulness.

## Current Assessment

TrackDraw is now strong in these areas:

- Core 2D editing with real-scale placement, snapping, transforms, and undo/redo
- Track path authoring with elevation-aware planning and a live 3D preview
- Share-first collaboration through read-only links
- Practical mobile editing for quick venue-side changes
- Portable outputs through PNG, SVG, PDF, 3D render capture, and JSON project files

The biggest remaining gaps are:

- Faster layout creation from reusable building blocks
- Better support for iteration and comparison inside one project
- Lightweight design feedback before a layout reaches the field
- More deliberate outputs for race-day communication
- A cleaner first-use path for new users

## Product Principles

- TrackDraw remains a design tool first
- Solo workflow speed and clarity come before multi-user collaboration
- Analysis should stay lightweight, visual, and design-oriented before becoming simulation-heavy
- Mobile should be practical and deliberate, not a compromised desktop clone
- Race-day deliverables should extend the editor, not become a separate product surface

## Recently Completed

### Core Editor Baseline

TrackDraw now has a much stronger editing baseline than earlier roadmap versions assumed.

Included:

- Refined 2D drag behavior with more readable snap feedback
- Better desktop and mobile interaction consistency
- Multi-select support on mobile with quick actions
- Inspector cleanup and broader property editing polish
- Better status and version visibility inside the app shell

Why it matters:

- The editor now feels materially more dependable during real layout work
- The roadmap can shift away from foundation work toward workflow acceleration

### Path Authoring And Route Preview

Path editing has moved from a rough capability into a meaningful planning tool.

Included:

- Stronger polyline editing and selection behavior
- Resume and close-path flows for route authoring
- Better path-related inspector support
- Smoother 3D route rendering and adaptive curve handling
- Improved elevation chart and inspector integration

Why it matters:

- Route planning is now valuable enough to build analysis and briefing features on top of it
- "Path authoring UX" is no longer a vague future item; the first serious pass is already shipped

### Shared View, Export, And Persistence

The product now has a more complete handoff story from planning to sharing.

Included:

- Cleaner read-only shared view and intro overlay
- Clearer "Open Studio" path from shared links back into editing
- Native and copy-link sharing improvements
- JSON project export/import for reusable backups
- Theme-aware PNG/SVG export, PDF export, and 3D render capture
- Ongoing local persistence for in-browser work

Why it matters:

- TrackDraw now supports both quick sharing and reliable project reuse
- The next roadmap step should be better project structure, not basic file survival

## Release Cleanup

### Share Route Deprecation Before v1

Keep `/share/[token]` as the current canonical read-only route for now, but remove legacy `/share?d=...` query-param support before the v1 release.

Included:

- Keep `/share/[token]` as the supported read-only route for v1
- Remove legacy `/share?d=...` support before release
- Update docs and product copy so query-based shared links are no longer referenced

Why it matters:

- The product should ship v1 with one clear share-link format
- Removing the query-param variant reduces migration debt before release
- Product copy and technical behavior should describe the same share model

## Near-Term Priorities

### 1. Obstacle Presets

Add a curated preset library for reusable obstacle groupings and common race-building patterns.

Why now:

- The editor is strong enough that speed of composition is the next obvious bottleneck
- Presets create immediate value without introducing heavy new systems

Good first slice:

- Start/finish setups
- Straight gate runs
- Slalom blocks
- Ladder and dive combinations
- Small training layouts

### 2. Snapshots And Layout Variants

Combine named snapshots and multi-layout variants into one coherent project iteration model.

Why now:

- Users have more reasons to iterate now that the editor is mature
- Separate exports are a poor substitute for structured comparison
- This is the natural foundation for later project-manager and cross-device workflows

Good first slice:

- Save named snapshots inside one project
- Duplicate the current layout into a variant
- Switch between variants without opening separate files
- Mark one variant as the active share/export target

Strong extension after the first slice:

- Share a specific snapshot or variant through a stable read-only link
- Keep a clear distinction between the current working state and intentionally shared states

### 3. Project Manager And Local Project Management

Introduce a local-first project manager so users can keep, reopen, duplicate, and remove multiple TrackDraw projects over time instead of working from one implicit editor state.

Why now:

- A richer project model becomes much more useful once variants and snapshots exist
- Real use already points toward seasonal or event-based project collections
- This creates a cleaner path toward future cross-device support without requiring accounts yet

Good first slice:

- Local project list with title and last-updated state
- Create, open, rename, duplicate, and delete project flows
- Clear separation between the current project and the broader projects overview
- Stable project ids and metadata suitable for future sync-compatible architecture

Future note:

- Keep the first release explicitly local-first
- Design the model so future cross-device sync is possible without reworking the project structure from scratch

### 4. Lightweight Course Validation

Introduce helpful warnings for track design issues without turning the product into a rules engine.

Why now:

- Path authoring and 3D preview are now good enough to support design feedback
- This adds confidence for less experienced builders and speeds review for experienced ones

Good first slice:

- Tight-turn warnings
- Suspicious obstacle spacing
- Track path gaps or unfinished route states
- Large elevation jumps between nearby points

### 5. Studio Onboarding And Starter Flows

Reduce blank-canvas friction for first-time users.

Why now:

- The product surface has grown enough that a cold start is more intimidating
- Better onboarding should improve activation without adding heavy product chrome

Good first slice:

- A guided empty-state prompt
- One or two starter layouts or starter field presets
- Contextual hints around path drawing, 3D preview, and sharing

### 6. Canvas Display Controls

Turn the current scattered view toggles into a coherent display-control system.

Why now:

- Mobile rulers and the 3D gizmo already prove the value
- As the editor grows, optional chrome needs clearer structure

Good first slice:

- Rulers
- Labels
- Helper overlays
- 3D gizmo
- Share/read-only-safe defaults

### 7. Selection Grouping

Allow users to turn a set of selected shapes into a movable, duplicable logical group without collapsing everything into a rigid compound object model.

Why now:

- The editor already supports multi-select, duplication, and bulk movement
- Grouping would remove a lot of repetitive section-level editing friction

Good first slice:

- Create and dissolve a selection group
- Move, duplicate, lock, and delete a group as one unit
- Keep child shapes editable when explicitly entering the group
- Keep the underlying shape model simple and reversible

### 8. Touch-Friendly Transform And Path Handles

Improve the precision and clarity of touch editing for small objects and path points.

Why now:

- Mobile editing is now viable, so the next gains come from reducing touch precision friction
- This is a better investment than broad new mobile chrome changes right now

## Mid-Term Priorities

### 9. Printable Marshal Pack

Generate setup-friendly race-day documents with obstacle counts, dimensions, sectors, notes, and a practical build sheet for setup crews.

Good first slice:

- Obstacle inventory by type
- Field dimensions and key layout notes
- Numbered setup references for major obstacles or sectors
- A print-friendly summary that crews can use without opening the editor

### 10. Obstacle Numbering

Support automatic and manual numbering for key obstacles such as gates, sectors, or route references.

Why:

- Makes setup communication much clearer
- Improves pilot briefing and marshal coordination
- Pairs naturally with build sheets, annotations, and briefing exports

### 11. Pilot Briefing Mode

Create a presentation-friendly viewing mode for pilot meetings, screens, and fly-throughs.

### 12. Velocidrone Export Compatibility

Explore whether TrackDraw layouts can be exported into a format that is usable inside Velocidrone's track builder workflow.

Why:

- Creates a bridge from planning into simulator testing
- Makes TrackDraw more useful beyond static design and briefing
- Could become a strong differentiator if the export is reliable enough

Constraints:

- There is no public API or official export documentation to build against
- This may require reverse engineering of Velocidrone track data or import behavior
- Legal, maintenance, and breakage risk must be considered before promising user-facing support

Recommended approach:

- Treat this as a research and compatibility project first
- Start with format discovery and proof-of-concept export
- Only promote it to a supported feature if the workflow is stable enough to maintain

### 13. Field Templates And Venue Constraints

Support reusable field setups with dimensions, no-go areas, and recurring venue structure.

### 14. Comments And Review Mode

Allow feedback to be anchored to obstacles or route sections without requiring live collaboration.

### 15. Heatmap And Flow Analysis

Add lightweight visual feedback for rhythm, density, and bottlenecks after validation basics are in place.

### 16. Adaptive Mobile UI

Let portrait and landscape diverge where that clearly improves usability.

### 17. Codebase Architecture And Performance Refactor

This area now has meaningful groundwork, but it should stay on the roadmap as an ongoing internal quality track rather than being treated as fully complete.

Sub-items:

- [x] Lightweight performance instrumentation
      Add render and autosave instrumentation for development-time performance visibility.
- [x] Editor and canvas modularisation
      Split key interaction and rendering responsibilities across more focused hooks, selectors, and utility modules.
- [ ] Remaining maintainability and state-flow refactor pass
      Further reduce complexity in large rendering surfaces, persistence flow, and state-heavy editor paths.

Why:

- The editor is gaining more product structure, which increases pressure on state and component architecture
- Better internal boundaries can reduce feature risk and make future work faster
- Performance and code clarity should be improved deliberately instead of through scattered one-off changes

## Long-Term Priorities

### 18. Map And Field Overlay

Support background references such as venue plans, field maps, or imagery.

### 19. Lap Simulator

Estimate route timing and flow once lighter analysis tools have proven useful.

### 20. Real-Time Collaboration

Allow multiple users to work on the same design concurrently.

## Recommended Sequence

If the goal is to deliver the highest product value over the next cycle, the best order is:

1. Obstacle presets
2. Snapshots and layout variants
3. Project manager and local project management
4. Lightweight course validation
5. Studio onboarding and starter flows
6. Canvas display controls
7. Selection grouping

This sequence builds directly on the current strengths of the editor and improves the practical path from "draw a layout" to "use it on race day."

## Supporting Design Docs

- [Obstacle Presets PVA](./obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](./snapshots-layout-variants-design.md)
