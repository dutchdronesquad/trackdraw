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
});
