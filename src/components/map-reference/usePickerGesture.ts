"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  globalPixelToLatLng,
  latLngToGlobalPixel,
  panLatLngByPixels,
  screenDeltaToMapPixelDelta,
  type LatLng,
} from "@/lib/map-reference/geometry";

const PICKER_WIDTH = 760;
const PICKER_HEIGHT = 430;
const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_PAGE_HEIGHT_PX = 420;
const WHEEL_PAN_FACTOR = 0.65;
const PINCH_ZOOM_FACTOR = 0.008;

interface PointerPosition {
  x: number;
  y: number;
}

interface PickerGestureState {
  lastCentroid: PointerPosition | null;
  lastDistance: number | null;
  lastX: number;
  lastY: number;
  mode: "idle" | "single" | "multi";
  moved: boolean;
  pointers: Map<number, PointerPosition>;
  suppressClick: boolean;
  totalDx: number;
  totalDy: number;
}

type WebKitGestureEvent = Event & {
  clientX?: number;
  clientY?: number;
  scale?: number;
};

function normalizeWheelDelta(delta: number, deltaMode: number) {
  if (deltaMode === 1) return delta * WHEEL_LINE_HEIGHT_PX;
  if (deltaMode === 2) return delta * WHEEL_PAGE_HEIGHT_PX;
  return delta;
}

function getPointerCentroid(
  pointers: Map<number, PointerPosition>
): PointerPosition | null {
  if (pointers.size === 0) return null;

  let x = 0;
  let y = 0;
  pointers.forEach((pointer) => {
    x += pointer.x;
    y += pointer.y;
  });

  return { x: x / pointers.size, y: y / pointers.size };
}

