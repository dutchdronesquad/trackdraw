"use client";

import { useCallback } from "react";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import { createShapeForTool, type EditorTool } from "@/lib/editor-tools";
import { distance2D } from "@/lib/geometry";
import { px2m } from "@/lib/units";
import {
  MIN_MARQUEE_SIZE,
  normalizeRect,
  rectsIntersect,
  type CursorState,
  type DraftPoint,
  type RectLike,
} from "@/components/canvas/shared";
import type { Shape, ShapeDraft } from "@/lib/types";

interface TrackCanvasInteractionsParams {
  activeTool: EditorTool;
  addShape: (shape: ShapeDraft) => string;
  designField: { gridStep: number; ppm: number };
  designShapes: Shape[];
  disableTouchGestures: boolean;
  finalizePath: () => void;
  isMobile: boolean;
  lastPinchCenterRef: React.MutableRefObject<{ x: number; y: number } | null>;
  lastPinchDistRef: React.MutableRefObject<number | null>;
  lastTouchPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  marqueeAdditiveRef: React.MutableRefObject<boolean>;
  marqueeOriginRef: React.MutableRefObject<Vector2d | null>;
  marqueeRect: RectLike | null;
  onCursorChange?: (pos: { x: number; y: number } | null) => void;
  onSnapChange?: (active: boolean) => void;
  readOnly: boolean;
  selection: string[];
  setCursor: React.Dispatch<React.SetStateAction<CursorState | null>>;
  setDraftPath: React.Dispatch<React.SetStateAction<DraftPoint[]>>;
  setIsStageDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setManualView: (value: boolean) => void;
  setMarqueeRect: React.Dispatch<React.SetStateAction<RectLike | null>>;
  setSelection: (ids: string[]) => void;
  setSnapTarget: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; id: string } | null>
  >;
  setZoom: (zoom: number) => void;
  shapeRefs: React.MutableRefObject<Record<string, KonvaGroup | null>>;
  snapTarget: { x: number; y: number; id: string } | null;
  stageRef: React.MutableRefObject<KonvaStage | null>;
  stepPx: number;
  suppressTapRef: React.MutableRefObject<boolean>;
  syncTransform: () => void;
  touchInteractionModeRef: React.MutableRefObject<"none" | "pan" | "content">;
}

