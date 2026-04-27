# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw. The core design loop is now in place across desktop, shared read-only viewing, public gallery discovery, practical mobile use, venue-aligned editing, account-published embeds, and export/share handoff. The roadmap should now focus primarily on workflow depth and small product surfaces that build cleanly on the shipped foundation.

## Current Focus

TrackDraw is now strong in these areas:

- Core 2D editing with real-scale placement, snapping, transforms, and undo/redo
- Track path authoring with elevation-aware planning and a live 3D preview
- Share-first collaboration through read-only links
- Public gallery discovery through opt-in published shares
- Account-published embeds through a dedicated read-only `/embed/[token]` route
- Real venue alignment through editor-only satellite map references
- Practical mobile editing for quick venue-side changes
- Portable outputs through PNG, SVG, PDF, 3D render capture, and JSON project files

The most useful next product moves are:

- Race Pack QR codes that connect printed or on-screen briefings back to canonical shared views
- Timing marker follow-ups that build on the shipped editor and Race Pack markers for race director planning and future overlay preparation
- A sharper decision on how far account-backed project continuity should go after the shipped account and authorization foundation
- A clearer separation between local-first workflows and account-backed follow-up
- Versioned publish history for account-backed shares
- Curated gallery collections that improve discovery without social mechanics
- Operator-facing dashboard polish for published share and gallery lifecycle visibility

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

### 1. Race-Day Handoff Next Slice (`No account required`)

The next release-sized work should build on the shipped Race Pack, published shares, map/reference work, and route numbering without turning TrackDraw into a race-control product.

Focus:

- Shipped timing gate markers for start/finish and split hardware placement
- Keep future overlay metadata work behind the shipped editor and Race Pack timing marker foundation
- Keep the future race director page behind these smaller foundations

Suggested first slices:

- Shipped: shared view QR code in Race Pack, tied to an active published account-project share with a clear no-share fallback
- Shipped: timing gate markers for start/finish and split hardware placement, surfaced in the editor and Race Pack

### 2. Accounts And Ownership Model (`Research`)

TrackDraw now has the first account foundation in place through sign-in, profile management, role-aware dashboard access, and internal role management. The next question is how far account-backed project continuity should go beyond that shipped foundation.

Supporting product-shape document:

- `docs/pva/accounts-project-sync-pva.md`

Why now:

- More roadmap items now depend on durable ownership and cross-device persistence
- Share management, venue records, inventory profiles, and future review features all become clearer once the account boundary is defined
- The account layer is now shipped enough that the next decision is about product scope, not whether the basic foundation exists at all

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

- Email magic-link sign-in
- In-app profile management and account deletion
- Account-aware desktop and mobile shell entry points
- Role-aware dashboard access and internal role management
- Initial account-backed schema and project/share ownership groundwork

### 3. Account-Backed Follow-up (`Account-backed`)

These items are now follow-up work rather than intentionally blocked. The first ownership model is clear enough that they can move forward when priority allows.

#### Share Lifecycle Follow-up

Keep refining published links now that stored share publishing is the default model.

Shipped:

- Share ownership enforced: `DELETE /api/shares/[token]` now requires the authenticated owner; anonymous shares expire naturally and cannot be revoked
- `GET /api/shares` endpoint returns the signed-in user's active shares
- Shares published by signed-in users are always linked to the active account project via `project_id`
- Shares tab added to the Projects dialog: lists active shares with copy-link, open-in-tab, and revoke actions
- Revoke button in ShareDialog hidden for unauthenticated sessions
- Share lifecycle is explicit: anonymous shares are temporary and always expire; account-backed shares are published and stay live until revoked
- Account project publishing reuses the active published share token instead of creating unbounded duplicate shares
- Gallery visibility is decoupled from share expiry; list, unlist, feature, and hide only change gallery state
- Account-published shares are automatically embeddable through `/embed/[token]`; anonymous, expired, revoked, and missing embeds never render track data
- ShareDialog has a dedicated Embed section with 2D layout / 3D preview initial view selection and copyable iframe code

Focus:

- Keep local-first publish flows simple for unauthenticated use
- Improve operator visibility for temporary, published, revoked, gallery-linked, and embedded share states before adding deeper share administration

#### Share Version History

Account-backed shares should eventually support deliberate publish history so owners can update a published track without making existing links feel mysterious.

Why:

- Published links are increasingly reused through share pages, gallery cards, and future embeds
- Owners need a safer way to update a published track without losing the last known-good public version
- Version history fits account-backed shares better than anonymous one-off shares, because rollback and ownership need durable identity

Focus:

- Store each deliberate publish or update as a timestamped published version
- Make the current public version explicit in the share management UI
- Let owners inspect previous versions and restore one if a published update was a mistake
- Keep anonymous shares simple and expiry-based; do not add version management to logged-out publishing

