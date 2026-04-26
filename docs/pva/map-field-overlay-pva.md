# Map Field Reference PVA

Date: April 14, 2026

Status: v1 implemented as editor-only map reference

## Decision Summary

Recommended direction:

- build `Map reference` before any arbitrary image-upload reference
- use a dedicated popup/dialog with Esri World Imagery satellite tiles
- let the user choose the field center
- use `field.width` and `field.height` to size the reference footprint
- make rotation the main user adjustment
- render the confirmed reference in the editor with a dedicated Konva tile layer, not a second DOM map under the canvas
- store map metadata, not raw image payloads
- keep export and share unaware of map references in v1

This avoids the main UX problem with uploaded images: a loose image has no reliable scale unless the user calibrates it.

For the full product evaluation and UX rationale, see [docs/research/map-field-overlay-evaluation.md](../research/map-field-overlay-evaluation.md).

## Approval Recommendation

Approve a narrow prototype if TrackDraw accepts:

- Esri World Imagery satellite tiles as the primary v1 path
- one map reference per project
- center-point placement
- project field dimensions as the sizing source
- rotation, opacity, visibility, and remove controls
- no arbitrary image upload in v1
- no export/share inclusion in v1

Do not approve this as image-upload work. Uploads belong in a later `Image reference` fallback with separate calibration rules.

## Delivery Checklist

- [x] Phase 0: verify Esri World Imagery attribution requirements
      The picker displays Esri/data-provider attribution while imagery is visible. Provider terms and traffic assumptions should still be reviewed before relying on heavy production usage.
- [x] Phase 1: prototype map picker dialog with center-point selection
      The picker supports search/typeahead, current-location jump, pointer/touch panning, center click/tap, desktop dialog, and mobile drawer.
- [x] Phase 2: draw project field footprint over the map picker
      The footprint is derived from the current project field dimensions and stays centered while the map moves underneath it.
- [x] Phase 3: add rotation adjustment and confirm flow
      Rotation can be adjusted in the picker and from the Project inspector.
- [x] Phase 4: render the confirmed map reference behind the 2D layout with a Konva tile renderer
      The editor renders non-interactive Esri imagery behind the field and normal layout objects.
- [x] Phase 5: persist reference metadata in project JSON
      Project serialization keeps map metadata, while share serialization strips it.
- [x] Phase 6: add Project inspector controls for visibility, opacity, edit, and remove
      Project inspector exposes compact controls for add/edit, show/hide, opacity, rotation, and remove.
- [ ] Phase 7: decide whether 3D ground reference should follow
      Deferred. V1 is intentionally limited to the 2D editor reference.

## Go / No-Go Criteria

Go for implementation if:

- the user can set up a reference by choosing a location and rotation
- the user does not need to enter scale or dimensions
- the field footprint is derived from existing project field dimensions
- the 2D editor remains readable with the map visible
- Esri World Imagery attribution and usage terms are acceptable

No-go or delay if:

- Esri World Imagery usage terms do not fit TrackDraw's editor use case
- map rendering makes the editor slow or visually noisy
- editor rendering requires synchronizing a live DOM map under the Konva stage
- the flow starts requiring manual scale calibration
- export/share inclusion becomes mandatory for v1
- the feature drifts into branding, custom logos, or decorative backgrounds

## Product Flow

### Add Map

Entry points:

- Project inspector section: `Map reference`

Flow:

1. Open a desktop dialog or mobile drawer with satellite imagery.
2. User searches, uses current location, pans, or zooms to the venue.
3. User clicks the center of the intended field.
4. TrackDraw draws a rectangle using current `field.width` and `field.height`.
5. User adjusts rotation to align with the venue.
6. User confirms.

The field dimensions remain editable through the existing Project field controls. The map flow should not introduce separate width/height controls.

### Edit Map

Flow:

1. User clicks `Edit map`.
2. Dialog opens at the saved center and rotation.
3. User moves the center or adjusts rotation.
4. User confirms.

### Normal Editing

After setup:

- map reference is visible at low opacity by default
- map reference is locked by default
- normal object selection, snapping, route editing, and drag behavior are unchanged
- Project inspector exposes visibility, opacity, edit, and remove controls

## Data Model

Add one optional `mapReference` field to `TrackDesign` after the prototype validates the interaction.

