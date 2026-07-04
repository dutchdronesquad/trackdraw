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
- Catalog-backed official MultiGP obstacles including gates, ladders, flags, dive gate, launch gate, and a barrier category for hurdles, banners, fencing, and nets
- Account-backed user presets where users save and reuse named canvas selections across devices
- English, Dutch, and German multilingual product experience with explicit language choice, route-scoped message loading, and CI checks for catalog parity and new hardcoded UI copy

After v1.12.0, the next product focus should be deliberately narrow:

1. Export and handoff workflow polish: rebuild the export dialog around clearer handoff intent, closer to the Project Manager and Share dialog structure, so images, documents, editable data, Race Pack, simulator output, and export limitations are easier to understand.
2. Generated flightpath assistance: prototype route generation from ordered obstacles as an optional editable starting point, not as an authoritative racing-line simulator.
3. Editor reliability polish: harden recovery states, mobile ergonomics, selection/transforms, the Elevation Profile dialog, autosave/account sync edge cases, imports/exports, sharing, read-only viewing, and larger layouts.

Race-day workflow depth, remaining focused 3D controls, account lifecycle depth, custom banner textures, share version history, gallery collections, billing, and community features should stay behind those priorities unless a concrete support issue or release risk forces them forward.

Lower-priority follow-up such as share version history, gallery collections, Velocidrone export stabilization, AR, and build mode should stay parked until there is clearer need.

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
- Failed account sync keeps the latest local copy available and exposes retry/fallback status in the editor
- Project Manager now makes account copies, local copies, and device-only projects easier to tell apart

### 2. Usability And Reliability Pass (`No account required`, `Account-backed`)

TrackDraw is feature-rich enough that small clarity and stability improvements can have more product value than starting another large surface. This track should harden the existing editor, share, export, mobile, and account flows without redesigning the product.

Why now:

- Core editing, sharing, exports, accounts, gallery publishing, embeds, API access, and Race Pack flows now overlap in normal usage
- The account project lifecycle polish reduced a major source of cross-device ambiguity, but the same standard should apply to other failure and recovery states
- Mobile is a supported venue-side workflow, so small friction in drawers, touch targets, labels, and recovery copy has real race-day cost
- Export and share confidence matters because TrackDraw is increasingly used for handoff, briefing, publishing, and integrations

Focus:

- Improve editor recovery and failure states so autosave, import, export, share, account sync, and runtime errors explain what happened and what the user can do next
- Run a mobile editor ergonomics pass across Project Manager, inspector drawers, path builder, multi-select, map reference controls, and app/menu actions
- Harden selection and transform behavior around locked objects, grouped selections, route waypoint editing, snapping, rotation, resize handles, and undo/redo
- Improve export and share confidence by clarifying what each output includes, what is intentionally excluded, and which limitations matter for race-day use
- Stress-test larger layouts and dense projects with map references, 3D preview, PDF/export, and longer routes, then make targeted performance or debounce fixes
- Add regression tests where the risk is high enough: import/export, autosave/recovery, account sync failures, share publish/revoke, mobile project flows, and selection transforms

Important boundary:

- This should be a quality pass over shipped workflows, not a broad redesign
- Do not use this track to introduce new editing modes, social features, or simulation-heavy analysis
- Keep changes small enough that import/export, autosave, share publish/read, read-only viewing, and mobile editor flows can be validated after each slice

Suggested first slices:

- Editor recovery and failure states
  - Started with a local autosave failure state that reports storage/quota failures and offers retry before users continue editing blindly
  - Added clearer import failure states for invalid JSON, wrong file types, unreadable files, and non-TrackDraw project data
  - Added shared JSON export feedback so Project Manager export failures are reported instead of silently ignored
- Mobile editor ergonomics pass
  - Started with larger, more consistent mobile app-menu touch targets for project, share, transfer, account, dashboard, and sign-out actions
  - Added steadier touch targets for path builder, quick adjust, and multi-select overlay actions during mobile editing
  - Improved mobile map-reference controls with larger action targets and easier opacity adjustment
  - Enlarged mobile inspector section headers so collapsible panels are easier to open and close on touch screens
  - Improved mobile Project Manager action targets for opening and scanning local-project actions
- Selection and transform reliability pass
  - Started with store-level locked-shape guards for direct patches, batch patches, and route waypoint edits
  - Added locked-selection guards and shortcut feedback for duplicate/delete paths so shortcuts, context menus, and mobile overlays cannot mutate selections that include locked shapes
- Export/share confidence pass
  - Started by clarifying which exports are read-only visuals, which JSON files are editable backups, what Race Pack is for, and where simulator export remains experimental
  - Moved the export dialog onto the same sidebar-and-panel structure used by Share and Project Manager, with export categories in the sidebar and available outputs plus per-export filename, theme, and route-number settings in the main panel
  - Calmed the export dialog visuals: flattened the nested format/settings cards, gave the format picker a responsive layout (stacked tiles on mobile, inline row on desktop), and gave default export filenames a consistent theme suffix plus a date stamp so repeat exports do not silently overwrite each other
  - Clarified managed shares as read-only review links and JSON export as the editable handoff path
