# Transparent 3D PNG export

In Studio's Export dialog, select **3D Render**. **Transparent background** is enabled and **Entire track** is selected by default. This overview can render directly from the 2D tab. The image includes the field's bounded floor plate, obstacles, labels and racing lines. The surrounding pixels have alpha transparency; sky, fog, surrounding terrain, selection handles and editor overlays are excluded.

The default image is 3200 × 2400 pixels. The camera fits the complete rendered geometry, including elevated paths and rotated obstacles outside the field, with comfortable padding. **Current 3D view** uses a clone of the active 3D camera, including its orientation, projection and aspect ratio, for a custom composition. With transparency enabled, its longest image edge is 3200 pixels. This alternative preserves the chosen composition and can intentionally crop the track. When exporting from 2D, the export action opens the 3D view automatically and waits for its camera; normal scene screenshots follow the same flow. **Adjust view in 3D** is an optional step to inspect or change the framing before exporting; it closes the dialog and retains the export choices. Composition and transparency are independent. Disable **Transparent background** for a whole-course overview on a solid theme background, or choose **Current 3D view** with transparency disabled to capture the existing visible scene at the viewport resolution. The full scene uses the editor theme; the standalone track render uses the export theme.

Rendering runs in an independent WebGL context and never moves the editor camera or writes to the track. Portable artwork resolves before texture loading, and required textures decode before capture. Loading or WebGL failures keep the export dialog open and show a retry message. Transparency requires WebGL2; a 2D fallback is not substituted for this export.

## Camera and floor convention

TrackDraw issue #972 and Track Viewer issue #21 use this canonical overview convention:

- Perspective vertical field of view: 46 degrees.
- Camera direction from the bounds center: normalized `(-14, 18, 20)` in Three.js coordinates, where Y is elevation and Z corresponds to track Y.
- Fit every corner of the complete scene bounds in camera space with a padding factor of 1.15. Distance, target and clipping planes adapt to the geometry; orientation stays fixed.
- Retain the field rectangle and its existing 0.45 m border. Remove surrounding terrain, sky and fog; clear the canvas with alpha zero.

The implementation lives in `src/lib/export/presentation-camera.ts` and `src/lib/export/export3dPng.tsx`, using the existing Studio item renderers and floor component. The viewer package capability is delivered separately through its companion issue; this change does not require a viewer dependency upgrade.

## Validation

The normal unit/component suite covers framing, deterministic camera placement, export mode selection, the 3D-tab requirement for a custom camera or normal screenshot, and the user-visible failure state.

With Playwright and its Chromium browser available in your Node environment, run:

```bash
node tests/browser/transparent-3d-png.cjs
```

This standalone browser check bundles the export implementation with the repository's esbuild dependency. It renders small, large, elongated and rotated courses in both themes, checks actual PNG alpha and antialiased pixels, composites on black and white backgrounds, verifies deterministic output, preserves the supplied camera and design, and checks WebGL failure cleanup. Catalog textures use delayed, deterministic image fixtures so readiness is tested without relying on the asset host. PNGs are written to a temporary directory for visual inspection. Check desktop and mobile export controls in `npm run dev` as well.