#### Gallery Featured Collections

The gallery can become more useful through curated collections without becoming a social feed.

Why:

- Featured entries are useful, but one global featured bucket will get blunt as the gallery grows
- Collections can guide visitors toward practical examples such as indoor practice, beginner friendly, technical layouts, or race-day examples
- Admin-curated collections reuse the existing dashboard and gallery foundations without adding voting, comments, or reporting

Focus:

- Add dashboard controls for creating, ordering, and publishing gallery collections
- Let admins assign listed or featured gallery entries to one or more collections
- Surface selected collections on `/gallery` while keeping every card destination on `/share/[token]`
- Keep collection pages or deep collection routing out of the first slice unless the gallery needs it later

#### Admin Dashboard Operations Follow-up

Now that the admin dashboard exists, the next dashboard work should improve operator visibility and support workflows without turning the gallery into a social platform.

Current boundary:

- Public reporting flows are out of scope for now
- Gallery safety remains operator-driven through existing feature, hide, restore, and delete controls
- Dashboard follow-up should make existing account, share, audit, and gallery state easier to inspect before adding new moderation models

Focus:

- Add practical gallery filters for state, featured entries, hidden entries, and recent updates
- Improve share lifecycle visibility for active, expired, revoked, and gallery-linked shares
- Make the audit log easier to inspect with filters and action detail views
- Support curated gallery collection management once collections become a build target
- Consider a lightweight user/support lookup only if it helps resolve account, role, or share ownership issues

### 4. Race-Day Follow-up (`No account required`)

TrackDraw now has a real Race Pack and numbering handoff. The immediate QR/timing-marker slice is tracked at the top of the active roadmap; the remaining work here is broader race-day operations follow-up.

Current first pass:

- PDF export now includes a dedicated Race Pack variant
- The Race Pack now ships as a multi-page race-day document with a cover page, track map, material list, inventory/buildability status, setup sequence, and initial timing/build guidance

Later slices:

- Race director page once TrackDraw can extend the existing start/finish and timing-marker foundation with the supporting race-day metadata and ops elements it depends on, including pilot line, director position, timing/start box placement, cable routing, and ops notes
- Live race overlay preparation once the `rh-stream-overlays` side is ready to consume TrackDraw-authored route and timing metadata

Important boundary:

- The Race Pack is now the handoff document for briefing, print, and sharing
- A future Build mode should be treated as a separate operational product surface, not as "just a bigger PDF"
- Live race overlay rendering, OBS presentation, RotorHazard event handling, and position estimation should stay in `rh-stream-overlays`, not in TrackDraw

#### Live Race Overlay Preparation

TrackDraw's role in the live race overlay work is course preparation, not live broadcast rendering.
The same start/finish and split timing markers should first serve TrackDraw's own race-day planning surfaces, then become overlay preparation metadata when `rh-stream-overlays` consumes the project.

Current state:

- Stable project JSON export/import already exists through `serializeDesign()` and `parseDesign()`
- The existing project JSON is the preferred first integration format for `rh-stream-overlays`
- TrackDraw still lacks explicit race-route and timing-role authoring, so overlay preparation is not yet release-ready from this repo alone

TrackDraw scope:

- Identify the active race route instead of relying on the first polyline fallback
- Reuse the race-day timing marker model, likely `shape.meta.timing`, for start/finish and split points
- Provide editor controls for assigning timing roles to relevant shapes in a way that also improves Race Pack and race director output
- Validate missing race route, duplicate timing roles, missing timing identifiers, and timing-marked shapes that cannot be mapped onto route progress
- Document the TrackDraw JSON fields that `rh-stream-overlays` should consume for the first minimap prototype

Out of TrackDraw scope:

- OBS-facing minimap rendering
- RotorHazard event ingestion
- estimated pilot position logic
- stale, reconnect, and race-state behavior
- live race control or timing dashboard UX

Suggested first slices:

- Add explicit active race route metadata to the project model
- Add typed timing metadata helpers and normalization for `shape.meta.timing`
- Add inspector controls for `start_finish` and `split` roles on relevant gates or timing shapes
- Surface timing markers in Race Pack and race director-oriented output before treating them as overlay-only metadata
- Add overlay-preparation validation that can be reused by export and future setup UI
- Keep using full TrackDraw project JSON until the RH plugin proves a dedicated overlay package is necessary

### 5. Real-Time Collaboration Evaluation (`Research`)

Evaluate whether TrackDraw should support shared real-time editing for race track design, but do not actively invest in enabling collaboration until the sync, presence, and conflict model clearly justify the editor complexity.

Suggested first slices:

