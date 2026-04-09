import { DEFAULT_LAYOUT_PRESET_ID } from "@/lib/planning/layout-presets";
import type {
  EditorSessionState,
  EditorTransientState,
} from "@/lib/editor/store-types";

interface EditorTransientResetOptions {
  activePresetId?: string | null;
  zoom?: number;
  panOffset?: { x: number; y: number };
}

export function createDefaultEditorTransientState(
  options: EditorTransientResetOptions = {}
): EditorTransientState {
  return {
    activeTool: "select",
    activePresetId: options.activePresetId ?? DEFAULT_LAYOUT_PRESET_ID,
    zoom: options.zoom ?? 1,
    panOffset: options.panOffset ?? { x: 0, y: 0 },
    hoveredShapeId: null,
    hoveredWaypoint: null,
    segmentSelection: null,
    vertexSelection: null,
    draftPath: [],
    draftForceClosed: false,
    draftSourceShapeId: null,
    marqueeRect: null,
    rotationSession: null,
    groupDragPreview: null,
    liveShapePatches: {},
  };
}

export function resetEditorTransientState(
  current: EditorTransientState,
  options: EditorTransientResetOptions = {}
): EditorTransientState {
  return createDefaultEditorTransientState({
    activePresetId: options.activePresetId ?? current.activePresetId,
    zoom: options.zoom ?? current.zoom,
    panOffset: options.panOffset ?? current.panOffset,
  });
}

export function sanitizeEditorTransientState(
  current: EditorTransientState
): EditorTransientState {
  return {
    ...current,
    hoveredShapeId: null,
    hoveredWaypoint: null,
    vertexSelection: null,
    marqueeRect: null,
    rotationSession: null,
    groupDragPreview: null,
  };
}

export function createDefaultEditorSessionState(): EditorSessionState {
  return {
    historyPaused: false,
    historySessionDepth: 0,
    interactionSessionDepth: 0,
  };
}
