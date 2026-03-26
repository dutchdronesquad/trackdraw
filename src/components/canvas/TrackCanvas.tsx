"use client";

import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Stage, Layer, Circle, Line, Group, Rect } from "react-konva";
import type { Vector2d } from "konva/lib/types";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import {
  clamp,
  mergeClientRects,
  type CursorState,
  type RectLike,
} from "@/components/canvas/shared";
import { useTrackCanvasInteractions } from "@/components/canvas/useTrackCanvasInteractions";
import {
  FieldLayerContent,
  getShapeLocalBounds,
  RotationGuideOverlay,
  TrackShapeNode,
} from "@/components/canvas/renderers";
import { useTrackCanvasShortcuts } from "@/components/canvas/useTrackCanvasShortcuts";
import { useTrackCanvasViewport } from "@/components/canvas/useTrackCanvasViewport";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useEditor } from "@/store/editor";
import {
  selectDesignShapes,
  selectDesignPolylineZRange,
  selectShapeRecordMap,
} from "@/store/selectors";
import { m2px } from "@/lib/units";
import type { PolylinePoint, PolylineShape, Shape } from "@/lib/types";
import { distance2D, getPolyline2DPoints } from "@/lib/geometry";
import { CanvasRuler, RULER_SIZE } from "@/components/canvas/CanvasRuler";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import { shapeKindLabels } from "@/lib/editor-tools";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CanvasContextMenuContent } from "@/components/canvas/CanvasContextMenu";
import { Scan } from "lucide-react";

export interface TrackCanvasHandle {
  getStage: () => KonvaStage | null;
  fitToWindow: () => void;
  closeDraftLoop: () => void;
  finishDraftPath: (closeLoop?: boolean) => void;
  cancelDraftPath: () => void;
  undoDraftPoint: () => void;
  resumePolylineEditing: (shapeId: string) => void;
}

interface TrackCanvasProps {
  onCursorChange?: (pos: { x: number; y: number } | null) => void;
  onDraftPathStateChange?: (state: {
    active: boolean;
    canClose: boolean;
    closed: boolean;
    length: number;
    pointCount: number;
  }) => void;
  onSnapChange?: (active: boolean) => void;
  onMobileMultiSelectStart?: (shapeId: string) => void;
  mobileRulersEnabled?: boolean;
  mobileMultiSelectEnabled?: boolean;
  readOnly?: boolean;
}