- Decide whether the first live multi-user step should be presence-only, a host-led review session, or true co-editing
- Define the sync model and conflict handling approach only if a shared editing surface still looks strategically justified
- Decide how local-first editing and offline behavior should interact with any live session model
- Treat host-led review with optional presence as the strongest smaller step if TrackDraw wants live collaboration-adjacent value before full co-editing
- Only revisit active co-editing investment after the editor state, persistence, and undo boundaries are stronger for the solo workflow too

### 6. Backlog And Research Tracks

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

#### AR Mode Evaluation (`Research`)

Keep AR parked as a later research track until real product pull appears from users or venue-side workflows. It remains an exciting possible direction, but it should not compete with nearer-term product work until there is clearer demand.

Suggested first slices if interest appears:

- Validate Android WebXR feasibility
- Identify a practical iOS fallback
- Test whether full-track placement is useful and accurate enough for real venue-side decisions

#### Track DNA And Layout Analysis (`No account required`)

Turn route and layout analysis into clearer reusable signals that help compare tracks, explain style, and support later recommendation or AI-oriented work.

Suggested first slices:

- Validate whether any compact track-character summary actually helps real layout decisions instead of adding decorative scoring
- Rule-based pattern recognition for shapes such as S-turns, hairpins, or figure-8 sections if the output can be labeled clearly and kept stable under normal edits
- Compact flow, speed, technical, or complexity scoring only if the output stays explainable and actionable
- Descriptive track tags such as faster, more technical, or more flowy only if they remain stable under normal layout edits
- Derived section tags or labels from detected route patterns only if they make review faster without creating noisy false positives
- Follow-up flow analysis that expands beyond current warnings into alignment and rhythm-oriented feedback where it stays actionable

#### Track Challenges Evaluation (`Research`)

Evaluate whether recurring design challenges would create meaningful product value without introducing a heavy moderation, identity, or submission-management burden.

Suggested first slices:

- Define how challenge entries are submitted
- Decide whether accounts are required from day one
- Test whether lightweight voting, featured picks, or curation is enough

#### Build Mode / Setup Sequence (`No account required`)

Turn a finished layout into a dedicated build/setup surface instead of continuing to expand the Race Pack, but keep it as a later workflow track rather than a near-term roadmap focus.

Suggested first slices:

- Dedicated build-mode view
- Map-linked setup steps
- Grouped build phases and check-off flow
- Crew and venue assumptions

#### Comments And Review Mode (`Account-backed`)

Allow feedback to be anchored to obstacles or route sections, but keep it as a later follow-up behind the more pressing design, handoff, and collaboration research tracks.

Why later:

- Simple note-taking is plausible, but the more meaningful version depends on identity, ownership, and shared project context
- Richer review workflows are easier to define once collaboration and publishing boundaries are clearer

Suggested first slices:

- Pinned notes anchored to a selected obstacle as a local-first first pass
- Notes anchored to a route waypoint or path segment without requiring identity first
- Read-only review mode that surfaces notes clearly without exposing editing tools
- Richer threaded comments only if simple anchored notes prove useful
  and an account-backed identity model exists

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

### 7. Accounts Boundary

Be deliberate about what should stay usable without an account versus what actually benefits from account identity and continuity.

Keep these usable without an account where possible:

- Core editing, preview, import/export, and local project work
- Local inventory, venue setup, and lightweight notes in their initial versions
- One-off temporary share publishing with explicit expiry

Likely account-backed follow-up:

- Cross-device project sync and cloud-backed project libraries
- Durable ownership and administration of published shares
- Durable published embeds
- Version history for account-backed published shares
- Operator-controlled gallery visibility through feature, hide, restore, and delete actions
- Curated gallery collections
- Shared venue or club records, including shared inventory profiles
- Identity-aware comments, review threads, and future collaboration

## v1.5.0 Archive

<details>
<summary>Completed release work archived with v1.5.0</summary>

### Published Gallery (`Account-backed`)

TrackDraw now has a public gallery at `/gallery` for opt-in published tracks. Gallery entries remain tied to canonical `/share/[token]` links, so browsing does not introduce a second read-only destination.

Included:

- Signed-in owners can add a published share to the gallery from the share dialog
- Owners can update gallery title and description, remove an entry from the gallery, or revoke the underlying share
- Gallery preview images are generated and stored as public media
- The public gallery includes featured and recent entries, empty and failure states, public metadata, and sitemap coverage
- Moderators and admins can view, feature, hide, restore, and delete gallery entries from the dashboard

### Durable Shares And Embeds (`Account-backed`)

Account-backed published shares now stay live until revoked, while anonymous shares remain temporary. Published account shares can also travel beyond TrackDraw links through a lightweight embed viewer.

Included:

