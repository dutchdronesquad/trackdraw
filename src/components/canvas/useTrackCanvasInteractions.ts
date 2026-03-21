"use client";

import { useCallback, useMemo, useRef } from "react";
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
  draftPath: DraftPoint[];
  finalizePath: (closed?: boolean) => void;
  isMobile: boolean;
  lastPinchCenterRef: React.RefObject<{ x: number; y: number } | null>;
  lastPinchDistRef: React.RefObject<number | null>;
  lastTouchPosRef: React.RefObject<{ x: number; y: number } | null>;
  lastTouchStartClientRef: React.RefObject<{
    x: number;
    y: number;
  } | null>;
  lastTouchStagePointRef: React.RefObject<{
    x: number;
    y: number;
  } | null>;
  touchMovedRef: React.RefObject<boolean>;
  marqueeAdditiveRef: React.RefObject<boolean>;
  marqueeOriginRef: React.RefObject<Vector2d | null>;
  marqueeRect: RectLike | null;
  mobileMultiSelectEnabled?: boolean;
  onCursorChange?: (pos: { x: number; y: number } | null) => void;
  onSnapChange?: (active: boolean) => void;
  readOnly: boolean;
  selection: string[];
  setActiveTool: (tool: EditorTool) => void;
  setCursor: React.Dispatch<React.SetStateAction<CursorState | null>>;
  setDraftPath: (
    value: DraftPoint[] | ((previous: DraftPoint[]) => DraftPoint[])
  ) => void;
  setDraftForceClosed: (
    value: boolean | ((previous: boolean) => boolean)
  ) => void;
  setIsStageDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setManualView: (value: boolean) => void;
  setMarqueeRect: (
    value: RectLike | null | ((previous: RectLike | null) => RectLike | null)
  ) => void;
  setSelection: (ids: string[]) => void;
  setSnapTarget: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; id: string } | null>
  >;
  setZoom: (zoom: number) => void;
  shapeRefs: React.RefObject<Record<string, KonvaGroup | null>>;
  snapTarget: { x: number; y: number; id: string } | null;
  stageRef: React.RefObject<KonvaStage | null>;
  stepPx: number;
  suppressTapRef: React.RefObject<boolean>;
  syncTransform: () => void;
  touchInteractionModeRef: React.RefObject<
    "none" | "pan" | "content" | "viewportGesture"
  >;
}

