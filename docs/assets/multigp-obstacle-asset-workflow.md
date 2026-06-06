# MultiGP Obstacle Asset Workflow

This document records how TrackDraw turns the MultiGP obstacle source model into runtime textures for the catalog-backed MultiGP gates, ladders, and corner flag.

## Source And Attribution

Primary source:

- MultiGP Drone Race Course Obstacles: `https://www.multigp.com/multigp-drone-race-course-obstacles/`

The MultiGP guide is the source reference for obstacle dimensions, construction context, and the SketchUp obstacle file. MultiGP names, obstacle artwork, and related branding belong to MultiGP. TrackDraw uses these assets as catalog references for race layout planning and should keep source links visible in catalog metadata and public-facing docs where relevant.

## Repository Layout

- `assets/multigp/multigp-obstacles.glb`
  - Source GLB containing the imported MultiGP obstacle artwork.
  - Kept outside `public/` so it is not served as a runtime asset.
- `scripts/extract_glb_textures.py`
  - Optional maintenance helper for extracting embedded images from the source GLB.
- `public/assets/models/textures/multigp-obstacles/`
  - Runtime PNG textures loaded by the 3D preview and flythrough export.

## Current Runtime Model

TrackDraw does not render the MultiGP GLB directly at runtime. Instead:

1. The catalog defines official element dimensions and texture paths in `src/lib/track/elements/catalog.ts`.
2. Shared layout helpers in `src/lib/track/render3d-layout.ts` compute panel sizes, frame placement, ladder height, and flag texture placement.
3. The 3D preview and flythrough export build procedural geometry and apply the extracted PNG textures onto known panel surfaces.

This keeps official obstacle geometry predictable for selection, rotation, export, and dense layouts while still using recognizable MultiGP artwork.

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

TrackDraw currently renders procedural 3D geometry with PNG textures instead of rendering the source GLB directly. If the runtime PNGs need to be regenerated from the combined GLB, use the optional extraction helper:

```bash
python3 scripts/extract_glb_textures.py
```

By default the script reads:

```text
assets/multigp/multigp-obstacles.glb
```

and writes:

```text
public/assets/models/textures/multigp-obstacles/
```

If runtime PNGs were exported another way, the Python helper can be skipped. The important part is that `public/assets/models/textures/multigp-obstacles/` contains the filenames referenced by `src/lib/track/elements/catalog.ts`.

## After Updating Textures

Check the runtime texture filenames against `src/lib/track/elements/catalog.ts`.

Current expected runtime textures:

- `MultiGP-2017-Airgate-left-panel-regular-50-percent.png`
- `MultiGP-2017-Airgate-right-panel-regular-50-percent.png`
- `MultiGP-2017-Airgate-top-regular-50-percent.png`
- `large-side-panel-multigp.png`
- `large-top-multigp.png`
- `feather-banners-cobranded-multigp.png`
- `feather-banners-cobranded-multigp-back.png`
- `5x10-hurdle-multigp.png`

If filenames change, either rename the runtime files back to the expected names or update the catalog texture paths. Prefer stable filenames in `public/assets/models/textures/multigp-obstacles/` so saved catalog rendering behavior remains easy to review.

## Verification

After replacing the GLB or textures:

1. If runtime PNGs need regeneration, run the extractor or otherwise update the texture files in `public/assets/models/textures/multigp-obstacles/`.
2. Start the app and inspect:
   - MultiGP Standard Gate 5x5
   - MultiGP Championship Gate 7x6
   - MultiGP Standard Ladder 5x5
   - MultiGP Championship Ladder 7x6
   - MultiGP Corner Flag
3. Rotate gates and ladders in the 3D editor and confirm textures stay attached to the same physical side.
4. Run:

```bash
npx eslint src/lib/track/elements/catalog.ts src/lib/track/render3d-layout.ts src/components/canvas/trackPreview3DSharedSceneContent.tsx src/lib/export/exportFlythrough.ts
npx tsc --noEmit --pretty false
npm run build
```

## Boundaries

- Do not place the source GLB in `public/`; it is not a runtime asset.
- Do not use this source GLB flow for user-uploaded custom banners. Custom banner artwork should be account-backed media stored in Cloudflare R2 with ownership metadata.