- Explicit temporary versus published share lifecycle
- Account project publishing reuses the active published share token instead of creating unbounded duplicate shares
- Anonymous shares keep explicit expiry and are never embeddable
- `/embed/[token]` renders only active published shares and shows unavailable states for temporary, expired, revoked, or missing embeds
- The Share dialog includes a dedicated Embed section with iframe code and 2D layout / 3D preview start modes
- Gallery visibility is independent from share expiry, so listing, unlisting, featuring, and hiding do not change whether a share or embed stays live

### Editor Workflow Follow-up (`No account required`)

Route editing and layout review now have clearer editor feedback without replacing the current lightweight workflow.

Included:

- Route-derived obstacle numbering validation and layout inspector status
- Missing-route, off-route, and partial-numbering cues in the layout review surface
- Route-line snapping, waypoint-aware snapping, and x/y object-alignment snapping
- Smaller waypoint snap targets so route editing stays precise
- Inspector cleanup that keeps project settings, layout review, and selection editing easier to scan

### Map Field Reference (`No account required`)

TrackDraw now supports an editor-only satellite map reference for lining a project up with a real venue.

Included:

- Desktop dialog and mobile drawer for choosing the field center
- Esri World Imagery tiles, typeahead location search, current-location jump, touch/pointer panning, and wheel/pinch zoom
- A field footprint derived from project dimensions
- Non-interactive Konva tile rendering behind the 2D layout
- Layout inspector controls for add/edit, show/hide, opacity, rotation, and remove
- Project JSON keeps map reference metadata, while public shares and share/export payloads strip map imagery and location data

### Bundle Size Reduction (`No account required`)

TrackDraw now keeps more heavy code behind the workflows that need it instead of loading everything with the first editor surface.

Included:

- Reduced avoidable weight in the main Studio toolbar so secondary controls do not all ship in the first editor load
- Kept editor-only interaction code separated from the base 2D canvas path where that lowers startup cost without risking core viewing behavior
- Re-measured the shared 3D preview stack and kept further splitting limited to concrete hotspots
- Confirmed that heavier export dependencies stay fully deferred behind export flows

</details>

## v1.4.0 Archive

<details>
<summary>Completed release work archived with v1.4.0</summary>

### Shared Review Polish (`No account required`)

The shared read-only experience now has a stronger product pass. Mobile 3D controls are cleaner, first-load review framing is clearer, and the path from a shared link into making an editable Studio copy is more intentional.

### Stronger Route Review Warnings (`No account required`)

The existing warning layer now catches more uneven route sections through first-pass rhythm, spacing, and alignment-oriented cues that help refine a lap before export or sharing.

### Snap UX Improvements (`No account required`)

Snapping is now more visible and more consistent across the editor. Desktop and mobile both expose a persistent snap toggle, shape dragging can snap to nearby shapes, and placement, drag, and waypoint editing now share a unified snap resolver.

### Cinematic FPV Export First Pass (`No account required`)

TrackDraw now ships a share-ready cinematic FPV WebM export with stronger FPV camera motion and clearer background progress handling.

### Landing Page Proof Follow-up (`No account required`)

The marketing site now does a better job of showing the shipped draw-review-share workflow, especially around cinematic FPV export, route review, and read-only sharing.

### Editor State And Persistence Boundary Pass (`No account required`)

The editor store now separates track, session, and local UI state more explicitly, action ownership is clearer in code, local draft versus project versus restore-point persistence is more deliberate, and grouped history sessions now better match drag, rotate, and inspector editing intent.

### Test Infrastructure

Vitest is now established as the baseline test runner, with first coverage for store behavior, transforms, export builders, and critical editor-shell component flows.

### File Structure And Module Boundary Pass

Folder ownership and internal module boundaries are now tighter across the editor store, canvas interaction layer, inspector, editor shell, and mobile editor composition, making future follow-up work easier to do incrementally.

</details>

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

### 15. Real-Time Collaboration Evaluation

Evaluate whether TrackDraw should support shared real-time editing, and define the sync, presence, and conflict model before treating collaboration as a committed product surface.

## Recommended Sequence

### v1

The v1 scope is complete. All items are done: project workflow, share route deprecation, share/publish UX, path and flow review (including stub warning), contextual hints, mobile dialogs, onboarding, and codebase refactor.

### Current Roadmap

3. Race-day communication and briefing
4. Layout acceleration (obstacle presets, selection grouping, venue templates)
5. Published share lifecycle controls
6. Velocidrone experimental export follow-up

This sequence keeps the roadmap focused on extending workflow depth rather than plugging product gaps.

</details>

## Supporting Design Docs

- [Obstacle Presets PVA](../pva/obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](../pva/snapshots-layout-variants-design.md)
- [Wrapper Evaluation](../research/wrapper-evaluation.md)
- [PWA Evaluation](../research/pwa-evaluation.md)