- Performance and large-layout stability
  - Started with bounded dense-grid rendering for SVG/PDF/PNG exports so fine grid settings do not explode export payload size
  - Added long-route obstacle-numbering coverage with bounded route-segment scans for dense gate layouts

#### Regional Measurement Units

International users should be able to work in familiar Metric or Imperial measurement presets without TrackDraw changing its internal geometry model.

Why:

- TrackDraw currently stores, calculates, exports, and validates geometry in meters, which remains the safest shared model for maps, simulation-adjacent outputs, and backwards-compatible project files
- Metric should remain the natural default for most international users, including markets such as Europe, China, and Japan
- Users in places or clubs that expect feet/inches, including US users and some mixed-measurement UK contexts, should not have to mentally convert field size, obstacle dimensions, route length, or setup/export summaries while designing
- Unit support is a core editor usability feature and should remain available without an account
- Browser locale can provide a useful first guess, but venue practice and club expectations can differ from country defaults, so users need an explicit override

Focus:

- Add a simple Metric versus Imperial unit preference with a Metric default that preserves existing project behavior
- Use browser locale signals to choose the first-run unit default when no saved preference exists, then persist the user's override locally and, where appropriate, in account/project settings
- Centralize measurement formatting so field labels, rulers, inspectors, route/elevation summaries, gallery metadata, and export previews stop hard-coding `m`
- Support unit-aware numeric input for common values such as meters, feet, and inches while storing normalized meter values in project data
- Keep JSON/API geometry and speed values meter-based/SI for compatibility, while allowing share/export presentation to use the selected measurement preset

Current shipped foundation:

- Browser-locale-informed Metric versus Imperial default with local manual override
- Shared measurement formatting for core editor chrome, rulers, inspector summaries, gallery cards, import previews, share canvas labels, and visual export labels
- Unit-aware measurement inputs for field settings, selected object dimensions/positions, and route waypoint elevation
- PNG/SVG/PDF/Race Pack presentation follows the selected measurement preset while JSON/API geometry remains meter-based

Important boundary:

- Do not convert stored coordinates, field dimensions, route data, or obstacle dimensions away from meters
- Do not add account-only regional settings as the first slice; the editor needs this for logged-out international users too
- Do not couple measurement units to UI language; translation/localization can be a later track, while this slice focuses on measurement defaults, formatting, and input
- Avoid broad localization work in this slice unless it is required for measurement clarity

#### Multilingual Product Experience

Regional measurement support should be treated as the first locale-aware foundation for TrackDraw, but a multilingual product needs its own rollout plan so translation work does not destabilize the editor.

Why:

- International users may benefit from familiar product language in addition to familiar measurement units
- Locale-aware defaults, preference storage, shared formatting helpers, and text boundaries created for unit support can reduce the later cost of full i18n
- Translation touches high-risk surfaces such as editor tools, import/export recovery, share pages, Race Pack/PDF copy, dashboard moderation, and legal pages, so it needs deliberate QA rather than ad hoc string replacement

Current shipped foundation:

- `next-intl` is integrated without locale routing, preserving existing `/studio`, `/gallery`, `/share/[token]`, and `/embed/[token]` URLs
- Browser language provides the first-run default when no saved language preference exists, while manual language choice remains separate from measurement units
- English, Dutch, and German catalogs cover the public site, editor, share/embed/gallery surfaces, dashboard, dialogs, inspector, exported handoff copy, and metadata/API docs surfaces
- English remains the stable fallback baseline, with route-scoped message loading and a centralized i18n catalog policy
- Locale parity/unresolved-key validation and hardcoded-copy scanning run in CI so new UI copy is intentionally cataloged or explicitly allowlisted

Maintenance focus:

- Keep new product copy behind typed message catalogs instead of reopening hardcoded-copy debt
- Add future languages only when there is enough user demand and maintenance capacity to review FPV terminology, compact UI labels, and export/legal copy
- Continue checking translated UI on desktop and mobile, especially tight inspector panels, buttons, dialogs, share pages, exported PDFs/Race Packs, and legal pages where applicable

Important boundary:

- Do not block regional measurement support on full i18n; units can ship first as a smaller, lower-risk slice
- Do not infer units only from language, because English users can prefer Metric and non-English users can work with Imperial venue expectations
- Do not translate legal pages casually; any material legal translation needs a separate review standard

#### Track Element Catalog

TrackDraw should move from generic element defaults toward a clearer equipment model with official names, dimensions, source references, and reusable placement defaults.

Supporting research document:

- `docs/research/track-element-catalog.md`

Why:

- Real race directors think in named equipment such as standard gates, champ gates, flags, launch blocks, hurdles, and club-specific kits, not just generic shape primitives
- Official names and dimensions should be introduced through a durable catalog so TrackDraw can support MultiGP-style gates and other known objects without silently changing old projects
- A catalog can feed 2D placement, 3D rendering, export metadata, inventory/setup counts, and future account-backed club libraries from one source of truth

