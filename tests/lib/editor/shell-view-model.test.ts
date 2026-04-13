import { describe, expect, it } from "vitest";
import { getEditorShellSelectionState } from "@/lib/editor/shell-view-model";
import type { Shape } from "@/lib/types";

describe("editor shell view model", () => {
  const gate: Shape = {
    id: "gate-1",
    kind: "gate",
    x: 10,
    y: 8,
    rotation: 0,
    width: 2,
    height: 2,
    meta: { groupId: "group-a", groupName: "Section A" },
  };
  const flag: Shape = {
    id: "flag-1",
    kind: "flag",
    x: 14,
    y: 9,
    rotation: 0,
    radius: 0.25,
    meta: { groupId: "group-a", groupName: "Section A" },
  };
  const polyline: Shape = {
    id: "line-1",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 1, z: 1 },
      { x: 6, y: 2, z: 2 },
    ],
  };

  it("derives grouped multi-selection state", () => {
    const result = getEditorShellSelectionState({
      activePresetName: "Tight opener",
      designGridStep: 0.25,
      segmentSelection: null,
      selection: [gate.id, flag.id],
      shapeById: {
        [gate.id]: gate,
        [flag.id]: flag,
      },
      vertexSelection: null,
    });

    expect(result.activePresetLabel).toBe("Tight opener");
    expect(result.canUngroupSelection).toBe(true);
    expect(result.selectedGroupName).toBe("Section A");
    expect(result.selectedShapes).toHaveLength(2);
    expect(result.singleSelectedShape).toBeNull();
    expect(result.mobilePrecisionStep).toBe(0.1);
    expect(result.mobilePrecisionStepLabel).toBe("0.1 m");
  });

  it("derives polyline editing affordances from single selection", () => {
    const result = getEditorShellSelectionState({
      activePresetName: null,
      designGridStep: 0.05,
      segmentSelection: {
        shapeId: polyline.id,
        segmentIndex: 1,
        point: { x: 4.5, y: 1.5 },
      },
      selection: [polyline.id],
      shapeById: {
        [polyline.id]: polyline,
      },
      vertexSelection: {
        shapeId: polyline.id,
        idx: 1,
      },
    });

    expect(result.singleSelectedShape?.id).toBe(polyline.id);
    expect(result.singleSelectedShapeLabel).toBe("Race Line");
    expect(result.selectedPolylineSegment).toMatchObject({ segmentIndex: 1 });
    expect(result.selectedPolylineVertex).toMatchObject({ idx: 1 });
    expect(result.canAddSelectedPolylineWaypoint).toBe(true);
    expect(result.canDeleteSelectedPolylineWaypoint).toBe(true);
    expect(result.singleSelectionCanRotate).toBe(false);
    expect(result.mobilePrecisionStep).toBe(0.05);
    expect(result.mobilePrecisionStepLabel).toBe("0.05 m");
  });

  it("blocks rotation and polyline editing affordances for locked selections", () => {
    const lockedGate: Shape = {
      ...gate,
      locked: true,
      meta: undefined,
    };
    const lockedPolyline: Shape = {
      ...polyline,
      locked: true,
    };

    const gateResult = getEditorShellSelectionState({
      activePresetName: null,
      designGridStep: 1,
      segmentSelection: null,
      selection: [lockedGate.id],
      shapeById: {
        [lockedGate.id]: lockedGate,
      },
      vertexSelection: null,
    });
    expect(gateResult.singleSelectionCanRotate).toBe(false);

    const polylineResult = getEditorShellSelectionState({
      activePresetName: null,
      designGridStep: 1,
      segmentSelection: {
        shapeId: lockedPolyline.id,
        segmentIndex: 0,
        point: { x: 1, y: 1 },
      },
      selection: [lockedPolyline.id],
      shapeById: {
        [lockedPolyline.id]: lockedPolyline,
      },
      vertexSelection: {
        shapeId: lockedPolyline.id,
        idx: 0,
      },
    });

    expect(polylineResult.canAddSelectedPolylineWaypoint).toBe(false);
    expect(polylineResult.canDeleteSelectedPolylineWaypoint).toBe(false);
  });
});
