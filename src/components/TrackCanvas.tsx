"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Stage, Layer, Circle, Line, Group } from "react-konva";
import type { Vector2d } from "konva/lib/types";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import {
  clamp,
  mergeClientRects,
  type CursorState,
  type DraftPoint,
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
import { useEditor } from "@/store/editor";
import { m2px } from "@/lib/units";
import { zRangeForDesign } from "@/lib/alt";
import type { PolylinePoint, Shape } from "@/lib/types";
import { distance2D } from "@/lib/geometry";
import { CanvasRuler, RULER_SIZE } from "@/components/CanvasRuler";
import { useTheme } from "@/hooks/useTheme";
import { shapeKindLabels } from "@/lib/editor-tools";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Lock,
  RotateCcw,
  RotateCw,
  Scan,
  Trash2,
  Unlock,
} from "lucide-react";

export interface TrackCanvasHandle {
  getStage: () => KonvaStage | null;
  fitToWindow: () => void;
}

interface TrackCanvasProps {
  onCursorChange?: (pos: { x: number; y: number } | null) => void;
  onSnapChange?: (active: boolean) => void;
  readOnly?: boolean;
}

const TrackCanvas = forwardRef<TrackCanvasHandle, TrackCanvasProps>(
  function TrackCanvas(
    { onCursorChange, onSnapChange, readOnly = false },
    ref
  ) {
    const {
      design,
      selection,
      setSelection,
      updateShape,
      addShape,
      activeTool,
      setActiveTool,
      removeShapes,
      duplicateShapes,
      nudgeShapes,
      setZoom,
      hoveredWaypoint,
      bringForward,
      sendBackward,
    } = useEditor();

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
    const lastPinchDistRef = useRef<number | null>(null);
    const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);

    const [vertexSel, setVertexSel] = useState<{
      shapeId: string;
      idx: number;
    } | null>(null);
    const [draftPath, setDraftPath] = useState<DraftPoint[]>([]);
    const [cursor, setCursor] = useState<CursorState | null>(null);
    const [snapTarget, setSnapTarget] = useState<{
      x: number;
      y: number;
      id: string;
    } | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<RectLike | null>(null);
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
    const [rotationSession, setRotationSession] = useState<{
      center: { x: number; y: number };
      shapeId: string;
      startAngle: number;
      startRotation: number;
    } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      ids: string[];
      label: string;
      locked: boolean;
      rotatableIds: string[];
    } | null>(null);
    const hasManualViewRef = useRef(false);
    const isDark = useTheme() === "dark";

    const normalizeRotation = useCallback(
      (rotation: number) => ((rotation % 360) + 360) % 360,
      []
    );

    const rotateShapes = useCallback(
      (ids: string[], delta: number) => {
        for (const id of ids) {
          const shape = design.shapes.find((candidate) => candidate.id === id);
          if (!shape || shape.kind === "polyline" || shape.locked) continue;
          updateShape(id, {
            rotation: normalizeRotation((shape.rotation ?? 0) + delta),
          });
        }
      },
      [design.shapes, normalizeRotation, updateShape]
    );

    const effectiveVertexSel = useMemo(
      () =>
        selection.length === 0 || activeTool !== "select" ? null : vertexSel,
      [selection.length, activeTool, vertexSel]
    );
    const effectiveSelectionFrame = selection.length ? selectionFrame : null;
    const singleSelectedShape = useMemo(
      () =>
        selection.length === 1
          ? (design.shapes.find((shape) => shape.id === selection[0]) ?? null)
          : null,
      [design.shapes, selection]
    );
    const rotationGuide = useMemo(() => {
      if (
        !singleSelectedShape ||
        singleSelectedShape.kind === "polyline" ||
        singleSelectedShape.locked
      ) {
        return null;
      }

      const center = {
        x: m2px(singleSelectedShape.x, design.field.ppm),
        y: m2px(singleSelectedShape.y, design.field.ppm),
      };

      return {
        angleDeg: singleSelectedShape.rotation - 90,
        center,
        label: `${Math.round(singleSelectedShape.rotation)}°`,
        radius: estimateRotationGuideRadiusPx(singleSelectedShape),
      };
    }, [design.field.ppm, estimateRotationGuideRadiusPx, singleSelectedShape]);

    const syncTransform = useCallback(() => {
      const s = stageRef.current;
      if (!s) return;
      setStageTransform({ x: s.x(), y: s.y(), scale: s.scaleX() });
    }, []);

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

    // Generous bounds — shapes can be placed well outside the field on the infinite canvas
    const dragBound = useCallback(
      (pos: Vector2d): Vector2d => {
        const bound = {
          x: clamp(pos.x, -widthPx * 2, widthPx * 3),
          y: clamp(pos.y, -heightPx * 2, heightPx * 3),
        };
        if (!dragSnapRef.current) return bound;
        return {
          x: Math.round(bound.x / stepPx) * stepPx,
          y: Math.round(bound.y / stepPx) * stepPx,
        };
      },
      [heightPx, stepPx, widthPx]
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

    useImperativeHandle(
      ref,
      () => ({
        getStage: () => stageRef.current,
        fitToWindow: () => {
          setManualView(false);
          fitFieldToViewport();
        },
      }),
      [fitFieldToViewport, setManualView]
    );

    const finalizePath = useCallback(() => {
      if (draftPath.length < 2) {
        setDraftPath([]);
        return;
      }
      const points: PolylinePoint[] = draftPath.map((p) => ({
        x: p.x,
        y: p.y,
        z: p.z ?? 0,
      }));
      const id = addShape({
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        points,
        strokeWidth: 0.18,
        showArrows: true,
        smooth: true,
        color: "#3b82f6",
      });
      setSelection([id]);
      setVertexSel(null);
      setDraftPath([]);
      setActiveTool("select");
    }, [addShape, draftPath, setActiveTool, setSelection]);

    useTrackCanvasShortcuts({
      activeTool,
      addShape,
      designFieldGridStep: design.field.gridStep,
      designShapes: design.shapes,
      draftPath,
      duplicateShapes,
      effectiveVertexSel,
      finalizePath,
      fitFieldToViewport,
      nudgeShapes,
      removeShapes,
      selection,
      setActiveTool,
      setManualView,
      setSelection,
      setDraftPath,
      setVertexSel,
      updateShape,
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
      onStageDragEnd,
      onStageDragMove,
      onStageDragStart,
      onTouchMove,
      onTouchStart,
      onWheel,
      snapRadiusMeters,
    } = useTrackCanvasInteractions({
      activeTool,
      addShape,
      designField: design.field,
      designShapes: design.shapes,
      finalizePath,
      lastPinchDistRef,
      lastTouchPosRef,
      marqueeAdditiveRef: marqueeAdditive,
      marqueeOriginRef: marqueeOrigin,
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
      syncTransform,
    });

    useLayoutEffect(() => {
      const stage = stageRef.current;
      if (!stage || !selection.length) return;
      const rects: RectLike[] = selection
        .map((id) => shapeRefs.current[id])
        .filter((node): node is KonvaGroup => Boolean(node))
        .map((node) => node.getClientRect({ relativeTo: stage }));
      setSelectionFrame(mergeClientRects(rects));
    }, [selection, design.shapes]);

    const [zmin, zmax] = zRangeForDesign(design);

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
      return (
        draftLength +
        distance2D(draftPath[draftPath.length - 1], {
          x: cursor.snappedMeters.x,
          y: cursor.snappedMeters.y,
        })
      );
    }, [activeTool, cursor, draftLength, draftPath]);

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
      if (!rotationSession) return;

      const stage = stageRef.current;
      if (!stage) return;

      const handlePointerMove = (event: MouseEvent) => {
        stage.setPointersPositions(event);
        const pointer = stage.getRelativePointerPosition();
        if (!pointer) return;

        const currentAngle =
          (Math.atan2(
            pointer.y - rotationSession.center.y,
            pointer.x - rotationSession.center.x
          ) *
            180) /
          Math.PI;
        const nextRotation =
          (((rotationSession.startRotation +
            currentAngle -
            rotationSession.startAngle +
            90) %
            360) +
            360) %
          360;
        const normalizedRotation = event.altKey
          ? Math.round(nextRotation)
          : Math.round(nextRotation / 5) * 5;

        updateShape(rotationSession.shapeId, {
          rotation: ((normalizedRotation % 360) + 360) % 360,
        });
      };

      const handlePointerUp = () => {
        setRotationSession(null);
      };

      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", handlePointerUp);

      return () => {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseup", handlePointerUp);
      };
    }, [rotationSession, updateShape]);

    return (
      <ContextMenu onOpenChange={(open) => !open && setContextMenu(null)}>
        <ContextMenuTrigger
          ref={containerRef}
          className="relative h-full w-full overflow-hidden"
          style={{ cursor: cursorStyle, touchAction: "none" }}
        >
        <div
          className="border-border/60 bg-card/80 text-muted-foreground pointer-events-none absolute z-20 flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] backdrop-blur"
          style={{ top: RULER_SIZE + 6, left: RULER_SIZE + 6 }}
        >
          <span>
            {design.field.width}m × {design.field.height}m
          </span>
          <span className="text-border">·</span>
          <span>Grid {design.field.gridStep}m</span>
          <span className="text-border">·</span>
          <span>{activeTool === "polyline" ? "Smart snap" : "Grid snap"}</span>
        </div>
        <div
          className="border-border/60 bg-card/80 text-muted-foreground/70 pointer-events-none absolute right-2 z-20 rounded-md border px-2 py-1 text-[10px] backdrop-blur"
          style={{ top: RULER_SIZE + 6 }}
        >
          <span className="text-foreground/60 font-medium">Mid-click</span> pan
          · <span className="text-foreground/60 font-medium">Right-click</span>{" "}
          menu · <span className="text-foreground/60 font-medium">Alt</span>{" "}
          free
        </div>
        {!readOnly && (
          <div
            className="absolute right-2 z-20"
            style={{ top: RULER_SIZE + 34 }}
          >
            <Tooltip>
              <TooltipTrigger
                onClick={() => {
                  setManualView(false);
                  fitFieldToViewport();
                }}
                className="border-border/60 bg-card/85 text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-md border shadow-sm backdrop-blur transition-colors"
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
        )}
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
            {design.shapes.map((shape) => {
              const allowInteraction = activeTool === "select" && !readOnly;
              return (
                <TrackShapeNode
                  key={shape.id}
                  allowInteraction={allowInteraction}
                  designPpm={design.field.ppm}
                  dragBound={dragBound}
                  dragSnapRef={dragSnapRef}
                  effectiveVertexSel={effectiveVertexSel}
                  heightPx={heightPx}
                  hoveredWaypoint={hoveredWaypoint}
                  isSelected={selection.includes(shape.id)}
                  onShapeContextMenu={(clickedShape) => {
                    if (activeTool !== "select" || readOnly) return;

                    const nextSelection = selection.includes(clickedShape.id)
                      ? selection
                      : [clickedShape.id];
                    if (!selection.includes(clickedShape.id)) {
                      setSelection(nextSelection);
                    }
                    const rotatableIds = nextSelection.filter((id) => {
                      const shape = design.shapes.find(
                        (candidate) => candidate.id === id
                      );
                      return (
                        shape && shape.kind !== "polyline" && !shape.locked
                      );
                    });

                    setContextMenu({
                      ids: nextSelection,
                      label:
                        nextSelection.length > 1
                          ? `${nextSelection.length} items`
                          : shapeKindLabels[clickedShape.kind],
                      locked: nextSelection.every((id) => {
                        const shape = design.shapes.find(
                          (candidate) => candidate.id === id
                        );
                        return Boolean(shape?.locked);
                      }),
                      rotatableIds,
                    });
                  }}
                  selection={selection}
                  setSelection={setSelection}
                  setVertexSel={setVertexSel}
                  shape={shape}
                  shapeRef={(node) => {
                    shapeRefs.current[shape.id] = node;
                  }}
                  stepPx={stepPx}
                  updateShape={updateShape}
                  widthPx={widthPx}
                  zmax={zmax}
                  zmin={zmin}
                />
              );
            })}
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
            {draftPointsPx.length > 0 && (
              <Line
                points={draftPointsPx}
                stroke="#3b82f6"
                strokeWidth={m2px(0.18, design.field.ppm)}
                dash={[6, 6]}
                lineCap="round"
                lineJoin="round"
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
                return (
                  <Line
                    points={[
                      draftPointsPx[draftPointsPx.length - 2],
                      draftPointsPx[draftPointsPx.length - 1],
                      endX,
                      endY,
                    ]}
                    stroke={snapTarget ? "#22c55e" : "#60a5fa"}
                    strokeWidth={m2px(0.18, design.field.ppm)}
                    dash={[4, 6]}
                    opacity={0.7}
                    lineCap="round"
                  />
                );
              })()}

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

        {/* Rulers */}
        {/* Horizontal ruler — top edge, inset by RULER_SIZE to leave room for corner */}
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
        {/* Vertical ruler — left edge, inset by RULER_SIZE to leave room for corner */}
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
        {/* Corner square */}
        <div
          className="pointer-events-none absolute z-10"
          style={{
            top: 0,
            left: 0,
            width: RULER_SIZE,
            height: RULER_SIZE,
            background: isDark ? "#070b12" : "#f2f4f7",
            borderRight: isDark ? "1px solid #1a2636" : "1px solid #c8d2db",
            borderBottom: isDark ? "1px solid #1a2636" : "1px solid #c8d2db",
          }}
        />

        {/* Status overlay */}
        {draftPath.length > 0 && (
          <div className="text-primary/70 bg-background/80 border-border/40 pointer-events-none absolute inset-x-0 bottom-0 border-t px-3 py-2 text-[11px]">
            Click to add points · Double-click or{" "}
            <span className="text-foreground/60 font-medium">Enter</span> to
            finish · <span className="text-foreground/60 font-medium">Esc</span>{" "}
            to cancel
            {draftLengthWithCursor > 0 && (
              <span className="text-muted-foreground/60 ml-3">
                {draftLengthWithCursor.toFixed(1)} m
              </span>
            )}
          </div>
        )}
        </ContextMenuTrigger>

        {contextMenu && (
          <ContextMenuContent sideOffset={6} className="min-w-56">
            <ContextMenuGroup>
              <ContextMenuLabel>
                <div className="text-foreground/85 font-medium">
                  {contextMenu.label}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {contextMenu.ids.length === 1
                    ? "Quick actions"
                    : `${contextMenu.ids.length} selected`}
                </div>
              </ContextMenuLabel>
              <ContextMenuItem
                onClick={() => {
                  duplicateShapes(contextMenu.ids);
                  setContextMenu(null);
                }}
              >
                <Copy className="size-3.5" />
                Duplicate
                <ContextMenuShortcut>Ctrl/Cmd+D</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  for (const id of contextMenu.ids) {
                    const shape = design.shapes.find(
                      (candidate) => candidate.id === id
                    );
                    if (!shape) continue;
                    updateShape(id, { locked: !contextMenu.locked });
                  }
                  setContextMenu(null);
                }}
              >
                {contextMenu.locked ? (
                  <Unlock className="size-3.5" />
                ) : (
                  <Lock className="size-3.5" />
                )}
                {contextMenu.locked ? "Unlock" : "Lock"}
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger disabled={contextMenu.ids.length !== 1}>
                  <ArrowUp className="size-3.5" />
                  Arrange
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem
                    onClick={() => {
                      bringForward(contextMenu.ids[0]);
                      setContextMenu(null);
                    }}
                  >
                    <ArrowUp className="size-3.5" />
                    Bring forward
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      sendBackward(contextMenu.ids[0]);
                      setContextMenu(null);
                    }}
                  >
                    <ArrowDown className="size-3.5" />
                    Send backward
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSub>
                <ContextMenuSubTrigger
                  disabled={contextMenu.rotatableIds.length === 0}
                >
                  <RotateCw className="size-3.5" />
                  Rotate
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem
                    onClick={() => {
                      rotateShapes(contextMenu.rotatableIds, -15);
                      setContextMenu(null);
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                    Rotate left
                    <ContextMenuShortcut>Q / [</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      rotateShapes(contextMenu.rotatableIds, 15);
                      setContextMenu(null);
                    }}
                  >
                    <RotateCw className="size-3.5" />
                    Rotate right
                    <ContextMenuShortcut>E / ]</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuGroup>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onClick={() => {
                removeShapes(contextMenu.ids);
                setContextMenu(null);
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
  }
);

export default TrackCanvas;