export function useTrackCanvasInteractions({
  activeTool,
  addShape,
  designField,
  designShapes,
  disableTouchGestures,
  finalizePath,
  isMobile,
  lastPinchCenterRef,
  lastPinchDistRef,
  lastTouchPosRef,
  marqueeAdditiveRef,
  marqueeOriginRef,
  marqueeRect,
  onCursorChange,
  onSnapChange,
  readOnly,
  selection,
  setCursor,
  setDraftPath,
  setIsStageDragging,
  setManualView,
  setMarqueeRect,
  setSelection,
  setSnapTarget,
  setZoom,
  shapeRefs,
  snapTarget,
  stageRef,
  stepPx,
  suppressTapRef,
  syncTransform,
  touchInteractionModeRef,
}: TrackCanvasInteractionsParams) {
  const snapRadiusMeters = Math.max(1, designField.gridStep * 1.5);

  const pointerToMeters = useCallback(
    (pointer: { x: number; y: number } | null, snap = true) => {
      if (!pointer) return null;
      const px = snap ? Math.round(pointer.x / stepPx) * stepPx : pointer.x;
      const py = snap ? Math.round(pointer.y / stepPx) * stepPx : pointer.y;
      const gridMeters = {
        x: px2m(px, designField.ppm),
        y: px2m(py, designField.ppm),
      };
      if (!snap) return gridMeters;

      let nearest: { x: number; y: number } | null = null;
      let minDist = snapRadiusMeters;
      for (const shape of designShapes) {
        if (shape.kind === "polyline") continue;
        const dist = Math.sqrt(
          (shape.x - gridMeters.x) ** 2 + (shape.y - gridMeters.y) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: shape.x, y: shape.y };
        }
      }
      return nearest ?? gridMeters;
    },
    [designField.ppm, designShapes, snapRadiusMeters, stepPx]
  );

  const findSnapTarget = useCallback(
    (meters: { x: number; y: number }) => {
      let nearest: { x: number; y: number; id: string } | null = null;
      let minDist = snapRadiusMeters;
      for (const shape of designShapes) {
        if (shape.kind === "polyline") continue;
        const dist = Math.sqrt(
          (shape.x - meters.x) ** 2 + (shape.y - meters.y) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: shape.x, y: shape.y, id: shape.id };
        }
      }
      return nearest;
    },
    [designShapes, snapRadiusMeters]
  );

  const onStageDragStart = useCallback(() => {
    setIsStageDragging(true);
    setManualView(true);
  }, [setIsStageDragging, setManualView]);

  const onStageDragMove = useCallback(() => {
    syncTransform();
  }, [syncTransform]);

  const onStageDragEnd = useCallback(() => {
    setIsStageDragging(false);
    syncTransform();
  }, [setIsStageDragging, syncTransform]);

  const onWheel = useCallback(
    (event: { evt: WheelEvent }) => {
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      setManualView(true);
      const scaleBy = 1.08;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const nextScale =
        event.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.2, Math.min(5, nextScale));
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      stage.scale({ x: clampedScale, y: clampedScale });
      stage.position({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
      setZoom(clampedScale);
      syncTransform();
    },
    [setManualView, setZoom, stageRef, syncTransform]
  );

  const onTouchStart = useCallback(
    (event: { evt: TouchEvent; target: unknown }) => {
      if (disableTouchGestures) return;
      const stage = stageRef.current;
      if (!stage) return;

      if (event.evt.touches.length === 2) {
        event.evt.preventDefault();
        touchInteractionModeRef.current = "content";
        suppressTapRef.current = true;
        lastTouchPosRef.current = null;
        const [touch1, touch2] = [event.evt.touches[0], event.evt.touches[1]];
        lastPinchDistRef.current = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const stageBox = stage?.container().getBoundingClientRect();
        lastPinchCenterRef.current = stageBox
          ? {
              x: (touch1.clientX + touch2.clientX) / 2 - stageBox.left,
              y: (touch1.clientY + touch2.clientY) / 2 - stageBox.top,
            }
          : null;
      } else if (event.evt.touches.length === 1) {
        const touch = event.evt.touches[0];
        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        lastPinchDistRef.current = null;
        lastPinchCenterRef.current = null;
        suppressTapRef.current = false;
        touchInteractionModeRef.current =
          event.target === stage &&
          (activeTool === "grab" || (isMobile && activeTool === "select"))
            ? "pan"
            : "content";
      }
    },
    [
      activeTool,
      disableTouchGestures,
      isMobile,
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      stageRef,
      suppressTapRef,
      touchInteractionModeRef,
    ]
  );

  const onTouchMove = useCallback(
    (event: { evt: TouchEvent }) => {
      if (disableTouchGestures) {
        event.evt.preventDefault();
        return;
      }

      if (event.evt.touches.length === 1) {
        if (touchInteractionModeRef.current !== "pan") return;
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const touch = event.evt.touches[0];
        const last = lastTouchPosRef.current;
        if (last) {
          setManualView(true);
          suppressTapRef.current = true;
          stage.position({
            x: stage.x() + (touch.clientX - last.x),
            y: stage.y() + (touch.clientY - last.y),
          });
          stage.batchDraw();
          syncTransform();
        }
        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      if (event.evt.touches.length !== 2) return;
      event.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const [touch1, touch2] = [event.evt.touches[0], event.evt.touches[1]];
      const dist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const lastDist = lastPinchDistRef.current;
      const stageBox = stage.container().getBoundingClientRect();
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2 - stageBox.left,
        y: (touch1.clientY + touch2.clientY) / 2 - stageBox.top,
      };
      const lastCenter = lastPinchCenterRef.current;

      if (lastDist === null || !lastCenter) {
        lastPinchDistRef.current = dist;
        lastPinchCenterRef.current = center;
        return;
      }

      const scaleBy = dist / lastDist;
      lastPinchDistRef.current = dist;
      setManualView(true);
      const oldScale = stage.scaleX();
      const newScale = Math.max(0.2, Math.min(5, oldScale * scaleBy));
      const pointTo = {
        x: (lastCenter.x - stage.x()) / oldScale,
        y: (lastCenter.y - stage.y()) / oldScale,
      };
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: center.x - pointTo.x * newScale,
        y: center.y - pointTo.y * newScale,
      });
      setZoom(newScale);
      syncTransform();
      lastPinchCenterRef.current = center;
    },
    [
      disableTouchGestures,
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      setManualView,
      setZoom,
      stageRef,
      suppressTapRef,
      syncTransform,
      touchInteractionModeRef,
    ]
  );

  const handleStageTap = useCallback(() => {
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      touchInteractionModeRef.current = "none";
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    const meters = pointerToMeters(pointer, true);
    if (!meters) return;

    if (activeTool === "polyline" && !readOnly) {
      const pos = snapTarget ?? meters;
      setDraftPath((previous) => {
        const last = previous.at(-1);
        if (last && distance2D(last, pos) < 0.05) return previous;
        return [...previous, { ...pos, z: 0 }];
      });
      setSelection([]);
      touchInteractionModeRef.current = "none";
      return;
    }

    if (activeTool !== "select" && activeTool !== "grab" && !readOnly) {
      const shape = createShapeForTool(activeTool, meters);
      if (!shape) return;
      const id = addShape(shape);
      setSelection([id]);
      touchInteractionModeRef.current = "none";
      return;
    }

    if (activeTool === "select") {
      setSelection([]);
    }

    touchInteractionModeRef.current = "none";
  }, [
    activeTool,
    addShape,
    pointerToMeters,
    readOnly,
    setDraftPath,
    setSelection,
    snapTarget,
    stageRef,
    suppressTapRef,
    touchInteractionModeRef,
  ]);

  const onTap = useCallback(
    (event: { target: unknown }) => {
      if (event.target !== stageRef.current) return;
      handleStageTap();
    },
    [handleStageTap, stageRef]
  );

  const onDblTap = useCallback(
    (event: { target: unknown }) => {
      if (event.target !== stageRef.current) return;
      suppressTapRef.current = false;
      touchInteractionModeRef.current = "none";
      if (activeTool === "polyline" && !readOnly) {
        finalizePath();
      }
    },
    [
      activeTool,
      finalizePath,
      readOnly,
      stageRef,
      suppressTapRef,
      touchInteractionModeRef,
    ]
  );

  const onMouseDown = useCallback(
    (event: { evt: MouseEvent; target: unknown }) => {
      const stage = stageRef.current;
      if (!stage || event.evt.button !== 0) return;
      if (activeTool === "grab") return;

      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const snap = !(
        event.evt.altKey ||
        event.evt.metaKey ||
        event.evt.shiftKey
      );

      if (activeTool === "polyline" && !readOnly) {
        if (event.evt.detail >= 2) {
          finalizePath();
          return;
        }
        const meters = pointerToMeters(pointer, snap);
        if (!meters) return;
        const pos = snapTarget ?? meters;
        setDraftPath((previous) => {
          const last = previous.at(-1);
          if (last && distance2D(last, pos) < 0.05) return previous;
          return [...previous, { ...pos, z: 0 }];
        });
        setSelection([]);
        return;
      }

      if (activeTool !== "select" && !readOnly) {
        const meters = pointerToMeters(pointer, snap);
        if (!meters) return;
        const shape = createShapeForTool(activeTool, meters);
        if (!shape) return;
        const id = addShape(shape);
        setSelection([id]);
        return;
      }

      if (event.target === stage) {
        if (!(event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey)) {
          setSelection([]);
        }
        marqueeOriginRef.current = pointer;
        marqueeAdditiveRef.current = Boolean(
          event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey
        );
        setMarqueeRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
      }
    },
    [
      activeTool,
      addShape,
      finalizePath,
      marqueeAdditiveRef,
      marqueeOriginRef,
      pointerToMeters,
      readOnly,
      setDraftPath,
      setMarqueeRect,
      setSelection,
      snapTarget,
      stageRef,
    ]
  );

  const onMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    const rawMeters = pointerToMeters(pointer, false);
    const snappedMeters = pointerToMeters(pointer, true);
    if (rawMeters && snappedMeters) {
      setCursor({
        rawMeters,
        snappedMeters,
        rawPx: { x: pointer.x, y: pointer.y },
        snappedPx: {
          x: Math.round(pointer.x / stepPx) * stepPx,
          y: Math.round(pointer.y / stepPx) * stepPx,
        },
      });
      onCursorChange?.(rawMeters);

      if (activeTool === "polyline") {
        const target = findSnapTarget(rawMeters);
        setSnapTarget(target);
        onSnapChange?.(target !== null);
      } else if (snapTarget) {
        setSnapTarget(null);
        onSnapChange?.(false);
      }
    }

    if (marqueeOriginRef.current && activeTool === "select") {
      setMarqueeRect(normalizeRect(marqueeOriginRef.current, pointer));
    }
  }, [
    activeTool,
    findSnapTarget,
    marqueeOriginRef,
    onCursorChange,
    onSnapChange,
    pointerToMeters,
    setCursor,
    setMarqueeRect,
    setSnapTarget,
    snapTarget,
    stageRef,
    stepPx,
  ]);

  const onMouseLeave = useCallback(() => {
    setCursor(null);
    setSnapTarget(null);
    onCursorChange?.(null);
    onSnapChange?.(false);
    setMarqueeRect(null);
    marqueeOriginRef.current = null;
  }, [
    marqueeOriginRef,
    onCursorChange,
    onSnapChange,
    setCursor,
    setMarqueeRect,
    setSnapTarget,
  ]);

  const onMouseUp = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !marqueeOriginRef.current || !marqueeRect) {
      marqueeOriginRef.current = null;
      setMarqueeRect(null);
      return;
    }

    const rect = marqueeRect;
    marqueeOriginRef.current = null;
    setMarqueeRect(null);
    if (rect.width < MIN_MARQUEE_SIZE && rect.height < MIN_MARQUEE_SIZE) return;

    const selectedIds = Object.entries(shapeRefs.current)
      .filter((entry): entry is [string, KonvaGroup] => Boolean(entry[1]))
      .filter(([, node]) =>
        rectsIntersect(rect, node.getClientRect({ relativeTo: stage }))
      )
      .map(([id]) => id);

    if (marqueeAdditiveRef.current) {
      setSelection(Array.from(new Set([...selection, ...selectedIds])));
    } else {
      setSelection(selectedIds);
    }
  }, [
    marqueeAdditiveRef,
    marqueeOriginRef,
    marqueeRect,
    selection,
    setMarqueeRect,
    setSelection,
    shapeRefs,
    stageRef,
  ]);

  return {
    onMouseDown,
    onMouseLeave,
    onMouseMove,
    onMouseUp,
    onTap,
    onDblTap,
    onStageDragEnd,
    onStageDragMove,
    onStageDragStart,
    onTouchMove,
    onTouchStart,
    onWheel,
    pointerToMeters,
    snapRadiusMeters,
  };
}
