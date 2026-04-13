import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditor } from "@/store/editor";

function getPastStatesCount() {
  return useEditor.temporal.getState().pastStates.length;
}

function runHistoryStep(step: () => void) {
  step();
  const temporal = useEditor.temporal.getState();
  temporal.pause();
  useEditor.getState().sanitizeHistoryState();
  temporal.resume();
}

describe("editor store history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:00:00.000Z"));
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not create a history entry for a no-op shape patch", () => {
    const state = useEditor.getState();
    const id = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

    state.clearHistory();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;

    useEditor.getState().updateShape(id, { rotation: 0 });

    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
    expect(getPastStatesCount()).toBe(0);
  });

  it("creates a history entry when a shape patch changes the design", () => {
    const state = useEditor.getState();
    const id = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

    state.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:06:22.500Z"));

    useEditor.getState().updateShape(id, { rotation: 5 });

    expect(useEditor.getState().track.design.shapeById[id]?.rotation).toBe(5);
    expect(useEditor.getState().track.design.updatedAt).toBe(
      "2026-04-13T10:06:22.500Z"
    );
    expect(getPastStatesCount()).toBe(1);
  });

  it("does not create a history entry for unchanged polyline points", () => {
    const state = useEditor.getState();
    const id = state.addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 1, y: 2, z: 0 },
        { x: 3, y: 4, z: 1 },
      ],
    });

    state.clearHistory();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;

    useEditor.getState().setPolylinePoints(id, [
      { x: 1, y: 2, z: 0 },
      { x: 3, y: 4, z: 1 },
    ]);

    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
    expect(getPastStatesCount()).toBe(0);
  });

  it("does not create a history entry when rotateShapes only targets non-rotatable shapes", () => {
    const state = useEditor.getState();
    const coneId = state.addShape({
      kind: "cone",
      x: 5,
      y: 6,
      rotation: 0,
      radius: 0.2,
    });
    const polylineId = state.addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 1, y: 2, z: 0 },
        { x: 3, y: 4, z: 1 },
      ],
    });

    state.clearHistory();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;

    useEditor.getState().rotateShapes([coneId, polylineId], 15);

    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
    expect(getPastStatesCount()).toBe(0);
  });

  it("does not create a history entry for a no-op batch patch", () => {
    const state = useEditor.getState();
    const firstGateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });
    const secondGateId = state.addShape({
      kind: "gate",
      x: 14,
      y: 12,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

    state.clearHistory();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;

    useEditor.getState().updateShapes([firstGateId, secondGateId], {
      rotation: 0,
    });

    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
    expect(getPastStatesCount()).toBe(0);
  });

  it("creates a history entry when rotateShapes changes a rotatable shape", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

    state.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:06:25.000Z"));

    useEditor.getState().rotateShapes([gateId], 15);

    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      15
    );
    expect(useEditor.getState().track.design.updatedAt).toBe(
      "2026-04-13T10:06:25.000Z"
    );
    expect(getPastStatesCount()).toBe(1);
  });

  it("undoes and redoes a real design change through the temporal store", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

    state.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:06:27.000Z"));
    useEditor.getState().updateShape(gateId, { rotation: 20 });

    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      20
    );
    expect(getPastStatesCount()).toBe(1);

    runHistoryStep(useEditor.temporal.getState().undo);
    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      0
    );

    runHistoryStep(useEditor.temporal.getState().redo);
    expect(useEditor.getState().track.design.shapeById[gateId]?.rotation).toBe(
      20
    );
  });

  it("sanitizeHistoryState clears transient session and ui state after history steps", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2.2,
      height: 1.9,
    });

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
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 0,
      width: 2,
      height: 2,
    });

    state.clearHistory();
    const beforeUpdatedAt = useEditor.getState().track.design.updatedAt;

    state.setShapesLocked([gateId], false);
    expect(useEditor.getState().track.design.updatedAt).toBe(beforeUpdatedAt);
    expect(getPastStatesCount()).toBe(0);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:10:00.000Z"));
    state.setShapesLocked([gateId], true);

    expect(useEditor.getState().track.design.shapeById[gateId]?.locked).toBe(
      true
    );
    expect(useEditor.getState().track.design.updatedAt).toBe(
      "2026-04-13T10:10:00.000Z"
    );
    expect(getPastStatesCount()).toBe(1);
  });

  it("duplicates shapes, updates selection, and creates a history entry", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 10,
      y: 8,
      rotation: 5,
      width: 2,
      height: 2,
    });

    state.clearHistory();
    const beforeCount = useEditor.getState().track.design.shapeOrder.length;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:10:10.000Z"));
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
    expect(getPastStatesCount()).toBe(1);
  });

  it("removes selected shapes and clears them from the selection", () => {
    const state = useEditor.getState();
    const firstId = state.addShape({
      kind: "gate",
      x: 5,
      y: 5,
      rotation: 0,
      width: 2,
      height: 2,
    });
    const secondId = state.addShape({
      kind: "flag",
      x: 8,
      y: 7,
      rotation: 0,
      radius: 0.25,
    });

    state.setSelection([firstId, secondId]);
    state.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:10:20.000Z"));
    state.removeShapes([firstId]);

    const nextState = useEditor.getState();
    expect(nextState.track.design.shapeById[firstId]).toBeUndefined();
    expect(nextState.session.selection).toEqual([secondId]);
    expect(getPastStatesCount()).toBe(1);
  });

  it("groups and ungroups the current selection", () => {
    const state = useEditor.getState();
    const firstId = state.addShape({
      kind: "gate",
      x: 5,
      y: 5,
      rotation: 0,
      width: 2,
      height: 2,
    });
    const secondId = state.addShape({
      kind: "flag",
      x: 8,
      y: 7,
      rotation: 0,
      radius: 0.25,
    });

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
    const firstId = state.addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
      ],
    });
    const secondId = state.addShape({
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 2, y: 0, z: 0 },
        { x: 4, y: 1, z: 0 },
      ],
    });

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

  it("updates field and design metadata through explicit track actions", () => {
    const state = useEditor.getState();
    state.clearHistory();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:12:00.000Z"));
    state.updateField({ width: 80 });
    vi.setSystemTime(new Date("2026-04-13T10:12:01.000Z"));
    state.updateDesignMeta({ title: "Race Day Layout" });

    const nextState = useEditor.getState();
    expect(nextState.track.design.field.width).toBe(80);
    expect(nextState.track.design.title).toBe("Race Day Layout");
    expect(nextState.track.design.updatedAt).toBe("2026-04-13T10:12:01.000Z");
    expect(getPastStatesCount()).toBe(2);
  });

  it("resets track, session, ui, and history when replacing the design or starting a new project", () => {
    const state = useEditor.getState();
    const gateId = state.addShape({
      kind: "gate",
      x: 5,
      y: 6,
      rotation: 0,
      width: 2,
      height: 2,
    });

    state.setSelection([gateId]);
    state.setHoveredShapeId(gateId);
    state.setZoom(2);
    state.clearHistory();
    state.updateDesignMeta({ title: "Before replace" });

    state.replaceDesign({
      id: "replacement",
      version: 1,
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
    expect(getPastStatesCount()).toBe(0);

    state.newProject();
    nextState = useEditor.getState();
    expect(nextState.track.design.title).toBe("New Track");
    expect(nextState.ui.zoom).toBe(1);
    expect(nextState.ui.panOffset).toEqual({ x: 0, y: 0 });
    expect(getPastStatesCount()).toBe(0);
  });

  it("nudges shapes and changes z-order only when movement is possible", () => {
    const state = useEditor.getState();
    const firstId = state.addShape({
      kind: "gate",
      x: 1,
      y: 2,
      rotation: 0,
      width: 2,
      height: 2,
    });
    const secondId = state.addShape({
      kind: "flag",
      x: 3,
      y: 4,
      rotation: 0,
      radius: 0.25,
    });
    const thirdId = state.addShape({
      kind: "cone",
      x: 5,
      y: 6,
      rotation: 0,
      radius: 0.2,
    });

    state.clearHistory();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:12:10.000Z"));
    state.nudgeShapes([firstId], 2, -1);
    expect(useEditor.getState().track.design.shapeById[firstId]).toMatchObject({
      x: 3,
      y: 1,
    });

    vi.setSystemTime(new Date("2026-04-13T10:12:11.000Z"));
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
});
