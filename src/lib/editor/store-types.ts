import type { Shape } from "@/lib/types";
import type { EditorTool } from "@/lib/editor-tools";
import type { DraftPoint, RectLike } from "@/lib/canvas/shared";

export interface EditorTransientState {
  activeTool: EditorTool;
  activePresetId: string | null;
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
  historyPaused: boolean;
  historySessionDepth: number;
  interactionSessionDepth: number;
}