export function useTrackCanvasInteractions({
  activeTool,
  addShape,
  designField,
  designShapes,
  disableTouchGestures,
  draftPath,
  finalizePath,
  isMobile,
  lastPinchCenterRef,
  lastPinchDistRef,
  lastTouchPosRef,
  lastTouchStartClientRef,
  lastTouchStagePointRef,
  touchMovedRef,
  marqueeAdditiveRef,
  marqueeOriginRef,
  marqueeRect,
  mobileMultiSelectEnabled: _mobileMultiSelectEnabled,
  onCursorChange,
  onSnapChange,
  readOnly,
  selection,
  setActiveTool,
  setCursor,
  setDraftPath,
  setDraftForceClosed,
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
  const closeLoopRadiusMeters = Math.max(designField.gridStep * 1.25, 0.9);
  const minWaypointGapMeters = isMobile
    ? Math.max(designField.gridStep * 0.7, 0.45)
    : 0.05;
  const mobileTapMoveThresholdPx = 10;
  const lastCursorKeyRef = useRef("");
  const lastSnapTargetIdRef = useRef<string | null>(null);
  const snapCellSize = Math.max(snapRadiusMeters * 2, designField.gridStep * 4);
  const snapIndex = useMemo(() => {
    const index = new Map<string, Shape[]>();

    for (const shape of designShapes) {
      if (shape.kind === "polyline") continue;
      const cellX = Math.floor(shape.x / snapCellSize);
      const cellY = Math.floor(shape.y / snapCellSize);
      const key = `${cellX}:${cellY}`;
      const bucket = index.get(key);
      if (bucket) bucket.push(shape);
      else index.set(key, [shape]);
    }

    return index;
  }, [designShapes, snapCellSize]);

  const getNearbySnapCandidates = useCallback(
    (meters: { x: number; y: number }) => {
      const baseX = Math.floor(meters.x / snapCellSize);
      const baseY = Math.floor(meters.y / snapCellSize);
      const nearby: Shape[] = [];

      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const bucket = snapIndex.get(`${baseX + dx}:${baseY + dy}`);
          if (bucket) nearby.push(...bucket);
        }
      }

      return nearby;
    },
    [snapCellSize, snapIndex]
  );

  const pointerToMeters = useCallback(
    (
      pointer: { x: number; y: number } | null,
      snap = true,
      magnetic = true
    ) => {
      if (!pointer) return null;
      const px = snap ? Math.round(pointer.x / stepPx) * stepPx : pointer.x;
      const py = snap ? Math.round(pointer.y / stepPx) * stepPx : pointer.y;
      const gridMeters = {
        x: px2m(px, designField.ppm),
        y: px2m(py, designField.ppm),
      };
      if (!snap) return gridMeters;
      if (!magnetic) return gridMeters;

      let nearest: { x: number; y: number } | null = null;
      let minDist = snapRadiusMeters;
      for (const shape of getNearbySnapCandidates(gridMeters)) {
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
    [designField.ppm, getNearbySnapCandidates, snapRadiusMeters, stepPx]
  );

  const touchToStagePoint = useCallback((touch: Touch, stage: KonvaStage) => {
    const stageBox = stage.container().getBoundingClientRect();
    const scaleX = stage.scaleX() || 1;
    const scaleY = stage.scaleY() || 1;
    return {
      x: (touch.clientX - stageBox.left - stage.x()) / scaleX,
      y: (touch.clientY - stageBox.top - stage.y()) / scaleY,
    };
  }, []);

  const findSnapTarget = useCallback(
    (meters: { x: number; y: number }) => {
      let nearest: { x: number; y: number; id: string } | null = null;
      let minDist = snapRadiusMeters;
      for (const shape of getNearbySnapCandidates(meters)) {
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
    [getNearbySnapCandidates, snapRadiusMeters]
  );

  const shouldCloseDraftLoop = useCallback(
    (meters: { x: number; y: number } | null) => {
      if (!meters || draftPath.length < 3) return false;
      return distance2D(meters, draftPath[0]) <= closeLoopRadiusMeters;
    },
    [closeLoopRadiusMeters, draftPath]
  );

  const shouldSkipDraftPoint = useCallback(
    (previous: DraftPoint[], nextPoint: { x: number; y: number }) => {
      const last = previous.at(-1);
      return Boolean(
        last && distance2D(last, nextPoint) < minWaypointGapMeters
      );
    },
    [minWaypointGapMeters]
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

      const hasHorizontalScroll = Math.abs(event.evt.deltaX) > 0.01;
      const isFineVerticalScroll = Math.abs(event.evt.deltaY) < 40;
      const isTrackpadPan =
        isMobile === false &&
        event.evt.deltaMode === 0 &&
        !event.evt.ctrlKey &&
        !event.evt.metaKey &&
        !event.evt.altKey &&
        (hasHorizontalScroll || isFineVerticalScroll);

      if (isTrackpadPan) {
        stage.position({
          x: stage.x() - event.evt.deltaX,
          y: stage.y() - event.evt.deltaY,
        });
        syncTransform();
        return;
      }

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const zoomIntensity = event.evt.ctrlKey ? 0.006 : 0.0025;
      const zoomFactor = Math.exp(-event.evt.deltaY * zoomIntensity);
      const nextScale = oldScale * zoomFactor;
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
    [isMobile, setManualView, setZoom, stageRef, syncTransform]
  );

  const stopActiveCanvasDrags = useCallback(() => {
    stageRef.current?.stopDrag();
    for (const node of Object.values(shapeRefs.current)) {
      node?.stopDrag();
    }
  }, [shapeRefs, stageRef]);

  const onTouchStart = useCallback(
    (event: { evt: TouchEvent; target: unknown }) => {
      if (disableTouchGestures) return;
      const stage = stageRef.current;
      if (!stage) return;

      if (event.evt.touches.length === 2) {
        event.evt.preventDefault();
        stopActiveCanvasDrags();
        touchInteractionModeRef.current = "viewportGesture";
        suppressTapRef.current = true;
        lastTouchPosRef.current = null;
        lastTouchStartClientRef.current = null;
        lastTouchStagePointRef.current = null;
        touchMovedRef.current = false;
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
        lastTouchStartClientRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        lastPinchDistRef.current = null;
        lastPinchCenterRef.current = null;
        suppressTapRef.current = false;
        touchMovedRef.current = false;
        const nextTouchMode =
          event.target === stage &&
          (activeTool === "grab" || (isMobile && activeTool === "select"))
            ? "pan"
            : "content";
        touchInteractionModeRef.current = nextTouchMode;
        lastTouchStagePointRef.current =
          nextTouchMode === "content" ? touchToStagePoint(touch, stage) : null;
      }
    },
    [
      activeTool,
      disableTouchGestures,
      isMobile,
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      lastTouchStartClientRef,
      lastTouchStagePointRef,
      stageRef,
      stopActiveCanvasDrags,
      suppressTapRef,
      touchMovedRef,
      touchToStagePoint,
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
        const touch = event.evt.touches[0];
        const start = lastTouchStartClientRef.current;
        if (
          start &&
          Math.hypot(touch.clientX - start.x, touch.clientY - start.y) >
            mobileTapMoveThresholdPx
        ) {
          touchMovedRef.current = true;
          suppressTapRef.current = true;
        }
        if (touchInteractionModeRef.current !== "pan") return;
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
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
      stopActiveCanvasDrags();
      touchInteractionModeRef.current = "viewportGesture";
      suppressTapRef.current = true;
      touchMovedRef.current = true;
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
      const centerDelta = {
        x: center.x - lastCenter.x,
        y: center.y - lastCenter.y,
      };
      const pointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
      };
      stage.scale({ x: newScale, y: newScale });
      stage.position({
        x: center.x - pointTo.x * newScale + centerDelta.x,
        y: center.y - pointTo.y * newScale + centerDelta.y,
      });
      stage.batchDraw();
      setZoom(newScale);
      syncTransform();
      lastPinchCenterRef.current = center;
    },
    [
      disableTouchGestures,
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      lastTouchStartClientRef,
      setManualView,
      setZoom,
      stageRef,
      stopActiveCanvasDrags,
      suppressTapRef,
      syncTransform,
      touchMovedRef,
      touchInteractionModeRef,
    ]
  );

  const onTouchEnd = useCallback(
    (event: { evt: TouchEvent }) => {
      const remainingTouches = event.evt.touches.length;

      if (remainingTouches === 0) {
        lastPinchDistRef.current = null;
        lastPinchCenterRef.current = null;
        lastTouchPosRef.current = null;
        lastTouchStartClientRef.current = null;
        lastTouchStagePointRef.current = null;
        touchMovedRef.current = false;
        touchInteractionModeRef.current = "none";
        return;
      }

      if (touchInteractionModeRef.current === "viewportGesture") {
        suppressTapRef.current = true;
      }

      if (remainingTouches === 1) {
        const touch = event.evt.touches[0];
        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        lastPinchDistRef.current = null;
        lastPinchCenterRef.current = null;
      }
    },
    [
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      lastTouchStagePointRef,
      lastTouchStartClientRef,
      suppressTapRef,
      touchMovedRef,
      touchInteractionModeRef,
    ]
  );

  const onTap = useCallback(
    (event: { target: unknown }) => {
      if (event.target !== stageRef.current) return;
      if (
        suppressTapRef.current ||
        touchMovedRef.current ||
        touchInteractionModeRef.current === "viewportGesture"
      ) {
        suppressTapRef.current = false;
        touchMovedRef.current = false;
        lastTouchStagePointRef.current = null;
        touchInteractionModeRef.current = "none";
        return;
      }

      const stage = stageRef.current;
      if (!stage) return;
      const pointer =
        isMobile && touchInteractionModeRef.current === "content"
          ? lastTouchStagePointRef.current
          : stage.getRelativePointerPosition();
      lastTouchStagePointRef.current = null;
      if (!pointer) return;

      const meters = pointerToMeters(pointer, true, activeTool === "polyline");
      if (!meters) return;

      if (activeTool === "polyline" && !readOnly) {
        const pos = snapTarget ?? meters;
        if (shouldCloseDraftLoop(pos)) {
          finalizePath(true);
          touchInteractionModeRef.current = "none";
          return;
        }
        setDraftForceClosed(false);
        setDraftPath((previous) => {
          if (shouldSkipDraftPoint(previous, pos)) return previous;
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
        if (isMobile) {
          setActiveTool("select");
        }
        touchInteractionModeRef.current = "none";
        return;
      }

      if (activeTool === "select") {
        setSelection([]);
      }

      touchMovedRef.current = false;
      touchInteractionModeRef.current = "none";
    },
    [
      activeTool,
      addShape,
      finalizePath,
      isMobile,
      pointerToMeters,
      readOnly,
      setActiveTool,
      setDraftPath,
      setDraftForceClosed,
      setSelection,
      shouldCloseDraftLoop,
      shouldSkipDraftPoint,
      snapTarget,
      lastTouchStagePointRef,
      stageRef,
      suppressTapRef,
      touchMovedRef,
      touchInteractionModeRef,
    ]
  );

  const onDblTap = useCallback(
    (event: { target: unknown }) => {
      if (event.target !== stageRef.current) return;
      suppressTapRef.current = false;
      touchMovedRef.current = false;
      lastTouchStagePointRef.current = null;
      touchInteractionModeRef.current = "none";
      if (activeTool === "polyline" && !readOnly) {
        finalizePath();
      }
    },
    [
      activeTool,
      finalizePath,
      lastTouchStagePointRef,
      readOnly,
      stageRef,
      suppressTapRef,
      touchMovedRef,
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
        const meters = pointerToMeters(pointer, snap, true);
        if (!meters) return;
        const pos = snapTarget ?? meters;
        if (shouldCloseDraftLoop(pos)) {
          finalizePath(true);
          return;
        }
        setDraftForceClosed(false);
        setDraftPath((previous) => {
          if (shouldSkipDraftPoint(previous, pos)) return previous;
          return [...previous, { ...pos, z: 0 }];
        });
        setSelection([]);
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
      finalizePath,
      marqueeAdditiveRef,
      marqueeOriginRef,
      pointerToMeters,
      readOnly,
      setDraftPath,
      setDraftForceClosed,
      setMarqueeRect,
      setSelection,
      snapTarget,
      stageRef,
      shouldCloseDraftLoop,
      shouldSkipDraftPoint,
    ]
  );

  const onMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (stage.isDragging()) return;
    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    const rawMeters = pointerToMeters(pointer, false);
    const snappedMeters = pointerToMeters(pointer, true);
    if (rawMeters && snappedMeters) {
      const nextCursor = {
        rawMeters,
        snappedMeters,
        rawPx: { x: pointer.x, y: pointer.y },
        snappedPx: {
          x: Math.round(pointer.x / stepPx) * stepPx,
          y: Math.round(pointer.y / stepPx) * stepPx,
        },
      };
      const cursorKey = [
        nextCursor.rawPx.x.toFixed(2),
        nextCursor.rawPx.y.toFixed(2),
        nextCursor.snappedMeters.x.toFixed(2),
        nextCursor.snappedMeters.y.toFixed(2),
      ].join("|");
      if (cursorKey !== lastCursorKeyRef.current) {
        lastCursorKeyRef.current = cursorKey;
        setCursor(nextCursor);
      }
      onCursorChange?.(rawMeters);

      if (activeTool === "polyline") {
        const target = findSnapTarget(rawMeters);
        if ((target?.id ?? null) !== lastSnapTargetIdRef.current) {
          lastSnapTargetIdRef.current = target?.id ?? null;
          setSnapTarget(target);
          onSnapChange?.(target !== null);
        }
      } else if (snapTarget) {
        lastSnapTargetIdRef.current = null;
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
    lastCursorKeyRef.current = "";
    lastSnapTargetIdRef.current = null;
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

  const onMouseUp = useCallback(
    (event?: { evt: MouseEvent; target: unknown }) => {
      const stage = stageRef.current;
      if (!stage) return;

      if (activeTool !== "select" && activeTool !== "grab" && !readOnly) {
        if (event?.target !== stage) return;
        const pointer = stage.getRelativePointerPosition();
        if (!pointer) return;
        const snap = !(
          event?.evt.altKey ||
          event?.evt.metaKey ||
          event?.evt.shiftKey
        );
        const meters = pointerToMeters(pointer, snap, false);
        if (!meters) return;
        const shape = createShapeForTool(activeTool, meters);
        if (!shape) return;
        const id = addShape(shape);
        setSelection([id]);
        suppressTapRef.current = true;
        return;
      }

      if (!marqueeOriginRef.current || !marqueeRect) {
        marqueeOriginRef.current = null;
        setMarqueeRect(null);
        return;
      }

      const rect = marqueeRect;
      marqueeOriginRef.current = null;
      setMarqueeRect(null);
      if (rect.width < MIN_MARQUEE_SIZE && rect.height < MIN_MARQUEE_SIZE)
        return;

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
    },
    [
      activeTool,
      addShape,
      marqueeAdditiveRef,
      marqueeOriginRef,
      marqueeRect,
      pointerToMeters,
      readOnly,
      selection,
      setMarqueeRect,
      setSelection,
      shapeRefs,
      stageRef,
      suppressTapRef,
    ]
  );

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
    onTouchEnd,
    onTouchMove,
    onTouchStart,
    onWheel,
    pointerToMeters,
    snapRadiusMeters,
  };
}
