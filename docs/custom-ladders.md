# Custom ladders

Custom TrackDraw ladders support one to five gate openings. Newly placed ladders start with three openings. Changing the gate count scales the total height while preserving the height per opening and elevation. A default ladder has 2 m openings: one gate is 2 m tall, two gates are 4 m tall, and three gates are 6 m tall. Custom opening heights scale the same way; total height never drops below the inspector minimum of 0.50 m. Edit height and elevation independently to build tall or suspended ladders.

Frame thickness is editable in the inspector's measurement units and defaults to 0.20 m for older designs. The stored thickness controls the generic 2D footprint, 3D frame, SVG and flythrough exports. Fixed catalog ladder dimensions remain locked. Velocidrone uses its existing fixed prefabs and now preserves a single gate instead of adding a second one.

## Standalone viewers

Snapshots and offline ZIP exports preserve custom ladder thickness with `@trackdraw/schema` 1.0.6 or later. Rendering hosts need `@trackdraw/viewer` 1.0.6 or later to display it. Snapshots that specify ladder thickness require the `shape:ladder:thickness` capability so older standalone viewers reject unsupported geometry. Existing ladders without an explicit thickness keep their legacy compatibility.