Feature tracks:

- Track element catalog: define typed local catalog entries with official names, meter-based dimensions, display dimensions, source references, shape defaults, 2D hints, 3D hints, and export compatibility metadata
- Official equipment entries: expose cataloged official entries such as the MultiGP Standard Gate 5x5 through deliberate placement/library UI rather than hard-coded generic defaults, while keeping custom sizing on the standard TrackDraw Gate and preserving saved-project compatibility
- Element library UI: expose official and custom variants without slowing down the current quick-placement toolbar flow

Important boundary:

- Do not automatically migrate existing projects to official gate dimensions
- Do not make the first element catalog account-backed or database-backed; start local and typed so it is testable and versioned
- Do not copy competitor UI patterns wholesale; adapt useful patterns to TrackDraw's existing editor and handoff workflows

Current shipped foundation:

- A typed local catalog module now holds TrackDraw-provided element entries and source-backed MultiGP-style gate, ladder, and corner flag entries without changing the existing generic element defaults
- Toolbar placement, layout presets, and starter layouts now use shared catalog placement helpers for generic elements, keeping saved geometry meter-based and backwards compatible
- Gate placement can now switch between the generic TrackDraw gate and catalog-backed MultiGP-style 5x5 and 7x6 gate variants through a compact desktop placement dropdown and a compact mobile Gate type picker
- Ladder placement can switch between the generic TrackDraw ladder and catalog-backed MultiGP Standard 5x5, Championship 7x6, and Topless 7x6 ladder variants
- Barrier placement now supports TrackDraw banner, fence, and net entries plus the official MultiGP Hurdle as a separate non-traversable obstacle category with catalog identity, 2D/3D rendering, type switching, inventory counts, and export support
- The inspector shows catalog type, source, official size, and dimension status while keeping official gate width and height fixed in normal editing

Next catalog slices:

- Double Gate Tower 5x5 and 7x6: introduce as a new shape kind with its own 2D representation, 3D rendering, catalog entries, and inspector pipeline; race-line behavior is gate-like (fly through) while the physical structure resembles a two-frame tower

#### Generated Flightpath Assistance

TrackDraw should research generated flightpaths as route-authoring assistance, separate from the element catalog and separate from 3D preview rendering. Research document: `docs/research/generated-flightpath-assistance.md`.

Why:

- TrackDraw already has explicit route authoring, elevation, obstacle numbering, and overlay preparation
- Generated flightpaths may help with first-pass drafting, route review, flythrough preparation, and ambiguous gate-order warnings
- The useful product boundary is whether users can accept and edit a suggested route, not whether TrackDraw can fully simulate an optimal racing line

Feature tracks:

- Generated flightpath research: prototype route generation from ordered elements as an optional starting point that users can accept and edit
- Route ambiguity warnings: explore lightweight feedback for unclear order, direction, or corkscrew-like layouts before adding simulation-heavy path optimization

Current foundation:

- Track item registry now exposes explicit generated-route metadata for clear pass-through obstacles such as gates, ladders, towers, and dive gates
- A pure generated-route module can create an editable Race Line draft from ordered pass-through obstacles and return warnings for unsupported or closely spaced items before any UI commits the result

Important boundary:

- Do not treat generated flightpaths as authoritative until they are validated against real layouts
- Do not replace explicit race-line authoring; generated routes should remain assistive and editable
- Do not bury generated flightpath work under the element catalog or 3D preview work; it should remain a standalone route-authoring feature

#### Editor Workspace Ergonomics

TrackDraw should keep improving dense editor layouts without mixing those usability changes into the track element catalog work.

Why:

- Dense desktop editing benefits from collapsible side panels so users can reclaim canvas space without losing selection context
- Mobile already relies on drawer-style surfaces, so desktop/tablet workspace density should be improved without regressing mobile editor flows
- Workspace preferences are local UI state and should stay separate from saved track geometry and catalog definitions

Feature tracks:

- Collapsible inspector workspace: continue refining the shipped desktop collapse rail only if real usage shows friction around selection context or repeated resizing
- Persistent sidebar density: keep local-only collapse preferences for editor chrome where that improves repeated editing

Important boundary:

- Do not bury workspace improvements under the element catalog; inspector collapse should remain a standalone usability feature
- Do not store workspace density in project files unless it becomes an explicit share/review requirement

Current shipped foundation:

- Desktop users can collapse the inspector from the inspector header into a narrow right-side rail, then reopen it from that rail while preserving the current selection and leaving mobile drawer behavior unchanged
- The left editor toolbar and right inspector collapsed states are persisted locally so repeated desktop editing keeps the chosen workspace density after refresh

### 3. Account-Backed Follow-up (`Account-backed`)

These items are now follow-up work rather than intentionally blocked. The first ownership model is clear enough that they can move forward when priority allows.

#### User-Defined Presets (`Account-backed`)

