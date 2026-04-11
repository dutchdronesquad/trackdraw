# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw. The core design loop is now in place across desktop, shared read-only viewing, practical mobile use, and export/share handoff. The roadmap should now focus primarily on ownership boundaries, workflow depth, and the next product surfaces that build cleanly on the shipped v1.1.0 release.

## Current Focus

TrackDraw is now strong in these areas:

- Core 2D editing with real-scale placement, snapping, transforms, and undo/redo
- Track path authoring with elevation-aware planning and a live 3D preview
- Share-first collaboration through read-only links
- Practical mobile editing for quick venue-side changes
- Portable outputs through PNG, SVG, PDF, 3D render capture, and JSON project files

The most useful next product moves are:

- A sharper decision on how far account-backed continuity should go after the first auth slice
- A clearer separation between local-first workflows and account-backed follow-up
- Better lifecycle controls around published shares once ownership is defined
- Deliberate follow-up on race-day outputs after the ownership boundary is settled

## Product Principles

- TrackDraw remains a design tool first
- Solo workflow speed and clarity come before multi-user collaboration
- Analysis should stay lightweight, visual, and design-oriented before becoming simulation-heavy
- Mobile should be practical and deliberate, not a compromised desktop clone
- Race-day deliverables should extend the editor, not become a separate product surface
- Sharing should feel intentional and publishable, not like a side effect of editor state
- Local-first workflows should remain usable without requiring sign-in
- Accounts should only appear where sync, ownership, identity, or shared administration clearly improve the workflow

## Active Roadmap

Labels used below:

- `No account required`: should remain meaningfully usable without an account
- `Account-backed`: depends on ownership, sync, identity, or shared persistence
- `Research`: still primarily exploratory

### 1. Accounts And Ownership Model (`Research`)

TrackDraw now has the first account foundation in place through Better Auth, magic-link sign-in, profile management, and account-aware UI in Studio. The next question is how far account-backed continuity should go beyond that first slice.

Supporting product-shape document:

- `docs/pva/accounts-project-sync-pva.md`

Why now:

- More roadmap items now depend on durable ownership and cross-device persistence
- Share management, venue records, inventory profiles, and future review features all become clearer once the account boundary is defined
- The first auth layer is now shipped enough that the next decision is about scope, not whether accounts exist at all

Focus:

- Validate the first account value around cross-device continuation, especially moving from home planning to race-day mobile review or adjustment
- Treat stronger ownership and share control as the second immediate account value, so published tracks are easier to revisit, manage, and trust over time
- Define the first clear project model: what stays local by default, what becomes account-backed, and how a user should move between those two states without ambiguity
- Clarify how cross-device continuation should work in practice, especially from desktop planning into mobile venue-side review or adjustments
- Clarify ownership for shares, venue records, and future shared race-day metadata
- Decide what the next implementation slice should be instead of treating "accounts" as an open-ended platform project

Key product-model questions:

- Should projects remain local by default and only become account-backed when a user explicitly saves them to their account?
- How should TrackDraw present account-backed projects inside Studio so they feel like continuity, not a second separate product?
- How should a user reopen the same project on another device without creating confusing merge or overwrite behavior between local and account-backed copies?
- Should published shares belong primarily to an account, to a specific project, or to both?
- Which workflows should remain clean without an account, including local projects, JSON export/import, and one-off share publishing?

Current product direction to carry forward:

- Keep the product language simple: TrackDraw should talk about `projects`, not separate local versus cloud project types
- Logged-out users work with ordinary device-local projects
- Signed-in users should expect projects to sync with their account by default, because cross-device continuity is the main reason to sign in at all
- For signed-in users, cloud state should be treated as the canonical project state, while local browser data acts as the working copy, cache, and resilience layer
- Sign-out should end account sync but should not automatically clear ordinary local project data from the device

Authentication and storage recommendation:

- TrackDraw should remain local-first for logged-out use
- Signed-in use should continue toward account-backed continuity by default in practice
- Browser-local persistence remains required as the working copy and resilience layer
- The account-backed project record should be treated as the canonical durable state for signed-in users
- The product should not move toward mandatory-auth editing or a cloud-only storage model
- The product should also not stop at local-only storage, because that would undercut the main value of signing in

Important unresolved transition:

- Existing local projects on a device should not be silently absorbed into an account the moment a user signs in
- TrackDraw should keep those projects visible, make their sync state understandable, and provide an explicit follow-up path to bring them into account-backed sync
- For signed-in users, the project management surface should likely emphasize account-backed projects first, with device-only projects presented separately rather than mixed into one ambiguous list

