# TrackDraw Roadmap

This roadmap reflects the current state of TrackDraw and is updated with each release.

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
- Account-backed REST API with API key management and a live race overlay data endpoint

The most useful next product move is deepening the race-day workflow and refining the account-backed project model:

- Race director page with pilot line, timing/start box placement, and ops notes
- Share version history so owners can update a published track without surprising existing links
- Gallery collections for curated browsing beyond the current featured bucket

Larger product ideas such as real-time collaboration, venue libraries, and build mode should stay parked until there is clearer need.

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

TrackDraw now has the first account foundation in place through sign-in, profile management, role-aware dashboard access, and internal role management. The next question is how far account-backed project continuity should go beyond that shipped foundation.

Supporting product-shape document:

- `docs/research/accounts-project-sync.md`

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
- Account project sync detects stale cross-device saves and asks the user to review versions instead of silently overwriting the newer account copy
- Failed account sync keeps the latest browser copy available locally and exposes retry/fallback status in the editor
- Project Manager now makes account copies, browser copies, and device-only projects easier to tell apart

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

### 3. Race-Day Follow-up (`No account required`, `Account-backed`)

TrackDraw now has a real Race Pack, numbering handoff, shared-view QR codes, and explicit timing markers. The immediate QR/timing-marker slice is archived with v1.6.0; the remaining work here is broader race-day operations follow-up.

Current first pass:

- PDF export now includes a dedicated Race Pack variant
- The Race Pack now ships as a multi-page race-day document with a cover page, track map, material list, inventory/buildability status, setup sequence, and initial timing/build guidance

Later slices:

- Race director page once TrackDraw can extend the existing start/finish and timing-marker foundation with the supporting race-day metadata and ops elements it depends on, including pilot line, director position, timing/start box placement, cable routing, and ops notes

Important boundary:

- The Race Pack is now the handoff document for briefing, print, and sharing
- A future Build mode should be treated as a separate operational product surface, not as "just a bigger PDF"
- Live race overlay rendering, OBS presentation, RotorHazard event handling, and position estimation should stay in `rh-stream-overlays`, not in TrackDraw

### 3. Real-Time Collaboration Evaluation (`Research`)

Evaluate whether TrackDraw should support shared real-time editing for race track design, but do not actively invest in enabling collaboration until the sync, presence, and conflict model clearly justify the editor complexity.

Suggested first slices:

- Decide whether the first live multi-user step should be presence-only, a host-led review session, or true co-editing
- Define the sync model and conflict handling approach only if a shared editing surface still looks strategically justified
- Decide how local-first editing and offline behavior should interact with any live session model
- Treat host-led review with optional presence as the strongest smaller step if TrackDraw wants live collaboration-adjacent value before full co-editing
- Only revisit active co-editing investment after the editor state, persistence, and undo boundaries are stronger for the solo workflow too

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

### 5. Accounts Boundary

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

## v1.7.0 Archive

<details>
<summary>Completed release work archived with v1.7.0</summary>

### UI/UX Polish And Reliability Pass (`No account required`)

Shipped workflows across Project Manager, Account, share, export, mobile, and editor now feel more consistent and self-explanatory. Selection, locked states, destructive actions, disabled states, touch targets, and inspector feedback are more predictable across desktop and mobile.

### REST API And Integration Surface (`Account-backed`)

TrackDraw now has a versioned REST API as an account-backed integration surface for external tools, starting with read-only access to account projects and compact livestream overlay data.

Included:

- Browser-session API key management for signed-in users: create named keys with configurable expiry (7/30/90 days or 1 year), view active keys with last-used timestamps, and revoke at any time
- Bearer-authenticated project reads at `/api/v1/me`, `/api/v1/projects`, `/api/v1/projects/[projectId]`, and `/api/v1/projects/[projectId]/track`
- Livestream map-overlay data at `/api/v1/projects/[projectId]/overlay`, including route data, numbered obstacles, timing markers with split indices, route positions, overlay readiness status, and an optional estimated lap duration
- OpenAPI documentation at `/api/v1/openapi.json` and `/api/docs`
- API key throttling, stable rate-limit errors, audit events, cleanup behavior, and test coverage for the shipped v1 boundaries
- API project ID visible and copyable from the Project Manager

### Live Race Overlay Preparation (`Account-backed`)

TrackDraw's side of the live race overlay integration is complete. Account projects are ready to use with [rh-stream-overlays](https://github.com/dutchdronesquad/rh-stream-overlays).

Included:

- Overlay-preparation validation: readiness status (`ready` or `blocked`) with specific issue types for missing route, missing start/finish, duplicate timing IDs, timing points off-route, and ambiguous multi-route setups
- Split-index support for each timing marker so `rh-stream-overlays` can display per-split progress
- Optional route-duration estimate in the overlay package, including estimated lap time, assumed speed, source, and confidence flag

Out of TrackDraw scope: OBS-facing map overlay rendering, RotorHazard event ingestion, pilot position estimation, and live race control.

</details>

## v1.6.0 Archive

<details>
<summary>Completed release work archived with v1.6.0</summary>

### Race-Day Handoff Next Slice (`No account required`)

The Race Pack now connects printed and on-screen briefings back to canonical shared views, and timing hardware placement is clearer in both the editor and handoff output.

Included:

- Shared-view QR codes in Race Pack output, tied to active published account-project shares with a clear fallback when no share exists
- Timing gate markers for start/finish and split hardware placement
- Editor and Race Pack surfacing for timing roles so future race director and overlay preparation work can build on explicit metadata instead of ad hoc notes

### Admin Dashboard Operations Follow-up (`Account-backed`)

Operator-facing dashboard surfaces are now more consistent and easier to scan across gallery, users, and audit workflows.

Included:

- A consistent dashboard table toolbar with search and facet filters
- Gallery state and share lifecycle filters for active, expired, revoked, and gallery-linked shares
- User role filters for account administration
- Audit category/action filters, clearer entity labels, and action detail views
- A dashboard boundary that keeps public reporting out of scope while preserving operator-driven gallery and support workflows

</details>

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

## Supporting Design Docs

- [Obstacle Presets PVA](../pva/obstacle-presets-pva.md)
- [Snapshots And Layout Variants Design](../pva/snapshots-layout-variants-design.md)
- [Wrapper Evaluation](../research/wrapper-evaluation.md)
- [PWA Evaluation](../research/pwa-evaluation.md)