User-defined presets are now shipped. The four hard-coded presets in `layout-presets.ts` are removed and replaced with an account-backed preset library where users save, name, and reuse their own canvas selections.

Current shipped foundation:

- The hard-coded preset list is removed; the picker shows only user-created presets with an empty state that guides new users toward saving their first preset from a canvas selection
- Users select one or more non-path shapes on the canvas and save them as a named preset; positions are normalized to a centroid-relative coordinate system so placement is anchor-based and consistent with how the existing `placeLayoutPreset` helper works
- Presets are account-backed only; the sidebar presets button is hidden when not signed in, and `addUserPreset` shows a toast error if called without a valid session
- Account presets are fetched on sign-in and cleared on sign-out or account switch; a module-level `lastSyncedUserId` guard prevents double-fetching
- Rename and delete actions are available per preset in the picker UI
- A "Save preset" action is available both from the multi-selection inspector and from the canvas context menu when multiple shapes are selected
- Route lines and paths are never captured in a preset; the `PlaceablePresetShape = Exclude<Shape, PolylineShape>` type enforces this at the type level

Deliberate scope decisions:

- Local-first preset storage for logged-out users was deferred; the first version is account-backed only, keeping the implementation simple and the data model unambiguous
- Local-to-account migration was skipped for the same reason — there is no local preset state to migrate
- A community presets store where users publish and browse each other's presets remains a deliberate future follow-up. Research document: `docs/research/presets-store.md`

Supporting design doc:

- `docs/pva/obstacle-presets-pva.md`

#### REST API Route And Integration Packages

The REST API should separate generic TrackDraw data from consumer-specific integration packages before adding more external consumers such as RaceLink.

Why:

- `/track` is currently the broad account-backed track package, but external tools also need a route-focused contract that describes what is flown rather than every editor-safe object that was drawn
- The existing `/overlay` endpoint is a compact livestream package used by `rh-stream-overlays`, but it is not a generic RotorHazard API and should not become the naming pattern for every integration
- RaceLink-style lighting integrations need route-ordered gates/obstacles, timing markers, and explicit sections/groups without depending on manual export JSON ordering
- A clearer API model avoids a growing set of ad hoc vendor endpoints while still leaving room for integration-specific packages when a consumer truly needs one

Proposed API shape:

- Keep `/api/v1/projects/[projectId]/track` as the drawn layout / geometry package
- Add `/api/v1/projects/[projectId]/route` as the flown route semantics package
- Add `/api/v1/projects/[projectId]/integrations/stream-overlays` as the canonical livestream overlay integration package
- Keep `/api/v1/projects/[projectId]/overlay` as a backwards-compatible alias for the stream overlays package
- Reserve `/api/v1/projects/[projectId]/integrations/[consumer]` for future consumer-specific packages only when the generic `/route` contract is not enough

Route package focus:

- Return route geometry, ordered route elements, timing roles, split indices, route distances, route progress, and route readiness
- Base element order on route progress relative to start/finish, not on JSON array order
- Include explicit `sections` or groups once the product has a stable authoring or derivation model for them
- Make the route package useful for lighting systems, event dashboards, RaceLink-style imports, and other tools that need race-course semantics without a full editor export

OpenAPI/docs follow-up:

- Keep `/track` and `/route` under the Track data group
- Keep `/integrations/stream-overlays` and the deprecated `/overlay` alias under the Integrations group
- Rename any overly broad RotorHazard wording to describe the actual stream overlays integration package
- Document `/overlay` as a backwards-compatible alias and direct new consumers to `/integrations/stream-overlays`

Open questions:

- Should route sections/groups be explicitly authored in the editor, derived from route patterns/naming, or both?
- Should the public API call drawn editor objects `shapes` for continuity, or expose them as `objects` while keeping `shapes` as internal/editor terminology?
- What minimal fields does RaceLink need for track elements, gate groups, and lighting zones before a vendor-specific adapter would be justified?

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

Possible later idea (not yet scoped, separate task):

- Retention policy for long-inactive published shares, roughly a one-year inactivity window, distinct from the existing 30-day cleanup of revoked/expired shares — needs its own definition of "inactive" and an owner notice before anything is removed

#### Share Version History (`Lower priority`)

Account-backed shares should support deliberate publish history so owners can update a published track without making existing links feel mysterious or losing the last known-good public version.

Why:

- Published links are increasingly reused through share pages, gallery cards, and future embeds
- Owners need a safer way to update a published track without losing the last known-good public version
- Version history fits account-backed shares better than anonymous one-off shares, because rollback and ownership need durable identity

Focus:

- Store each deliberate publish or update as a timestamped immutable published version
- Make the current public version explicit in the share management UI, public share metadata, and dashboard share lifecycle inspector
- Let owners compare recent published versions at a practical summary level before restoring one
- Let owners restore a previous version as a new current version instead of mutating old history in place
- Keep gallery entries, embeds, QR codes, and canonical `/share/[token]` links pointed at the current public version unless a future deep-link model is deliberately added
- Keep anonymous shares simple and expiry-based; do not add version management to logged-out publishing

