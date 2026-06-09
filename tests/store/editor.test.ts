import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "@/store/editor";
import {
  clearHistoryAndCaptureUpdatedAt,
  coneDraft,
  expectDesignUpdatedAt,
  expectNoDesignHistoryChange,
  expectPastStatesCount,
  flagDraft,
  gateDraft,
  ladderDraft,
  polylineDraft,
  resetEditorStore,
  runHistoryStep,
  setEditorTestTime,
} from "../helpers/editor-store";
import {
  MULTIGP_CORNER_FLAG_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID,
  getTrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";

describe("editor store history", () => {
  beforeEach(() => {
    resetEditorStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not create a history entry for a no-op shape patch", () => {
    const state = useEditor.getState();
    const id = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    useEditor.getState().updateShape(id, { rotation: 0 });

    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("creates a history entry when a shape patch changes the design", () => {
    const state = useEditor.getState();
    const id = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:06:22.500Z");

    useEditor.getState().updateShape(id, { rotation: 5 });

    expect(useEditor.getState().track.design.shapeById[id]?.rotation).toBe(5);
    expectDesignUpdatedAt("2026-04-13T10:06:22.500Z");
    expectPastStatesCount(1);
  });

  it("does not create a history entry for unchanged polyline points", () => {
    const state = useEditor.getState();
    const id = state.addShape(
      polylineDraft({
        points: [
          { x: 1, y: 2, z: 0 },
          { x: 3, y: 4, z: 1 },
        ],
      })
    );

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    useEditor.getState().setPolylinePoints(id, [
      { x: 1, y: 2, z: 0 },
      { x: 3, y: 4, z: 1 },
    ]);

    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("does not create a history entry when rotateShapes only targets non-rotatable shapes", () => {
    const state = useEditor.getState();
    const coneId = state.addShape(coneDraft({ x: 5, y: 6, radius: 0.2 }));
    const polylineId = state.addShape(
      polylineDraft({
        points: [
          { x: 1, y: 2, z: 0 },
          { x: 3, y: 4, z: 1 },
        ],
      })
    );

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    useEditor.getState().rotateShapes([coneId, polylineId], 15);

    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("does not create a history entry for a no-op batch patch", () => {
    const state = useEditor.getState();
    const firstGateId = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));
    const secondGateId = state.addShape(
      gateDraft({ x: 14, y: 12, width: 2.2, height: 1.9 })
    );

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    useEditor.getState().updateShapes([firstGateId, secondGateId], {
      rotation: 0,
    });

    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("creates a history entry when rotateShapes changes a rotatable shape", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:06:25.000Z");

    useEditor.getState().rotateShapes([gateId], 15);

    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      15
    );
    expectDesignUpdatedAt("2026-04-13T10:06:25.000Z");
    expectPastStatesCount(1);
  });

  it("undoes and redoes a real design change through the temporal store", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:06:27.000Z");
    useEditor.getState().updateShape(gateId, { rotation: 20 });

    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      20
    );
    expectPastStatesCount(1);

    runHistoryStep(useEditor.temporal.getState().undo);
    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      0
    );

    runHistoryStep(useEditor.temporal.getState().redo);
    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      20
    );
  });

  it("keeps shape resize changes undoable and redoable", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ height: 1.5 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:06:28.000Z");

    useEditor.getState().updateShape(gateId, { width: 3, height: 2 });

    expect(useEditor.getState().track.design.shapeById[gateId]).toMatchObject({
      width: 3,
      height: 2,
    });
    expectDesignUpdatedAt("2026-04-13T10:06:28.000Z");
    expectPastStatesCount(1);

    runHistoryStep(useEditor.temporal.getState().undo);
    expect(useEditor.getState().track.design.shapeById[gateId]).toMatchObject({
      width: 2,
      height: 1.5,
    });

    runHistoryStep(useEditor.temporal.getState().redo);
    expect(useEditor.getState().track.design.shapeById[gateId]).toMatchObject({
      width: 3,
      height: 2,
    });
  });

  it("sanitizeHistoryState clears transient session and ui state after history steps", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ width: 2.2, height: 1.9 }));

    useEditor.getState().setSelection([gateId]);
    useEditor.getState().setHoveredShapeId(gateId);
    useEditor.getState().setRotationSession({
      center: { x: 10, y: 8 },
      shapeId: gateId,
      initialRotation: 0,
      startAngle: 90,
      startRotation: 0,
      previewRotation: 10,
    });

    runHistoryStep(() => {
      useEditor.getState().sanitizeHistoryState();
    });

    const nextState = useEditor.getState();
    expect(nextState.session.selection).toEqual([]);
    expect(nextState.session.historyPaused).toBe(false);
    expect(nextState.session.interactionSessionDepth).toBe(0);
    expect(nextState.ui.hoveredShapeId).toBeNull();
    expect(nextState.ui.rotationSession).toBeNull();
  });

  it("tracks nested history pause and resume depth safely", () => {
    const state = useEditor.getState();

    state.pauseHistory();
    state.pauseHistory();
    expect(useEditor.getState().session.historyPaused).toBe(true);
    expect(useEditor.getState().session.historySessionDepth).toBe(2);

    state.resumeHistory();
    expect(useEditor.getState().session.historyPaused).toBe(true);
    expect(useEditor.getState().session.historySessionDepth).toBe(1);

    state.resumeHistory();
    expect(useEditor.getState().session.historyPaused).toBe(false);
    expect(useEditor.getState().session.historySessionDepth).toBe(0);

    state.resumeHistory();
    expect(useEditor.getState().session.historyPaused).toBe(false);
    expect(useEditor.getState().session.historySessionDepth).toBe(0);
  });

  it("tracks nested interaction depth safely", () => {
    const state = useEditor.getState();

    state.beginInteraction();
    state.beginInteraction();
    expect(useEditor.getState().session.interactionSessionDepth).toBe(2);

    state.endInteraction();
    expect(useEditor.getState().session.interactionSessionDepth).toBe(1);

    state.endInteraction();
    expect(useEditor.getState().session.interactionSessionDepth).toBe(0);

    state.endInteraction();
    expect(useEditor.getState().session.interactionSessionDepth).toBe(0);
  });

  it("locks shapes only when the locked state actually changes", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft());

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.setShapesLocked([gateId], false);
    expectNoDesignHistoryChange(beforeUpdatedAt);

    setEditorTestTime("2026-04-13T10:10:00.000Z");
    state.setShapesLocked([gateId], true);

    expect(useEditor.getState().track.design.shapeById[gateId]?.locked).toBe(
      true
    );
    expectDesignUpdatedAt("2026-04-13T10:10:00.000Z");
    expectPastStatesCount(1);
  });

  it("does not move locked shapes or create history for locked-only nudges", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ locked: true }));

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.nudgeShapes([gateId], 1, 1);

    const shape = useEditor.getState().track.design.shapeById[gateId];
    expect(shape).toMatchObject({ x: 10, y: 8 });
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("nudges only editable shapes in a mixed locked selection", () => {
    const state = useEditor.getState();
    const lockedGateId = state.addShape(gateDraft({ locked: true }));
    const editableGateId = state.addShape(gateDraft({ x: 12, y: 9 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:10:05.000Z");

    state.nudgeShapes([lockedGateId, editableGateId], 1, -2);

    const nextDesign = useEditor.getState().track.design;
    expect(nextDesign.shapeById[lockedGateId]).toMatchObject({ x: 10, y: 8 });
    expect(nextDesign.shapeById[editableGateId]).toMatchObject({
      x: 13,
      y: 7,
    });
    expectDesignUpdatedAt("2026-04-13T10:10:05.000Z");
    expectPastStatesCount(1);
  });

  it("does not patch locked shapes or create history for locked-only updates", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ locked: true }));

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.updateShape(gateId, { x: 20, width: 4, rotation: 45 });

    expect(useEditor.getState().track.design.shapeById[gateId]).toMatchObject({
      x: 10,
      y: 8,
      rotation: 0,
      width: 2,
      height: 2,
    });
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("batch patches only editable shapes in a mixed locked selection", () => {
    const state = useEditor.getState();
    const lockedGateId = state.addShape(gateDraft({ locked: true }));
    const editableGateId = state.addShape(gateDraft({ x: 12, y: 9 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:10:06.000Z");

    state.updateShapes([lockedGateId, editableGateId], {
      x: 20,
      width: 4,
    });

    const nextDesign = useEditor.getState().track.design;
    expect(nextDesign.shapeById[lockedGateId]).toMatchObject({
      x: 10,
      width: 2,
    });
    expect(nextDesign.shapeById[editableGateId]).toMatchObject({
      x: 20,
      width: 4,
    });
    expectDesignUpdatedAt("2026-04-13T10:10:06.000Z");
    expectPastStatesCount(1);
  });

  it("batch switches catalog gate types while leaving locked gates unchanged", () => {
    const state = useEditor.getState();
    const lockedGateId = state.addShape(
      gateDraft({ rotation: 35, locked: true })
    );
    const editableGateId = state.addShape(
      gateDraft({ x: 12, y: 9, rotation: 45 })
    );

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:10:07.000Z");

    state.updateShapesCatalogType(
      [lockedGateId, editableGateId],
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );

    const nextDesign = useEditor.getState().track.design;
    expect(nextDesign.shapeById[lockedGateId]).toMatchObject({
      width: 2,
      height: 2,
      rotation: 35,
    });
    expect(nextDesign.shapeById[editableGateId]).toMatchObject({
      x: 12,
      y: 9,
      rotation: 45,
    });
    const editableGate = nextDesign.shapeById[editableGateId];
    expect(editableGate?.kind).toBe("gate");
    if (editableGate?.kind === "gate") {
      expect(editableGate.width).toBeCloseTo(1.524);
      expect(editableGate.height).toBeCloseTo(1.524);
    }
    expect(
      getTrackElementCatalogIdentity(nextDesign.shapeById[editableGateId]?.meta)
        ?.elementId
    ).toBe(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID);
    expectDesignUpdatedAt("2026-04-13T10:10:07.000Z");
    expectPastStatesCount(1);
  });

  it("does not edit locked route waypoints or create history", () => {
    const state = useEditor.getState();
    const routeId = state.addShape(
      polylineDraft({
        locked: true,
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
          { x: 8, y: 0, z: 0 },
        ],
      })
    );

    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.setPolylinePoints(routeId, [
      { x: 1, y: 1, z: 0 },
      { x: 4, y: 1, z: 0 },
    ]);
    state.updatePolylinePoint(routeId, 1, { x: 6 });
    state.insertPolylinePoint(routeId, 1, { x: 2, y: 1, z: 0 });
    state.removePolylinePoint(routeId, 1);
    state.appendPolylinePoint(routeId, { x: 10, y: 0, z: 0 });
    state.reversePolylinePoints(routeId);

    const route = useEditor.getState().track.design.shapeById[routeId];
    expect(route?.kind === "polyline" ? route.points : []).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
      { x: 8, y: 0, z: 0 },
    ]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("duplicates shapes, updates selection, and creates a history entry", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ rotation: 5 }));

    state.clearHistory();
    const beforeCount = useEditor.getState().track.design.shapeOrder.length;
    setEditorTestTime("2026-04-13T10:10:10.000Z");
    state.duplicateShapes([gateId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeOrder).toHaveLength(beforeCount + 1);
    expect(nextState.session.selection).toHaveLength(1);
    expect(nextState.session.selection[0]).not.toBe(gateId);
    expect(
      nextState.track.design.shapeById[nextState.session.selection[0]]
    ).toMatchObject({
      kind: "gate",
      rotation: 5,
    });
    expectPastStatesCount(1);
  });

  it("does not duplicate locked shapes or create history", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ rotation: 5, locked: true }));

    state.setSelection([gateId]);
    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();
    const beforeCount = useEditor.getState().track.design.shapeOrder.length;

    state.duplicateShapes([gateId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeOrder).toHaveLength(beforeCount);
    expect(nextState.session.selection).toEqual([gateId]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("does not duplicate mixed locked selections or create history", () => {
    const state = useEditor.getState();
    const lockedId = state.addShape(gateDraft({ rotation: 5, locked: true }));
    const editableId = state.addShape(flagDraft({ x: 12, y: 9 }));

    state.setSelection([lockedId, editableId]);
    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();
    const beforeCount = useEditor.getState().track.design.shapeOrder.length;

    state.duplicateShapes([lockedId, editableId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeOrder).toHaveLength(beforeCount);
    expect(nextState.session.selection).toEqual([lockedId, editableId]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("removes selected shapes and clears them from the selection", () => {
    const state = useEditor.getState();
    const firstId = state.addShape(gateDraft({ x: 5, y: 5 }));
    const secondId = state.addShape(flagDraft());

    state.setSelection([firstId, secondId]);
    state.clearHistory();
    setEditorTestTime("2026-04-13T10:10:20.000Z");
    state.removeShapes([firstId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeById[firstId]).toBeUndefined();
    expect(nextState.session.selection).toEqual([secondId]);
    expectPastStatesCount(1);
  });

  it("does not remove mixed locked selections or create history", () => {
    const state = useEditor.getState();
    const lockedId = state.addShape(gateDraft({ x: 5, y: 5, locked: true }));
    const editableId = state.addShape(flagDraft());

    state.setSelection([lockedId, editableId]);
    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();
    setEditorTestTime("2026-04-13T10:10:21.000Z");

    state.removeShapes([lockedId, editableId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeById[lockedId]).toBeTruthy();
    expect(nextState.track.design.shapeById[editableId]).toBeTruthy();
    expect(nextState.session.selection).toEqual([lockedId, editableId]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("does not remove grouped selections when one grouped member is locked", () => {
    const state = useEditor.getState();
    const lockedId = state.addShape(gateDraft({ x: 5, y: 5, locked: true }));
    const editableId = state.addShape(flagDraft());

    state.groupSelection([lockedId, editableId]);
    state.setSelection([lockedId]);
    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.removeShapes(useEditor.getState().session.selection);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeById[lockedId]).toBeTruthy();
    expect(nextState.track.design.shapeById[editableId]).toBeTruthy();
    expect(nextState.session.selection).toEqual([lockedId, editableId]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("does not remove locked-only selections or create history", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ x: 5, y: 5, locked: true }));

    state.setSelection([gateId]);
    const beforeUpdatedAt = clearHistoryAndCaptureUpdatedAt();

    state.removeShapes([gateId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeById[gateId]).toBeTruthy();
    expect(nextState.session.selection).toEqual([gateId]);
    expectNoDesignHistoryChange(beforeUpdatedAt);
  });

  it("groups and ungroups the current selection", () => {
    const state = useEditor.getState();
    const firstId = state.addShape(gateDraft({ x: 5, y: 5 }));
    const secondId = state.addShape(flagDraft());

    state.clearHistory();
    const groupId = state.groupSelection([firstId, secondId]);

    expect(groupId).toBeTruthy();
    expect(
      useEditor.getState().track.design.shapeById[firstId]?.meta
    ).toMatchObject({
      groupId,
    });
    expect(
      useEditor.getState().track.design.shapeById[secondId]?.meta
    ).toMatchObject({
      groupId,
    });

    state.setGroupName([firstId], "Section A");
    expect(
      useEditor.getState().track.design.shapeById[firstId]?.meta
    ).toMatchObject({
      groupId,
      groupName: "Section A",
    });

    state.ungroupSelection([firstId]);
    expect(
      useEditor.getState().track.design.shapeById[firstId]?.meta
    ).toBeUndefined();
    expect(
      useEditor.getState().track.design.shapeById[secondId]?.meta
    ).toBeUndefined();
  });

  it("joins and closes polylines when possible", () => {
    const state = useEditor.getState();
    const firstId = state.addShape(
      polylineDraft({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
        ],
      })
    );
    const secondId = state.addShape(
      polylineDraft({
        points: [
          { x: 2, y: 0, z: 0 },
          { x: 4, y: 1, z: 0 },
        ],
      })
    );

    state.clearHistory();
    const joinedId = state.joinPolylines([firstId, secondId]);

    expect(joinedId).toBeTruthy();
    expect(
      useEditor.getState().track.design.shapeById[firstId]
    ).toBeUndefined();
    expect(
      useEditor.getState().track.design.shapeById[secondId]
    ).toBeUndefined();
    expect(useEditor.getState().track.design.shapeById[joinedId!]?.kind).toBe(
      "polyline"
    );

    expect(state.closePolyline(joinedId!)).toBe(true);
    expect(
      useEditor.getState().track.design.shapeById[joinedId!]
    ).toMatchObject({
      kind: "polyline",
      closed: true,
    });
  });

  it("keeps route waypoint insertion undoable and clears stale segment selection", () => {
    const state = useEditor.getState();
    const routeId = state.addShape(
      polylineDraft({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
        ],
      })
    );

    state.setSelection([routeId]);
    state.setSegmentSelection({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 2, y: 0 },
    });
    state.clearHistory();
    setEditorTestTime("2026-04-13T10:11:00.000Z");

    state.insertPolylinePoint(routeId, 1, { x: 2, y: 1, z: 0 });

    let nextState = useEditor.getState();
    let route = nextState.track.design.shapeById[routeId];
    expect(route?.kind).toBe("polyline");
    expect(route?.kind === "polyline" ? route.points : []).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 },
    ]);
    expect(nextState.session.selection).toEqual([routeId]);
    expect(nextState.ui.segmentSelection).toBeNull();
    expectDesignUpdatedAt("2026-04-13T10:11:00.000Z");
    expectPastStatesCount(1);

    runHistoryStep(useEditor.temporal.getState().undo);

    nextState = useEditor.getState();
    route = nextState.track.design.shapeById[routeId];
    expect(route?.kind === "polyline" ? route.points : []).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 4, y: 0, z: 0 },
    ]);

    runHistoryStep(useEditor.temporal.getState().redo);

    route = useEditor.getState().track.design.shapeById[routeId];
    expect(route?.kind === "polyline" ? route.points : []).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 1, z: 0 },
      { x: 4, y: 0, z: 0 },
    ]);
  });

  it("keeps a selected route segment when the same path is selected again", () => {
    const state = useEditor.getState();
    const routeId = state.addShape(
      polylineDraft({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 4, y: 0, z: 0 },
        ],
      })
    );
    const gateId = state.addShape(gateDraft({ x: 2, y: 2, height: 1.5 }));

    state.setSelection([routeId]);
    state.setSegmentSelection({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 2, y: 0 },
    });

    state.setSelection([routeId]);

    expect(useEditor.getState().ui.segmentSelection).toEqual({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 2, y: 0 },
    });

    state.setSelection([gateId]);

    expect(useEditor.getState().ui.segmentSelection).toBeNull();
  });

  it("updates field and design metadata through explicit track actions", () => {
    const state = useEditor.getState();
    state.clearHistory();

    setEditorTestTime("2026-04-13T10:12:00.000Z");
    state.updateField({ width: 80 });
    setEditorTestTime("2026-04-13T10:12:01.000Z");
    state.updateDesignMeta({ title: "Race Day Layout" });

    const nextState = useEditor.getState();
    expect(nextState.track.design.field.width).toBe(80);
    expect(nextState.track.design.title).toBe("Race Day Layout");
    expect(nextState.track.design.updatedAt).toBe("2026-04-13T10:12:01.000Z");
    expectPastStatesCount(2);
  });

  it("resets track, session, ui, and history when replacing the design or starting a new project", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft({ x: 5, y: 6 }));

    state.setSelection([gateId]);
    state.setHoveredShapeId(gateId);
    state.setZoom(2);
    state.clearHistory();
    state.updateDesignMeta({ title: "Before replace" });

    state.replaceDesign({
      id: "replacement",
      version: 2,
      title: "Replacement",
      description: "",
      tags: [],
      authorName: "",
      inventory: {
        gate: 0,
        flag: 0,
        cone: 0,
        startfinish: 0,
        ladder: 0,
        divegate: 0,
      },
      field: { width: 40, height: 20, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    let nextState = useEditor.getState();
    expect(nextState.track.design.id).toBe("replacement");
    expect(nextState.session.selection).toEqual([]);
    expect(nextState.ui.hoveredShapeId).toBeNull();
    expect(nextState.ui.zoom).toBe(2);
    expectPastStatesCount(0);

    state.newProject();
    nextState = useEditor.getState();
    expect(nextState.track.design.title).toBe("New Track");
    expect(nextState.ui.zoom).toBe(1);
    expect(nextState.ui.panOffset).toEqual({ x: 0, y: 0 });
    expectPastStatesCount(0);
  });

  it("nudges shapes and changes z-order only when movement is possible", () => {
    const state = useEditor.getState();
    const firstId = state.addShape(gateDraft({ x: 1, y: 2 }));
    const secondId = state.addShape(flagDraft({ x: 3, y: 4 }));
    const thirdId = state.addShape(coneDraft({ x: 5, y: 6, radius: 0.2 }));

    state.clearHistory();
    setEditorTestTime("2026-04-13T10:12:10.000Z");
    state.nudgeShapes([firstId], 2, -1);
    expect(useEditor.getState().track.design.shapeById[firstId]).toMatchObject({
      x: 3,
      y: 1,
    });

    setEditorTestTime("2026-04-13T10:12:11.000Z");
    state.nudgeShapes([firstId], 0, 0);
    expect(useEditor.getState().track.design.shapeById[firstId]).toMatchObject({
      x: 3,
      y: 1,
    });

    expect(useEditor.getState().track.design.shapeOrder).toEqual([
      firstId,
      secondId,
      thirdId,
    ]);
    state.bringForward(firstId);
    expect(useEditor.getState().track.design.shapeOrder).toEqual([
      secondId,
      firstId,
      thirdId,
    ]);
    state.sendBackward(thirdId);
    expect(useEditor.getState().track.design.shapeOrder).toEqual([
      secondId,
      thirdId,
      firstId,
    ]);
  });

  it("reorderShapes moves a shape before another", () => {
    const state = useEditor.getState();
    const a = state.addShape(coneDraft());
    const b = state.addShape(coneDraft({ x: 1 }));
    const c = state.addShape(coneDraft({ x: 2 }));

    state.reorderShapes(c, a);
    expect(useEditor.getState().track.design.shapeOrder).toEqual([c, a, b]);
  });

  it("reorderShapes with null beforeId moves shape to end", () => {
    const state = useEditor.getState();
    const a = state.addShape(coneDraft());
    const b = state.addShape(coneDraft({ x: 1 }));
    const c = state.addShape(coneDraft({ x: 2 }));

    state.reorderShapes(a, null);
    expect(useEditor.getState().track.design.shapeOrder).toEqual([b, c, a]);
  });

  it("reorderShapes is a no-op when fromId equals beforeId", () => {
    const state = useEditor.getState();
    const a = state.addShape(coneDraft());
    state.addShape(coneDraft({ x: 1 }));

    const orderBefore = [...useEditor.getState().track.design.shapeOrder];
    state.reorderShapes(a, a);
    expect(useEditor.getState().track.design.shapeOrder).toEqual(orderBefore);
  });

  it("updateShapesCatalogType switches flag types and skips locked flags", () => {
    const state = useEditor.getState();
    const editableId = state.addShape(flagDraft({ x: 0, y: 0, radius: 1 }));
    const lockedId = state.addShape(
      flagDraft({ x: 1, y: 0, radius: 1, locked: true })
    );

    state.updateShapesCatalogType(
      [editableId, lockedId],
      MULTIGP_CORNER_FLAG_ELEMENT_ID
    );

    expect(
      getTrackElementCatalogIdentity(
        useEditor.getState().track.design.shapeById[editableId]?.meta
      )?.elementId
    ).toBe(MULTIGP_CORNER_FLAG_ELEMENT_ID);
    expect(
      getTrackElementCatalogIdentity(
        useEditor.getState().track.design.shapeById[lockedId]?.meta
      )
    ).toBeNull();
  });

  it("updateShapesCatalogType switches ladder types", () => {
    const state = useEditor.getState();
    const id = state.addShape(ladderDraft());

    state.updateShapesCatalogType([id], MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID);

    expect(
      getTrackElementCatalogIdentity(
        useEditor.getState().track.design.shapeById[id]?.meta
      )?.elementId
    ).toBe(MULTIGP_STANDARD_LADDER_5X5_ELEMENT_ID);
  });

  it("updateShapesCatalogType does nothing when all shapes are locked", () => {
    const state = useEditor.getState();
    const id = state.addShape(
      gateDraft({ x: 0, y: 0, width: 3, height: 3, locked: true })
    );
    state.clearHistory();

    state.updateShapesCatalogType([id], MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID);

    expect(
      useEditor.getState().track.design.shapeById[id]?.meta
    ).toBeUndefined();
    expectPastStatesCount(0);
  });

  it("addShapes assigns unique ids to all shapes in one atomic update", () => {
    const state = useEditor.getState();
    const ids = state.addShapes([
      gateDraft({ x: 0, y: 0 }),
      flagDraft({ x: 4, y: 0 }),
      coneDraft({ x: 8, y: 0, radius: 0.2 }),
    ]);

    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    const design = useEditor.getState().track.design;
    for (const id of ids) {
      expect(design.shapeById[id]).toBeTruthy();
    }
    expect(design.shapeOrder.slice(-3)).toEqual(ids);
  });

  it("sets map reference, toggles visibility, clamps opacity, and normalises rotation", () => {
    const state = useEditor.getState();

    state.setMapReference({
      type: "map",
      provider: "esri-world-imagery",
      mapStyle: "satellite",
      centerLat: 51.5,
      centerLng: 4.5,
      zoom: 14,
      visible: true,
      opacity: 1,
      rotationDeg: 0,
      locked: false,
    });

    expect(useEditor.getState().track.design.mapReference?.type).toBe("map");

    state.setMapReferenceVisibility(false);
    expect(useEditor.getState().track.design.mapReference?.visible).toBe(false);

    state.setMapReferenceOpacity(0.02);
    expect(useEditor.getState().track.design.mapReference?.opacity).toBeCloseTo(
      0.05
    );

    state.setMapReferenceOpacity(1.5);
    expect(useEditor.getState().track.design.mapReference?.opacity).toBeCloseTo(
      1
    );

    state.setMapReferenceRotation(370);
    expect(
      useEditor.getState().track.design.mapReference?.rotationDeg
    ).toBeCloseTo(10);

    state.clearMapReference();
    expect(useEditor.getState().track.design.mapReference).toBeNull();
  });

  it("clearMapReference is a no-op when there is no map reference", () => {
    const state = useEditor.getState();
    state.clearMapReference();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;
    state.clearMapReference();
    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
  });

  it("covers UI setters: snap, zoom, pan, active tool and placement", () => {
    const state = useEditor.getState();

    state.setSnapEnabled(false);
    expect(useEditor.getState().ui.snapEnabled).toBe(false);
    state.toggleSnapEnabled();
    expect(useEditor.getState().ui.snapEnabled).toBe(true);

    state.setZoom(0.05);
    expect(useEditor.getState().ui.zoom).toBeCloseTo(0.1);
    state.setZoom(10);
    expect(useEditor.getState().ui.zoom).toBeCloseTo(5);

    state.setPanOffset({ x: 100, y: -50 });
    expect(useEditor.getState().ui.panOffset).toEqual({ x: 100, y: -50 });

    state.setActiveTool("gate");
    expect(useEditor.getState().ui.activeTool).toBe("gate");

    state.setActivePresetId("preset-abc");
    expect(useEditor.getState().ui.activePresetId).toBe("preset-abc");

    state.setActivePlacementElementId(
      "gate",
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );
    expect(useEditor.getState().ui.activePlacementElementId.gate).toBe(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID
    );
    state.setActivePlacementElementId("gate", null);
    expect(
      useEditor.getState().ui.activePlacementElementId.gate
    ).toBeUndefined();
  });

  it("covers remaining UI setters: waypoint hover, draft path, marquee, patches", () => {
    const state = useEditor.getState();

    state.setHoveredWaypoint({ shapeId: "s1", idx: 2 });
    expect(useEditor.getState().ui.hoveredWaypoint).toMatchObject({
      shapeId: "s1",
      idx: 2,
    });

    state.setDraftPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(useEditor.getState().ui.draftPath).toHaveLength(2);
    state.setDraftForceClosed(true);
    expect(useEditor.getState().ui.draftForceClosed).toBe(true);
    state.setDraftSourceShapeId("shape-x");
    expect(useEditor.getState().ui.draftSourceShapeId).toBe("shape-x");

    state.setMarqueeRect({ x: 0, y: 0, width: 100, height: 50 });
    expect(useEditor.getState().ui.marqueeRect).toMatchObject({ width: 100 });

    state.setGroupDragPreview({
      ids: ["a", "b"],
      origin: { x: 5, y: 10 },
      dx: 2,
      dy: -1,
    });
    expect(useEditor.getState().ui.groupDragPreview).toMatchObject({
      ids: ["a", "b"],
      dx: 2,
      dy: -1,
    });

    const gateId = state.addShape(gateDraft({ x: 0, y: 0 }));
    state.setLiveShapePatch(gateId, { x: 5 });
    expect(useEditor.getState().ui.liveShapePatches[gateId]).toMatchObject({
      x: 5,
    });
    state.clearLiveShapePatch(gateId);
    expect(useEditor.getState().ui.liveShapePatches[gateId]).toBeUndefined();
  });

  it("setVertexSelection clears segment selection and vice versa", () => {
    const state = useEditor.getState();
    const routeId = state.addShape(
      polylineDraft({
        points: [
          { x: 0, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
        ],
      })
    );

    state.setSegmentSelection({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 1, y: 0 },
    });
    expect(useEditor.getState().ui.segmentSelection).not.toBeNull();

    state.setVertexSelection({ shapeId: routeId, idx: 0 });
    expect(useEditor.getState().ui.vertexSelection).toMatchObject({ idx: 0 });
    expect(useEditor.getState().ui.segmentSelection).toBeNull();

    state.setSegmentSelection({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 1, y: 0 },
    });
    expect(useEditor.getState().ui.vertexSelection).toBeNull();
  });
});