Current shipped foundation:

- Better Auth with email magic-link sign-in
- In-app profile management and account deletion
- Account-aware desktop and mobile shell entry points
- Initial account-backed schema and project/share ownership groundwork

### 2. Account-Backed Follow-up (`Account-backed`)

These items are now follow-up work rather than intentionally blocked. The first ownership model is clear enough that they can move forward when priority allows.

#### Share Lifecycle Follow-up

Keep refining published links now that stored share publishing is the default model.

Shipped:

- Share ownership enforced: `DELETE /api/shares/[token]` now requires the authenticated owner; anonymous shares expire naturally and cannot be revoked
- `GET /api/shares` endpoint returns the signed-in user's active shares
- Shares published by signed-in users are always linked to the active account project via `project_id`
- Shares tab added to the Projects dialog: lists active shares with copy-link, open-in-tab, and revoke actions
- Revoke button in ShareDialog hidden for unauthenticated sessions

Focus:

- Keep local-first publish flows simple for unauthenticated use
- Revisit any replace/regenerate flow only once account ownership is properly defined

#### Comments And Review Mode

Allow feedback to be anchored to obstacles or route sections without requiring live collaboration.

Why later:

- Simple local-first notes are still plausible without accounts
- But richer review workflows become much clearer once account identity, ownership, and shared project models are better defined

Suggested first slices:

- Pinned notes anchored to a selected obstacle as a local-first first pass
- Pinned notes anchored to a selected obstacle as an initial local-first version
- Notes anchored to a route waypoint or path segment without requiring identity first
- Read-only review mode that surfaces notes clearly without exposing editing tools
- Richer threaded comments only if simple anchored notes prove useful
  and an account-backed identity model exists

### 3. Race-Day Follow-up (`No account required`)

TrackDraw now has a real Race Pack and numbering handoff. The next work here is follow-up, not the main roadmap driver.

Current first pass:

- PDF export now includes a dedicated Race Pack variant
- The Race Pack now ships as a multi-page race-day document with a cover page, track map, material list, inventory/buildability status, setup sequence, and initial timing/build guidance

Later slices:

- Race director page once TrackDraw can extend the existing start/finish foundation with the supporting race-day metadata and ops elements it depends on, including pilot line, director position, timing/start box placement, cable routing, and ops notes

Important boundary:

- The Race Pack is now the handoff document for briefing, print, and sharing
- A future Build mode should be treated as a separate operational product surface, not as "just a bigger PDF"

### 4. Backlog And Research Tracks

These remain valuable, but they are not the current build target.

#### 3D Editor Interaction Polish (`No account required`)

Keep smoothing the direct-manipulation parts of the 3D preview where they noticeably speed up venue-side editing.

Recent shipped progress:

- Floating ladders now have a first practical editing pass through ladder elevation, direct 3D raise/lower handles, clearer handle styling, and live inspector feedback while dragging

Suggested follow-up:

- Keep refining floating ladder placement so the controls stay easy to read and adjust in dense layouts and mobile-sized screens
- Continue only with narrow, high-confidence 3D controls that improve placement speed without turning the preview into a heavy general-purpose modeling surface

#### Heatmap And Flow Analysis (`No account required`)

Add lightweight visual feedback for rhythm, density, and bottlenecks once it returns from backlog.

Suggested first slices:

- Density overlay
- Suspicious spacing cues
- Route rhythm cues

#### Research Tracks (`Research`)

- Velocidrone experimental export follow-up
  - The core compatibility question is answered: TrackDraw can already generate an experimental `.trk` file that imports into Velocidrone
  - Next step is validation and orientation correctness, especially gate front/back direction
- Desktop and mobile wrapper evaluation
- PWA evaluation
- Template library product definition
  - Determine whether TrackDraw should support reusable personal, club, or team-owned templates at all
  - Define what a template object actually is: full project, reusable section/group, race-day preset, or something else
  - Clarify how browse, duplicate, insert, and fork flows should work without overlapping confusingly with starter layouts or ordinary projects
  - Define ownership and visibility boundaries for private, club, team, or published template libraries

### 5. Accounts Boundary

Be deliberate about what should stay usable without an account versus what actually benefits from account identity and continuity.

Keep these usable without an account where possible:

- Core editing, preview, import/export, and local project work
- Local inventory, venue setup, and lightweight notes in their initial versions
- One-off share publishing and local revoke from the current Studio session

Likely account-backed follow-up:

- Cross-device project sync and cloud-backed project libraries
- Durable ownership and administration of published shares
- Shared venue or club records, including shared inventory profiles
- Identity-aware comments, review threads, and future collaboration

