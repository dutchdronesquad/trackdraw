import { createDefaultDesign } from "@/lib/track/design";
import { toolCatalogEntryIds } from "@/lib/editor/tool-registry";
import type {
  EditorSessionState,
  EditorTrackState,
  EditorUiState,
} from "@/lib/editor/store-types";

interface EditorUiResetOptions {
  activePresetId?: string | null;
  activePlacementElementId?: EditorUiState["activePlacementElementId"];
  zoom?: number;
  panOffset?: { x: number; y: number };
}

export function createDefaultEditorTrackState(): EditorTrackState {
  return {
    design: createDefaultDesign(),
  };
}

export function createDefaultEditorUiState(
  options: EditorUiResetOptions = {}
): EditorUiState {
  return {
    activeTool: "select",
    activePresetId: options.activePresetId ?? null,
    activePlacementElementId: options.activePlacementElementId ?? {
      ...toolCatalogEntryIds,
    },
    snapEnabled: true,
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

export function resetEditorUiState(
  current: EditorUiState,
  options: EditorUiResetOptions = {}
): EditorUiState {
  return createDefaultEditorUiState({
    activePresetId: options.activePresetId ?? current.activePresetId,
    activePlacementElementId: options.activePlacementElementId ?? {
      ...current.activePlacementElementId,
    },
    zoom: options.zoom ?? current.zoom,
    panOffset: options.panOffset ?? current.panOffset,
  });
}

export function sanitizeEditorUiState(current: EditorUiState): EditorUiState {
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
    selection: [],
    historyPaused: false,
    historySessionDepth: 0,
    interactionSessionDepth: 0,
  };
}
