# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw after the v1 release. The core design loop is now in place across desktop, shared read-only viewing, practical mobile use, and export/share handoff. The roadmap should now focus primarily on workflow depth, race-day outputs, and faster layout building rather than on v1 foundation work.

## Post-v1 Focus

TrackDraw is now strong in these areas:

- Core 2D editing with real-scale placement, snapping, transforms, and undo/redo
- Track path authoring with elevation-aware planning and a live 3D preview
- Share-first collaboration through read-only links
- Practical mobile editing for quick venue-side changes
- Portable outputs through PNG, SVG, PDF, 3D render capture, and JSON project files

The most useful next product moves are:

- Faster layout creation from reusable building blocks
- A clearer decision on optional accounts, ownership, and cross-device persistence
- Better design feedback before a layout reaches the field
- More deliberate outputs for race-day communication and presentation
- Better validation that a planned layout matches the real inventory on hand
- Better lifecycle controls around published shares

## Product Principles

- TrackDraw remains a design tool first
- Solo workflow speed and clarity come before multi-user collaboration
- Analysis should stay lightweight, visual, and design-oriented before becoming simulation-heavy
- Mobile should be practical and deliberate, not a compromised desktop clone
- Race-day deliverables should extend the editor, not become a separate product surface
- Sharing should feel intentional and publishable, not like a side effect of editor state
- Local-first workflows should remain usable without requiring sign-in
- Optional accounts should only appear where sync, ownership, identity, or shared administration clearly improve the workflow

## Active Roadmap

Labels used below:

- `No account required`: should remain meaningfully usable without an account
- `Account-backed`: depends on ownership, sync, identity, or shared persistence
- `Research`: still primarily exploratory
- `Blocked`: depends on another roadmap decision or capability first

### 1. Race-Day Communication And Briefing (`No account required`)

Turn existing export and read-only capabilities into more deliberate communication outputs.

Why now:

- The product already has export breadth and a read-only view, but briefing workflows still need a more deliberate output surface
- This is the clearest next step now that the v1 planning loop is stable

Scope:

- Obstacle numbering
- Pilot briefing output
- Race-director-oriented Race Pack pages
- Race Pack outputs tuned for briefing, print, and mobile review

Next slices:

- Race Pack foundation with title, field dimensions, obstacle summary, stock status, and build guidance
- Race director page once TrackDraw can capture practical start-area metadata such as director position, timing/start box position, cable run, and related ops notes

Current first pass:

- PDF export now includes a dedicated Race Pack variant
- The Race Pack now ships as a multi-page race-day document with a cover page, track map, material list, inventory/buildability status, setup sequence, and first-pass timing/build guidance

Important boundary:

- The Race Pack is now the handoff document for briefing, print, and sharing
- A future Build mode should be treated as a separate operational product surface, not as "just a bigger PDF"

### 2. Layout Acceleration (`No account required`)

Reduce repetitive setup work so users can compose good layouts faster.

Why now:

- The editor is complete enough for v1 without preset content
- Presets now matter more as workflow acceleration than as foundational capability

Scope:

- Obstacle presets for reusable groupings and common race-building patterns
- Selection grouping for repeated layout sections
- Venue-aware field templates and starter fields

Next slices:

- Obstacle-pack presets for common race-building patterns
- Selection grouping with duplicate/move as one unit
- Starter layouts before venue-aware templates
- Template browser only after preset content and grouping are proven useful

### 3. Share Lifecycle Follow-up (`Account-backed`, `Blocked`)

Keep refining published links now that stored share publishing is the default model.

Focus:

- Better published-link management for repeated use in Studio
- Keep local-first publish flows simple for unauthenticated use
- Decide how much share administration should live in the product UI
- Revisit any replace/regenerate flow only once optional-account ownership is properly defined

### 4. Heatmap And Flow Analysis (`No account required`)

Add lightweight visual feedback for rhythm, density, and bottlenecks once the v1 validation basics are in place.

Suggested first slices:

- Density overlay
- Suspicious spacing cues
- Route rhythm cues

### 5. Operational Follow-up

Deployment validation is complete. The runtime path is live across development and production, and the remaining work is now ordinary operational maintenance rather than a roadmap blocker.

Completed:

- `dev.trackdraw.app` validated on Cloudflare
- Production domain and release-gated production deploy validated
- GitHub environment secrets and domain routing finalized

### 6. Optional Accounts And Ownership Model (`Research`)

Decide sooner how far TrackDraw should go with optional identity, sync, and ownership.

Why now:

- More roadmap items now depend on durable ownership and cross-device persistence
- Share management, venue records, inventory profiles, and future review features all become clearer once the account boundary is defined

Focus:

- Validate whether users actually need cloud-backed continuity badly enough to justify optional accounts
- Define how local-first projects and cloud-backed projects should coexist
- Clarify ownership for shares, venue records, and future shared race-day metadata

### 7. Inventory And Buildability Validation (`No account required`)

Connect the design to the actual obstacle stock available to a club or event.

Why now:

- A layout is only useful if it can actually be built with the gear on hand
- This creates a strong bridge between planning and race-day feasibility without requiring simulation

