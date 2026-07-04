# Changelog

All notable shipped changes to TrackDraw should be documented in this file.

This changelog is intentionally concise. GitHub Releases and Release Drafter can continue to carry the fuller change list.

## [Unreleased]

### Export handoff clarity

The export dialog now uses the same sidebar-and-panel structure as Share and Project Manager, with export categories in the sidebar and the available outputs plus their filename, theme, and route-number settings scoped to the active category. The format picker adapts to a stacked layout on mobile, and default export filenames now include a date so repeat exports do not silently overwrite each other.

## [1.12.0]

### Multilingual experience

TrackDraw now supports English 🏴󠁧󠁢󠁥󠁮󠁧󠁿, Dutch 🇳🇱, and German 🇩🇪

TrackDraw uses your browser language as the first default when possible, and you can change the language separately from your measurement units. The translations were created with AI assistance, so please open an issue if you spot wording that is incorrect or unclear.

### Open-source licensing

TrackDraw source code is now licensed under AGPL-3.0-only. This applies to the application source code, while the TrackDraw name, logo, brand assets, hosted service, and user-created content remain separate from the code license.

## [1.11.0]

### Barriers

TrackDraw now has a dedicated barrier category for obstacles that mark field boundaries, block sightlines, or serve as physical separators rather than fly-through gates. The first barrier set includes the MultiGP Hurdle with official dimensions and artwork, and TrackDraw banner, fence panel, and net entries for free-sized barrier variants.

Barriers work the same way as gates and ladders: placement from the toolbar, type switching in the inspector, 2D and 3D rendering, inventory counts, and Race Pack material output.

### Track section library

Users can now save their own reusable track sections. Select any combination of shapes on the canvas, give the selection a name, and save it to a personal section library. Sections are account-backed and available across devices when signed in.

The four hard-coded starter sections are replaced by this user-created library. The section picker shows only your own sections, with guidance for saving a first section from a canvas selection. Rename and delete actions are available per section.

### 3D route maneuver review

The 3D route review surface now highlights detected powerloop and split-S sections for quality review. Route curves are rendered more accurately and consistently across elevation changes.

## [1.10.0]

### MultiGP Dive Gate and Launch Gate

TrackDraw now supports the MultiGP Dive Gate 7x6 and Launch Gate 7x6. Both obstacles use real dimensions, textured panels, and correct proportions in the editor, 3D preview and exports. Existing designs with a legacy dive gate size are migrated automatically. Red color variants are also available for standard MultiGP gate types.

### Improved 3D scene

The 3D view now shows a gradient sky, giving the scene more depth and a cleaner backdrop. Lighting is also improved, with better consistency across the track and no fog artifacts in dark or light export themes. Towers can now be adjusted for elevation in 3D, matching the same inspector controls already available for other obstacles. Tower and ladder rendering is also more refined, with better proportions and placement behavior.

### Smoother path drawing

Curve smoothing in path drawing mode is more visible and predictable. Drawing interactions feel more responsive, with better handling of drag start, curve point placement, and visual feedback while sketching a new path. Elevation controls in the 3D view are hidden for locked paths to avoid confusion.

### Corner Flag improvements

MultiGP Corner Flags now render correctly on both sides in 3D, with double-sided textures applied across all color variants.

## [1.9.0]

### More MultiGP obstacles

TrackDraw now supports more official MultiGP obstacles: Corner Flags, Standard Ladder 5x5, Championship Ladder 7x6, and Topless Ladder 7x6. They use real dimensions and recognizable MultiGP visuals across the editor, 3D preview, exports, shared views, and flythroughs.

### Cleaner 3D review

MultiGP gates, flags, and ladders now feel closer to the real obstacles in 3D, with textured panels and cleaner placement behavior. Textured obstacles also load more smoothly because TrackDraw warms only the textures used by the current design. Selection, rotation, flag updates, and ladder elevation controls are more dependable around catalog obstacles.

### Faster catalog changes

Catalog type switching is easier after placement, including batch edits. You can change a set of gates, flags, or ladders without deleting and rebuilding them. The track items list is easier to scan too, with clearer names and filters for finding the elements you want to inspect or adjust.

### Smoother route editing

Path and waypoint selection is more reliable while editing, especially on mobile and when adjusting elevation in 3D. Route warnings in the 3D view now stay aligned with the visible track line, so warning segments match what you see on the course.

## [1.8.0]

### Official gate types

TrackDraw now includes common MultiGP-style gate types, including Standard Gate 5x5 and Championship Gate 7x6. The regular TrackDraw Gate is still available when you want to choose your own size.

Official gate types keep their correct size, colors, frame details, and branding in the editor, exports, 3D preview, and flythrough videos. You can also change an existing gate to another type without deleting it first. Its position, rotation, race-line connections, and timing markers stay in place.