function getPointerDistance(pointers: Map<number, PointerPosition>) {
  if (pointers.size < 2) return null;

  const [first, second] = Array.from(pointers.values());
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function usePickerGesture({
  centerRef,
  zoomRef,
  rotationRef,
  syncCenter,
  syncZoom,
}: {
  centerRef: { readonly current: LatLng };
  zoomRef: { readonly current: number };
  rotationRef: { readonly current: number };
  syncCenter: (center: LatLng) => void;
  syncZoom: (zoom: number) => void;
}) {
  const pickerGestureRef = useRef<PickerGestureState>({
    lastCentroid: null,
    lastDistance: null,
    lastX: 0,
    lastY: 0,
    mode: "idle",
    moved: false,
    pointers: new Map(),
    suppressClick: false,
    totalDx: 0,
    totalDy: 0,
  });
  const tileLayerRef = useRef<HTMLDivElement | null>(null);
  const gestureScaleRef = useRef(1);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [pickerElement, setPickerElement] = useState<HTMLDivElement | null>(
    null
  );
  const [pickerSize, setPickerSize] = useState({
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
  });

  const setPickerNode = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    setPickerElement(node);

    if (!node) return;

    const updatePickerSize = () => {
      setPickerSize({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
      });
    };

    updatePickerSize();
    resizeObserverRef.current = new ResizeObserver(updatePickerSize);
    resizeObserverRef.current.observe(node);
  }, []);

  const panByScreenPixels = useCallback(
    ({ dx, dy }: { dx: number; dy: number }) => {
      const panDelta = screenDeltaToMapPixelDelta({
        dx,
        dy,
        rotationDeg: rotationRef.current,
      });
      syncCenter(
        panLatLngByPixels({
          center: centerRef.current,
          dx: panDelta.dx,
          dy: panDelta.dy,
          zoom: zoomRef.current,
        })
      );
    },
    [centerRef, rotationRef, syncCenter, zoomRef]
  );

  useEffect(() => {
    if (!pickerElement) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode);

      if (event.ctrlKey) {
        syncZoom(zoomRef.current - deltaY * PINCH_ZOOM_FACTOR);
        return;
      }

      panByScreenPixels({
        dx: -deltaX * WHEEL_PAN_FACTOR,
        dy: -deltaY * WHEEL_PAN_FACTOR,
      });
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      gestureScaleRef.current = 1;
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      const gestureEvent = event as WebKitGestureEvent;
      const nextScale = gestureEvent.scale ?? 1;
      const zoomDelta = Math.log2(nextScale / gestureScaleRef.current);
      gestureScaleRef.current = nextScale;
      if (!Number.isFinite(zoomDelta) || zoomDelta === 0) return;

      syncZoom(zoomRef.current + zoomDelta);
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      gestureScaleRef.current = 1;
    };

    pickerElement.addEventListener("wheel", handleWheel, { passive: false });
    pickerElement.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    pickerElement.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    pickerElement.addEventListener("gestureend", handleGestureEnd, {
      passive: false,
    });

    return () => {
      pickerElement.removeEventListener("wheel", handleWheel);
      pickerElement.removeEventListener("gesturestart", handleGestureStart);
      pickerElement.removeEventListener("gesturechange", handleGestureChange);
      pickerElement.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [panByScreenPixels, pickerElement, syncZoom, zoomRef]);

  useEffect(() => {
    if (!pickerElement) return;

    const resetTileLayerTransform = () => {
      if (tileLayerRef.current) {
        tileLayerRef.current.style.transform = `rotate(${-rotationRef.current}deg)`;
      }
    };

    const commitSinglePointerPan = () => {
      const gesture = pickerGestureRef.current;
      if (gesture.totalDx !== 0 || gesture.totalDy !== 0) {
        panByScreenPixels({ dx: gesture.totalDx, dy: gesture.totalDy });
      }
      gesture.totalDx = 0;
      gesture.totalDy = 0;
      resetTileLayerTransform();
    };

    const resetGesture = () => {
      pickerGestureRef.current = {
        lastCentroid: null,
        lastDistance: null,
        lastX: 0,
        lastY: 0,
        mode: "idle",
        moved: false,
        pointers: new Map(),
        suppressClick: false,
        totalDx: 0,
        totalDy: 0,
      };
      resetTileLayerTransform();
    };

    const startSinglePointerGesture = (
      pointer: PointerPosition,
      suppressClick: boolean
    ) => {
      const gesture = pickerGestureRef.current;
      gesture.lastCentroid = null;
      gesture.lastDistance = null;
      gesture.lastX = pointer.x;
      gesture.lastY = pointer.y;
      gesture.mode = "single";
      gesture.moved = suppressClick;
      gesture.suppressClick = suppressClick;
      gesture.totalDx = 0;
      gesture.totalDy = 0;
    };

    const startMultiPointerGesture = () => {
      const gesture = pickerGestureRef.current;
      gesture.lastCentroid = getPointerCentroid(gesture.pointers);
      gesture.lastDistance = getPointerDistance(gesture.pointers);
      gesture.mode = "multi";
      gesture.moved = true;
      gesture.suppressClick = true;
      gesture.totalDx = 0;
      gesture.totalDy = 0;
      resetTileLayerTransform();
    };

    const handleSinglePointerTap = (event: PointerEvent) => {
      const rect = pickerElement.getBoundingClientRect();
      const centerPixel = latLngToGlobalPixel(
        centerRef.current.lat,
        centerRef.current.lng,
        zoomRef.current
      );
      const clickDelta = screenDeltaToMapPixelDelta({
        dx: event.clientX - rect.left - rect.width / 2,
        dy: event.clientY - rect.top - rect.height / 2,
        rotationDeg: rotationRef.current,
      });
      syncCenter(
        globalPixelToLatLng(
          {
            x: centerPixel.x + clickDelta.dx,
            y: centerPixel.y + clickDelta.dy,
          },
          zoomRef.current
        )
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      pickerElement.setPointerCapture(event.pointerId);

      const gesture = pickerGestureRef.current;
      gesture.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (gesture.pointers.size === 1) {
        startSinglePointerGesture(
          { x: event.clientX, y: event.clientY },
          gesture.suppressClick
        );
        return;
      }

      if (gesture.mode === "single") {
        commitSinglePointerPan();
      }
      startMultiPointerGesture();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = pickerGestureRef.current;
      if (!gesture.pointers.has(event.pointerId)) return;

      event.preventDefault();
      event.stopPropagation();

      gesture.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (gesture.pointers.size >= 2) {
        const centroid = getPointerCentroid(gesture.pointers);
        const distance = getPointerDistance(gesture.pointers);
        if (!centroid || !distance) return;

        if (gesture.lastCentroid) {
          const dx = centroid.x - gesture.lastCentroid.x;
          const dy = centroid.y - gesture.lastCentroid.y;
          if (Math.abs(dx) + Math.abs(dy) > 0) {
            panByScreenPixels({ dx, dy });
          }
        }

        if (gesture.lastDistance && gesture.lastDistance > 0 && distance > 0) {
          const zoomDelta = Math.log2(distance / gesture.lastDistance);
          if (Number.isFinite(zoomDelta) && zoomDelta !== 0) {
            syncZoom(zoomRef.current + zoomDelta);
          }
        }

        gesture.lastCentroid = centroid;
        gesture.lastDistance = distance;
        gesture.mode = "multi";
        gesture.moved = true;
        gesture.suppressClick = true;
        return;
      }

      if (gesture.mode !== "single") return;

      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 1) gesture.moved = true;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      gesture.totalDx += dx;
      gesture.totalDy += dy;

      if (tileLayerRef.current) {
        tileLayerRef.current.style.transform = `translate(${gesture.totalDx}px, ${gesture.totalDy}px) rotate(${-rotationRef.current}deg)`;
      }
    };

    const finishPointer = (event: PointerEvent) => {
      const gesture = pickerGestureRef.current;
      if (!gesture.pointers.has(event.pointerId)) return;

      event.preventDefault();
      event.stopPropagation();

      if (pickerElement.hasPointerCapture(event.pointerId)) {
        pickerElement.releasePointerCapture(event.pointerId);
      }

      const wasSingle = gesture.mode === "single";
      const wasMulti = gesture.mode === "multi";
      const moved = gesture.moved;
      const suppressClick = gesture.suppressClick;
      gesture.pointers.delete(event.pointerId);

      if (wasSingle && gesture.pointers.size === 0) {
        resetTileLayerTransform();
        if (moved) {
          commitSinglePointerPan();
        } else if (!suppressClick) {
          handleSinglePointerTap(event);
        }
        resetGesture();
        return;
      }

      if (!wasMulti) {
        resetGesture();
        return;
      }

      resetTileLayerTransform();

      if (gesture.pointers.size >= 2) {
        startMultiPointerGesture();
        return;
      }

      if (gesture.pointers.size === 1) {
        const remainingPointer = Array.from(gesture.pointers.values())[0];
        startSinglePointerGesture(remainingPointer, true);
        return;
      }

      resetGesture();
    };

    pickerElement.addEventListener("pointerdown", handlePointerDown);
    pickerElement.addEventListener("pointermove", handlePointerMove);
    pickerElement.addEventListener("pointerup", finishPointer);
    pickerElement.addEventListener("pointercancel", finishPointer);
    return () => {
      pickerElement.removeEventListener("pointerdown", handlePointerDown);
      pickerElement.removeEventListener("pointermove", handlePointerMove);
      pickerElement.removeEventListener("pointerup", finishPointer);
      pickerElement.removeEventListener("pointercancel", finishPointer);
      resetGesture();
    };
  }, [
    centerRef,
    panByScreenPixels,
    pickerElement,
    rotationRef,
    syncCenter,
    syncZoom,
    zoomRef,
  ]);

  return { setPickerNode, tileLayerRef, pickerSize };
}
