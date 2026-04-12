"use client";

import { useCallback, useMemo, useRef } from "react";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import type { Vector2d } from "konva/lib/types";
import {
  buildCursorState,
  buildSnapIndex,
  getPinchCenter,
  getPinchDistance,
  getPinchZoomState,
  getCursorStateKey,
  getNearbySnapCandidates as getNearbySnapCandidatesFromIndex,
  getSelectedIdsInMarquee,
  getTouchInteractionMode,
  getWheelZoomTarget,
  getZoomedStagePosition,
  hasExceededTapMoveThreshold,
  isTrackpadPanGesture,
  pointerToMeters as pointerToMetersFromCanvas,
  shouldCloseDraftLoop as shouldCloseDraftLoopForPath,
  shouldSkipDraftPoint as shouldSkipDraftPointForPath,
} from "@/lib/canvas/interaction-helpers";
import { findNearestSnapTarget } from "@/lib/canvas/snap";
import { createShapeForTool, type EditorTool } from "@/lib/editor-tools";
import {
  getLayoutPresetById,
  placeLayoutPreset,
} from "@/lib/planning/layout-presets";
import {
  normalizeRect,
  type CursorState,
  type DraftPoint,
  type RectLike,
} from "@/lib/canvas/shared";
import type { Shape, ShapeDraft } from "@/lib/types";

interface TrackCanvasInteractionsParams {
  activeTool: EditorTool;
  activePresetId: string | null;
  addShape: (shape: ShapeDraft) => string;
  addShapes: (shapes: ShapeDraft[]) => string[];
  contentDragActiveRef: React.RefObject<boolean>;
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
  snapEnabled: boolean;
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
  activePresetId,
  addShape,
  addShapes,
  contentDragActiveRef,
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
  snapEnabled,
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
  const lastHorizontalScrollTimeRef = useRef(0);
  const lastSnapTargetIdRef = useRef<string | null>(null);
  const wheelTargetScaleRef = useRef<number | null>(null);
  const wheelPointerRef = useRef<{ x: number; y: number } | null>(null);
  const wheelAnimFrameRef = useRef<number | null>(null);
  const snapCellSize = Math.max(snapRadiusMeters * 2, designField.gridStep * 4);
  const snapIndex = useMemo(
    () => buildSnapIndex(designShapes, snapCellSize),
    [designShapes, snapCellSize]
  );

  const getNearbySnapCandidates = useCallback(
    (meters: { x: number; y: number }) => {
      return getNearbySnapCandidatesFromIndex(snapIndex, snapCellSize, meters);
    },
    [snapCellSize, snapIndex]
  );