Recommended shape:

- `type: "map"`
- `provider: "esri-world-imagery"`
- `mapStyle: "satellite"`
- `centerLat: number`
- `centerLng: number`
- `rotationDeg: number`
- `opacity: number`
- `visible: boolean`
- `locked: boolean`

Do not store:

- raw image bytes
- tile data
- screenshots
- uploaded files
- separate width/height values

The footprint size comes from `design.field.width` and `design.field.height`.

## Technical Direction

Likely existing files to update after the prototype:

- [src/lib/types.ts](../../src/lib/types.ts)
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
- [src/store/editor.ts](../../src/store/editor.ts)
- [src/components/canvas/editor/TrackCanvas.tsx](../../src/components/canvas/editor/TrackCanvas.tsx)
- Project inspector view files under [src/components/inspector/views](../../src/components/inspector/views)

Likely additions:

- `src/lib/map-reference/types.ts`
- `src/lib/map-reference/geometry.ts`
- `src/lib/map-reference/tiles.ts`
- `src/components/map-reference/MapReferenceDialog.tsx`
- `src/components/canvas/renderers/map-reference-layer.tsx`

Store actions:

- `setMapReference`
- `clearMapReference`
- `setMapReferenceVisibility`
- `setMapReferenceOpacity`
- `setMapReferenceRotation`

Geometry responsibilities:

- convert field dimensions to a map footprint around `centerLat`/`centerLng`
- apply `rotationDeg`
- produce canvas coordinates for rendering behind the design
- avoid affecting the existing field coordinate system

### Picker Vs Editor Renderer

Use two deliberately separate pieces:

- `MapReferenceDialog` uses the same Esri tile/provider helpers for panning, zooming, center selection, and field-heading adjustment.
- Picker zoom is treated as a navigation aid only. The saved editor reference renders from the project field scale and latitude so the background dimensions do not depend on the zoom level used while choosing the center.
- `map-reference-layer.tsx` renders the saved reference inside Konva as non-interactive imagery behind the design.

Do not place a live DOM map behind the Konva stage in the editor.

Reasoning:

- the editor already has its own pan/zoom/stage transform
- a DOM map layer would need fragile camera synchronization
- mobile gestures would be split across the map and Konva
- z-order, clipping, opacity, and export boundaries are cleaner inside Konva
- `listening={false}` keeps the reference from intercepting normal editing

The Konva renderer should load the minimum required provider tiles for the current field footprint, draw them clipped to the field area, and let the existing stage transform handle editor pan/zoom.

## Provider Direction

V1 should use Esri World Imagery as the single satellite provider.

Use one central code config first:

```ts
export const mapReferenceProvider = {
  id: "esri-world-imagery",
  name: "Esri World Imagery",
  defaultStyle: "satellite",
  styles: {
    satellite: {
      tileUrl:
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Sources: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
} as const;
```

Recommended file:

- `src/lib/map-reference/provider.ts`

Both the picker and Konva tile renderer should use this same config.

Do not add a `Map | Satellite` toggle in v1. Satellite is the default for this feature. Do not add provider env vars until TrackDraw actually needs provider switching, API-key-backed tiles, or deployment-specific map sources.

Still verify before production release:

- attribution requirements
- tile caching rules
- privacy implications of location searches

Implementation should prefer provider APIs with clear browser usage and attribution terms.

## Share And Export

V1 behavior:

- map reference is editor-only
- share payloads do not include map imagery
- exported PDFs/images do not include map imagery
- project JSON may include map metadata so the editor can restore it

Future export inclusion should be opt-in and provider-term-aware.

## Future Image Reference Fallback

Arbitrary image upload is out of scope for v1.

If added later, it should be a separate flow:

- `Image reference`
- clear approximate/calibrated state
- known-distance calibration
- local or account-backed asset storage
- explicit export/share behavior

Do not mix uploaded images into the map-center flow, because a custom image cannot be correctly sized from a center point alone.

## Test Plan

- map reference metadata normalizes with valid defaults
- invalid lat/lng/rotation values are rejected or clamped
- field footprint uses `field.width` and `field.height`
- toggling visibility does not affect field dimensions or shapes
- changing field dimensions updates the footprint size
- share/export serialization behavior stays unchanged for map imagery
- editor interactions still select and drag shapes normally with the map reference visible
