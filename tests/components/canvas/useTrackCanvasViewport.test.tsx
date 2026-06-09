// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { useRef } from "react";
import { useTrackCanvasViewport } from "@/components/canvas/useTrackCanvasViewport";
import type { Stage as KonvaStage } from "konva/lib/Stage";

type StageMock = {
  batchDraw: Mock;
  off: Mock;
  on: Mock;
  position: Mock;
  x: Mock;
  y: Mock;
};

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

function createStageMock(): StageMock {
  let position = { x: 100, y: 200 };

  return {
    batchDraw: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    position: vi.fn((nextPosition: { x: number; y: number }) => {
      position = nextPosition;
    }),
    x: vi.fn(() => position.x),
    y: vi.fn(() => position.y),
  };
}

function asKonvaStage(stage: StageMock): KonvaStage {
  return stage as unknown as KonvaStage;
}

function Harness({
  contentDragActive = false,
  hasManualView = false,
  stage = createStageMock(),
  fitFieldToViewport = vi.fn(),
  setManualView = vi.fn(),
  setViewportSize = vi.fn(),
  syncTransform = vi.fn(),
}: {
  contentDragActive?: boolean;
  fitFieldToViewport?: () => void;
  hasManualView?: boolean;
  setManualView?: (value: boolean) => void;
  setViewportSize?: (size: { width: number; height: number }) => void;
  stage?: StageMock;
  syncTransform?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentDragActiveRef = useRef(contentDragActive);
  const hasManualViewRef = useRef(hasManualView);
  const stageInstance = asKonvaStage(stage);
  const stageRef = useRef<KonvaStage | null>(stageInstance);

  useTrackCanvasViewport({
    containerRef,
    contentDragActiveRef,
    fitFieldToViewport,
    hasManualViewRef,
    setManualView,
    setViewportSize,
    stageRef,
    stageInstance,
    syncTransform,
  });

  return <div ref={containerRef} data-testid="canvas-container" />;
}

describe("useTrackCanvasViewport", () => {
  beforeEach(() => {
    ResizeObserverMock.instances = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("subscribes to stage transform changes and fits new canvases", () => {
    const stage = createStageMock();
    const fitFieldToViewport = vi.fn();
    const syncTransform = vi.fn();
    const { unmount } = render(
      <Harness
        fitFieldToViewport={fitFieldToViewport}
        stage={stage}
        syncTransform={syncTransform}
      />
    );

    expect(stage.on).toHaveBeenCalledWith(
      "xChange yChange scaleXChange scaleYChange dragmove",
      expect.any(Function)
    );
    expect(syncTransform).toHaveBeenCalledTimes(1);
    expect(fitFieldToViewport).toHaveBeenCalledTimes(1);

    unmount();

    expect(stage.off).toHaveBeenCalledWith(
      "xChange yChange scaleXChange scaleYChange dragmove",
      expect.any(Function)
    );
  });

  it("reports clamped viewport dimensions from ResizeObserver", () => {
    const setViewportSize = vi.fn();
    render(<Harness setViewportSize={setViewportSize} />);
    const observer = ResizeObserverMock.instances.at(-1)!;

    act(() => {
      observer.callback(
        [
          {
            contentRect: {
              width: 249.8,
              height: 0,
            },
          } as ResizeObserverEntry,
        ],
        observer as unknown as ResizeObserver
      );
    });

    expect(setViewportSize).toHaveBeenCalledWith({ width: 249, height: 1 });
  });

  it("pans the stage with the middle mouse button when content is not being dragged", () => {
    const stage = createStageMock();
    const setManualView = vi.fn();
    const syncTransform = vi.fn();
    render(
      <Harness
        setManualView={setManualView}
        stage={stage}
        syncTransform={syncTransform}
      />
    );
    syncTransform.mockClear();
    const container = screen.getByTestId("canvas-container");

    act(() => {
      container.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          button: 1,
          clientX: 10,
          clientY: 20,
        })
      );
      container.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 18,
          clientY: 15,
        })
      );
      window.dispatchEvent(
        new MouseEvent("mouseup", {
          bubbles: true,
          button: 1,
        })
      );
    });

    expect(setManualView).toHaveBeenCalledWith(true);
    expect(stage.position).toHaveBeenCalledWith({ x: 108, y: 195 });
    expect(stage.batchDraw).toHaveBeenCalledTimes(1);
    expect(syncTransform).toHaveBeenCalledTimes(1);
    expect(container.style.cursor).toBe("");
  });

  it("ignores middle mouse panning while canvas content is already dragged", () => {
    const stage = createStageMock();
    const setManualView = vi.fn();
    render(
      <Harness contentDragActive setManualView={setManualView} stage={stage} />
    );
    const container = screen.getByTestId("canvas-container");

    act(() => {
      container.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          button: 1,
          clientX: 10,
          clientY: 20,
        })
      );
      container.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 18,
          clientY: 15,
        })
      );
    });

    expect(setManualView).not.toHaveBeenCalled();
    expect(stage.position).not.toHaveBeenCalled();
  });
});