Suggested first slices:

- Published version data model
  - Add a durable published-version record linked to the account-backed share and project
  - Snapshot the normalized public share payload, title/description metadata, preview image reference where available, and publish timestamp
  - Preserve the existing share token as the stable public address while separating current version from version history
- Owner publish/update flow
  - Make updating an already-published share an explicit action that creates a new version
  - Show the current published version timestamp and whether the editor has unpublished changes
  - Keep one-click copy/open/revoke actions intact so share management does not become heavy
- Version review and restore
  - Show recent versions with timestamp, editor title, gallery metadata where available, and lightweight layout summary such as field size and obstacle count
  - Restore by publishing the selected historical snapshot as a new latest version
  - Avoid full visual diffing in the first slice unless ordinary summaries are not enough
- Operator visibility
  - Surface current version, latest update time, version count, gallery state, and embed availability in the dashboard share lifecycle inspector
  - Keep dashboard actions narrow: inspect, open, and support owner/admin actions already allowed by the current share and gallery model

Important boundary:

- This is share publish history, not full project version control
- Do not add branching, named release channels, collaborative approval, or public version browsing in the first pass
- Do not expose private project history through public gallery, embeds, or share metadata

#### Gallery Featured Collections (`Lower priority`)

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

#### Dashboard Operator Tooling (`Lower priority`)

The dashboard should become the control surface for public, account-backed, and integration-sensitive behavior without turning TrackDraw into a social platform or support console that can casually mutate user work.

Why:

- Public gallery tracks, embeds, API keys, and overlay integrations now create operational states that owners and moderators need to trust
- Admins need faster ways to review public track quality, inspect share state, and understand account/project issues without digging through database records
- API and overlay usage should be observable enough to debug integration problems before adding deeper public API or live-race features

Focus:

- Gallery collections management: add dashboard controls for creating, ordering, publishing, and assigning curated gallery collections
- Share lifecycle inspector: expose share owner, project, token state, expiry/revocation, gallery listing, embed availability, and latest publish/update metadata in one operator view
- Contextual account/project diagnostics: add inspect affordances inside existing Users, Gallery, Share, API, and Audit surfaces instead of a standalone diagnostics page
- API usage dashboard: show API key activity, last-used timestamps, rate-limit hits, endpoint error patterns, and overlay readiness/API usage signals for account projects — started with a /dashboard/api-keys page listing all keys across accounts with status, request count, last-used, expiry, and a clickable inspect sheet showing rate limit config, permissions, and owner details

##### Contextual Account/Project Diagnostics

Contextual diagnostics should help operators answer "what state is this account, project, share, or integration in?" from the dashboard surface where the question naturally appears.

Why:

- Account sync, published shares, gallery listing, embeds, API keys, and overlay readiness can fail or look confusing in ways users will report as one support problem
- Operators need lightweight inspection paths across users, projects, shares, gallery entries, API keys, and audit events
- Contextual inspection should reduce database digging while preserving the product's privacy posture and local-first editing model
- A standalone diagnostics page is not the preferred first slice; it creates a weak extra destination and duplicates existing dashboard modules

Suggested first slices:

- Gallery/share inspect drawer
  - Started with a read-only inspect drawer on dashboard gallery rows that surfaces owner, share token, share lifecycle, gallery state, description, share title, field size, element count, preview media state, publish/update dates, copy/open share actions, copyable owner user ID, share type badge, embed availability (with link), project ID (copyable), share created/updated dates, and expiry/revocation detail; rows are now clickable to open the drawer directly
- User context panel
  - Started with a user detail/inspect sheet from the Users table surfacing role badge, created/updated dates, last login, account-backed project count, active share count, gallery entry count, and API key count in a stats strip, recent account audit events, and a separate change-role section with self-role-change protection
- Project context panel
  - Surface account-backed project ID, owner, title, updated timestamp, active published share state, gallery state, API project ID, overlay readiness, field size, obstacle count, route presence, and timing-marker readiness
  - Keep raw project design data out of contextual diagnostics except for safe summaries
- Entity timeline links
  - Link from users, gallery entries, share tokens, projects, and API keys into a filtered audit timeline when audit events already exist
  - Include account, project sync, share publish/revoke, gallery visibility, API key lifecycle, and dashboard moderation events where already audited
- Diagnostic copy
  - Use "what happened / where to go next" labels over internal database terminology
- Narrow operator actions
  - Allow safe actions that already fit the current admin model, such as open public share, copy project/API IDs, open owner profile, open audit trail, and navigate to gallery moderation
  - Keep destructive or privacy-sensitive actions out of the first slice unless they already exist behind explicit role checks elsewhere

Diagnostics boundary:

- This is contextual visibility, not impersonation
- Do not create a standalone diagnostics dashboard page as the first slice
- Do not let operators edit a user's private project design from diagnostics surfaces
- Do not expose API key secrets, local-only browser projects, private map location metadata beyond existing owner-visible surfaces, or raw project JSON by default
- Do not add account takeover or password/session management flows in this slice

