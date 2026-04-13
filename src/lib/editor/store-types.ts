import type {
  FieldSpec,
  PolylinePoint,
  SerializedTrackDesign,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";
import type { EditorTool } from "@/lib/editor-tools";
import type { DraftPoint, RectLike } from "@/lib/canvas/shared";

export interface EditorTrackState {
  design: TrackDesign;
}

export interface EditorUiState {
  activeTool: EditorTool;
  activePresetId: string | null;
  snapEnabled: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  hoveredShapeId: string | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  segmentSelection: {
    shapeId: string;
    segmentIndex: number;
    point: { x: number; y: number };
  } | null;
  vertexSelection: { shapeId: string; idx: number } | null;
  draftPath: DraftPoint[];
  draftForceClosed: boolean;
  draftSourceShapeId: string | null;
  marqueeRect: RectLike | null;
  rotationSession: {
    center: { x: number; y: number };
    shapeId: string;
    initialRotation: number;
    startAngle: number;
    startRotation: number;
    previewRotation: number;
  } | null;
  groupDragPreview: {
    ids: string[];
    origin: { x: number; y: number };
    dx: number;
    dy: number;
  } | null;
  liveShapePatches: Record<string, Partial<Shape>>;
}

export interface EditorSessionState {
  selection: string[];
  historyPaused: boolean;
  historySessionDepth: number;
  interactionSessionDepth: number;
}

export interface EditorTrackActions {
  addShape: (shape: ShapeDraft) => string;
  addShapes: (shapes: ShapeDraft[]) => string[];
  updateShape: (id: string, patch: Partial<Shape>) => void;
  updateShapes: (ids: string[], patch: Partial<Shape>) => void;
  setShapesLocked: (ids: string[], locked: boolean) => void;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  updatePolylinePoint: (
    id: string,
    index: number,
    patch: Partial<PolylinePoint>
  ) => void;
  insertPolylinePoint: (
    id: string,
    index: number,
    point: PolylinePoint
  ) => void;
  removePolylinePoint: (id: string, index: number) => void;
  appendPolylinePoint: (id: string, point: PolylinePoint) => void;
  reversePolylinePoints: (id: string) => void;
  rotateShapes: (ids: string[], delta: number) => void;
  removeShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  groupSelection: (ids: string[]) => string | null;
  setGroupName: (ids: string[], name: string) => void;
  ungroupSelection: (ids: string[]) => void;
  joinPolylines: (ids: string[]) => string | null;
  closePolyline: (id: string) => boolean;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (
    patch: Partial<
      Pick<
        TrackDesign,
        "title" | "description" | "authorName" | "tags" | "inventory"
      >
    >
  ) => void;
  replaceDesign: (design: TrackDesign | SerializedTrackDesign) => void;
  newProject: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
}

export interface EditorSessionActions {
  setSelection: (ids: string[]) => void;
  pauseHistory: () => void;
  resumeHistory: () => void;
  clearHistory: () => void;
  beginInteraction: () => void;
  endInteraction: () => void;
  sanitizeHistoryState: () => void;
}

export interface EditorUiActions {
  setActiveTool: (tool: EditorTool) => void;
  setActivePresetId: (presetId: string | null) => void;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnapEnabled: () => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
  setSegmentSelection: (
    value:
      | {
          shapeId: string;
          segmentIndex: number;
          point: { x: number; y: number };
        }
      | null
      | ((
          previous: {
            shapeId: string;
            segmentIndex: number;
            point: { x: number; y: number };
          } | null
        ) => {
          shapeId: string;
          segmentIndex: number;
          point: { x: number; y: number };
        } | null)
  ) => void;
  setVertexSelection: (
    value:
      | { shapeId: string; idx: number }
      | null
      | ((
          previous: { shapeId: string; idx: number } | null
        ) => { shapeId: string; idx: number } | null)
  ) => void;
  setDraftPath: (
    value: DraftPoint[] | ((previous: DraftPoint[]) => DraftPoint[])
  ) => void;
  setDraftForceClosed: (
    value: boolean | ((previous: boolean) => boolean)
  ) => void;
  setDraftSourceShapeId: (
    value: string | null | ((previous: string | null) => string | null)
  ) => void;
  setMarqueeRect: (
    value: RectLike | null | ((previous: RectLike | null) => RectLike | null)
  ) => void;
  setRotationSession: (
    value:
      | {
          center: { x: number; y: number };
          shapeId: string;
          initialRotation: number;
          startAngle: number;
          startRotation: number;
          previewRotation: number;
        }
      | null
      | ((
          previous: {
            center: { x: number; y: number };
            shapeId: string;
            initialRotation: number;
            startAngle: number;
            startRotation: number;
            previewRotation: number;
          } | null
        ) => {
          center: { x: number; y: number };
          shapeId: string;
          initialRotation: number;
          startAngle: number;
          startRotation: number;
          previewRotation: number;
        } | null)
  ) => void;
  setGroupDragPreview: (
    value:
      | {
          ids: string[];
          origin: { x: number; y: number };
          dx: number;
          dy: number;
        }
      | null
      | ((
          previous: {
            ids: string[];
            origin: { x: number; y: number };
            dx: number;
            dy: number;
          } | null
        ) => {
          ids: string[];
          origin: { x: number; y: number };
          dx: number;
          dy: number;
        } | null)
  ) => void;
  setLiveShapePatch: (id: string, patch: Partial<Shape>) => void;
  clearLiveShapePatch: (id: string) => void;
}

export interface EditorActionGroups {
  track: EditorTrackActions;
  session: EditorSessionActions;
  ui: EditorUiActions;
}

export const editorStateOwnership = {
  track: ["design"],
  session: [
    "selection",
    "historyPaused",
    "historySessionDepth",
    "interactionSessionDepth",
  ],
  ui: [
    "activeTool",
    "activePresetId",
    "snapEnabled",
    "zoom",
    "panOffset",
    "hoveredShapeId",
    "hoveredWaypoint",
    "segmentSelection",
    "vertexSelection",
    "draftPath",
    "draftForceClosed",
    "draftSourceShapeId",
    "marqueeRect",
    "rotationSession",
    "groupDragPreview",
    "liveShapePatches",
  ],
} as const;

export const editorActionOwnership = {
  track: [
    "addShape",
    "addShapes",
    "updateShape",
    "updateShapes",
    "setShapesLocked",
    "setPolylinePoints",
    "updatePolylinePoint",
    "insertPolylinePoint",
    "removePolylinePoint",
    "appendPolylinePoint",
    "reversePolylinePoints",
    "rotateShapes",
    "removeShapes",
    "duplicateShapes",
    "groupSelection",
    "setGroupName",
    "ungroupSelection",
    "joinPolylines",
    "closePolyline",
    "nudgeShapes",
    "updateField",
    "updateDesignMeta",
    "replaceDesign",
    "newProject",
    "bringForward",
    "sendBackward",
  ],
  session: [
    "setSelection",
    "pauseHistory",
    "resumeHistory",
    "clearHistory",
    "beginInteraction",
    "endInteraction",
    "sanitizeHistoryState",
  ],
  ui: [
    "setActiveTool",
    "setActivePresetId",
    "setSnapEnabled",
    "toggleSnapEnabled",
    "setZoom",
    "setPanOffset",
    "setHoveredShapeId",
    "setHoveredWaypoint",
    "setSegmentSelection",
    "setVertexSelection",
    "setDraftPath",
    "setDraftForceClosed",
    "setDraftSourceShapeId",
    "setMarqueeRect",
    "setRotationSession",
    "setGroupDragPreview",
    "setLiveShapePatch",
    "clearLiveShapePatch",
  ],
} as const;