  const pointerToMeters = useCallback(
    (
      pointer: { x: number; y: number } | null,
      snap = true,
      magnetic = true
    ) => {
      return pointerToMetersFromCanvas({
        designPpm: designField.ppm,
        getNearbySnapCandidates,
        magnetic,
        pointer,
        snap: snapEnabled && snap,
        snapRadiusMeters,
        stepPx,
      });
    },
    [
      designField.ppm,
      getNearbySnapCandidates,
      snapEnabled,
      snapRadiusMeters,
      stepPx,
    ]
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
      return findNearestSnapTarget({
        candidates: getNearbySnapCandidates(meters),
        pos: meters,
        snapRadiusMeters,
      });
    },
    [getNearbySnapCandidates, snapRadiusMeters]
  );

  const shouldCloseDraftLoop = useCallback(
    (meters: { x: number; y: number } | null) => {
      return shouldCloseDraftLoopForPath({
        closeLoopRadiusMeters,
        draftPath,
        meters,
      });
    },
    [closeLoopRadiusMeters, draftPath]
  );

  const shouldSkipDraftPoint = useCallback(
    (previous: DraftPoint[], nextPoint: { x: number; y: number }) => {
      return shouldSkipDraftPointForPath({
        minWaypointGapMeters,
        nextPoint,
        previous,
      });
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
      if (contentDragActiveRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      setManualView(true);

      const hasHorizontalScroll = Math.abs(event.evt.deltaX) > 0.01;
      const now = Date.now();
      if (hasHorizontalScroll) {
        lastHorizontalScrollTimeRef.current = now;
      }
      const isTrackpadPan = isTrackpadPanGesture({
        deltaMode: event.evt.deltaMode,
        hasHorizontalScroll,
        isMobile,
        modifierActive:
          event.evt.ctrlKey || event.evt.metaKey || event.evt.altKey,
        now,
        previousHorizontalScrollTime: lastHorizontalScrollTimeRef.current,
      });

      if (isTrackpadPan) {
        stage.position({
          x: stage.x() - event.evt.deltaX,
          y: stage.y() - event.evt.deltaY,
        });
        syncTransform();
        return;
      }

      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const currentTarget = wheelTargetScaleRef.current ?? stage.scaleX();
      wheelTargetScaleRef.current = getWheelZoomTarget({
        ctrlKey: event.evt.ctrlKey,
        currentTargetScale: currentTarget,
        deltaY: event.evt.deltaY,
      });
      wheelPointerRef.current = pointer;

      if (!wheelAnimFrameRef.current) {
        const animate = () => {
          const s = stageRef.current;
          const target = wheelTargetScaleRef.current;
          const ptr = wheelPointerRef.current;
          if (!s || target === null || !ptr) {
            wheelAnimFrameRef.current = null;
            return;
          }
          const current = s.scaleX();
          const next = current + (target - current) * 0.25;
          const settled = Math.abs(target - next) < 0.0005;
          const applied = settled ? target : next;
          const nextPosition = getZoomedStagePosition({
            currentScale: current,
            pointer: ptr,
            stagePosition: { x: s.x(), y: s.y() },
            targetScale: applied,
          });
          s.scale({ x: applied, y: applied });
          s.position(nextPosition);
          setZoom(applied);
          syncTransform();
          if (settled) {
            wheelTargetScaleRef.current = null;
            wheelPointerRef.current = null;
            wheelAnimFrameRef.current = null;
          } else {
            wheelAnimFrameRef.current = requestAnimationFrame(animate);
          }
        };
        wheelAnimFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [
      contentDragActiveRef,
      isMobile,
      setManualView,
      setZoom,
      stageRef,
      syncTransform,
    ]
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
      if (contentDragActiveRef.current) {
        event.evt.preventDefault();
        touchInteractionModeRef.current = "content";
        return;
      }

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
        lastPinchDistRef.current = getPinchDistance(touch1, touch2);
        const stageBox = stage?.container().getBoundingClientRect();
        lastPinchCenterRef.current = stageBox
          ? getPinchCenter(touch1, touch2, stageBox)
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
        const nextTouchMode = getTouchInteractionMode({
          activeTool,
          isMobile,
          targetIsStage: event.target === stage,
        });
        touchInteractionModeRef.current = nextTouchMode;
        lastTouchStagePointRef.current =
          nextTouchMode === "content" ? touchToStagePoint(touch, stage) : null;
      }
    },
    [
      activeTool,
      contentDragActiveRef,
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
      if (contentDragActiveRef.current) {
        event.evt.preventDefault();
        return;
      }

      if (event.evt.touches.length === 1) {
        const touch = event.evt.touches[0];
        if (
          hasExceededTapMoveThreshold({
            current: { x: touch.clientX, y: touch.clientY },
            start: lastTouchStartClientRef.current,
            thresholdPx: mobileTapMoveThresholdPx,
          })
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
      const dist = getPinchDistance(touch1, touch2);
      const lastDist = lastPinchDistRef.current;
      const stageBox = stage.container().getBoundingClientRect();
      const center = getPinchCenter(touch1, touch2, stageBox);
      const lastCenter = lastPinchCenterRef.current;

      if (lastDist === null || !lastCenter) {
        lastPinchDistRef.current = dist;
        lastPinchCenterRef.current = center;
        return;
      }

      lastPinchDistRef.current = dist;
      setManualView(true);
      const nextViewport = getPinchZoomState({
        center,
        lastCenter,
        lastDistance: lastDist,
        nextDistance: dist,
        oldScale: stage.scaleX(),
        stagePosition: { x: stage.x(), y: stage.y() },
      });
      stage.scale({ x: nextViewport.scale, y: nextViewport.scale });
      stage.position(nextViewport.position);
      stage.batchDraw();
      setZoom(nextViewport.scale);
      syncTransform();
      lastPinchCenterRef.current = center;
    },
    [
      contentDragActiveRef,
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
        if (activeTool === "preset") {
          const preset = getLayoutPresetById(activePresetId);
          if (!preset) return;
          const ids = addShapes(placeLayoutPreset(preset, meters));
          setSelection(ids);
          if (isMobile) {
            setActiveTool("select");
          }
          touchInteractionModeRef.current = "none";
          return;
        }
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
      activePresetId,
      addShape,
      addShapes,
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
      const nextCursor = buildCursorState(
        pointer,
        rawMeters,
        snappedMeters,
        stepPx
      );
      const cursorKey = getCursorStateKey(nextCursor);
      if (cursorKey !== lastCursorKeyRef.current) {
        lastCursorKeyRef.current = cursorKey;
        setCursor(nextCursor);
      }
      onCursorChange?.(rawMeters);

      if (activeTool === "polyline") {
        const target = snapEnabled ? findSnapTarget(rawMeters) : null;
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
    snapEnabled,
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
      if (event && event.evt.button !== 0) return;

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
        if (activeTool === "preset") {
          const preset = getLayoutPresetById(activePresetId);
          if (!preset) return;
          const ids = addShapes(placeLayoutPreset(preset, meters));
          setSelection(ids);
          suppressTapRef.current = true;
          return;
        }
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
      const marqueeSelection = getSelectedIdsInMarquee({
        marqueeRect: rect,
        shapeRefs: shapeRefs.current,
        stage,
      });
      if (marqueeSelection.tooSmall) return;
      const selectedIds = marqueeSelection.ids;

      if (marqueeAdditiveRef.current) {
        setSelection(Array.from(new Set([...selection, ...selectedIds])));
      } else {
        setSelection(selectedIds);
      }
    },
    [
      activeTool,
      activePresetId,
      addShape,
      addShapes,
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
