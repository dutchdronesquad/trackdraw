# Map Field Reference Evaluation

This document evaluates the product shape and UX approach for adding real venue context behind a TrackDraw layout.

Status: v1 map-first implementation shipped. Arbitrary image upload remains out of scope.

## Decision

The first meaningful version should use a map or satellite picker instead of arbitrary image upload.

Users should not need to understand calibration, pixel scale, image dimensions, or georeferencing. The preferred UX is:

1. Open `Add map reference`.
2. Search, pan, or zoom the map.
3. Click the center point of the field.
4. TrackDraw draws the project field rectangle using `field.width` and `field.height`.
5. The user adjusts rotation if needed.
6. Confirm, then continue editing normally.

This is a better first product shape because map tiles already have real-world scale. TrackDraw can use the project field dimensions to determine the correct size, so the user only needs to choose the location and direction.

## Product Goal

Map field reference should make it easy to line a TrackDraw project up with a real venue without making the editor feel like a mapping tool.

That means:

- the user chooses a location, not an image scale
- TrackDraw derives the field footprint from the existing project dimensions
- the reference stays secondary to the track design
- normal editing remains clean, readable, and fast
- no account is required for the core flow

This is not a branding/customization feature. Replacing the TrackDraw logo with a club or event logo is a separate publishing concern.

## Why Not Image Upload In V1

Loose image upload creates product and UX problems:

- a photo, screenshot, floor plan, or sketch has no reliable scale on its own
- asking users to calibrate every image adds setup friction
- quick-fit can look plausible while being wrong
- arbitrary images increase storage, sync, copyright, and privacy concerns immediately
- the 2D editor can become visually noisy without actually improving measurement confidence

Image upload can remain a later fallback for floor plans or indoor venues, but it should not define the first version.

## Recommended V1 Model

### 1. Map Reference, Not Overlay Image

Each project can optionally store one map reference.

Recommended concept:

- `centerLat`
- `centerLng`
- `rotationDeg`
- `zoom` or tile resolution metadata
- `mapStyle: "satellite" | "map"`
- `opacity`
- `visible`
- `locked`

The TrackDraw field dimensions remain the source of truth for width and height.

### 2. Center-First Setup

The user should only need to answer one main question:

- Where is the center of the field?

TrackDraw handles:

- converting project field dimensions into a map footprint
- drawing the field rectangle
- fitting the map reference behind the layout
- keeping scale tied to the map source instead of user-entered image dimensions

The only likely manual adjustment is rotation, because fields are rarely aligned exactly north/south.

### 3. Rotation As The Main Adjustment

After choosing the center, the user should see the field rectangle over the map and adjust orientation.

Recommended controls:

- rotate left/right or drag a heading handle
- snap rotation to common angles if useful
- reset north-up
- opacity
- confirm

Avoid exposing width/height scaling controls in the primary map flow. If the field size is wrong, the user should edit project field dimensions instead.

### 4. Editor Visibility

The reference should be available without permanently making the 2D editor busy.

Recommended behavior:

- visible after setup, at low opacity
- locked by default
- quick show/hide toggle
- `Edit map reference` opens the picker/adjustment view again
- reference does not intercept object selection, route editing, snapping, or drag behavior

The map reference should sit behind the field chrome and shapes, not inside a nested card or floating preview.

## UX Flow

### Add Map Reference

Entry point:

- Project inspector: `Map reference`
- Canvas or toolbar action: `Add map`

Flow:

1. Desktop dialog or mobile drawer opens with map/satellite view.
2. User searches, uses current location, or pans to venue.
3. User clicks the center of the field.
4. TrackDraw overlays the project field rectangle.
5. User adjusts rotation if needed.
6. User confirms.

### Edit Map Reference

Flow:

1. User opens `Edit map`.
2. Dialog reopens at the current reference location.
3. User moves center or adjusts rotation.
4. Confirm updates the reference.

### Normal Editing

Once confirmed:

