# MultiGP Obstacle Asset Workflow

This document records how TrackDraw turns the MultiGP obstacle source model into runtime textures for the catalog-backed MultiGP gates, ladders, corner flag, and hurdle.

## Source And Attribution

Primary source:

- MultiGP Drone Race Course Obstacles: `https://www.multigp.com/multigp-drone-race-course-obstacles/`

The MultiGP guide is the source reference for obstacle dimensions, construction context, and the SketchUp obstacle file. MultiGP names, obstacle artwork, and related branding belong to MultiGP. TrackDraw uses these assets as catalog references for race layout planning and should keep source links visible in catalog metadata and public-facing docs where relevant.

## Repository Layout

- `assets/multigp/multigp-obstacles.glb`
  - Source GLB containing the imported MultiGP obstacle artwork.
  - Kept outside `public/` so it is not served as a runtime asset.
- `scripts/extract_glb_textures.mjs`
  - Optional maintenance helper for extracting embedded images from the source GLB.
- `public/assets/models/textures/multigp-obstacles/`
  - Extracted PNG textures and optimized runtime WebP textures loaded by the 3D preview and flythrough export.

## Current Runtime Model

TrackDraw does not render the MultiGP GLB directly at runtime. Instead:

1. The catalog defines official element dimensions and texture paths in `src/lib/track/elements/catalog.ts`.
2. Shared layout helpers in `src/lib/track/render3d-layout.ts` compute panel sizes, frame placement, ladder height, and flag texture placement.
3. The 3D preview and flythrough export build procedural geometry and apply optimized WebP textures onto known panel surfaces.

This keeps official obstacle geometry predictable for selection, rotation, export, and dense layouts while still using recognizable MultiGP artwork.

Side-panel orientation is handled in runtime rendering. For front-facing gates and ladders, the physical left side should read bottom-to-top and the physical right side should read top-to-bottom. The Standard 5x5 assets have separate left/right side images, so runtime rendering maps those companion textures onto the opposite physical side. The Championship 7x6 assets use one shared side image, so runtime rendering derives the opposite side by rotating the physical-left side plane 180 degrees in its own panel plane.

## Blender Route

Use this route when the MultiGP SketchUp source file changes or when new embedded obstacle artwork needs to be recovered.

1. Open the official MultiGP obstacle guide and download the SketchUp obstacle file referenced there.
2. Import the `.skp` file into Blender using a SketchUp importer compatible with the Blender version in use.
3. Confirm the expected obstacles and artwork are visible in the Blender scene.
4. Export one combined GLB:
   - Use glTF 2.0 export.
   - Export format: `GLB`.
   - Keep embedded textures included.
   - Export the full obstacle scene unless deliberately isolating a specific source update.
5. Save the exported file as:
   - `assets/multigp/multigp-obstacles.glb`

At this point the Blender route is done. The source GLB should contain the full MultiGP obstacle scene and embedded artwork.

## Runtime Texture Extraction

TrackDraw currently renders procedural 3D geometry with optimized texture files instead of rendering the source GLB directly. If the extracted PNGs need to be regenerated from the combined GLB, use the optional extraction helper:

```bash
npm run assets:multigp:extract
```

By default the script reads:

```text
assets/multigp/multigp-obstacles.glb
```

and writes:

```text
public/assets/models/textures/multigp-obstacles/
```

If source PNGs were exported another way, the extraction helper can be skipped. The important part is that `public/assets/models/textures/multigp-obstacles/` contains the runtime WebP filenames referenced by `src/lib/track/elements/catalog.ts`.

## Runtime Texture Optimization

After extracting or replacing source PNGs, downsample them and generate lossless WebP files for browser/GPU use:

```bash
npm run assets:multigp:optimize
```

The source GLB and extracted images can be very high resolution. Runtime rendering does not need the full 4k-8k source bitmaps because the artwork is mapped onto small gate, ladder, flag, and hurdle panels in an interactive 3D preview. The optimizer keeps stable basenames, preserves aspect ratios, writes optimized PNG maintenance copies, and generates lossless WebP files for the runtime catalog paths.

The MultiGP corner-flag back texture is intentionally mirrored as a standalone image. The runtime back panel is rotated 180 degrees around the vertical axis, which makes the mirrored back texture read correctly in the 3D scene. Do not add an extra flag-back flip in runtime code or in the optimizer.

## After Updating Textures

Check the runtime texture filenames against `src/lib/track/elements/catalog.ts`.

Current expected runtime textures:

- `MultiGP-2017-Airgate-left-panel-regular-50-percent.webp`
- `MultiGP-2017-Airgate-right-panel-regular-50-percent.webp`
- `MultiGP-2017-Airgate-top-regular-50-percent.webp`
- `large-side-panel-multigp.webp`
- `large-top-multigp.webp`
- `feather-banners-cobranded-multigp.webp`
- `feather-banners-cobranded-multigp-back.webp`
- `5x10-hurdle-multigp.webp`

If filenames change, either rename the runtime files back to the expected names or update the catalog texture paths. Prefer stable filenames in `public/assets/models/textures/multigp-obstacles/` so saved catalog rendering behavior remains easy to review.

## Verification

After replacing the GLB or textures:

1. If source PNGs need regeneration, run the extractor or otherwise update the texture files in `public/assets/models/textures/multigp-obstacles/`.
2. Run `npm run assets:multigp:optimize` so runtime textures stay small enough for fast 3D loading.
3. Start the app and inspect:
   - MultiGP Standard Gate 5x5
   - MultiGP Championship Gate 7x6
   - MultiGP Standard Ladder 5x5
   - MultiGP Championship Ladder 7x6
   - MultiGP Topless Ladder 7x6
   - MultiGP Corner Flag
   - MultiGP Hurdle
4. Confirm side-panel reading direction for gates and ladders:
   - physical left side reads bottom-to-top
   - physical right side reads top-to-bottom
5. Rotate gates and ladders in the 3D editor and confirm textures stay attached to the same physical side.
6. Run:

```bash
npx eslint src/lib/track/elements/catalog.ts src/lib/track/render3d-layout.ts src/components/canvas/trackPreview3DSharedSceneContent.tsx src/lib/export/exportFlythrough.ts
npx tsc --noEmit --pretty false
npm run build
```

## Boundaries

- Do not place the source GLB in `public/`; it is not a runtime asset.
- Do not use this source GLB flow for user-uploaded custom banners. Custom banner artwork should be account-backed media stored in Cloudflare R2 with ownership metadata.
