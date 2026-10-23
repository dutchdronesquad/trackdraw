# Custom ladders

Custom TrackDraw ladders support one to five gate openings. Newly placed ladders start with three openings. Changing the gate count preserves the total ladder height and elevation; edit those dimensions independently to build tall or suspended ladders.

Frame thickness is editable in the inspector's measurement units and defaults to 0.20 m for older designs. The stored thickness controls the generic 2D footprint, 3D frame, SVG and flythrough exports. Fixed catalog ladder dimensions remain locked. Velocidrone uses its existing fixed prefabs and now preserves a single gate instead of adding a second one.

## Standalone viewer delivery

The shared schema and standalone renderer also need ladder thickness support. Release [Track Viewer #57](https://github.com/dutchdronesquad/track-viewer/pull/57), then update TrackDraw's `@trackdraw/schema` dependency and lockfile before merging this feature. The existing published schema strips `thick` from ladder snapshots and offline viewer archives. Validate a suspended two-gate ladder with custom thickness through `toViewerDesignSnapshot` and the offline ZIP round trip against the published release. Snapshots that specify ladder thickness require the `shape:ladder:thickness` capability so older standalone viewers reject unsupported geometry.