Suggested first slices:

- "My inventory" setup for available gates, ladders, dive gates, start/finish elements, flags, cones, and other obstacle types, stored as a local-first project profile
- Required-vs-available comparison for the current design without requiring an account
- Buildability warnings when a layout depends on more obstacles than are available
- Later: inventory profiles tied to a venue or club setup, which may justify optional account-backed persistence

Current first pass:

- Inventory can now be entered directly in the design inspector
- The current layout is compared against saved stock counts
- The inspector surfaces missing counts and a simple buildable-vs-short status
- The Race Pack now turns those counts into a clearer race-day setup summary with grouped setup steps, timing ranges, and lightweight complexity cues

Still open:

- Smarter venue- or club-specific setup assumptions instead of one generalized heuristic
- Deeper build-mode guidance beyond the current Race Pack first pass, such as stronger crew coordination and on-field sequencing

What that means:

- Inventory/buildability and the Race Pack now cover document-style setup guidance
- A true Build mode remains a separate future track with its own page or mode, map-linked steps, grouped phases, and on-field interaction model

### 8. Comments And Review Mode (`Account-backed`, `Blocked`)

Allow feedback to be anchored to obstacles or route sections without requiring live collaboration.

Why later:

- Simple local-first notes are still plausible without accounts
- But richer review workflows become much clearer once optional identity, ownership, and shared project models are better defined

Suggested first slices:

- Pinned notes anchored to a selected obstacle as a local-first first pass
- Notes anchored to a route waypoint or path segment without requiring identity first
- Read-only review mode that surfaces notes clearly without exposing editing tools
- Richer threaded comments only if simple anchored notes prove useful
  and an account-backed identity model exists

### 9. Research Tracks (`Research`)

- Velocidrone export compatibility
- Desktop and mobile wrapper evaluation
- PWA evaluation

### 10. Accounts Boundary

Be deliberate about what should stay account-free versus what actually benefits from optional identity.

Keep account-free where possible:

- Core editing, preview, import/export, and local project work
- Local inventory, venue setup, and lightweight notes first passes
- One-off share publishing and local revoke from the current Studio session

Likely account-backed follow-up:

- Cross-device project sync and cloud-backed project libraries
- Durable ownership and administration of published shares
- Shared venue or club records, including shared inventory profiles
- Identity-aware comments, review threads, and future collaboration

## v1 Archive

<details>
<summary>Completed v1 foundation and release work</summary>

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

- Better published-link management for repeated use in Studio
- Revisit link replacement/regeneration only once account-backed ownership exists

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

- Operational maintenance and rollout monitoring only

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

- Decide how much share administration should live in the product UI
- Keep refining the publish dialog around repeated use in Studio without regressing the current flow
- Revisit any replace/regenerate flow only once account-backed ownership exists

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

Suggested first slices:

- Basic density overlay for obstacle clusters and repeated turns
- Suspicious spacing warnings between obstacles or route sections
- Route rhythm cues before any heavier timing or simulation work
- Heatmap polish only after the simpler warnings prove actionable

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

### F. Desktop And Mobile Wrapper Evaluation

Evaluate whether an Electron desktop wrapper or a Capacitor mobile wrapper would materially improve TrackDraw beyond the web app.

Why it fits:

- TrackDraw is already local-first, which makes filesystem, offline, and installability questions product-relevant
- Desktop and mobile wrappers could improve import/export, local project handling, and venue-side launch ergonomics
- The app now has enough real workflow depth that wrapper work can be judged against concrete user value instead of hypothetical future needs

Research outcome:

- no wrapper needed yet
- Electron proof of concept
- Capacitor proof of concept
- or a clear decision to stay web-first for the foreseeable future

### G. PWA Evaluation

Evaluate whether TrackDraw should add a deliberate Progressive Web App layer for installability and limited offline resilience.

Why it fits:

- TrackDraw already behaves like an application more than a document site
- mobile and venue-side usage make installability and launch behavior relevant
- PWA may solve part of the "app-like" need without wrapper complexity

Research outcome:

- stay a standard web app
- add a narrow installable PWA layer
- or expand into a stronger offline/app-shell strategy later

### H. Optional Accounts And Cross-Device Projects

Evaluate whether optional user accounts should unlock cloud-backed project storage, project management, and cross-device continuation.

Why it fits:

- local-first project work is already valuable, but browser-local persistence has obvious long-term limits
- cross-device access and safer project storage may matter before real-time collaboration does
- the current share and runtime model already points toward future ownership and project boundaries

Research outcome:

- stay fully local-first
- add optional cloud backup only
- add optional account-linked project libraries and sync
- or later expand toward broader team workflows

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

</details>

## Supporting Design Docs

- [Obstacle Presets PVA](../pva/obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](../pva/snapshots-layout-variants-design.md)
- [Wrapper Evaluation](../research/wrapper-evaluation.md)
- [PWA Evaluation](../research/pwa-evaluation.md)
- [Accounts And Cross-Device Evaluation](../research/accounts-and-cross-device-evaluation.md)