const TrackCanvas = memo(
  forwardRef<TrackCanvasHandle, TrackCanvasProps>(function TrackCanvas(
    {
      onCursorChange,
      onDraftPathStateChange,
      onSnapChange,
      onMobileMultiSelectStart,
      mobileRulersEnabled = false,
      mobileMultiSelectEnabled = false,
      readOnly = false,
    },
    ref
  ) {
    usePerfMetric("render:TrackCanvas");
    const design = useEditor((state) => state.design);
    const designShapes = useEditor(selectDesignShapes);
    const [zmin, zmax] = useEditor(selectDesignPolylineZRange);
    const shapeById = useEditor(selectShapeRecordMap);
    const selection = useEditor((state) => state.selection);
    const setSelection = useEditor((state) => state.setSelection);
    const updateShape = useEditor((state) => state.updateShape);
    const setShapesLocked = useEditor((state) => state.setShapesLocked);
    const setPolylinePoints = useEditor((state) => state.setPolylinePoints);
    const removePolylinePoint = useEditor((state) => state.removePolylinePoint);
    const addShape = useEditor((state) => state.addShape);
    const addShapes = useEditor((state) => state.addShapes);
    const activeTool = useEditor((state) => state.transient.activeTool);
    const vertexSel = useEditor((state) => state.transient.vertexSelection);
    const draftPath = useEditor((state) => state.transient.draftPath);
    const draftForceClosed = useEditor(
      (state) => state.transient.draftForceClosed
    );
    const draftSourceShapeId = useEditor(
      (state) => state.transient.draftSourceShapeId
    );
    const marqueeRect = useEditor((state) => state.transient.marqueeRect);
    const rotationSession = useEditor(
      (state) => state.transient.rotationSession
    );
    const groupDragPreview = useEditor(
      (state) => state.transient.groupDragPreview
    );
    const setActiveTool = useEditor((state) => state.setActiveTool);
    const setVertexSel = useEditor((state) => state.setVertexSelection);
    const setDraftPath = useEditor((state) => state.setDraftPath);
    const setDraftForceClosed = useEditor((state) => state.setDraftForceClosed);
    const setDraftSourceShapeId = useEditor(
      (state) => state.setDraftSourceShapeId
    );
    const setMarqueeRect = useEditor((state) => state.setMarqueeRect);
    const setRotationSession = useEditor((state) => state.setRotationSession);
    const setGroupDragPreview = useEditor((state) => state.setGroupDragPreview);
    const rotateShapes = useEditor((state) => state.rotateShapes);
    const removeShapes = useEditor((state) => state.removeShapes);
    const duplicateShapes = useEditor((state) => state.duplicateShapes);
    const joinPolylines = useEditor((state) => state.joinPolylines);
    const closePolyline = useEditor((state) => state.closePolyline);
    const nudgeShapes = useEditor((state) => state.nudgeShapes);
    const pauseHistory = useEditor((state) => state.pauseHistory);
    const resumeHistory = useEditor((state) => state.resumeHistory);
    const beginInteraction = useEditor((state) => state.beginInteraction);
    const endInteraction = useEditor((state) => state.endInteraction);
    const setZoom = useEditor((state) => state.setZoom);
    const hoveredShapeId = useEditor((state) => state.transient.hoveredShapeId);
    const hoveredWaypoint = useEditor(
      (state) => state.transient.hoveredWaypoint
    );
    const bringForward = useEditor((state) => state.bringForward);
    const sendBackward = useEditor((state) => state.sendBackward);

    const estimateRotationGuideRadiusPx = useCallback(
      (shape: Shape) => {
        if (shape.kind === "polyline") return 0;
        const bounds = getShapeLocalBounds(shape, design.field.ppm);
        if (!bounds) return 18;
        return Math.hypot(bounds.width, bounds.height) / 2 + 18;
      },
      [design.field.ppm]
    );
    const stageRef = useRef<KonvaStage | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const shapeRefs = useRef<Record<string, KonvaGroup | null>>({});
    const dragSnapRef = useRef<boolean>(true);
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
    const lastPinchDistRef = useRef<number | null>(null);
    const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
    const lastTouchStartClientRef = useRef<{ x: number; y: number } | null>(
      null
    );
    const lastTouchStagePointRef = useRef<{ x: number; y: number } | null>(
      null
    );
    const touchMovedRef = useRef(false);
    const suppressTapRef = useRef(false);
    const touchInteractionModeRef = useRef<
      "none" | "pan" | "content" | "viewportGesture"
    >("none");
    const syncFrameRef = useRef<number | null>(null);
    const rotationSessionRef = useRef(rotationSession);
    const resumeHistoryRef = useRef(resumeHistory);
    const updateShapeRef = useRef(updateShape);
    const rotationEffectSessionKeyRef = useRef<string | null>(null);
    const rotationEffectCleanupRef = useRef<(() => void) | null>(null);
    const rotationEffectResumedRef = useRef(false);

    const [cursor, setCursor] = useState<CursorState | null>(null);
    const [snapTarget, setSnapTarget] = useState<{
      x: number;
      y: number;
      id: string;
    } | null>(null);
    const [dragSnapPreview, setDragSnapPreview] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const marqueeOrigin = useRef<Vector2d | null>(null);
    const marqueeAdditive = useRef(false);
    const [selectionFrame, setSelectionFrame] = useState<RectLike | null>(null);
    const [isStageDragging, setIsStageDragging] = useState(false);
    const [viewportSize, setViewportSize] = useState({
      width: 1000,
      height: 700,
    });
    const [stageTransform, setStageTransform] = useState({
      x: 0,
      y: 0,
      scale: 1,
    });
    const [contextMenu, setContextMenu] = useState<{
      closablePolylineId: string | null;
      editablePolylineId: string | null;
      ids: string[];
      joinablePolylineIds: string[];
      label: string;
      locked: boolean;
      rotatableIds: string[];
    } | null>(null);
    const hasManualViewRef = useRef(false);
    const isDark = useTheme() === "dark";
    const isMobile = useIsMobile();
    const showRulers = !isMobile || mobileRulersEnabled;
    const showDesktopCanvasChrome = viewportSize.width >= 1024;
    const selectionRef = useRef(selection);
    const selectionIdSet = useMemo(() => new Set(selection), [selection]);
    const groupDragIdSet = useMemo(
      () => new Set(groupDragPreview?.ids ?? []),
      [groupDragPreview]
    );
    const draftSourcePath = useMemo(
      () =>
        draftSourceShapeId
          ? ((shapeById[draftSourceShapeId] as PolylineShape | undefined) ??
            null)
          : null,
      [draftSourceShapeId, shapeById]
    );

    useEffect(() => {
      selectionRef.current = selection;
    }, [selection]);

    useEffect(() => {
      rotationSessionRef.current = rotationSession;
    }, [rotationSession]);

    useEffect(() => {
      resumeHistoryRef.current = resumeHistory;
    }, [resumeHistory]);

    useEffect(() => {
      updateShapeRef.current = updateShape;
    }, [updateShape]);

    const effectiveVertexSel = useMemo(
      () =>
        selection.length === 0 || activeTool !== "select" ? null : vertexSel,
      [selection.length, activeTool, vertexSel]
    );
    const effectiveSelectionFrame = useMemo(() => {
      if (!selection.length || !selectionFrame) return null;
      if (!groupDragPreview) return selectionFrame;
      return {
        ...selectionFrame,
        x: selectionFrame.x + groupDragPreview.dx,
        y: selectionFrame.y + groupDragPreview.dy,
      };
    }, [groupDragPreview, selection.length, selectionFrame]);
    const singleSelectedShape = useMemo(
      () => (selection.length === 1 ? (shapeById[selection[0]] ?? null) : null),
      [selection, shapeById]
    );
    const displaySingleSelectedShape = useMemo(() => {
      if (!singleSelectedShape) return null;
      if (rotationSession?.shapeId !== singleSelectedShape.id) {
        return singleSelectedShape;
      }
      return {
        ...singleSelectedShape,
        rotation: rotationSession.previewRotation,
      };
    }, [rotationSession, singleSelectedShape]);
    const rotationGuide = useMemo(() => {
      if (
        !displaySingleSelectedShape ||
        displaySingleSelectedShape.kind === "polyline" ||
        displaySingleSelectedShape.kind === "cone" ||
        displaySingleSelectedShape.locked
      ) {
        return null;
      }

      const center = {
        x: m2px(displaySingleSelectedShape.x, design.field.ppm),
        y: m2px(displaySingleSelectedShape.y, design.field.ppm),
      };

      return {
        angleDeg: displaySingleSelectedShape.rotation - 90,
        center,
        label: `${Math.round(displaySingleSelectedShape.rotation)}°`,
        radius: estimateRotationGuideRadiusPx(displaySingleSelectedShape),
      };
    }, [
      design.field.ppm,
      displaySingleSelectedShape,
      estimateRotationGuideRadiusPx,
    ]);

    const syncTransform = useCallback(() => {
      if (syncFrameRef.current !== null) return;
      syncFrameRef.current = window.requestAnimationFrame(() => {
        syncFrameRef.current = null;
        const s = stageRef.current;
        if (!s) return;
        const nextTransform = { x: s.x(), y: s.y(), scale: s.scaleX() };
        setStageTransform((current) =>
          Math.abs(current.x - nextTransform.x) < 0.001 &&
          Math.abs(current.y - nextTransform.y) < 0.001 &&
          Math.abs(current.scale - nextTransform.scale) < 0.001
            ? current
            : nextTransform
        );
      });
    }, []);

    useEffect(
      () => () => {
        if (syncFrameRef.current !== null) {
          window.cancelAnimationFrame(syncFrameRef.current);
        }
        setMarqueeRect(null);
        setGroupDragPreview(null);
        setRotationSession(null);
      },
      [setGroupDragPreview, setMarqueeRect, setRotationSession]
    );

    const widthPx = useMemo(
      () => m2px(design.field.width, design.field.ppm),
      [design.field.width, design.field.ppm]
    );
    const heightPx = useMemo(
      () => m2px(design.field.height, design.field.ppm),
      [design.field.height, design.field.ppm]
    );
    const stepPx = useMemo(
      () => Math.max(1, m2px(design.field.gridStep, design.field.ppm)),
      [design.field.gridStep, design.field.ppm]
    );
    const magneticSnapRadiusPx = useMemo(
      () => Math.min(18, Math.max(10, stepPx * 0.35)),
      [stepPx]
    );

    const clampShapeDragPosition = useCallback(
      (pos: Vector2d): Vector2d => ({
        x: clamp(pos.x, -widthPx * 2, widthPx * 3),
        y: clamp(pos.y, -heightPx * 2, heightPx * 3),
      }),
      [heightPx, widthPx]
    );

    const clampWaypointDragPosition = useCallback(
      (pos: Vector2d): Vector2d => ({
        x: clamp(pos.x, 0, widthPx),
        y: clamp(pos.y, 0, heightPx),
      }),
      [heightPx, widthPx]
    );

    // Generous bounds — shapes can be placed well outside the field on the infinite canvas
    const resolveShapeDragPosition = useCallback(
      (pos: Vector2d, snapEnabled: boolean): Vector2d => {
        const bounded = clampShapeDragPosition(pos);
        if (!snapEnabled) return bounded;
        const snapX = Math.round(bounded.x / stepPx) * stepPx;
        const snapY = Math.round(bounded.y / stepPx) * stepPx;
        return {
          x:
            Math.abs(bounded.x - snapX) <= magneticSnapRadiusPx
              ? snapX
              : bounded.x,
          y:
            Math.abs(bounded.y - snapY) <= magneticSnapRadiusPx
              ? snapY
              : bounded.y,
        };
      },
      [clampShapeDragPosition, magneticSnapRadiusPx, stepPx]
    );

    const resolveGroupDragPosition = useCallback(
      (pos: Vector2d, frame: RectLike, snapEnabled: boolean) => {
        const bounded = clampShapeDragPosition(pos);
        const center = {
          x: bounded.x + frame.width / 2,
          y: bounded.y + frame.height / 2,
        };

        if (!snapEnabled) {
          return {
            dragPosition: bounded,
            finalPosition: bounded,
            snapPoint: center,
            snapped: false,
          };
        }

        const snapCenterX = Math.round(center.x / stepPx) * stepPx;
        const snapCenterY = Math.round(center.y / stepPx) * stepPx;
        const snappedCenter = {
          x:
            Math.abs(center.x - snapCenterX) <= magneticSnapRadiusPx
              ? snapCenterX
              : center.x,
          y:
            Math.abs(center.y - snapCenterY) <= magneticSnapRadiusPx
              ? snapCenterY
              : center.y,
        };

        return {
          dragPosition: bounded,
          finalPosition: {
            x: snappedCenter.x - frame.width / 2,
            y: snappedCenter.y - frame.height / 2,
          },
          snapPoint: snappedCenter,
          snapped:
            Math.abs(center.x - snappedCenter.x) > 0.5 ||
            Math.abs(center.y - snappedCenter.y) > 0.5,
        };
      },
      [clampShapeDragPosition, magneticSnapRadiusPx, stepPx]
    );

    const resolveWaypointDragPosition = useCallback(
      (pos: Vector2d, snapEnabled: boolean): Vector2d => {
        const bounded = clampWaypointDragPosition(pos);
        if (!snapEnabled) return bounded;
        const snapX = Math.round(bounded.x / stepPx) * stepPx;
        const snapY = Math.round(bounded.y / stepPx) * stepPx;
        return {
          x:
            Math.abs(bounded.x - snapX) <= magneticSnapRadiusPx
              ? snapX
              : bounded.x,
          y:
            Math.abs(bounded.y - snapY) <= magneticSnapRadiusPx
              ? snapY
              : bounded.y,
        };
      },
      [clampWaypointDragPosition, magneticSnapRadiusPx, stepPx]
    );

    const dragBound = useCallback(
      (pos: Vector2d): Vector2d => clampShapeDragPosition(pos),
      [clampShapeDragPosition]
    );

    const applyGroupDragDelta = useCallback(
      (ids: string[], dxPx: number, dyPx: number) => {
        if (Math.abs(dxPx) < 0.5 && Math.abs(dyPx) < 0.5) return;
        const dxMeters = dxPx / design.field.ppm;
        const dyMeters = dyPx / design.field.ppm;
        nudgeShapes(ids, dxMeters, dyMeters);
      },
      [design.field.ppm, nudgeShapes]
    );

    const selectOnlyShape = useCallback(
      (shapeId: string) => {
        setSelection([shapeId]);
      },
      [setSelection]
    );

    const toggleShapeSelection = useCallback(
      (shapeId: string) => {
        const current = new Set(selectionRef.current);
        if (current.has(shapeId)) current.delete(shapeId);
        else current.add(shapeId);
        setSelection(Array.from(current));
      },
      [setSelection]
    );

    const openContextMenuForSelection = useCallback(
      (ids: string[], clickedShape?: Shape) => {
        if (activeTool !== "select" || readOnly || ids.length === 0) return;

        const nextSelection =
          clickedShape && !ids.includes(clickedShape.id)
            ? [clickedShape.id]
            : ids;

        if (
          nextSelection.length !== selectionRef.current.length ||
          nextSelection.some((id, index) => selectionRef.current[index] !== id)
        ) {
          setSelection(nextSelection);
        }

        const primaryShape =
          (clickedShape && nextSelection.includes(clickedShape.id)
            ? clickedShape
            : shapeById[nextSelection[0]]) ?? null;

        const rotatableIds = nextSelection.filter((id) => {
          const shape = shapeById[id];
          return (
            shape &&
            shape.kind !== "polyline" &&
            shape.kind !== "cone" &&
            !shape.locked
          );
        });

        setContextMenu({
          closablePolylineId:
            nextSelection.length === 1 &&
            primaryShape?.kind === "polyline" &&
            !primaryShape.closed &&
            primaryShape.points.length >= 3
              ? primaryShape.id
              : null,
          editablePolylineId:
            nextSelection.length === 1 && primaryShape?.kind === "polyline"
              ? primaryShape.id
              : null,
          ids: nextSelection,
          joinablePolylineIds: nextSelection.filter((id) => {
            const shape = shapeById[id];
            return shape?.kind === "polyline" && !shape.closed;
          }),
          label:
            nextSelection.length > 1
              ? `${nextSelection.length} items`
              : primaryShape
                ? shapeKindLabels[primaryShape.kind]
                : "Selection",
          locked: nextSelection.every((id) => {
            const shape = shapeById[id];
            return Boolean(shape?.locked);
          }),
          rotatableIds,
        });
      },
      [activeTool, readOnly, setSelection, shapeById]
    );

    const openShapeContextMenu = useCallback(
      (clickedShape: Shape) => {
        const currentSelection = selectionRef.current;
        const ids = currentSelection.includes(clickedShape.id)
          ? currentSelection
          : [clickedShape.id];
        openContextMenuForSelection(ids, clickedShape);
      },
      [openContextMenuForSelection]
    );

    const waypointDragBound = useCallback(
      (pos: Vector2d): Vector2d => clampWaypointDragPosition(pos),
      [clampWaypointDragPosition]
    );

    const fitFieldToViewport = useCallback(() => {
      const stage = stageRef.current;
      if (!stage || viewportSize.width <= 0 || viewportSize.height <= 0) return;
      const scaleX = viewportSize.width / widthPx;
      const scaleY = viewportSize.height / heightPx;
      const scale = Math.min(scaleX, scaleY) * 0.8; // leave room around field on infinite canvas
      const newX = (viewportSize.width - widthPx * scale) / 2;
      const newY = (viewportSize.height - heightPx * scale) / 2;
      stage.scale({ x: scale, y: scale });
      stage.position({ x: newX, y: newY });
      setZoom(scale);
      syncTransform();
    }, [
      heightPx,
      setZoom,
      syncTransform,
      viewportSize.height,
      viewportSize.width,
      widthPx,
    ]);

    const setManualView = useCallback((value: boolean) => {
      hasManualViewRef.current = value;
    }, []);

    const finalizePath = useCallback(
      (closed = false) => {
        if (draftPath.length < 2) {
          setDraftPath([]);
          setDraftForceClosed(false);
          setDraftSourceShapeId(null);
          return;
        }
        const nextClosed = closed || draftForceClosed;
        const points: PolylinePoint[] = draftPath.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z ?? 0,
        }));
        const sourcePath = draftSourcePath;
        const id =
          sourcePath?.id ??
          addShape({
            kind: "polyline",
            x: 0,
            y: 0,
            rotation: 0,
            points,
            closed: nextClosed,
            strokeWidth: 0.26,
            showArrows: false,
            arrowSpacing: 15,
            smooth: true,
            color: "#3b82f6",
          });
        if (sourcePath) {
          updateShape(sourcePath.id, {
            points,
            closed: nextClosed,
          });
        }
        setSelection([id]);
        setVertexSel(null);
        setDraftPath([]);
        setDraftForceClosed(false);
        setDraftSourceShapeId(null);
        setActiveTool("select");
      },
      [
        addShape,
        draftForceClosed,
        draftPath,
        draftSourcePath,
        setActiveTool,
        setDraftForceClosed,
        setDraftPath,
        setDraftSourceShapeId,
        setSelection,
        setVertexSel,
        updateShape,
      ]
    );

    const cancelDraftPath = useCallback(() => {
      setDraftPath([]);
      setDraftForceClosed(false);
      if (draftSourcePath) {
        setSelection([draftSourcePath.id]);
        setActiveTool("select");
      }
      setDraftSourceShapeId(null);
    }, [
      draftSourcePath,
      setActiveTool,
      setDraftForceClosed,
      setDraftPath,
      setDraftSourceShapeId,
      setSelection,
    ]);

    useTrackCanvasShortcuts({
      activeTool,
      addShapes,
      cancelDraftPath,
      designFieldGridStep: design.field.gridStep,
      shapeById,
      draftPath,
      duplicateShapes,
      effectiveVertexSel,
      finalizePath,
      fitFieldToViewport,
      beginInteraction,
      nudgeShapes,
      pauseHistory,
      removeShapes,
      resumeHistory,
      rotateShapes,
      selection,
      setActiveTool,
      setManualView,
      setSelection,
      setDraftPath,
      setVertexSel,
      removePolylinePoint,
      endInteraction,
    });

    useTrackCanvasViewport({
      containerRef,
      fitFieldToViewport,
      hasManualViewRef,
      setManualView,
      setViewportSize,
      stageRef,
      syncTransform,
    });

    const {
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
      snapRadiusMeters,
    } = useTrackCanvasInteractions({
      activeTool,
      addShape,
      designField: design.field,
      designShapes,
      disableTouchGestures: rotationSession !== null,
      draftPath,
      finalizePath,
      isMobile,
      lastPinchCenterRef,
      lastPinchDistRef,
      lastTouchPosRef,
      lastTouchStartClientRef,
      lastTouchStagePointRef,
      marqueeAdditiveRef: marqueeAdditive,
      marqueeOriginRef: marqueeOrigin,
      marqueeRect,
      onCursorChange,
      onSnapChange,
      mobileMultiSelectEnabled,
      readOnly,
      selection,
      setActiveTool,
      setCursor,
      setDraftPath,
      setIsStageDragging,
      setManualView,
      setMarqueeRect,
      setSelection,
      setSnapTarget,
      setZoom,
      setDraftForceClosed,
      shapeRefs,
      snapTarget,
      stageRef,
      stepPx,
      suppressTapRef,
      syncTransform,
      touchMovedRef,
      touchInteractionModeRef,
    });

    useLayoutEffect(() => {
      const stage = stageRef.current;
      if (!stage || !selection.length) return;
      const rects: RectLike[] = selection
        .map((id) => shapeRefs.current[id])
        .filter((node): node is KonvaGroup => Boolean(node))
        .map((node) => node.getClientRect({ relativeTo: stage }));
      setSelectionFrame(mergeClientRects(rects));
    }, [selection, designShapes]);

    // ── Infinite grid ────────────────────────────────────────────
    const grid = useMemo(() => {
      const elements: React.JSX.Element[] = [];

      const padX = Math.max(widthPx * 2, 1400);
      const padY = Math.max(heightPx * 2, 1400);
      const gx0 = -padX,
        gy0 = -padY;
      const gx1 = widthPx + padX,
        gy1 = heightPx + padY;

      const coarseStepPx = m2px(5, design.field.ppm);
      const coarseEvery = Math.max(1, Math.round(coarseStepPx / stepPx));
      const majorEvery = coarseEvery * 2;

      const pmod = (n: number, m: number) => ((Math.round(n) % m) + m) % m;

      const maxLines = 320;
      const skipX = Math.max(
        1,
        Math.ceil(Math.ceil((gx1 - gx0) / stepPx) / maxLines)
      );
      const skipY = Math.max(
        1,
        Math.ceil(Math.ceil((gy1 - gy0) / stepPx) / maxLines)
      );
      const effStepX = stepPx * skipX;
      const effStepY = stepPx * skipY;

      // Theme-aware line styles — rulers handle labels so no text needed here
      const stroke = isDark
        ? { major: "#365a80", coarse: "#2a4060", minor: "#1e2f42" }
        : { major: "#6890b0", coarse: "#98b4cc", minor: "#bdd0e0" };
      const width = { major: 1.4, coarse: 1, minor: 0.6 };
      const outOp = isDark ? 0.2 : 0.28;

      const lineStyle = (
        isMajor: boolean,
        isCoarse: boolean,
        inside: boolean
      ) => ({
        stroke: isMajor
          ? stroke.major
          : isCoarse
            ? stroke.coarse
            : stroke.minor,
        strokeWidth: isMajor
          ? width.major
          : isCoarse
            ? width.coarse
            : width.minor,
        opacity: inside ? 1 : outOp,
      });

      const startX = Math.floor(gx0 / effStepX) * effStepX;
      for (let x = startX; x <= gx1; x += effStepX) {
        const idx = Math.round(x / stepPx);
        const isMajor = pmod(idx, majorEvery) === 0;
        const isCoarse = !isMajor && pmod(idx, coarseEvery) === 0;
        const inside = x >= 0 && x <= widthPx;
        const s = lineStyle(isMajor, isCoarse, inside);
        elements.push(
          <Line
            key={`vx-${x.toFixed(1)}`}
            points={[x, gy0, x, gy1]}
            {...s}
            listening={false}
          />
        );
      }

      const startY = Math.floor(gy0 / effStepY) * effStepY;
      for (let y = startY; y <= gy1; y += effStepY) {
        const idx = Math.round(y / stepPx);
        const isMajor = pmod(idx, majorEvery) === 0;
        const isCoarse = !isMajor && pmod(idx, coarseEvery) === 0;
        const inside = y >= 0 && y <= heightPx;
        const s = lineStyle(isMajor, isCoarse, inside);
        elements.push(
          <Line
            key={`hz-${y.toFixed(1)}`}
            points={[gx0, y, gx1, y]}
            {...s}
            listening={false}
          />
        );
      }

      return elements;
    }, [design.field.ppm, heightPx, isDark, stepPx, widthPx]);

    const draftPointsPx = useMemo(() => {
      if (!draftPath.length) return [];
      return draftPath.flatMap((p) => [
        m2px(p.x, design.field.ppm),
        m2px(p.y, design.field.ppm),
      ]);
    }, [design.field.ppm, draftPath]);

    const draftCloseTarget = useMemo(() => {
      if (activeTool !== "polyline" || draftPath.length < 3 || !cursor) {
        return null;
      }

      const candidate = snapTarget ?? cursor.snappedMeters;
      const firstPoint = draftPath[0];
      const closeRadius = Math.max(design.field.gridStep * 1.25, 0.9);

      return distance2D(candidate, firstPoint) <= closeRadius
        ? firstPoint
        : null;
    }, [activeTool, cursor, design.field.gridStep, draftPath, snapTarget]);

    const draftPreviewPath = useMemo(() => {
      if (!draftPath.length) return draftPath;

      const previewPoints = [...draftPath];
      if (activeTool === "polyline" && cursor) {
        previewPoints.push({
          x: draftForceClosed
            ? draftPath[0].x
            : (draftCloseTarget?.x ?? snapTarget?.x ?? cursor.snappedMeters.x),
          y: draftForceClosed
            ? draftPath[0].y
            : (draftCloseTarget?.y ?? snapTarget?.y ?? cursor.snappedMeters.y),
          z: draftPath.at(-1)?.z ?? 0,
        });
      }

      return previewPoints;
    }, [
      activeTool,
      cursor,
      draftCloseTarget,
      draftForceClosed,
      draftPath,
      snapTarget,
    ]);

    const draftPreviewSmoothPx = useMemo(() => {
      if (draftPreviewPath.length < 2) return [];
      return getPolyline2DPoints(draftPreviewPath, {
        closed: Boolean(draftCloseTarget) || draftForceClosed,
        smooth: true,
      }).flatMap((point) => [
        m2px(point.x, design.field.ppm),
        m2px(point.y, design.field.ppm),
      ]);
    }, [
      design.field.ppm,
      draftCloseTarget,
      draftForceClosed,
      draftPreviewPath,
    ]);

    const draftLength = useMemo(() => {
      if (draftPath.length < 2) return 0;
      let total = 0;
      for (let i = 1; i < draftPath.length; i++)
        total += distance2D(draftPath[i - 1], draftPath[i]);
      return total;
    }, [draftPath]);

    const draftLengthWithCursor = useMemo(() => {
      if (activeTool !== "polyline" || !draftPath.length || !cursor)
        return draftLength;
      if (draftForceClosed && draftPath.length >= 2) {
        return (
          draftLength +
          distance2D(draftPath[draftPath.length - 1], draftPath[0])
        );
      }
      return (
        draftLength +
        distance2D(draftPath[draftPath.length - 1], {
          x: cursor.snappedMeters.x,
          y: cursor.snappedMeters.y,
        })
      );
    }, [activeTool, cursor, draftForceClosed, draftLength, draftPath]);

    useEffect(() => {
      onDraftPathStateChange?.({
        active: draftPath.length > 0 || activeTool === "polyline",
        canClose: Boolean(draftCloseTarget) || draftForceClosed,
        closed: draftForceClosed,
        length: draftLengthWithCursor,
        pointCount: draftPath.length,
      });
    }, [
      activeTool,
      draftCloseTarget,
      draftForceClosed,
      draftLengthWithCursor,
      draftPath.length,
      onDraftPathStateChange,
    ]);

    useImperativeHandle(ref, () => ({
      getStage: () => stageRef.current,
      fitToWindow: () => {
        setManualView(false);
        fitFieldToViewport();
      },
      closeDraftLoop: () => {
        if (draftPath.length < 3) return;
        setDraftForceClosed(true);
      },
      finishDraftPath: (closeLoop = Boolean(draftCloseTarget)) =>
        finalizePath(closeLoop),
      cancelDraftPath,
      undoDraftPoint: () => {
        setDraftForceClosed(false);
        setDraftPath((previous) =>
          previous.slice(0, Math.max(0, previous.length - 1))
        );
      },
      resumePolylineEditing: (shapeId: string) => {
        const shape = shapeById[shapeId];
        if (!shape || shape.kind !== "polyline") return;
        setDraftSourceShapeId(shape.id);
        setDraftForceClosed(Boolean(shape.closed));
        setDraftPath(
          shape.points.map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z ?? 0,
          }))
        );
        setSelection([]);
        setVertexSel(null);
        setActiveTool("polyline");
      },
    }));

    const cursorStyle = useMemo(() => {
      if (isStageDragging) return "grabbing";
      if (activeTool === "grab") return "grab";
      if (activeTool !== "select") return "crosshair";
      if (marqueeRect) return "crosshair";
      return "default";
    }, [activeTool, isStageDragging, marqueeRect]);

    const hoverCell = useMemo(() => {
      if (!cursor || activeTool !== "select") return null;
      return {
        x: Math.floor(cursor.rawPx.x / stepPx) * stepPx,
        y: Math.floor(cursor.rawPx.y / stepPx) * stepPx,
      };
    }, [cursor, stepPx, activeTool]);

    useEffect(() => {
      const session = rotationSessionRef.current;
      const sessionKey = session
        ? `${session.shapeId}:${session.startAngle}:${session.startRotation}`
        : null;

      if (rotationEffectSessionKeyRef.current === sessionKey) return;

      rotationEffectCleanupRef.current?.();
      rotationEffectCleanupRef.current = null;
      rotationEffectSessionKeyRef.current = sessionKey;
      rotationEffectResumedRef.current = false;

      if (!session) return;

      const stage = stageRef.current;
      if (!stage) return;
      const container = stage.container();
      container.style.cursor = "grabbing";

      const updateRotationFromEvent = (event: MouseEvent | TouchEvent) => {
        const activeSession = rotationSessionRef.current;
        if (!activeSession) return;

        stage.setPointersPositions(event);
        const pointer = stage.getRelativePointerPosition();
        if (!pointer) return;

        const currentAngle =
          (Math.atan2(
            pointer.y - activeSession.center.y,
            pointer.x - activeSession.center.x
          ) *
            180) /
          Math.PI;
        const nextRotation =
          (((activeSession.startRotation +
            currentAngle -
            activeSession.startAngle +
            90) %
            360) +
            360) %
          360;
        const normalizedRotation =
          "altKey" in event && event.altKey
            ? Math.round(nextRotation)
            : Math.round(nextRotation / 5) * 5;

        const previewRotation = ((normalizedRotation % 360) + 360) % 360;
        setRotationSession((current) =>
          current
            ? {
                ...current,
                previewRotation,
              }
            : current
        );
      };

      const handleMouseMove = (event: MouseEvent) => {
        updateRotationFromEvent(event);
      };

      const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault();
        updateRotationFromEvent(event);
      };

      const handlePointerUp = () => {
        const activeSession = rotationSessionRef.current;
        if (!rotationEffectResumedRef.current) {
          resumeHistoryRef.current();
          rotationEffectResumedRef.current = true;
        }
        if (activeSession) {
          updateShapeRef.current(activeSession.shapeId, {
            rotation: activeSession.previewRotation,
          });
        }
        endInteraction();
        setRotationSession(null);
      };

      const cleanup = () => {
        container.style.cursor = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handlePointerUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handlePointerUp);
        window.removeEventListener("touchcancel", handlePointerUp);
        if (!rotationEffectResumedRef.current) {
          resumeHistoryRef.current();
          rotationEffectResumedRef.current = true;
        }
        endInteraction();
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handlePointerUp);
      window.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", handlePointerUp);
      window.addEventListener("touchcancel", handlePointerUp);

      rotationEffectCleanupRef.current = cleanup;
    });

    useEffect(
      () => () => {
        rotationEffectCleanupRef.current?.();
        rotationEffectCleanupRef.current = null;
      },
      []
    );

    const handleContinueEditing = useCallback(
      (polylineId: string) => {
        const shape = shapeById[polylineId];
        if (!shape || shape.kind !== "polyline") return;
        setDraftSourceShapeId(shape.id);
        setDraftPath(
          shape.points.map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z ?? 0,
          }))
        );
        setSelection([]);
        setVertexSel(null);
        setActiveTool("polyline");
      },
      [
        shapeById,
        setActiveTool,
        setDraftPath,
        setDraftSourceShapeId,
        setSelection,
        setVertexSel,
      ]
    );

    return (
      <ContextMenu onOpenChange={(open) => !open && setContextMenu(null)}>
        <ContextMenuTrigger
          ref={containerRef}
          className="relative h-full w-full overflow-hidden"
          style={{ cursor: cursorStyle, touchAction: "none" }}
        >
          <div
            className="border-border/60 bg-card/80 text-muted-foreground pointer-events-none absolute z-20 items-center gap-2 rounded-md border px-2 py-1 text-[10px] backdrop-blur"
            style={{
              top: RULER_SIZE + 6,
              left: RULER_SIZE + 6,
              display: showDesktopCanvasChrome ? "flex" : "none",
            }}
          >
            <span>
              {design.field.width}m × {design.field.height}m
            </span>
            <span className="text-border">·</span>
            <span>Grid {design.field.gridStep}m</span>
            <span className="text-border">·</span>
            <span>
              {activeTool === "polyline" ? "Smart snap" : "Grid snap"}
            </span>
          </div>
          <div
            className="border-border/60 bg-card/80 text-muted-foreground/70 pointer-events-none absolute top-10.5 right-2 z-20 rounded-md border px-2 py-1 text-[10px] backdrop-blur"
            style={{
              top: RULER_SIZE + 6,
              display: showDesktopCanvasChrome ? "block" : "none",
            }}
          >
            <span className="text-foreground/60 font-medium">Mid-click</span>{" "}
            pan ·{" "}
            <span className="text-foreground/60 font-medium">Right-click</span>{" "}
            menu · <span className="text-foreground/60 font-medium">Alt</span>{" "}
            free
          </div>
          <div
            className="absolute right-2 z-20"
            style={{
              top: RULER_SIZE + 34,
              display: showDesktopCanvasChrome ? "block" : "none",
            }}
          >
            <Tooltip>
              <TooltipTrigger
                onClick={() => {
                  setManualView(false);
                  fitFieldToViewport();
                }}
                className="border-border/60 bg-card/85 text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-md border shadow-xs backdrop-blur transition-colors"
                aria-label="Fit to window"
              >
                <Scan className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="left">
                Fit to window{" "}
                <span className="ml-1 font-mono text-[10px] opacity-50">0</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <Stage
            width={viewportSize.width}
            height={viewportSize.height}
            ref={stageRef}
            draggable={activeTool === "grab" && !readOnly}
            onDragStart={onStageDragStart}
            onDragMove={onStageDragMove}
            onDragEnd={onStageDragEnd}
            onWheel={onWheel}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTap={onTap}
            onDblTap={onDblTap}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
          >
            {/* Infinite grid + field boundary layer */}
            <Layer listening={false}>
              <FieldLayerContent
                designField={design.field}
                effectiveSelectionFrame={
                  selection.length > 1 ? effectiveSelectionFrame : null
                }
                grid={grid}
                heightPx={heightPx}
                hoverCell={hoverCell}
                isDark={isDark}
                marqueeRect={marqueeRect}
                stepPx={stepPx}
                widthPx={widthPx}
              />
            </Layer>

            {/* Shapes layer */}
            <Layer>
              {designShapes
                .filter((shape) => shape.id !== draftSourceShapeId)
                .map((shape) => {
                  const allowInteraction = activeTool === "select" && !readOnly;
                  const displayShape =
                    rotationSession?.shapeId === shape.id
                      ? { ...shape, rotation: rotationSession.previewRotation }
                      : shape;
                  return (
                    <TrackShapeNode
                      key={shape.id}
                      allowInteraction={allowInteraction}
                      designPpm={design.field.ppm}
                      dragBound={dragBound}
                      dragSnapRef={dragSnapRef}
                      effectiveVertexSel={effectiveVertexSel}
                      hoveredWaypoint={hoveredWaypoint}
                      isHovered={hoveredShapeId === shape.id}
                      isMobile={isMobile}
                      mobileMultiSelectEnabled={mobileMultiSelectEnabled}
                      isSelected={selectionIdSet.has(shape.id)}
                      selectionCount={selection.length}
                      groupDragOffsetPx={
                        groupDragPreview && groupDragIdSet.has(shape.id)
                          ? {
                              x: groupDragPreview.dx,
                              y: groupDragPreview.dy,
                            }
                          : null
                      }
                      onMobileMultiSelectStart={onMobileMultiSelectStart}
                      onShapeContextMenu={openShapeContextMenu}
                      onSelectOnly={selectOnlyShape}
                      onToggleSelection={toggleShapeSelection}
                      setSelection={setSelection}
                      setVertexSel={setVertexSel}
                      shape={displayShape}
                      shapeRef={(node) => {
                        shapeRefs.current[shape.id] = node;
                      }}
                      setDragSnapPreview={setDragSnapPreview}
                      resolveShapeDragPosition={resolveShapeDragPosition}
                      waypointDragBound={waypointDragBound}
                      resolveWaypointDragPosition={resolveWaypointDragPosition}
                      setPolylinePoints={setPolylinePoints}
                      updateShape={updateShape}
                      zmax={zmax}
                      zmin={zmin}
                    />
                  );
                })}
              {activeTool === "select" &&
                !readOnly &&
                selection.length > 1 &&
                selectionFrame && (
                  <Rect
                    x={selectionFrame.x + (groupDragPreview?.dx ?? 0)}
                    y={selectionFrame.y + (groupDragPreview?.dy ?? 0)}
                    width={selectionFrame.width}
                    height={selectionFrame.height}
                    fill={isDark ? "#60a5fa12" : "#3b82f610"}
                    strokeEnabled={false}
                    draggable
                    dragBoundFunc={dragBound}
                    onMouseDown={(event) => {
                      event.cancelBubble = true;
                    }}
                    onTap={(event) => {
                      event.cancelBubble = true;
                    }}
                    onContextMenu={(event) => {
                      event.cancelBubble = true;
                      openContextMenuForSelection(selectionRef.current);
                    }}
                    onDragStart={(event) => {
                      event.cancelBubble = true;
                      dragSnapRef.current = !(
                        event.evt.altKey ||
                        event.evt.metaKey ||
                        event.evt.shiftKey
                      );
                      setDragSnapPreview(null);
                      beginInteraction();
                      setGroupDragPreview({
                        ids: [...selection],
                        origin: { x: selectionFrame.x, y: selectionFrame.y },
                        dx: 0,
                        dy: 0,
                      });
                    }}
                    onDragMove={(event) => {
                      event.cancelBubble = true;
                      const current = event.currentTarget.position();
                      const resolved = resolveGroupDragPosition(
                        current,
                        selectionFrame,
                        dragSnapRef.current
                      );
                      setDragSnapPreview(
                        resolved.snapped ? resolved.snapPoint : null
                      );
                      event.currentTarget.position(resolved.dragPosition);
                      setGroupDragPreview((existing) =>
                        existing
                          ? {
                              ...existing,
                              dx: resolved.dragPosition.x - existing.origin.x,
                              dy: resolved.dragPosition.y - existing.origin.y,
                            }
                          : existing
                      );
                    }}
                    onDragEnd={(event) => {
                      event.cancelBubble = true;
                      const resolved = resolveGroupDragPosition(
                        event.currentTarget.position(),
                        selectionFrame,
                        dragSnapRef.current
                      );
                      event.currentTarget.position(resolved.finalPosition);
                      setDragSnapPreview(null);
                      const activePreview = groupDragPreview;
                      setGroupDragPreview(null);
                      endInteraction();
                      const origin = activePreview?.origin ?? {
                        x: selectionFrame.x,
                        y: selectionFrame.y,
                      };
                      const ids = activePreview?.ids ?? [...selection];
                      applyGroupDragDelta(
                        ids,
                        resolved.finalPosition.x - origin.x,
                        resolved.finalPosition.y - origin.y
                      );
                    }}
                  />
                )}
            </Layer>

            {!readOnly && activeTool === "select" && (
              <Layer>
                <RotationGuideOverlay
                  isDark={isDark}
                  onRotateStart={(event) => {
                    if (
                      !singleSelectedShape ||
                      singleSelectedShape.locked ||
                      !rotationGuide
                    ) {
                      return;
                    }

                    event.cancelBubble = true;
                    const stage = stageRef.current;
                    const pointer = stage?.getRelativePointerPosition();
                    if (!pointer) return;
                    beginInteraction();
                    pauseHistory();

                    const startAngle =
                      (Math.atan2(
                        pointer.y - rotationGuide.center.y,
                        pointer.x - rotationGuide.center.x
                      ) *
                        180) /
                      Math.PI;

                    setRotationSession({
                      center: rotationGuide.center,
                      shapeId: singleSelectedShape.id,
                      previewRotation: singleSelectedShape.rotation,
                      startAngle,
                      startRotation: singleSelectedShape.rotation - 90,
                    });
                  }}
                  rotationGuide={rotationGuide}
                  showAngleLabel={rotationSession !== null}
                />
              </Layer>
            )}

            <Layer>
              {dragSnapPreview && (
                <Group listening={false}>
                  <Circle
                    x={dragSnapPreview.x}
                    y={dragSnapPreview.y}
                    radius={Math.max(11, magneticSnapRadiusPx + 1)}
                    fill={isDark ? "#7dd3fc14" : "#0ea5e910"}
                    strokeEnabled={false}
                    opacity={0.24}
                  />
                  <Circle
                    x={dragSnapPreview.x}
                    y={dragSnapPreview.y}
                    radius={Math.max(7, magneticSnapRadiusPx - 2)}
                    fill={isDark ? "#e0f2fe10" : "#ffffffa8"}
                    stroke={isDark ? "#7dd3fc66" : "#0ea5e955"}
                    strokeWidth={0.8}
                    opacity={0.42}
                  />
                  <Circle
                    x={dragSnapPreview.x}
                    y={dragSnapPreview.y}
                    radius={1.75}
                    fill={isDark ? "#e0f2fe" : "#0284c7"}
                    opacity={0.62}
                  />
                </Group>
              )}

              {/* Snap-to-element indicator (polyline drawing mode) */}
              {snapTarget &&
                activeTool === "polyline" &&
                (() => {
                  const sx = m2px(snapTarget.x, design.field.ppm);
                  const sy = m2px(snapTarget.y, design.field.ppm);
                  const r = Math.max(
                    m2px(snapRadiusMeters * 0.55, design.field.ppm),
                    14
                  );
                  return (
                    <Group listening={false}>
                      <Circle
                        x={sx}
                        y={sy}
                        radius={r}
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        dash={[5, 4]}
                        opacity={0.85}
                      />
                      <Circle
                        x={sx}
                        y={sy}
                        radius={4}
                        fill="#22c55e"
                        opacity={0.9}
                      />
                    </Group>
                  );
                })()}

              {/* Draft polyline */}
              {draftPreviewSmoothPx.length >= 4 && (
                <>
                  <Line
                    points={draftPreviewSmoothPx}
                    stroke="#60a5fa"
                    strokeWidth={m2px(0.28, design.field.ppm)}
                    lineCap="round"
                    lineJoin="round"
                    opacity={0.2}
                  />
                  <Line
                    points={draftPreviewSmoothPx}
                    stroke={snapTarget ? "#22c55e" : "#3b82f6"}
                    strokeWidth={m2px(0.18, design.field.ppm)}
                    lineCap="round"
                    lineJoin="round"
                    opacity={0.55}
                  />
                </>
              )}
              {draftPointsPx.length > 0 && (
                <Line
                  points={draftPointsPx}
                  stroke="#93c5fd"
                  strokeWidth={Math.max(1, m2px(0.08, design.field.ppm))}
                  dash={[4, 6]}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.45}
                />
              )}
              {draftPointsPx.length > 0 &&
                cursor &&
                (() => {
                  const endX = snapTarget
                    ? m2px(snapTarget.x, design.field.ppm)
                    : cursor.snappedPx.x;
                  const endY = snapTarget
                    ? m2px(snapTarget.y, design.field.ppm)
                    : cursor.snappedPx.y;
                  const previewX = draftCloseTarget
                    ? m2px(draftCloseTarget.x, design.field.ppm)
                    : endX;
                  const previewY = draftCloseTarget
                    ? m2px(draftCloseTarget.y, design.field.ppm)
                    : endY;
                  return (
                    <Line
                      points={[
                        draftPointsPx[draftPointsPx.length - 2],
                        draftPointsPx[draftPointsPx.length - 1],
                        previewX,
                        previewY,
                      ]}
                      stroke={
                        draftCloseTarget
                          ? "#f59e0b"
                          : snapTarget
                            ? "#22c55e"
                            : "#60a5fa"
                      }
                      strokeWidth={Math.max(1, m2px(0.12, design.field.ppm))}
                      dash={[4, 6]}
                      opacity={0.5}
                      lineCap="round"
                    />
                  );
                })()}
              {draftCloseTarget && (
                <Group listening={false}>
                  <Circle
                    x={m2px(draftCloseTarget.x, design.field.ppm)}
                    y={m2px(draftCloseTarget.y, design.field.ppm)}
                    radius={Math.max(9, m2px(0.28, design.field.ppm))}
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dash={[5, 4]}
                    opacity={0.9}
                  />
                  <Circle
                    x={m2px(draftCloseTarget.x, design.field.ppm)}
                    y={m2px(draftCloseTarget.y, design.field.ppm)}
                    radius={3.5}
                    fill="#f59e0b"
                    opacity={0.95}
                  />
                </Group>
              )}

              {/* Cursor crosshair */}
              {cursor && (
                <Group listening={false}>
                  <Line
                    points={[
                      cursor.snappedPx.x,
                      cursor.snappedPx.y - 10,
                      cursor.snappedPx.x,
                      cursor.snappedPx.y + 10,
                    ]}
                    stroke="#4a5568"
                    strokeWidth={1}
                    dash={[3, 3]}
                  />
                  <Line
                    points={[
                      cursor.snappedPx.x - 10,
                      cursor.snappedPx.y,
                      cursor.snappedPx.x + 10,
                      cursor.snappedPx.y,
                    ]}
                    stroke="#4a5568"
                    strokeWidth={1}
                    dash={[3, 3]}
                  />
                </Group>
              )}
            </Layer>
          </Stage>

          {showRulers && (
            <>
              <div
                className="pointer-events-none absolute z-10"
                style={{ top: 0, left: RULER_SIZE }}
              >
                <div
                  style={{
                    position: "relative",
                    width: viewportSize.width - RULER_SIZE,
                    height: RULER_SIZE,
                  }}
                >
                  <CanvasRuler
                    orientation="h"
                    stageTransform={{
                      ...stageTransform,
                      x: stageTransform.x - RULER_SIZE,
                    }}
                    ppm={design.field.ppm}
                    gridStep={design.field.gridStep}
                    length={viewportSize.width - RULER_SIZE}
                    isDark={isDark}
                  />
                </div>
              </div>
              <div
                className="pointer-events-none absolute z-10"
                style={{ top: RULER_SIZE, left: 0 }}
              >
                <div
                  style={{
                    position: "relative",
                    width: RULER_SIZE,
                    height: viewportSize.height - RULER_SIZE,
                  }}
                >
                  <CanvasRuler
                    orientation="v"
                    stageTransform={{
                      ...stageTransform,
                      y: stageTransform.y - RULER_SIZE,
                    }}
                    ppm={design.field.ppm}
                    gridStep={design.field.gridStep}
                    length={viewportSize.height - RULER_SIZE}
                    isDark={isDark}
                  />
                </div>
              </div>
              <div
                className="pointer-events-none absolute z-10"
                style={{
                  top: 0,
                  left: 0,
                  width: RULER_SIZE,
                  height: RULER_SIZE,
                  background: isDark ? "#070b12" : "#f2f4f7",
                  borderRight: isDark
                    ? "1px solid #1a2636"
                    : "1px solid #c8d2db",
                  borderBottom: isDark
                    ? "1px solid #1a2636"
                    : "1px solid #c8d2db",
                }}
              />
            </>
          )}

          {/* Status overlay */}
          {draftPath.length > 0 && !isMobile && (
            <div className="text-primary/70 bg-background/80 border-border/40 pointer-events-none absolute inset-x-0 bottom-0 border-t px-3 py-2 text-[11px]">
              {isMobile ? "Tap" : "Click"} to add points ·{" "}
              {isMobile ? "double-tap" : "double-click"} or{" "}
              <span className="text-foreground/60 font-medium">Enter</span> to
              finish ·{" "}
              <span className="text-foreground/60 font-medium">Esc</span> to
              cancel
              {draftCloseTarget && (
                <span className="ml-3 text-amber-500/90">
                  Release to close loop
                </span>
              )}
              {draftLengthWithCursor > 0 && (
                <span className="text-muted-foreground/60 ml-3">
                  {draftLengthWithCursor.toFixed(1)} m
                </span>
              )}
            </div>
          )}
        </ContextMenuTrigger>

        {contextMenu && (
          <CanvasContextMenuContent
            contextMenu={contextMenu}
            onClose={() => setContextMenu(null)}
            onContinueEditing={handleContinueEditing}
            onClosePolyline={closePolyline}
            onDuplicate={duplicateShapes}
            onJoinPolylines={joinPolylines}
            onToggleLock={setShapesLocked}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onRotate={rotateShapes}
            onDelete={removeShapes}
          />
        )}
      </ContextMenu>
    );
  })
);

export default TrackCanvas;
