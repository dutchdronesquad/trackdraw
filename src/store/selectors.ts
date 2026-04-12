import { getDesignShapeById, getDesignShapes } from "@/lib/track/design";
import { getDesignPolylineZRange } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";
import type { useEditor } from "@/store/editor";

type EditorSnapshot = ReturnType<typeof useEditor.getState>;

const designShapesCache = new WeakMap<TrackDesign, Shape[]>();
const designPolylineZRangeCache = new WeakMap<TrackDesign, [number, number]>();
const shapeRecordCache = new WeakMap<TrackDesign, Record<string, Shape>>();
const selectedShapesCache = new WeakMap<
  TrackDesign,
  WeakMap<string[], Shape[]>
>();

function getCachedDesignShapes(design: TrackDesign): Shape[] {
  const cached = designShapesCache.get(design);
  if (cached) return cached;
  const next = getDesignShapes(design);
  designShapesCache.set(design, next);
  return next;
}

function getCachedDesignPolylineZRange(design: TrackDesign): [number, number] {
  const cached = designPolylineZRangeCache.get(design);
  if (cached) return cached;
  const next = getDesignPolylineZRange(design);
  designPolylineZRangeCache.set(design, next);
  return next;
}

function getCachedShapeRecordMap(design: TrackDesign): Record<string, Shape> {
  const cached = shapeRecordCache.get(design);
  if (cached) return cached;

  const next = Object.fromEntries(
    getCachedDesignShapes(design).map((shape) => [shape.id, shape] as const)
  );
  shapeRecordCache.set(design, next);
  return next;
}

export function selectDesignShapes(state: EditorSnapshot): Shape[] {
  return getCachedDesignShapes(state.track.design);
}

export function selectShapeRecordMap(state: EditorSnapshot) {
  return getCachedShapeRecordMap(state.track.design);
}

export function selectDesignShapeCount(state: EditorSnapshot) {
  return getCachedDesignShapes(state.track.design).length;
}

export function selectShapeById(
  state: EditorSnapshot,
  id: string
): Shape | null {
  return getDesignShapeById(state.track.design, id);
}

export function selectShapesByIds(
  state: EditorSnapshot,
  ids: string[]
): Shape[] {
  return ids
    .map((id) => getDesignShapeById(state.track.design, id))
    .filter((shape): shape is Shape => Boolean(shape));
}

export function selectSelectedShapes(state: EditorSnapshot): Shape[] {
  let designCache = selectedShapesCache.get(state.track.design);
  if (!designCache) {
    designCache = new WeakMap<string[], Shape[]>();
    selectedShapesCache.set(state.track.design, designCache);
  }

  const cached = designCache.get(state.session.selection);
  if (cached) return cached;

  const next = selectShapesByIds(state, state.session.selection);
  designCache.set(state.session.selection, next);
  return next;
}

export function selectSelectedPolyline(
  state: EditorSnapshot
): PolylineShape | null {
  if (state.session.selection.length !== 1) return null;
  const shape = getDesignShapeById(
    state.track.design,
    state.session.selection[0]
  );
  return shape?.kind === "polyline" ? shape : null;
}

export function selectPrimaryPolyline(
  state: EditorSnapshot
): PolylineShape | null {
  const selected = selectSelectedPolyline(state);
  if (selected) return selected;
  return (
    getCachedDesignShapes(state.track.design).find(
      (shape): shape is PolylineShape => shape.kind === "polyline"
    ) ?? null
  );
}

export function selectDesignPolylineZRange(state: EditorSnapshot) {
  return getCachedDesignPolylineZRange(state.track.design);
}

export function selectSelectionLocked(state: EditorSnapshot) {
  return (
    state.session.selection.length > 0 &&
    state.session.selection.every((id) =>
      Boolean(selectShapeById(state, id)?.locked)
    )
  );
}

export function selectHasPath(state: EditorSnapshot) {
  return getCachedDesignShapes(state.track.design).some(
    (shape): shape is PolylineShape =>
      shape.kind === "polyline" && shape.points.length >= 2
  );
}

export function selectHasSelectedPolyline(state: EditorSnapshot) {
  return selectSelectedPolyline(state) !== null;
}

export function selectActiveTool(state: EditorSnapshot) {
  return state.ui.activeTool;
}

export function selectZoom(state: EditorSnapshot) {
  return state.ui.zoom;
}

export function selectPanOffset(state: EditorSnapshot) {
  return state.ui.panOffset;
}

export function selectHoveredShapeId(state: EditorSnapshot) {
  return state.ui.hoveredShapeId;
}

export function selectHoveredWaypoint(state: EditorSnapshot) {
  return state.ui.hoveredWaypoint;
}

export function selectVertexSelection(state: EditorSnapshot) {
  return state.ui.vertexSelection;
}

export function selectDraftPath(state: EditorSnapshot) {
  return state.ui.draftPath;
}

export function selectDraftForceClosed(state: EditorSnapshot) {
  return state.ui.draftForceClosed;
}

export function selectDraftSourceShapeId(state: EditorSnapshot) {
  return state.ui.draftSourceShapeId;
}

export function selectMarqueeRect(state: EditorSnapshot) {
  return state.ui.marqueeRect;
}

export function selectRotationSession(state: EditorSnapshot) {
  return state.ui.rotationSession;
}

export function selectGroupDragPreview(state: EditorSnapshot) {
  return state.ui.groupDragPreview;
}
