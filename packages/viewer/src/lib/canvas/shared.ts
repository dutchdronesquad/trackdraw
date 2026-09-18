// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

// Trimmed vendored subset of src/lib/canvas/shared.ts (issue #870) - only
// the RectLike type, which is all field-layer.tsx/shape-bounds.ts need. The
// app's own file also exports an editor-interaction grab-bag (marquee-select
// helpers, isTypingInInput, and notably a module-level mutable `clipboard`
// singleton) that's both unused here and directly at odds with the package's
// multi-instance-isolation goal (Phase 1) - intentionally not vendored.

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}