### Metric and Imperial units

TrackDraw can now show measurements in Metric or Imperial units. It picks a sensible default from your browser, but you can change it yourself. You can enter common feet and inches values, while project files stay compatible by storing the design in meters.

### Clearer editing and previews

On desktop, the right-side editor panel can now collapse into a narrow rail so you have more room for the track. Your selected item stays selected, and the left toolbar remembers whether it was collapsed after a refresh.

The 3D preview now has clearer lighting and cleaner shadows in the editor, shared views, and gallery previews. Large tracks should look more consistent, and the race line no longer casts a dark line on the ground.

## [1.7.4]

### Safari waypoint editing fix

Waypoints on race lines can now be selected and dragged reliably in Safari again. This restores path refinement for Safari users while keeping the existing Chrome behavior unchanged.

## [1.7.3]

### Smoother path editing

Path point editing on desktop now feels less jumpy around grid and route snapping. The editor also explains snap on/off more clearly, including when snapping follows nearby grid positions, objects, and route points.

### Clearer route review guidance

Route review warnings are easier to understand and prioritize. Hairpins now show as high-priority warnings, important warnings stay visible in summaries instead of being hidden behind informational notes, and the elevation chart details use clearer language for short correction segments instead of vague alignment wording.

### Dashboard gallery inspection

Dashboard gallery rows now include a read-only Inspect action so operators can review owner, share lifecycle, gallery state, field size, element count, preview media, and share links without leaving the gallery table. The inspection dialog also gives a cleaner review summary before opening or copying a public share.

## [1.7.2]

### Easier public discovery

TrackDraw is now presented more clearly as a drone race track builder across public pages, browser titles, and link previews. The Studio and gallery have clearer search titles, the sitemap now includes Studio and public gallery track links, and public gallery tracks can appear as their own discoverable share pages while private, expired, and unsupported links stay out of search results.

### Richer public track previews

Public track pages now expose richer preview details for search engines and social cards, including gallery titles, descriptions, preview images, field size, and obstacle counts where available. TrackDraw also now safely serializes structured data before injecting it into pages, so gallery-provided text cannot break out of JSON-LD script tags.

### Public service pages

TrackDraw now includes public Privacy Policy and Terms of Service pages, linked from the footer, so account, sharing, gallery, embed, and API behavior has clearer public service guidance.

## [1.7.1]

### Cloud sync conflict resolution

When a cloud project and a local copy have both changed since the last sync, TrackDraw now detects the conflict and asks which version to keep instead of silently overwriting one of them. The Project Manager distinguishes account-backed projects from device-only copies, and sync failures now offer a retry option with clearer error feedback.

### Locked shape protection

Locked shapes are now fully protected from accidental edits. Move, delete, duplicate, nudge, and rotate actions are blocked while a shape is locked, with a toast explaining why the action was skipped.

### Shared design import fixes

Opening a shared link in Studio now correctly clears the token from the URL after the editable copy is saved, including when the initial save fails and the user recovers via the retry toast. The embed viewer and share viewer no longer show "Untitled track" as a placeholder when the design already has a title.

## [1.7.0]

### API keys and external integrations

Signed-in users can now create API keys from account settings to connect TrackDraw with external tools. Keys have a configurable expiry and can be revoked at any time. Account projects are accessible through a read-only REST API, including full track geometry and a compact overlay data package for each project.

### RotorHazard livestream overlays

