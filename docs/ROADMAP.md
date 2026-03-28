# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw as of March 25, 2026. The product has moved beyond "basic editor prototype" territory. The core design loop is now credible across desktop, shared read-only viewing, practical mobile use, and race-day handoff. The next phase should focus less on generic polish and more on workflow acceleration, design confidence, handoff quality, and venue-side usefulness.

## Current Assessment

TrackDraw is now strong in these areas:

- Core 2D editing with real-scale placement, snapping, transforms, and undo/redo
- Track path authoring with elevation-aware planning and a live 3D preview
- Share-first collaboration through read-only links
- Practical mobile editing for quick venue-side changes
- Portable outputs through PNG, SVG, PDF, 3D render capture, and JSON project files

The biggest remaining gaps are:

- Faster layout creation from reusable building blocks
- Better support for layout variants and comparison inside one project
- Better design feedback before a layout reaches the field
- More deliberate outputs for race-day communication and presentation
- A cleaner first-use path for new users
- Better lifecycle controls around published shares

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

### Starter Flows And Project Reset First Pass

The blank-canvas experience now has better early guidance and a clearer reset path than earlier roadmap versions assumed.

Included:

- A first-use starter surface inside Studio with guided and blank entry paths
- Contextual starter guidance tied to initial layout work
- A dedicated new-project confirmation flow across desktop and mobile

Why it matters:

- The roadmap can treat onboarding as an active product track with real groundwork already shipped
- The next step is broader starter content and project structure, not basic "how do I begin" or "how do I safely reset" coverage

## Release Cleanup

### Share Route Deprecation Before v1 ✓

Completed. The legacy `/share?d=...` redirect and its query-param token normalization have been removed. `/share/[token]` is now the sole canonical read-only route. No query-param share links remain in the codebase or product copy.

## Near-Term Priorities

### 1. Project Workflow And Recovery ✓

Completed. Projects dialog, project list with title/shape count/last-modified, create/open/rename/delete, autosave, restore points before destructive actions, manual snapshots via Cmd+S, periodic snapshots every 5 minutes, up to 10 restore points retained.

### 2. Share And Publish Workflow ✓

Completed for v1. Distinct error pages for invalid vs oversized share tokens. Read-only view UX polish with improved overlay copy, correct deep-linking, fit-to-window on desktop, and mobile drawer aligned with studio.

Post-v1:

- Revoke and regenerate controls on top of the stored-share model
- Better published-link management for repeated use in Studio

### 3. Path And Flow Review ✓

Completed. Tight-turn warnings (hairpin), steep grade warnings, close-point warnings, stub path warning (fewer than 2 waypoints), and 3D obstacle rotation and dive gate tilt controls.

Post-v1:

- Suspicious obstacle spacing
- Heatmap and flow density overlays

### 4. Studio Onboarding And Starter Flows ✓

Completed. First-use starter surface with guided ("Start by placing gates") and blank entry paths. Dedicated new-project confirmation flow across desktop and mobile. Contextual hints for gate placement, path drawing, 3D preview, 3D review, and post-path nudge toward preview — all dismissible and localStorage-persisted.

## Mid-Term Priorities

### 5. Runtime And Deployment Migration ✓

Completed in foundation form. TrackDraw is now set up around a real application runtime path instead of GitHub Pages, with Cloudflare Workers/OpenNext in the repo, development and production deploy workflows, and Vercel reduced to pull request previews.

Why now:

- The current app is already stretching beyond static-export assumptions
- Dynamic share metadata and OG image generation now conflict directly with static hosting
- Database-backed shares require a real runtime and backend connectivity
- This migration unblocks the next generation of share and publish work

Included:

- Vercel continues to handle pull request previews
- Cloudflare Workers becomes the runtime for `main` as a development environment
- Cloudflare Workers becomes the production runtime on `release.published`
- Cloudflare D1 is now the first persisted backend for share objects, but the app should avoid hard-coupling to provider-specific assumptions

Why it matters:

- Dynamic share metadata and OG image generation are no longer blocked by static export
- The app now has a viable path for backend-backed share storage
- The remaining work is operational validation and deployment hardening, not architecture selection

Remaining:

- Validate the first full `dev` deploy on Cloudflare
- Validate the first release-gated production deploy
- Finalize environment secrets and domain routing in Cloudflare/GitHub

