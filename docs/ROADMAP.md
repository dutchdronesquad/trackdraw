# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw as of March 20, 2026. The product has moved beyond "basic editor prototype" territory. The core design loop is now credible across desktop, shared read-only viewing, practical mobile use, and race-day handoff. The next phase should focus less on generic polish and more on workflow acceleration, design confidence, handoff quality, and venue-side usefulness.

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
- Better project recovery and clearer local project structure
- Better design feedback before a layout reaches the field
- More deliberate outputs for race-day communication and presentation
- A cleaner first-use path for new users
- A more durable share and publish model than "current state in one URL"

## Product Principles

- TrackDraw remains a design tool first
- Solo workflow speed and clarity come before multi-user collaboration
- Analysis should stay lightweight, visual, and design-oriented before becoming simulation-heavy
- Mobile should be practical and deliberate, not a compromised desktop clone
- Race-day deliverables should extend the editor, not become a separate product surface
- Sharing should feel intentional and publishable, not like a side effect of editor state

## Recently Completed

### Core Editor Baseline

TrackDraw now has a much stronger editing baseline than earlier roadmap versions assumed.

Included:

- Refined 2D drag behavior with more readable snap feedback
- Better desktop and mobile interaction consistency
- Multi-select support on mobile with quick actions
- Better mobile venue-side quick actions including single-selection adjust controls and mobile undo/redo access
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

### 1. Layout Acceleration

Reduce repetitive setup work so users can compose good layouts faster.

Why now:

- The editor is strong enough that speed of composition is the next obvious bottleneck
- Faster composition improves nearly every real workflow in the product

Good first slice:

- Obstacle presets for reusable obstacle groupings and common race-building patterns
- Start/finish setups
- Straight gate runs
- Slalom blocks
- Ladder and dive combinations
- Small training layouts
- Selection grouping for repeated layout sections
- Venue-aware field templates and starter fields

### 2. Project Workflow And Recovery

Turn the current local-first foundation into a clearer, safer project workflow.

Why now:

- The editor already autosaves and supports import/export, but the user-facing project model is still thin
- More serious usage needs recovery, restore, and clearer project boundaries
- This should exist before more advanced publish or share-state features

Good first slice:

- Local project list with title and last-updated state
- Create, open, rename, duplicate, and delete project flows
- Restore points or local recovery entries beyond one implicit autosave state
- Clear separation between the current project and broader project history

Strong extension after the first slice:

- Save named snapshots inside one project
- Duplicate the current layout into a variant
- Switch between variants without opening separate files
- Mark one variant as the active share/export target
- Share a specific snapshot or variant through a stable read-only link
- Keep a clear distinction between the current working state and intentionally shared states

### 3. Share And Publish Workflow

Move sharing from "the current state in one link" toward a cleaner publish model.

Why now:

- Shared links are already core to the product story
- The current model is useful, but still tied too tightly to raw editor state
- A better publish model improves trust, previews, and long-term share reliability

Good first slice:

- Share a specific snapshot or variant through a stable read-only link
- Keep a clear distinction between working state and intentionally shared states
- Better invalid-share and fallback states
- Cleaner read-only/share metadata behavior across the product

Future note:

- Shorter stable share links likely require server-side share storage
- Link lifecycle controls such as regenerate, revoke, or expire become more relevant once shares are durable objects

### 4. Path And Flow Review

Build on the existing path, elevation, and 3D review tools with lightweight feedback layers.

Why now:

- Path authoring and 3D preview are now good enough to support design feedback
- The current path toolset is already strong enough that review quality is the next product layer

Good first slice:

- Tight-turn warnings
- Suspicious obstacle spacing
- Track path gaps or unfinished route states
- Large elevation jumps between nearby points
- Better route readability and review cues before heavier simulation-style analysis

### 5. Race-Day Communication And Briefing

Turn existing export and read-only capabilities into more deliberate communication outputs.