Account projects are now ready for use with [rh-stream-overlays](https://github.com/dutchdronesquad/rh-stream-overlays) to display live race overlays during FPV events. The overlay data includes the route, obstacles, timing markers with split indices, and a readiness check that flags any setup issues before race day. The Project Manager shows the API project ID with a copy button to make connecting the integration straightforward.

### Smoother mobile editing and exports

Mobile editing now gives clearer feedback for locked selections, connected paths, inspector sections, and export choices. The mobile export drawer can switch to the 3D view when needed, and the route-number export option is labeled more explicitly.

## [1.6.0]

### Race timing markers

Gates can now be marked as start/finish or split timing points from the inspector. Timing markers use clearer colors across the editor, 3D preview, SVG export, and Race Pack output so race-day anchors are easier to spot.

Race Pack PDFs now include a dedicated timing-points section when a layout has assigned race timing markers.

### Better mobile map reference setup

Map reference setup has been rebuilt around a smoother mobile drawer flow. Location search, result selection, two-finger map movement, pinch zoom, rotation control, and drawer dragging now behave more predictably on touch devices.

The mobile map reference flow also keeps latitude and longitude details out of the way, so setup stays focused on finding the venue and aligning the field.

### Easier mobile editing

Small shapes are easier to select and move on touch devices, especially gates that sit directly on top of the race line. Mobile dragging also avoids over-eager route and axis snapping, so obstacle placement feels less jumpy while refining a layout.

### Race Pack shared-view QR

Race Pack PDFs now include a scan block for the canonical published share when the current account project already has an active published link. If no published share exists yet, the Race Pack explains that publishing the project first will add the scan code.

## [1.5.0]

### Real venue alignment

Projects can now use a satellite map reference behind the 2D editor to line up a field with a real venue. You can search for a location, use your current position, choose the field center, adjust rotation and opacity, and keep the reference locked behind the layout while designing.

Map references stay editor-only for now: project files can keep the reference metadata, but public shares and exports do not include map imagery or location data.

### Published tracks, durable shares, and embeds

Signed-in projects now publish as durable links that stay live until revoked, while anonymous shares remain temporary. Signed-in users can also list published tracks in the public gallery, update gallery titles and descriptions, and remove their own entries later.

Published account shares can be embedded on external sites through a lightweight read-only viewer with 2D layout and 3D preview start modes. Temporary, expired, revoked, or missing embeds now fail closed with a clear unavailable state instead of rendering track data.

Visitors can browse community tracks at `/gallery`, while moderators and admins can feature, hide, restore, or delete gallery entries from the dashboard.

### Cleaner editor workflow

Snapping and route editing have been tightened up across the editor. Waypoint editing now snaps more predictably to route points, route-line snapping follows paths more closely, and x/y alignment snapping helps line objects up without switching workflows.

The Project inspector has also been reorganized so larger project-level settings are easier to scan and adjust. Map reference controls follow the same compact editor patterns as selection and race-line controls, including mobile-friendly editing through a drawer.

## [1.4.0]

### Cinematic FPV export

[VIDEO DEMO LINK]

The editor now includes a cinematic FPV video export for route fly-through review and sharing, with a stronger FPV camera feel and clearer background export progress.

### Better shared track review

Shared track links now feel more deliberate on mobile and desktop. The read-only view does a better job of explaining itself, fly-through and drawer behavior are cleaner on mobile, and the path into making your own editable Studio copy is clearer.

### Better snapping and path editing

Snapping is now more visible and more consistent across the editor. You can keep snapping on or off from the UI, shape dragging can snap to nearby shapes before falling back to the grid, and waypoint editing follows the same shared snap behavior more reliably.

### Stronger route review warnings

Route review now catches more uneven sections before export or sharing. It can flag abrupt spacing shifts and short correction segments that interrupt the flow while you refine the lap.

## [1.3.0]

### Velocidrone export (experimental)

Track designs can now be exported as a Velocidrone `.trk` file for use in the simulator. The export is marked experimental — obstacle placement and orientation are best-effort translations, and the result may need manual adjustments in Velocidrone after import.

### Smoother editor on large tracks

The 2D canvas now stays responsive as track complexity grows. Mouse movement no longer triggers unnecessary redrawing of unrelated shapes or the background grid, so panning, hovering, and clicking stay snappy even with many obstacles and long polylines on the canvas.

### Passkey sign-in and account security

TrackDraw accounts can now add passkeys for faster passwordless sign-in, while magic-link email sign-in remains available. Account settings also separate profile details from security settings so passkeys and account email are easier to manage.

### Better floating ladder placement

Ladders can now be raised off the ground and adjusted directly in the 3D preview. The editor also gives clearer live feedback while placing floating ladders for indoor and overhead setups.

## [1.2.0]

### Accounts and synced projects

TrackDraw now supports accounts with passwordless email sign-in, cleaner profile management, and verified email changes. Signed-in projects are easier to reopen across devices, while existing device-local projects stay available and easier to manage.

### Easier sharing

Published links are now easier to manage when you are signed in. Shares are tied more clearly to the right project and account, and active links can be revisited, opened, copied, and revoked from the Projects dialog.

## [1.1.0]

### Layout acceleration

TrackDraw now makes it much faster to go from a blank canvas to a useful draft through obstacle presets, selection grouping, and starter layouts. The editor keeps everything usable without an account and fully editable after placement.

### Better race-day handoff

Race-day output is now much stronger through route-driven obstacle numbering, numbering carried into export and read-only surfaces, and a dedicated multi-page Race Pack PDF. TrackDraw now has a clearer handoff surface for briefing, setup, and sharing instead of relying on generic exports alone.

### Inventory and buildability

TrackDraw now connects planned layouts to available obstacle stock through local inventory entry, required-vs-available comparison, buildability warnings, and Race Pack setup estimates. This initial release makes planning more grounded before a layout ever reaches the field.