### 6. Stable Share Links And Share Storage ✓

Completed in first production-facing form. TrackDraw now supports persisted share objects behind the canonical `/share/[token]` route, with database-backed publish/read flows and stored-state-driven metadata generation.

Included:

- Stored share publishing with shorter, durable tokens
- Database-backed share reads
- Share metadata and social image generation driven by stored share state
- Legacy payload-in-URL share support retired behind a safe failure path
- Share expiry support with a default lifecycle window
- Automatic cleanup for revoked shares and expired links beyond the retention window
- A calmer publish flow that separates link creation from follow-up actions like copy, open, and native share

Constraints:

- Share publishing and retrieval should continue to be modeled in TrackDraw domain terms first, not around storage schema details
- The first backend integration should still leave room for later migration to another relational backend or another hosting platform

Remaining:

- Add revoke/regenerate lifecycle controls
- Decide how much share administration should live in the product UI
- Keep refining the publish dialog around repeated use in Studio without regressing the current flow

### 7. Race-Day Communication And Briefing

Turn existing export and read-only capabilities into more deliberate communication outputs.

Why post-v1:

- The product already has export breadth and a read-only view, but briefing workflows require a distinct output surface that goes beyond what the current export and share model supports
- This is meaningful work in its own right and benefits from the share and path review layers being solid first

Scope:

- Obstacle numbering
- Pilot briefing mode
- Printable marshal pack
- Export presets tuned for briefing, print, and mobile review

### 8. Layout Acceleration

Reduce repetitive setup work so users can compose good layouts faster.

Why post-v1:

- The editor is complete enough for v1 without preset content
- Presets require both a solid preset library and a good UI surface for browsing and applying them — this is a meaningful product investment better made after v1 ships

Scope:

- Obstacle presets for reusable groupings and common race-building patterns (start/finish setups, straight gate runs, slalom blocks, ladder and dive combinations, small training layouts)
- Selection grouping for repeated layout sections
- Venue-aware field templates and starter fields

### 9. Comments And Review Mode

Allow feedback to be anchored to obstacles or route sections without requiring live collaboration.

### 10. Velocidrone Export Compatibility (Research)

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

### 11. Heatmap And Flow Analysis

Add lightweight visual feedback for rhythm, density, and bottlenecks after validation basics are in place.

### 12. Adaptive Mobile UI ✓

Completed. `ExportDialog`, `ImportDialog`, and the studio keyboard-shortcuts dialog now use the newer modal style on desktop and bottom-drawer presentation on mobile.

### 13. Codebase Architecture And Performance Refactor

This area now has meaningful groundwork, but it should stay on the roadmap as an ongoing internal quality track rather than being treated as fully complete.

Sub-items:

- [x] Lightweight performance instrumentation
      Add render and autosave instrumentation for development-time performance visibility.
- [x] Editor and canvas modularisation
      Split key interaction and rendering responsibilities across more focused hooks, selectors, and utility modules.
- [ ] Remaining maintainability and state-flow refactor pass
      Further reduce complexity in large rendering surfaces, persistence flow, and state-heavy editor paths.
- [ ] File structure and large-file decomposition pass
      Revisit folder structure, introduce more focused subdirectories, and split oversized components and modules into smaller ownership boundaries.

Why:

- The editor is gaining more product structure, which increases pressure on state and component architecture
- Better internal boundaries can reduce feature risk and make future work faster
- Performance and code clarity should be improved deliberately instead of through scattered one-off changes
- Some core files are growing too broad, which makes navigation, ownership, and safe iteration harder than it should be

## Long-Term Priorities

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

### v1

The v1 scope is complete. All items are done: project workflow, share route deprecation, share/publish UX, path and flow review (including stub warning), contextual hints, mobile dialogs, onboarding, and codebase refactor.

### Post-v1

3. Race-day communication and briefing
4. Layout acceleration (obstacle presets, selection grouping, venue templates)
5. Published share lifecycle controls
6. Comments and review mode
7. Velocidrone export (research track)

This sequence delivers a complete, clean product at v1 and keeps post-v1 work focused on extending workflow depth rather than plugging gaps.

## Supporting Design Docs

- [Obstacle Presets PVA](./obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](./snapshots-layout-variants-design.md)
