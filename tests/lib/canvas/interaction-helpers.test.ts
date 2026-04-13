import { describe, expect, it } from "vitest";
import {
  buildCursorState,
  buildSnapIndex,
  clampZoom,
  findNearestSnapPoint,
  findNearestSnapTarget,
  getCursorStateKey,
  getNearbySnapCandidates,
  getPinchCenter,
  getPinchDistance,
  getPinchZoomState,
  getSelectedIdsInMarquee,
  getTouchInteractionMode,
  getWheelZoomTarget,
  getZoomedStagePosition,
  hasExceededTapMoveThreshold,
  isTrackpadPanGesture,
  pointerToMeters,
  shouldCloseDraftLoop,
  shouldSkipDraftPoint,
} from "@/lib/canvas/interaction-helpers";
import type { Shape } from "@/lib/types";

const shapes: Shape[] = [
  {
    id: "gate-1",
    kind: "gate",
    x: 10,
    y: 10,
    rotation: 0,
    width: 2,
    height: 2,
  },
  {
    id: "flag-1",
    kind: "flag",
    x: 14,
    y: 9,
    rotation: 0,
    radius: 0.25,
  },
  {
    id: "line-1",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 1, y: 1, z: 0 },
      { x: 2, y: 2, z: 1 },
    ],
  },
];

describe("canvas interaction helpers", () => {
  it("builds and queries a snap index without polylines", () => {
    const index = buildSnapIndex(shapes, 5);

    expect(index.get("2:2")).toHaveLength(1);
    expect(index.get("0:0")).toBeUndefined();

    const nearby = getNearbySnapCandidates(index, 5, { x: 11, y: 11 });
    expect(nearby.map((shape) => shape.id).sort()).toEqual([
      "flag-1",
      "gate-1",
    ]);

    expect(findNearestSnapPoint(nearby, { x: 10.4, y: 10.2 }, 1)).toEqual({
      x: 10,
      y: 10,
    });
    expect(findNearestSnapTarget(nearby, { x: 14.2, y: 9.1 }, 1)).toEqual({
      id: "flag-1",
      x: 14,
      y: 9,
    });
  });

  it("converts pointer positions to snapped meters", () => {
    const snapped = pointerToMeters({
      designPpm: 20,
      getNearbySnapCandidates: () => shapes,
      pointer: { x: 208, y: 203 },
      snap: true,
      magnetic: true,
      snapRadiusMeters: 1,
      stepPx: 20,
    });

    expect(snapped).toEqual({ x: 10, y: 10 });

    expect(
      pointerToMeters({
        designPpm: 20,
        getNearbySnapCandidates: () => [],
        pointer: { x: 27, y: 43 },
        snap: false,
        magnetic: false,
        snapRadiusMeters: 1,
        stepPx: 20,
      })
    ).toEqual({ x: 1.35, y: 2.15 });
  });

  it("handles draft-loop and cursor state helpers", () => {
    expect(
      shouldCloseDraftLoop({
        closeLoopRadiusMeters: 0.5,
        draftPath: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 3 },
        ],
        meters: { x: 1.2, y: 1.1 },
      })
    ).toBe(true);

    expect(
      shouldSkipDraftPoint({
        minWaypointGapMeters: 0.5,
        nextPoint: { x: 2.1, y: 2.1 },
        previous: [{ x: 2, y: 2 }],
      })
    ).toBe(true);

    const cursor = buildCursorState(
      { x: 47, y: 63 },
      { x: 2.35, y: 3.15 },
      { x: 2, y: 3 },
      20
    );
    expect(cursor.snappedPx).toEqual({ x: 40, y: 60 });
    expect(getCursorStateKey(cursor)).toBe("47.00|63.00|2.00|3.00");
  });

  it("calculates zoom, pinch, touch, and pan interaction state", () => {
    expect(
      isTrackpadPanGesture({
        deltaMode: 0,
        hasHorizontalScroll: true,
        isMobile: false,
        modifierActive: false,
        now: 500,
        previousHorizontalScrollTime: 0,
      })
    ).toBe(true);

    expect(clampZoom(10)).toBe(5);
    expect(
      getWheelZoomTarget({
        ctrlKey: false,
        currentTargetScale: 1,
        deltaY: -100,
      })
    ).toBeGreaterThan(1);

    expect(
      getZoomedStagePosition({
        currentScale: 1,
        pointer: { x: 100, y: 80 },
        stagePosition: { x: 10, y: 20 },
        targetScale: 2,
      })
    ).toEqual({ x: -80, y: -40 });

    expect(
      getPinchCenter(
        { clientX: 10, clientY: 20 },
        { clientX: 30, clientY: 60 },
        { left: 5, top: 10 }
      )
    ).toEqual({ x: 15, y: 30 });
    expect(
      getPinchDistance({ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 })
    ).toBe(5);

    const pinchState = getPinchZoomState({
      center: { x: 20, y: 30 },
      lastCenter: { x: 18, y: 28 },
      lastDistance: 100,
      nextDistance: 120,
      oldScale: 1,
      stagePosition: { x: 5, y: 7 },
    });
    expect(pinchState.scale).toBeCloseTo(1.2);
    expect(pinchState.position.x).toBeCloseTo(4);
    expect(pinchState.position.y).toBeCloseTo(4.4);

    expect(
      hasExceededTapMoveThreshold({
        current: { x: 15, y: 10 },
        start: { x: 10, y: 10 },
        thresholdPx: 4,
      })
    ).toBe(true);

    expect(
      getTouchInteractionMode({
        activeTool: "select",
        isMobile: true,
        targetIsStage: true,
      })
    ).toBe("pan");
  });

  it("collects marquee-selected ids and respects the minimum marquee size", () => {
    const result = getSelectedIdsInMarquee({
      marqueeRect: { x: 0, y: 0, width: 20, height: 20 },
      shapeRefs: {
        a: {
          getClientRect: () => ({ x: 5, y: 5, width: 4, height: 4 }),
        } as never,
        b: {
          getClientRect: () => ({ x: 25, y: 25, width: 4, height: 4 }),
        } as never,
        c: null,
      },
      stage: {} as never,
    });

    expect(result).toEqual({ ids: ["a"], tooSmall: false });
    expect(
      getSelectedIdsInMarquee({
        marqueeRect: { x: 0, y: 0, width: 4, height: 4 },
        shapeRefs: {},
        stage: {} as never,
      })
    ).toEqual({ ids: [], tooSmall: true });
  });
});