Why now:

- The product already has export breadth, a read-only view, and a fly-through
- What is missing is better packaging for pilots, marshals, and setup crews

Good first slice:

- Pilot briefing mode
- Obstacle numbering
- Printable marshal pack
- Export presets tuned for briefing, print, and mobile review

### 6. Studio Onboarding And Starter Flows

Reduce blank-canvas friction for first-time users.

Why now:

- The product surface has grown enough that a cold start is more intimidating
- Better onboarding should improve activation without adding heavy product chrome

Good first slice:

- A guided empty-state prompt
- One or two starter layouts or starter field presets
- Contextual hints around path drawing, 3D preview, and sharing

## Mid-Term Priorities

### 7. Comments And Review Mode

Allow feedback to be anchored to obstacles or route sections without requiring live collaboration.

### 8. Velocidrone Export Compatibility

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

### 9. Heatmap And Flow Analysis

Add lightweight visual feedback for rhythm, density, and bottlenecks after validation basics are in place.

### 10. Adaptive Mobile UI

Let portrait and landscape diverge where that clearly improves usability.

### 11. Codebase Architecture And Performance Refactor

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

### 12. Stable Share Links And Share Storage

Move from payload-in-URL sharing toward durable short links backed by stored share state.

Why:

- Shorter links are meaningfully better for copying, previewing, and publishing
- Durable share objects create a cleaner base for publish lifecycle features
- This should follow the earlier share-model cleanup, not precede it

## Product Opportunities

These ideas are not part of the immediate delivery sequence yet, but they fit the product direction especially well and are worth keeping visible.

### A. Obstacle Inventory And Setup Estimate

Automatically summarize what a layout requires in practical setup terms: obstacle counts, key sections, and a lightweight estimate of setup complexity.

Why it fits:

- Builds directly on existing export and handoff flows
- Translates design work into race-day preparation value
- Creates a natural bridge toward marshal packs and build-oriented outputs

### B. Venue Library And Constraints

Support reusable venue records with field dimensions, recurring boundaries, fixed no-go zones, and known setup constraints.

Why it fits:

- Extends the local-first project model in a practical direction
- Makes repeat event planning much faster
- Adds realism to planning without becoming a mapping product first

### C. Revision Compare

Make it easy to compare two layout states and see what changed between versions, snapshots, or variants.

Why it fits:

- Pairs naturally with snapshots and layout variants
- Helps race directors communicate changes between iterations
- Makes TrackDraw stronger as a planning and review tool, not just a drawing surface

### D. Marshal Mode

Create a race-day view focused on marshal readability, sectors, references, and obstacle clarity rather than editing.

Why it fits:

- Different users need a different view than the editor or pilot briefing mode
- Builds on existing share and output strengths
- Reinforces TrackDraw's usefulness during live event operations

### E. Build Mode / Setup Sequence

Turn a finished layout into a structured setup order so crews can build the course in a clearer sequence.

Why it fits:

- Moves TrackDraw from design into execution support
- Complements obstacle inventory and marshal-oriented outputs
- Feels genuinely differentiated from generic diagram tools

### 13. Map And Field Overlay

Support background references such as venue plans, field maps, or imagery.

### 14. Lap Simulator

Estimate route timing and flow once lighter analysis tools have proven useful.

### 15. Real-Time Collaboration

Allow multiple users to work on the same design concurrently.

## Recommended Sequence

If the goal is to deliver the highest product value over the next cycle, the best order is:

1. Obstacle presets
2. Project workflow and recovery
3. Share and publish workflow
4. Path and flow review
5. Race-day communication and briefing
6. Studio onboarding and starter flows
7. Mobile venue editing

This sequence builds directly on the current strengths of the editor and improves the practical path from "draw a layout" to "use it on race day."

## Supporting Design Docs

- [Obstacle Presets PVA](./obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](./snapshots-layout-variants-design.md)
