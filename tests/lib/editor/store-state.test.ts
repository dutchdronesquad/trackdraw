import { describe, expect, it } from "vitest";
import {
  createDefaultEditorSessionState,
  createDefaultEditorUiState,
  resetEditorUiState,
  sanitizeEditorUiState,
} from "@/lib/editor/store-state";
import type { EditorUiState } from "@/lib/editor/store-types";
import {
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";

describe("editor store state helpers", () => {
  it("resetEditorUiState preserves preset and resets zoom/pan when requested", () => {
    const current: EditorUiState = {
      ...createDefaultEditorUiState(),
      activePresetId: "straight-gate-run",
      activePlacementElementId: { gate: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID },
      zoom: 2.25,
      panOffset: { x: 120, y: 75 },
      hoveredShapeId: "shape-1",
      rotationSession: {
        center: { x: 10, y: 12 },
        shapeId: "shape-1",
        initialRotation: 0,
        startAngle: 90,
        startRotation: 0,
        previewRotation: 15,
      },
    };

    const next = resetEditorUiState(current, {
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    });

    expect(next.activePresetId).toBe("straight-gate-run");
    expect(next.activePlacementElementId.gate).toBe(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );
    expect(next.zoom).toBe(1);
    expect(next.panOffset).toEqual({ x: 0, y: 0 });
    expect(next.hoveredShapeId).toBeNull();
    expect(next.rotationSession).toBeNull();
  });

  it("defaults to the frame-only TrackDraw gate variant", () => {
    expect(createDefaultEditorUiState().activePlacementElementId.gate).toBe(
      TRACKDRAW_GATE_ELEMENT_ID
    );
  });

  it("sanitizeEditorUiState clears transient hover and drag state", () => {
    const current = {
      ...createDefaultEditorUiState(),
      hoveredShapeId: "shape-1",
      hoveredWaypoint: { shapeId: "shape-1", idx: 2 },
      vertexSelection: { shapeId: "shape-1", idx: 1 },
      marqueeRect: { x: 10, y: 20, width: 30, height: 40 },
      rotationSession: {
        center: { x: 10, y: 12 },
        shapeId: "shape-1",
        initialRotation: 0,
        startAngle: 90,
        startRotation: 0,
        previewRotation: 15,
      },
      groupDragPreview: {
        ids: ["shape-1"],
        origin: { x: 10, y: 12 },
        dx: 4,
        dy: 8,
      },
      draftPath: [{ x: 1, y: 2, z: 0 }],
    };

    const next = sanitizeEditorUiState(current);

    expect(next.hoveredShapeId).toBeNull();
    expect(next.hoveredWaypoint).toBeNull();
    expect(next.vertexSelection).toBeNull();
    expect(next.marqueeRect).toBeNull();
    expect(next.rotationSession).toBeNull();
    expect(next.groupDragPreview).toBeNull();
    expect(next.draftPath).toEqual([{ x: 1, y: 2, z: 0 }]);
  });

  it("createDefaultEditorSessionState starts with clean depths and selection", () => {
    expect(createDefaultEditorSessionState()).toEqual({
      selection: [],
      historyPaused: false,
      historySessionDepth: 0,
      interactionSessionDepth: 0,
    });
  });
});
