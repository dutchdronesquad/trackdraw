// @vitest-environment happy-dom

import { useCallback } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePickerGesture } from "@/components/map-reference/usePickerGesture";
import type { LatLng } from "@/lib/map-reference/geometry";

type MutableRef<T> = {
  current: T;
};

class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {}

  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

function configurePickerNode(node: HTMLDivElement) {
  Object.defineProperties(node, {
    clientHeight: { configurable: true, value: 200 },
    clientWidth: { configurable: true, value: 300 },
  });
  node.getBoundingClientRect = () =>
    ({
      bottom: 200,
      height: 200,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  node.hasPointerCapture = vi.fn(() => true);
  node.releasePointerCapture = vi.fn();
  node.setPointerCapture = vi.fn();
}

function createPointerEvent(
  type: string,
  {
    clientX,
    clientY,
    pointerId,
  }: {
    clientX: number;
    clientY: number;
    pointerId: number;
  }
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: 0 },
    buttons: { value: type === "pointerup" ? 0 : 1 },
    clientX: { value: clientX },
    clientY: { value: clientY },
    isPrimary: { value: pointerId === 1 },
    pageX: { value: clientX },
    pageY: { value: clientY },
    pointerId: { value: pointerId },
    pointerType: { value: "touch" },
  });

  return event as PointerEvent;
}

function dispatchPointer(
  target: HTMLElement,
  type: string,
  init: {
    clientX: number;
    clientY: number;
    pointerId: number;
  }
) {
  act(() => {
    target.dispatchEvent(createPointerEvent(type, init));
  });
}

function PickerGestureHarness({
  centerRef,
  rotationRef,
  syncCenter,
  syncZoom,
  zoomRef,
}: {
  centerRef: MutableRef<LatLng>;
  rotationRef: MutableRef<number>;
  syncCenter: (center: LatLng) => void;
  syncZoom: (zoom: number) => void;
  zoomRef: MutableRef<number>;
}) {
  const { setPickerNode, tileLayerRef } = usePickerGesture({
    centerRef,
    rotationRef,
    syncCenter,
    syncZoom,
    zoomRef,
  });

  const setNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        configurePickerNode(node);
      }
      setPickerNode(node);
    },
    [setPickerNode]
  );

  return (
    <div data-testid="picker" ref={setNode}>
      <div data-testid="tile-layer" ref={tileLayerRef} />
    </div>
  );
}

function renderPickerGestureHarness() {
  const centerRef: MutableRef<LatLng> = { current: { lat: 52.1, lng: 5.2 } };
  const rotationRef: MutableRef<number> = { current: 0 };
  const zoomRef: MutableRef<number> = { current: 10 };
  const syncCenter = vi.fn((center: LatLng) => {
    centerRef.current = center;
  });
  const syncZoom = vi.fn((zoom: number) => {
    zoomRef.current = zoom;
  });

  render(
    <PickerGestureHarness
      centerRef={centerRef}
      rotationRef={rotationRef}
      syncCenter={syncCenter}
      syncZoom={syncZoom}
      zoomRef={zoomRef}
    />
  );

  return {
    centerRef,
    picker: screen.getByTestId("picker"),
    syncCenter,
    syncZoom,
    tileLayer: screen.getByTestId("tile-layer"),
    zoomRef,
  };
}

describe("usePickerGesture", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("recenters the map on a single touch tap", async () => {
    const { picker, syncCenter } = renderPickerGestureHarness();
    await act(async () => {});

    dispatchPointer(picker, "pointerdown", {
      clientX: 210,
      clientY: 100,
      pointerId: 1,
    });
    dispatchPointer(picker, "pointerup", {
      clientX: 210,
      clientY: 100,
      pointerId: 1,
    });

    expect(syncCenter).toHaveBeenCalledTimes(1);
    expect(syncCenter.mock.calls[0]?.[0].lng).toBeGreaterThan(5.2);
  });

  it("keeps single-touch dragging visual until release, then commits the pan", async () => {
    const { picker, syncCenter, syncZoom, tileLayer } =
      renderPickerGestureHarness();
    await act(async () => {});

    dispatchPointer(picker, "pointerdown", {
      clientX: 150,
      clientY: 100,
      pointerId: 1,
    });
    dispatchPointer(picker, "pointermove", {
      clientX: 180,
      clientY: 110,
      pointerId: 1,
    });

    expect(tileLayer.style.transform).toBe(
      "translate(30px, 10px) rotate(0deg)"
    );
    expect(syncCenter).not.toHaveBeenCalled();

    dispatchPointer(picker, "pointerup", {
      clientX: 180,
      clientY: 110,
      pointerId: 1,
    });

    expect(syncCenter).toHaveBeenCalledTimes(1);
    expect(syncZoom).not.toHaveBeenCalled();
    expect(tileLayer.style.transform).toBe("rotate(0deg)");
  });

  it("supports two-touch drag and pinch zoom gestures", async () => {
    const { picker, syncCenter, syncZoom } = renderPickerGestureHarness();
    await act(async () => {});

    dispatchPointer(picker, "pointerdown", {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    dispatchPointer(picker, "pointerdown", {
      clientX: 200,
      clientY: 100,
      pointerId: 2,
    });
    dispatchPointer(picker, "pointermove", {
      clientX: 90,
      clientY: 100,
      pointerId: 1,
    });
    dispatchPointer(picker, "pointermove", {
      clientX: 210,
      clientY: 100,
      pointerId: 2,
    });

    expect(syncCenter).toHaveBeenCalled();
    expect(syncZoom).toHaveBeenCalled();
    expect(syncZoom.mock.calls.at(-1)?.[0]).toBeGreaterThan(10);
  });
});
