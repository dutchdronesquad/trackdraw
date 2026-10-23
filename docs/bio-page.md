# Link-in-bio page

`/bio` is a public, statically rendered entry point for social profiles. It uses the existing public-site language fallback and theme preferences. Core links are in the initial HTML and open in the same tab for social in-app browsers.

## Content

Edit `src/lib/bio.ts` to reorder product and social links, change destinations, or add featured announcement links. Primary links appear above the viewer; other product links use simple divided rows below it. Empty editorial sections are omitted. Configured destinations must be site-relative paths or HTTPS URLs without credentials; invalid configuration fails prerender.

English labels and descriptions live under `bio` in `lang/en-US/landing.json`. Add item IDs to the typed configuration when separate copy is needed. Target catalogs stay owned by Crowdin and use the existing English fallback until reviewed translations arrive.

## Interactive example

`src/components/bio/BioTrackViewer.tsx` mounts the published `@trackdraw/viewer` package in an isolated container. The package loads when the preview approaches the viewport; its 3D renderer loads when the visitor selects 3D. Controls are keyboard-accessible and reflect the effective view. Devices without WebGL retain 2D and show an explanation. A loading failure offers a retry while all product links remain usable. Unmounting destroys the viewer and releases its resources.

`src/lib/bio-track.ts` owns Skyline Circuit, a version-2 portable example with an elevated crossover, stacked gates, a dive and a slalom. It uses generic obstacles without remote catalog artwork, account data or database reads. This is a visual demonstration, not a certified event layout. Both views use the same track data; neither can modify the visitor's Studio projects.

The page introduces no CMS, external feed or new analytics event. Existing site-wide analytics preferences continue to apply. Public social profile URLs can be changed to `https://trackdraw.app/bio` after deployment.

## Validation

Use the standard lint, test, type, build, and i18n commands in `CONTRIBUTING.md`. Component coverage exercises mode switching, WebGL fallback, retry and cleanup; the example is validated against the portable schema. Check both modes on mobile and desktop, orbit/zoom interaction, keyboard controls, theme changes and direct loading. With JavaScript disabled, primary links remain available but the interactive preview requires JavaScript.

`/bio` belongs to the read-only OpenNext static shell cache. Keep it independent of request-time auth and database reads. The viewer is a client-side enhancement and must not move public page rendering to the Worker.
