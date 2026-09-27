# Catalog Asset Hosting

**Original research:** September 17, 2026

**Status:** Hosted assets and automatic publishing are live. TrackDraw and viewer integration use stable URLs without asset versions. Third-party contributions remain a future extension.

## Why This Exists

While deciding the [Track Viewer Package](../in-progress/track-viewer-package.md) [PVA](../../pva/track-viewer-package-pva.md)'s Phase 0 asset inventory, MultiGP-branded catalog textures (`organization: "MultiGP"` entries in [`src/lib/track/elements/catalog.ts`](../../../src/lib/track/elements/catalog.ts), files under `public/assets/models/textures/multigp-obstacles/`) turned out to need different handling than TrackDraw's own generic catalog geometry: they cannot ship inside the permissively licensed (`Apache-2.0`) `@trackdraw/viewer` package, because [`docs/assets/multigp-obstacle-asset-workflow.md`](../../assets/multigp-obstacle-asset-workflow.md) documents TrackDraw's own in-app use of that artwork, not a redistribution license for a package any third party can install and redistribute further.

That gap is broader than the viewer package: these textures already live inside the `AGPL-3.0-only` main repository today, without their own explicit rights boundary. Moving them to a dedicated, separately licensed asset repository fixes that for the existing app too, not only for the new viewer package.

## Legal Basis

TrackDraw claims no ownership or authorship over this artwork. It remains the property of whichever official organization it represents — MultiGP today, potentially others later (DRL, DCL, DDR, TDRF, and similar). These files are collected and loaded purely for **recognizability**, the same reason TrackDraw already tracks official dimensions as closely as possible — not as TrackDraw's own creative work.

Good faith alone does not create a redistribution right, so treat this as a deliberate, common risk posture rather than a resolved legal question: lean on good faith and transparency rather than trying to argue the point away in this document. Moving these assets into their own repository — with the disclaimer above stated plainly, clear per-organization boundaries, and (per [Future Extensibility](#future-extensibility-not-committed)) tooling that makes it easy to add or remove an organization's assets cleanly — is itself how that transparency is delivered: the scope, intent, and ownership of everything in it are visible at a glance, and any organization asking about or objecting to its inclusion is a straightforward, isolated conversation rather than something buried inside the main app. Reach out to a specific organization if and when that becomes relevant, rather than resolving it pre-emptively here; a qualified legal review is worth getting before this repository is made public, but does not need to gate writing this document.

## Naming Note

Home Assistant's [`home-assistant/brands`](https://github.com/home-assistant/brands) repository is the closest prior art: a separate repo, one folder per integration domain, served from its own CDN (`brands.home-assistant.io`), with a blanket disclaimer that all names/trademarks belong to their respective owners and are used for identification only. Do not copy the name "brands" for TrackDraw's version — these are not logos or trademarks, they are official third-party obstacle textures and dimensions (construction/manufacturing references, not brand marks).

Decided: **`obstacles`** (repository `dutchdronesquad/obstacles`), mirroring the short, one-word style of `home-assistant/brands` while matching existing naming already in this codebase (`multigp-obstacles/`, "MultiGP Obstacle Asset Workflow"). Rejected alternatives: `elements` (broader, would also cover non-obstacle catalog items such as flags/labels, but that breadth isn't needed today and reads more abstractly); `trackdraw-catalog-assets` (unambiguous but longer, and the `trackdraw-` prefix is redundant under the `dutchdronesquad` organization).

## Implemented Direction

Artwork, source models and maintenance scripts live in [dutchdronesquad/obstacles](https://github.com/dutchdronesquad/obstacles), organized per organization. Repository documentation explains attribution and rights separately from the MIT-licensed maintenance tools.

Cloudflare R2 serves stable URLs at `https://obstacles.trackdraw.app/multigp/<filename>.webp`. A push to the default branch publishes the assets automatically. There are no asset version tags, pinned copies or consumer bump steps. Responses use a five-minute cache lifetime and CORS for browser consumers.

### Consumers

- **TrackDraw:** the catalog points at the hosted WebP URLs. Procedural geometry, dimensions, catalog identities and orientation remain app-owned. Artwork production is no longer duplicated in this repository.
- **`@trackdraw/viewer`:** resolves catalog paths to the same host by default. Explicit asset resolvers still allow embedded or locally hosted textures. The npm package contains no obstacle artwork.
- **Offline consumers:** a manual `.tdviewer.zip` export captures the current bytes, records their sizes and hashes, and embeds them. Exporting branded textures requires a connection; opening the completed archive does not. Existing archives retain their own textures even when hosted artwork changes.
- **DDS:** stores the JSON viewer snapshot in private object storage and displays it with the npm viewer. The central API key stays on the server; browsers fetch textures directly from the asset host.

## Future Extensibility (Not Committed)

The per-organization folder structure and blanket disclaimer are deliberately chosen so a future organization beyond MultiGP could be added without restructuring — but nothing below is scheduled or scoped, and should not be read into the current extraction work:

- **A third party (an organization, or a designer acting on its behalf) could eventually contribute its own official obstacle textures**, similar to how Home Assistant accepts brand-icon contributions through pull requests. This is materially harder for TrackDraw than for HA: HA's images are flat logos, while TrackDraw's textures are UV-mapped onto procedural 3D geometry with an established panel/orientation convention (left/right side panels, top panel, mirrored back panels — see [render3d-layout.ts](../../../src/lib/track/render3d-layout.ts) and the MultiGP workflow doc). A contributor cannot just drop in an arbitrary image.
- Opening this up would need, at minimum: a documented per-obstacle-type texture template (required panels, dimensions, naming), automated CI validation of submissions against that template, and the same organization-agnostic "identification only, no rights claimed, submitter confirms they may share this artwork" disclaimer applied uniformly rather than negotiated per submitter.
- On the TrackDraw code side, `organization` is currently a closed union (`"TrackDraw" | "MultiGP"`) with every catalog entry hardcoded in `catalog.ts`. Supporting arbitrary contributed organizations would mean replacing that with a registry driven by the catalog-asset repository's own manifest — a real architecture change, not a data addition.
- This is unrelated to the separately parked [Presets Store](presets-store.md) research: presets are user-generated layout snippets published and moderated inside TrackDraw's own account/D1/R2 system, not externally hosted, curated obstacle asset sets. Do not conflate the two when scoping either one.

## Relationship To Other Documents

- [Track Viewer Package research](../in-progress/track-viewer-package.md) and its [PVA](../../pva/track-viewer-package-pva.md) depend on the "MultiGP textures are source-restricted" decision made here holding; this document is where that decision's implementation is worked out in full, not restated there.
- [`docs/assets/multigp-obstacle-asset-workflow.md`](../../assets/multigp-obstacle-asset-workflow.md) now points to the maintained workflow in the obstacles repository.
