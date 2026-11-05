// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Stage } from "konva/lib/Stage";
import { useTrackCanvasInteractions } from "@/components/canvas/editor/useTrackCanvasInteractions";

type Params = Parameters<typeof useTrackCanvasInteractions>[0];
function interactionParams(): Params {
  return {
    activeTool: "select",
    activePresetId: null,
    activePlacementElementId: {},
    addShape: vi.fn(),
    addShapes: vi.fn(),
    contentDragActiveRef: { current: false },
    designField: { gridStep: 1, ppm: 24 },
    designShapes: [],
    disableTouchGestures: false,
    draftPath: [],
    finalizePath: vi.fn(),
    isMobile: false,
    lastPinchCenterRef: { current: null },
    lastPinchDistRef: { current: null },
    lastTouchPosRef: { current: null },
    lastTouchStartClientRef: { current: null },
    lastTouchStagePointRef: { current: null },
    touchMovedRef: { current: false },
    marqueeAdditiveRef: { current: false },
    marqueeOriginRef: { current: null },
    marqueeRect: null,
    readOnly: false,
    snapEnabled: true,
    selection: [],
    setActiveTool: vi.fn(),
    setActivePresetId: vi.fn(),
    setCursor: vi.fn(),
    setDraftPath: vi.fn(),
    setDraftForceClosed: vi.fn(),
    setIsStageDragging: vi.fn(),
    setManualView: vi.fn(),
    setMarqueeRect: vi.fn(),
    setSelection: vi.fn(),
    setSnapTarget: vi.fn(),
    setZoom: vi.fn(),
    shapeRefs: { current: {} },
    snapTarget: null,
    stageRef: { current: {} as Stage },
    stepPx: 24,
    suppressTapRef: { current: false },
    syncTransform: vi.fn(),
    touchInteractionModeRef: { current: "none" },
  };
}
afterEach(cleanup);

describe("stage drag ownership", () => {
  it("does not treat bubbled shape or waypoint drags as viewport gestures", () => {
    const params = interactionParams();
    const { result } = renderHook(() => useTrackCanvasInteractions(params));
    act(() => {
      for (const target of [{ shapeId: "gate" }, { waypointIndex: 0 }]) {
        result.current.onStageDragStart({ target });
        for (let move = 0; move < 60; move++) {
          result.current.onStageDragMove({ target });
        }
        result.current.onStageDragEnd({ target });
      }
    });
    expect(params.setIsStageDragging).not.toHaveBeenCalled();
    expect(params.setManualView).not.toHaveBeenCalled();
    expect(params.syncTransform).not.toHaveBeenCalled();
  });

  it("keeps actual stage panning and view synchronization working", () => {
    const params = interactionParams();
    const { result } = renderHook(() => useTrackCanvasInteractions(params));
    const event = { target: params.stageRef.current };
    act(() => {
      result.current.onStageDragStart(event);
      result.current.onStageDragMove(event);
      result.current.onStageDragEnd(event);
    });
    expect(params.setIsStageDragging).toHaveBeenNthCalledWith(1, true);
    expect(params.setIsStageDragging).toHaveBeenNthCalledWith(2, false);
    expect(params.setManualView).toHaveBeenCalledWith(true);
    expect(params.syncTransform).toHaveBeenCalledTimes(2);
  });
});