Important boundary:

- Keep dashboard features operator-focused and permissioned
- Do not add public reporting, voting, comments, or moderation queues unless a later product decision explicitly expands the gallery model
- Prefer read-only inspection and narrow existing actions before adding powerful support mutations

### 4. Race-Day Follow-up (`No account required`, `Account-backed`)

TrackDraw now has a real Race Pack, numbering handoff, shared-view QR codes, and explicit timing markers. The immediate QR/timing-marker slice is archived with v1.6.0; the remaining work here is broader race-day operations follow-up.

Current first pass:

- PDF export now includes a dedicated Race Pack variant
- The Race Pack now ships as a multi-page race-day document with a cover page, track map, material list, inventory/buildability status, setup sequence, and initial timing/build guidance

Later slices:

- Race director page once TrackDraw can extend the existing start/finish and timing-marker foundation with the supporting race-day metadata and ops elements it depends on, including pilot line, director position, timing/start box placement, cable routing, and ops notes
- Route duration estimate follow-up where the estimate helps race-day setup, timing/overlay preparation, or briefing copy without presenting it as a guaranteed race result prediction
- Validation against real heats before relying on route duration estimates as a preferred baseline

Important boundary:

- The Race Pack is now the handoff document for briefing, print, and sharing
- A future Build mode should be treated as a separate operational product surface, not as "just a bigger PDF"
- Live race overlay rendering, OBS presentation, RotorHazard event handling, and position estimation should stay in `rh-stream-overlays`, not in TrackDraw

### 5. Backlog And Research Tracks

These remain valuable, but they are not the current build target.

#### 3D Editor Interaction Polish (`No account required`)

Keep smoothing the direct-manipulation parts of the 3D preview where they noticeably speed up venue-side editing.

Recent shipped progress:

- Floating ladders now have a first practical editing pass through ladder elevation, direct 3D raise/lower handles, clearer handle styling, and live inspector feedback while dragging

Suggested follow-up:

- Keep refining floating ladder placement so the controls stay easy to read and adjust in dense layouts and mobile-sized screens
- Continue only with narrow, high-confidence 3D controls that improve placement speed without turning the preview into a heavy general-purpose modeling surface

#### Custom Banner Textures (`Account-backed`)

The MultiGP texture-based obstacle approach creates a clear path for user-owned, club-specific, or sponsor-specific printed banners while still reusing official hardware dimensions. This should be account-backed so uploaded artwork can be linked to a user, reused across projects, and rendered reliably in shares, gallery entries, and flythrough exports.

Suggested first slices:

- Let users attach custom front-facing artwork to official-size gate side panels, gate top panels, ladder sections, and feather flags
- Start with account-owned image uploads mapped onto existing MultiGP 5x5, 7x6, ladder, and flag geometry
- Store uploaded banner artwork in Cloudflare R2 with database metadata for `ownerId`, optional `projectId`, panel target, dimensions, MIME type, aspect ratio, R2 key, and lifecycle state
- Use stable media URLs or a controlled `/api/media` path for editor preview, shares, gallery cards, and flythrough rendering instead of embedding user artwork directly into project JSON
- Generate lightweight previews or normalized derivatives where needed so the editor does not have to load oversized print-resolution artwork for every 3D frame
- Preserve the official catalog items as locked dimension presets, while allowing artwork overrides as a separate visual layer
- Add aspect-ratio validation and crop/fit controls so uploaded banners do not silently distort on real-size panels
- Include custom artwork in share/export/flythrough outputs through account-backed asset URLs with explicit ownership and access rules

Important boundary:

- Do not turn TrackDraw into a general texture editor; keep the first version focused on replacing banner artwork on known official-size surfaces
- Require an account for custom banner artwork so assets have a durable owner, can be reused across projects, and do not depend on fragile browser-local files

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

#### Build Mode / Setup Sequence (`No account required`)

Turn a finished layout into a dedicated build/setup surface instead of continuing to expand the Race Pack, but keep it as a later workflow track rather than a near-term roadmap focus.

Suggested first slices:

- Dedicated build-mode view
- Map-linked setup steps
- Grouped build phases and check-off flow
- Crew and venue assumptions

#### Comments And Review Mode (`Account-backed`)

Allow feedback to be anchored to obstacles or route sections, but keep it as a later follow-up behind the more pressing design, handoff, account, and publishing tracks.

Why later:

- Simple note-taking is plausible, but the more meaningful version depends on identity, ownership, and shared project context
- Richer review workflows are easier to define once account ownership and publishing boundaries are clearer

Suggested first slices:

- Pinned notes anchored to a selected obstacle as a local-first first pass
- Notes anchored to a route waypoint or path segment without requiring identity first
- Read-only review mode that surfaces notes clearly without exposing editing tools
- Richer threaded comments only if simple anchored notes prove useful
  and an account-backed identity model exists