## v1.1.0 Archive

<details>
<summary>Completed release work archived with v1.1.0</summary>

### Layout Acceleration (`No account required`)

This initial acceleration release that works without an account is now shipped through obstacle presets, selection grouping, and starter layouts. The next work here should be polish and learning rather than a broader template system.

### Operational Follow-up

The production runtime and deployment path are now treated as validated. Development and production Cloudflare domains are live, release-gated deploys are validated, and the remaining work is ordinary operational maintenance rather than a roadmap blocker.

### Inventory And Buildability Validation (`No account required`)

This initial release is also complete. TrackDraw now supports local inventory entry, required-vs-available comparison, buildability warnings, and Race Pack setup estimates. The next work from here belongs to `Build mode / setup sequence`, not to more expansion of the basic inventory comparison layer.

</details>

## v1.0.0 Archive

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
- Theme-aware PNG/SVG export, PDF export, 3D render capture, and cinematic FPV WebM export
- Background progress handling and explicit theme selection for cinematic FPV export
- Ongoing local persistence for in-browser work

Why it matters:

- TrackDraw now supports both quick sharing and reliable project reuse, including a first motion-based handoff path
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

Follow-up:

- Better published-link management for repeated use in Studio
- Revisit link replacement/regeneration only once account-backed ownership exists

### 3. Path And Flow Review ✓

Completed. Tight-turn warnings (hairpin), steep grade warnings, close-point warnings, stub path warning (fewer than 2 waypoints), and 3D obstacle rotation and dive gate tilt controls.

Follow-up:

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

### 10. Velocidrone Experimental Export Follow-up (`No account required`)

TrackDraw can already generate an experimental `.trk` export that imports into Velocidrone. The open work is now turning that proof of concept into a more dependable best-effort workflow.

Current status:

- The core compatibility question is now answered
- A first experimental `.trk` export already exists and can be imported into Velocidrone
- A first best-effort object mapping pass already exists for the main track items
- A centralized orientation layer now exists for export plus 2D/3D rotation guides
- First-pass 2D and 3D front/back validation cues now exist in the editor
- The workflow is already positioned product-wise as an experimental base export
- The workflow is still too early to treat as fully supported or stable

Why:

- Creates a bridge from planning into simulator testing
- Makes TrackDraw more useful beyond static design and briefing
- Could become a strong differentiator if the export is reliable enough

Constraints:

- There is no public API or official export documentation to build against
- The reverse engineering phase produced a working export path, but the object mapping still remains approximate in places
- Legal, maintenance, and breakage risk must be considered before promising user-facing support

Recommended approach:

- Treat this as an experimental export follow-up, not as a blank research question
- Keep iterating on the current proof-of-concept export instead of restarting discovery from zero
- Treat the current object mapping as a best-effort base layer, then tighten it through validation rather than promising perfect 1:1 conversion
- Keep refining the new centralized orientation model so per-shape export offsets and editor guides stay aligned
- Keep improving the 2D front/back affordance now that the first cue is attached to the rotation guide
- Keep improving the 3D orientation validation now that the first guide pass follows the same orientation mapping
- Keep positioning it as an experimental base export until the workflow is stable enough to maintain

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
      Shipped: `ProjectManagerDialog` split into `src/components/dialogs/ProjectManager/` with separate `DeviceTab`, `AccountTab`, `RestoreTab`, `SharesTab`, and `shared` modules.

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

### H. Accounts And Cross-Device Projects

Evaluate whether optional user accounts should unlock cloud-backed project storage, project management, and cross-device continuation.

Why it fits:

- local-first project work is already valuable, but browser-local persistence has obvious long-term limits
- cross-device access and safer project storage may matter before real-time collaboration does
- the current share and runtime model already points toward future ownership and project boundaries

Research outcome:

- stay fully local-first
- add optional cloud backup only
- add account-linked project libraries and sync
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

### Current Roadmap

3. Race-day communication and briefing
4. Layout acceleration (obstacle presets, selection grouping, venue templates)
5. Published share lifecycle controls
6. Comments and review mode
7. Velocidrone experimental export follow-up

This sequence keeps the roadmap focused on extending workflow depth rather than plugging product gaps.

</details>

## Supporting Design Docs

- [Obstacle Presets PVA](../pva/obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](../pva/snapshots-layout-variants-design.md)
- [Wrapper Evaluation](../research/wrapper-evaluation.md)
- [PWA Evaluation](../research/pwa-evaluation.md)