- map reference renders beneath the layout when visible
- field dimensions continue to come from TrackDraw
- route and obstacle editing behave normally
- opacity and visibility are available from the Project inspector

## Suggested UI Copy

Use simple placement language:

- `Add map`
- `Map reference`
- `Choose field center`
- `Align field`
- `Show map`
- `Hide map`
- `Edit map`
- `Remove map`
- `Opacity`

Avoid technical language in the main flow:

- `Georeference`
- `Calibrate map`
- `Set projection`
- `Tile resolution`

## 2D And 3D Behavior

### 2D

V1 should start with 2D because the map reference is primarily a placement aid.

Rules:

- draw the map behind shapes and route content
- keep opacity conservative by default
- keep a fast visibility toggle
- do not let the map participate in selection

### 3D

3D can use the same reference later as a ground texture once the 2D placement model works.

Do not block the first version on 3D. Validate 3D separately because ground textures add rendering and readability questions.

## Technical Direction

The first prototype should not accept arbitrary image uploads.

Recommended implementation direction:

- use a map provider that supports browser rendering and a suitable usage policy
- store only reference metadata in the project
- keep tile/image cache out of `TrackDesign`
- use a dedicated tile picker dialog for field center selection
- render confirmed editor imagery with a dedicated non-interactive Konva tile layer
- keep share/export unaware of map references in v1

Potential metadata:

- `type: "map"`
- `centerLat: number`
- `centerLng: number`
- `rotationDeg: number`
- `mapStyle: "satellite" | "map"`
- `opacity: number`
- `visible: boolean`
- `locked: boolean`
- `provider: string`

Open provider questions:

- provider licensing and attribution
- allowed tile caching or snapshot behavior
- API key handling
- offline behavior
- local development fallback

## Editor Renderer Decision

Use the tile picker for setup, not for the editor background.

The editor should render the confirmed map reference inside Konva. A live DOM map underneath the Konva stage is tempting for a prototype, but it creates a second camera and gesture system that must stay in sync with TrackDraw's stage transform.

Konva rendering is the better production path because:

- it follows existing canvas pan and zoom automatically
- it can be `listening={false}` so normal editing remains safe
- clipping, opacity, z-order, and dark/light field chrome stay predictable
- mobile gestures stay owned by the editor
- export and share boundaries remain explicit

The renderer should calculate the required provider tiles from `centerLat`, `centerLng`, `rotationDeg`, field dimensions, and provider style, then draw those tiles as images behind the layout. The editor render should derive its tile detail from project scale and latitude; the picker zoom is only a navigation aid and must not change the saved field scale.

## Storage And Sync

Because map references can be represented by metadata, v1 can avoid project asset storage.

Recommended v1 behavior:

- project stores center, rotation, style, opacity, and provider metadata
- logged-out users can save the reference with local project JSON
- signed-in users can sync the same metadata with account-backed projects
- no uploaded image blobs are needed

This is simpler than image upload and aligns better with cross-device project continuity.

## Export And Share Behavior

V1 should keep map references out of export and share output unless explicitly revisited.

Reasons:

- venue imagery may have licensing or privacy implications
- published shares should remain focused on the authored TrackDraw layout
- map provider terms may restrict exported imagery

Future export inclusion should be a deliberate per-export option, not a silent side effect of editor visibility.

## Future Image Upload Fallback

Image upload may still be useful later for:

- indoor floor plans
- venue sketches
- drone orthophotos
- custom field diagrams

If added later, it should be a separate `Image reference` path with explicit limitations and optional known-distance calibration. It should not share the simple map-center UX because it cannot derive scale from a location alone.

## Success Criteria

The first version is successful if:

- a user can add a useful map reference by choosing a field center and rotation
- TrackDraw sizes the reference from project field dimensions without user scale controls
- normal 2D editing remains readable and responsive
- the same project reference can reopen from saved metadata
- users do not confuse map reference visibility with authoritative survey-grade measurement