#### Usage Analytics And Event Tracking (`Account-backed`)

TrackDraw has Tier 1 internal metrics covering user population, content health, weekly growth, and plan limit simulation. Tier 2 requires a lightweight event log to answer questions that cannot be derived from the existing tables.

Supporting research document:

- `docs/research/admin-metrics-analytics.md`

Why:

- Share link view counts, export format distribution, 3D preview adoption, and element placement frequency cannot be derived from aggregate table queries alone
- These signals are useful for understanding real usage patterns over time
- A single narrow `events` table is enough for the first slice without requiring external analytics tooling

Focus:

- Add a `product_events` table separate from the existing `audit_events` table (audit events are identity-sensitive and actor-linked; product events can be anonymous and have a different retention lifecycle)
- Schema: narrow, privacy-safe — event name, nullable session ID, nullable user ID, nullable project ID, nullable share token, timestamp. No IP addresses, no fingerprinting, purgeable per user on account deletion
- Instrument the highest-value events first: `share.viewed`, `export.completed`, `editor.3d_opened`, `editor.element_placed`, `project.imported`
- Surface aggregate event data in the existing admin Metrics page alongside Tier 1 query metrics

Important boundary:

- Do not store personal data or device identifiers in events
- Do not add event tracking to private editor operations or account management flows
- Keep the event schema narrow; resist adding fields that are not needed for a specific metric

#### Research Tracks (`Research`)

- Velocidrone experimental export follow-up
  - The core compatibility question is answered: TrackDraw can already generate an experimental `.trk` file that imports into Velocidrone
  - Next step is validation and orientation correctness, especially gate front/back direction
- Desktop and mobile wrapper evaluation

### 6. Accounts Boundary

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
- Identity-aware comments and review threads

## v1.12.0 Archive

<details>
<summary>Completed release work to archive with v1.12.0</summary>

### Multilingual Product Experience (`No account required`)

TrackDraw now has a full multilingual product layer across the public site, Studio, share/embed/gallery surfaces, dashboard, dialogs, inspector, exported handoff copy, and metadata/API docs. English, Dutch, and German are supported through explicit language choice and browser-language first-run defaults, while existing routes such as `/studio`, `/gallery`, `/share/[token]`, and `/embed/[token]` stay unchanged.

Included:

- next-intl integration without locale routing, preserving existing route and share-link compatibility
- Route-scoped message loading, persisted locale preference, server-side locale/message resolution, and a language picker that works without an account
- Dutch rollout across editor, dialogs, inspector, dashboard, gallery, share/embed views, export/PDF/Race Pack copy, and shared shape/tool vocabulary
- German locale support on the same route-stable i18n foundation
- Follow-up copy QA for Dutch and German terminology, missed strings, compact labels, account/delete/export copy, and `Path`/`waypoint` terminology
- Centralized i18n catalog policy, locale parity/unresolved-key checks, hardcoded-copy scanning in CI, and an exception-only hardcoded allowlist baseline

### Open-Source Licensing Update

TrackDraw source code is now licensed under AGPL-3.0-only. Package metadata, README license copy, and NOTICE guidance were updated to clarify source-code licensing versus the TrackDraw name, logo, brand assets, hosted service, and user-created content.

### Research And Roadmap Alignment (`Research`)

Added product-shape research for generated flightpath assistance, the presets store, and RotorHazard event viewer integration, then refreshed roadmap/research references so those future tracks are documented without turning them into the current build target.

### User Account Moderation (`Account-backed`)

Admins can now temporarily ban or permanently delete a user account from the Users dashboard, alongside the existing role-change action. Ban and deletion are separate, individually confirmed, individually audited actions, and both block targeting your own account the same way role changes already do.

Included:

- Temporary ban via `banned_at` plus a reason chosen from a predefined list (with a free-text "Other" option), ending active sessions immediately and fully reversible without touching any owned data
- Permanent deletion that cascade-deletes owned projects, shares, gallery entries (including R2 preview images), and API keys, following the app's existing explicit-cascade pattern rather than relying on DB-level FK cascades
- A delete confirmation dialog requiring the account's email to be typed, showing live counts of what will be removed, and explicitly warning that published gallery tracks and embeds disappear too
- A compact moderation row in the Users inspect sheet, alongside the existing change-role action

</details>

## v1.11.0 Archive

<details>
<summary>Completed release work archived with v1.11.0</summary>

### Dashboard Operator Tooling (`Account-backed`)

Admins and moderators can now inspect the state of specific accounts, shares, and API keys from within the existing dashboard surfaces without digging through database records.

Included:

- User inspect sheet opened from the users table, showing a stats strip (projects, active shares, gallery entries, API keys), role badge, last login, created date, recent audit events, and a change-role section with self-role-change protection
- Gallery inspect dialog opened from gallery rows, showing share type, embed availability with a direct link, project ID, share created/updated dates, expiry and revocation detail, owner, gallery state, and preview media status
- API keys overview at `/dashboard/api-keys` listing all keys across all accounts with status badge, request count, last-used timestamp, and expiry; clickable rows open an inspect sheet with rate limit config, permissions, key prefix, and owner details
- Admin metrics dashboard with user population breakdown, active share and gallery counts, and an active API keys KPI

