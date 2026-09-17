# Catalog Asset Hosting

**Original research:** September 17, 2026

**Status:** Direction agreed (extract MultiGP textures into a dedicated hosted asset repository, served from Cloudflare R2). Not started; no repository, hosting, or code changes exist yet. Third-party contribution is an explicitly future-only extension, not committed.

## Why This Exists

While deciding the [Track Viewer Package](../in-progress/track-viewer-package.md) [PVA](../../pva/track-viewer-package-pva.md)'s Phase 0 asset inventory, MultiGP-branded catalog textures (`organization: "MultiGP"` entries in [`src/lib/track/elements/catalog.ts`](../../../src/lib/track/elements/catalog.ts), files under `public/assets/models/textures/multigp-obstacles/`) turned out to need different handling than TrackDraw's own generic catalog geometry: they cannot ship inside the permissively licensed (`Apache-2.0`) `@trackdraw/viewer` package, because [`docs/assets/multigp-obstacle-asset-workflow.md`](../../assets/multigp-obstacle-asset-workflow.md) documents TrackDraw's own in-app use of that artwork, not a redistribution license for a package any third party can install and redistribute further.

That gap is broader than the viewer package: these textures already live inside the `AGPL-3.0-only` main repository today, without their own explicit rights boundary. Moving them to a dedicated, separately licensed asset repository fixes that for the existing app too, not only for the new viewer package.

## Naming Note

Home Assistant's [`home-assistant/brands`](https://github.com/home-assistant/brands) repository is the closest prior art: a separate repo, one folder per integration domain, served from its own CDN (`brands.home-assistant.io`), with a blanket disclaimer that all names/trademarks belong to their respective owners and are used for identification only. Do not copy the name "brands" for TrackDraw's version — these are not logos or trademarks, they are official third-party obstacle textures and dimensions (construction/manufacturing references, not brand marks). Working name for this research: **catalog assets**. A concrete repository name (candidate: `trackdraw-catalog-assets`) is still open.

## Recommended Direction

Extract into a separate repository, structured per organization (starting with one: `multigp/`):

- Migrate the existing MultiGP maintenance pipeline as a unit: `assets/multigp/multigp-obstacles.glb`, `scripts/extract_glb_textures.mjs`, `scripts/optimize_multigp_textures.mjs`, `docs/assets/multigp-obstacle-asset-workflow.md`, and the current runtime output in `public/assets/models/textures/multigp-obstacles/`. This is asset production/maintenance work for this specific third-party asset set, not TrackDraw application logic, so it belongs together in the new repository rather than split across both.
- Carry over the same blanket disclaimer approach as Home Assistant: artwork/names belong to their respective owners, used for identification/compatibility purposes only, no endorsement implied, no rights claimed over the third-party content itself.
- Tag releases so consumers pin an explicit version rather than tracking a moving branch.

### Hosting: Cloudflare R2

Decided over jsDelivr-from-GitHub: serve from a Cloudflare R2 bucket behind a custom domain (candidate: `catalog-assets.trackdraw.app`, exact name open). Reasons:

- TrackDraw already runs on Cloudflare (OpenNext, D1, R2 for gallery preview media per [AGENTS.md](../../../AGENTS.md#stack)) — no new vendor relationship, no new operational surface to learn.
- Own domain instead of a third-party CDN URL; no dependency on jsDelivr's availability for a production feature.
- R2 has no egress fees, and the total asset volume is trivial (668 KB across ~12 files today) — cost and scale are non-issues either way, so this is decided on control/consistency with the existing stack rather than price or capacity.

### How Consumers Use It

This does not change runtime behavior for the existing app, and does not make any offline consumer depend on a live network fetch:

- **TrackDraw's own app (today's AGPL codebase):** vendor a pinned copy into `public/assets/models/textures/multigp-obstacles/` at asset-update time (a small sync step replacing the current in-repo extraction/optimization workflow as the day-to-day maintenance path). Runtime code (`catalog.ts`, `shared-scene.tsx`) is unchanged — it still loads local static files.
- **`@trackdraw/viewer` (Apache-2.0, always-online hosts like FPVScores/DDS):** resolve these textures from the R2-served URL at render time by default, alongside the existing snapshot-first resolution (if a texture is already present in a course's own snapshot asset manifest, prefer that; otherwise fall back to the hosted catalog-asset URL). No MultiGP bytes ship inside the npm/static package itself.
- **RotorHazard (fully offline):** unaffected by hosting choice. The browser-side manual export already needs these files available locally to build a `.tdviewer.zip`, exactly as decided in the [PVA's Phase 0 asset inventory](../../pva/track-viewer-package-pva.md#phase-0-confirm-distribution-fit) — it now sources them from the vendored copy described above instead of a repo-internal path, but the "bundle into the snapshot at export time" mechanism itself does not change.

## Future Extensibility (Not Committed)

The per-organization folder structure and blanket disclaimer are deliberately chosen so a future organization beyond MultiGP could be added without restructuring — but nothing below is scheduled or scoped, and should not be read into the current extraction work:

- **A third party (an organization, or a designer acting on its behalf) could eventually contribute its own official obstacle textures**, similar to how Home Assistant accepts brand-icon contributions through pull requests. This is materially harder for TrackDraw than for HA: HA's images are flat logos, while TrackDraw's textures are UV-mapped onto procedural 3D geometry with an established panel/orientation convention (left/right side panels, top panel, mirrored back panels — see [render3d-layout.ts](../../../src/lib/track/render3d-layout.ts) and the MultiGP workflow doc). A contributor cannot just drop in an arbitrary image.
- Opening this up would need, at minimum: a documented per-obstacle-type texture template (required panels, dimensions, naming), automated CI validation of submissions against that template, and the same organization-agnostic "identification only, no rights claimed, submitter confirms they may share this artwork" disclaimer applied uniformly rather than negotiated per submitter.
- On the TrackDraw code side, `organization` is currently a closed union (`"TrackDraw" | "MultiGP"`) with every catalog entry hardcoded in `catalog.ts`. Supporting arbitrary contributed organizations would mean replacing that with a registry driven by the catalog-asset repository's own manifest — a real architecture change, not a data addition.
- This is unrelated to the separately parked [Presets Store](presets-store.md) research: presets are user-generated layout snippets published and moderated inside TrackDraw's own account/D1/R2 system, not externally hosted, curated obstacle asset sets. Do not conflate the two when scoping either one.

## Relationship To Other Documents

- [Track Viewer Package research](../in-progress/track-viewer-package.md) and its [PVA](../../pva/track-viewer-package-pva.md) depend on the "MultiGP textures are source-restricted" decision made here holding; this document is where that decision's implementation is worked out in full, not restated there.
- [`docs/assets/multigp-obstacle-asset-workflow.md`](../../assets/multigp-obstacle-asset-workflow.md) remains accurate today and should be migrated (not just referenced) into the new repository once it exists, then removed or replaced with a pointer from this repository.
