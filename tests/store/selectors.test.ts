import { beforeEach, describe, expect, it } from "vitest";
import {
  selectActiveTool,
  selectDesignPolylineZRange,
  selectDesignShapeCount,
  selectDesignShapes,
  selectDraftPath,
  selectHasPath,
  selectHasSelectedPolyline,
  selectHoveredShapeId,
  selectMarqueeRect,
  selectPanOffset,
  selectPrimaryPolyline,
  selectRotationSession,
  selectSelectedPolyline,
  selectSelectedShapes,
  selectSelectionLocked,
  selectShapeById,
  selectShapeRecordMap,
  selectShapesByIds,
  selectVertexSelection,
  selectZoom,
} from "@/store/selectors";
import { useEditor } from "@/store/editor";

describe("editor selectors", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  it("returns design-derived shape collections and cached references", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });
    const flagId = state.addShape({
      kind: "flag",
      x: 14,
      y: 9,
      rotation: 0,
      radius: 0.25,
    });

    const snapshot = useEditor.getState();
    const shapes = selectDesignShapes(snapshot);
    const shapesAgain = selectDesignShapes(snapshot);
    const record = selectShapeRecordMap(snapshot);

    expect(selectDesignShapeCount(snapshot)).toBe(2);
    expect(shapes).toHaveLength(2);
    expect(shapesAgain).toBe(shapes);
    expect(record[gateId]?.kind).toBe("gate");
    expect(selectShapeById(snapshot, flagId)?.kind).toBe("flag");
    expect(selectShapesByIds(snapshot, [gateId, "missing"])).toHaveLength(1);
  });

  it("resolves selected and primary polylines plus path flags", () => {
    const state = useEditor.getState();
    state.addShape({
      kind: "gate",
      x: 3,
      y: 4,
      rotation: 0,
      width: 2,
      height: 2,
    });
    const polylineId = state.addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 1, y: 2, z: 0.5 },
        { x: 3, y: 4, z: 2 },
      ],
    });

    state.setSelection([polylineId]);

    const snapshot = useEditor.getState();
    const selectedShapes = selectSelectedShapes(snapshot);

    expect(selectedShapes).toHaveLength(1);
    expect(selectSelectedShapes(snapshot)).toBe(selectedShapes);
    expect(selectSelectedPolyline(snapshot)?.id).toBe(polylineId);
    expect(selectPrimaryPolyline(snapshot)?.id).toBe(polylineId);
    expect(selectHasPath(snapshot)).toBe(true);
    expect(selectHasSelectedPolyline(snapshot)).toBe(true);
    expect(selectDesignPolylineZRange(snapshot)).toEqual([0.5, 2]);
  });

  it("tracks locked selections and ui state selectors", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 5,
      y: 6,
      rotation: 0,
      width: 2,
      height: 2,
      locked: true,
    });
    const secondGateId = state.addShape({
      kind: "gate",
      x: 8,
      y: 9,
      rotation: 0,
      width: 2,
      height: 2,
      locked: true,
    });

    state.setSelection([gateId, secondGateId]);
    state.setActiveTool("grab");
    state.setZoom(2.5);
    state.setPanOffset({ x: 120, y: 80 });
    state.setHoveredShapeId(gateId);
    state.setVertexSelection({ shapeId: gateId, index: 1 });
    state.setDraftPath([{ x: 1, y: 2, z: 3 }]);
    state.setMarqueeRect({ x: 10, y: 12, width: 30, height: 20 });
    state.setRotationSession({
      shapeIds: [gateId],
      center: { x: 5, y: 6 },
      startPointerAngle: 15,
      startRotations: { [gateId]: 0 },
      initialRotation: 0,
      historyDepth: 1,
      sessionKey: 1,
    });

    const snapshot = useEditor.getState();

    expect(selectSelectionLocked(snapshot)).toBe(true);
    expect(selectActiveTool(snapshot)).toBe("grab");
    expect(selectZoom(snapshot)).toBe(2.5);
    expect(selectPanOffset(snapshot)).toEqual({ x: 120, y: 80 });
    expect(selectHoveredShapeId(snapshot)).toBe(gateId);
    expect(selectVertexSelection(snapshot)).toEqual({
      shapeId: gateId,
      index: 1,
    });
    expect(selectDraftPath(snapshot)).toEqual([{ x: 1, y: 2, z: 3 }]);
    expect(selectMarqueeRect(snapshot)).toEqual({
      x: 10,
      y: 12,
      width: 30,
      height: 20,
    });
    expect(selectRotationSession(snapshot)).toMatchObject({
      shapeIds: [gateId],
      sessionKey: 1,
    });
  });
});