### Client-State Persistence Consolidation (`No account required`)

Editor and unit preference state that was spread across multiple localStorage patterns is now unified under Zustand `persist` stores.

Included:

- `useMeasurementUnitSystem` migrated from a manual `useSyncExternalStore` + custom event pattern to a Zustand `persist` store; legacy raw-string storage format is migrated transparently on first read with no change to the hook interface
- `useEditorHints` migrated from five separate localStorage keys with manual get/set/remove calls to a single Zustand `persist` store under `trackdraw.editorHints`; all dismissed-hint states are stored as one JSON object, making `resetGuidedHints` a single store reset with no change to the hook interface

### User-Defined Presets (`Account-backed`)

The four hard-coded layout presets are replaced with an account-backed preset library. Users select any combination of non-path shapes on the canvas, name the selection, and save it as a reusable preset. Presets sync with the account on sign-in and are cleared on sign-out or account switch. The preset picker is hidden when not signed in. Rename, delete, and empty-state guidance are included. A "Save preset" action is available from both the canvas context menu and the multi-selection inspector. Local-first storage and local-to-account migration were intentionally deferred.

### 3D Route Maneuver Review (`No account required`)

The 3D route review surface now surfaces maneuver curve quality for powerloops, split-S, and similar moves with geometry-driven feedback. Route curves are rendered more accurately and consistently across elevation changes.

</details>

## v1.10.0 Archive

<details>
<summary>Completed release work archived with v1.10.0</summary>

### 3D Preview And Direct Manipulation (`No account required`)

The 3D scene now has a gradient sky and improved lighting, with better consistency across track layouts and no fog artifacts in dark or light export themes. Catalog-backed MultiGP gates, ladders, corner flags, dive gates, and launch gates render with correct panel dimensions, accurate texture orientations, and double-sided materials. Red color variants are available for standard and championship gate types. Tower elevation can now be adjusted directly in the 3D preview within a bounded elevation range. Tower and ladder rendering is more refined, with better proportions and placement behavior.

### Path Editing UX (`No account required`)

Curve smoothing in path drawing mode is now more visible and predictable. Drawing interactions are more responsive, with improved handling of drag start, curve point placement, and visual feedback while sketching a path. These improvements are backwards-compatible with saved project geometry.

</details>

## v1.9.0 Archive

<details>
<summary>Completed release work archived with v1.9.0</summary>

### MultiGP Catalog Expansion (`No account required`)

TrackDraw now supports a broader official MultiGP obstacle set, including Corner Flags, Standard Ladder 5x5, Championship Ladder 7x6, and Topless Ladder 7x6. These entries use catalog-backed identity, real dimensions, source references, placement/type switching, and recognizable visuals across the editor, 3D preview, exports, shared views, and flythroughs.

### 3D Review And Texture Handling (`No account required`)

Catalog-backed MultiGP gates, flags, and ladders now render with more realistic textured panels and cleaner 3D behavior. The 3D view warms only the textures used by the current design, and direct controls around catalog obstacles are more dependable for selection, rotation, flag updates, and ladder elevation.

### Catalog Editing And Track Items (`No account required`)

Catalog type switching now works better after placement, including batch edits, so users can change sets of gates, flags, or ladders without rebuilding them. The track items list also has clearer catalog-aware names and filters to make placed elements easier to find and inspect.

### Route Editing Reliability (`No account required`)

Path and waypoint selection is more reliable while editing, especially on mobile and when adjusting elevation in 3D. Route warning geometry now stays aligned with the visible 3D track line by sharing the same height offset as the main route tube and preview points.

</details>

## v1.8.0 Archive

<details>
<summary>Completed release work archived with v1.8.0</summary>

### Official Gate Catalog (`No account required`)

TrackDraw introduced a catalog-backed element model for official gate types, including MultiGP-style Standard Gate 5x5 and Championship Gate 7x6. These entries include official names, dimensions, source references, placement selection, inspector identity, in-place type switching, and catalog-driven rendering across editor, 3D, share, and export paths.

### Regional Measurement Units (`No account required`)

TrackDraw added Metric and Imperial display/input support while keeping project geometry stored in meters. Browser locale can choose the first-run default, users can override it, and editor labels, inspectors, gallery metadata, share views, and exports now present measurements in the selected unit system.

### 3D Preview Readability (`No account required`)

The 3D preview became clearer and more consistent with a shared scene theme, stronger lighting and shadows, cleaner large-track rendering, and less visual noise from route-line shadows.

### Workspace Ergonomics (`No account required`)

Desktop users can collapse the inspector into a narrow rail to reclaim canvas space while preserving selection context. Local workspace preferences keep repeated editing sessions closer to the user's chosen layout.

</details>

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
