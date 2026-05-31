# Changelog

All notable shipped changes to TrackDraw should be documented in this file.

This changelog is intentionally concise. GitHub Releases and Release Drafter can continue to carry the fuller change list.

## [Unreleased]

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
