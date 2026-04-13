"use client";

import {
  memo,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Circle, Group, Text, Line } from "react-konva";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { Scan } from "lucide-react";
import { CanvasRuler, RULER_SIZE } from "@/components/canvas/CanvasRuler";
import { StableFieldContent } from "@/components/canvas/renderers/field-layer";
import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import { useTrackCanvasViewport } from "@/components/canvas/useTrackCanvasViewport";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import { getObstacleNumberMap } from "@/lib/track/obstacleNumbering";
import { m2px } from "@/lib/track/units";
import { useEditor } from "@/store/editor";
import {
  selectDesignPolylineZRange,
  selectDesignShapes,
  selectPrimaryPolyline,
} from "@/store/selectors";
import type {
  TrackCanvasHandle,
  TrackCanvasProps,
} from "@/components/canvas/editor/TrackCanvas";
import { ShapeNode } from "./ShapeNode";

const TrackCanvas = memo(
  forwardRef<TrackCanvasHandle, TrackCanvasProps>(function TrackCanvas(
    { mobileRulersEnabled = false, showObstacleNumbers = false },
    ref
  ) {
    usePerfMetric("render:share/TrackCanvas");

    const design = useEditor((state) => state.track.design);
    const designShapes = useEditor(selectDesignShapes);
    const [zmin, zmax] = useEditor(selectDesignPolylineZRange);
    const primaryPolylineId = useEditor(
      (state) => selectPrimaryPolyline(state)?.id ?? null
    );
    const stageRef = useRef<KonvaStage | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const contentDragActiveRef = useRef(false);
    const hasManualViewRef = useRef(false);
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
    const lastPinchDistRef = useRef<number | null>(null);
    const [viewportSize, setViewportSize] = useState({
      width: 1000,
      height: 700,
    });
    const [stageTransform, setStageTransform] = useState({
      x: 0,
      y: 0,
      scale: 1,
    });
    const [isStageDragging, setIsStageDragging] = useState(false);
    const syncFrameRef = useRef<number | null>(null);
    const isMobile = useIsMobile();
    const isDark = useTheme() === "dark";
    const showRulers = !isMobile || mobileRulersEnabled;
    const showDesktopCanvasChrome = viewportSize.width >= 1024;
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
    const obstacleNumberMap = useMemo(
      () => (showObstacleNumbers ? getObstacleNumberMap(design) : null),
      [design, showObstacleNumbers]
    );

    const syncTransform = useCallback(() => {
      if (syncFrameRef.current !== null) return;
      syncFrameRef.current = window.requestAnimationFrame(() => {
        syncFrameRef.current = null;
        const stage = stageRef.current;
        if (!stage) return;
        const nextTransform = {
          x: stage.x(),
          y: stage.y(),
          scale: stage.scaleX(),
        };
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
      },
      []
    );

    const fitFieldToViewport = useCallback(() => {
      const stage = stageRef.current;
      if (!stage || viewportSize.width <= 0 || viewportSize.height <= 0) return;
      const scaleX = viewportSize.width / widthPx;
      const scaleY = viewportSize.height / heightPx;
      const scale = Math.min(scaleX, scaleY) * 0.8;
      const newX = (viewportSize.width - widthPx * scale) / 2;
      const newY = (viewportSize.height - heightPx * scale) / 2;
      stage.scale({ x: scale, y: scale });
      stage.position({ x: newX, y: newY });
      syncTransform();
    }, [
      heightPx,
      syncTransform,
      viewportSize.height,
      viewportSize.width,
      widthPx,
    ]);

    const setManualView = useCallback((value: boolean) => {
      hasManualViewRef.current = value;
    }, []);

    useTrackCanvasViewport({
      containerRef,
      contentDragActiveRef,
      fitFieldToViewport,
      hasManualViewRef,
      setManualView,
      setViewportSize,
      stageRef,
      syncTransform,
    });

    useImperativeHandle(ref, () => ({
      getStage: () => stageRef.current,
      fitToWindow: () => {
        setManualView(false);
        fitFieldToViewport();
      },
      closeDraftLoop: () => {},
      finishDraftPath: () => {},
      cancelDraftPath: () => {},
      undoDraftPoint: () => {},
      resumePolylineEditing: () => {},
    }));

    const handleWheel = useCallback(
      (event: { evt: WheelEvent }) => {
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        setManualView(true);
        const oldScale = stage.scaleX();
        const scaleBy = 1.06;
        const nextScale =
          event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clampedScale = Math.min(6, Math.max(0.15, nextScale));
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        stage.scale({ x: clampedScale, y: clampedScale });
        stage.position({
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        });
        stage.batchDraw();
        syncTransform();
      },
      [setManualView, syncTransform]
    );

    const handleTouchMove = useCallback(
      (event: { evt: TouchEvent }) => {
        const stage = stageRef.current;
        if (!stage) return;

        const touches = event.evt.touches;
        if (touches.length !== 2) {
          lastPinchCenterRef.current = null;
          lastPinchDistRef.current = null;
          return;
        }

        event.evt.preventDefault();
        setManualView(true);

        const rect = stage.container().getBoundingClientRect();
        const p1 = {
          x: touches[0].clientX - rect.left,
          y: touches[0].clientY - rect.top,
        };
        const p2 = {
          x: touches[1].clientX - rect.left,
          y: touches[1].clientY - rect.top,
        };
        const center = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
        };
        const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);

        if (
          !lastPinchCenterRef.current ||
          lastPinchDistRef.current === null ||
          lastPinchDistRef.current <= 0
        ) {
          lastPinchCenterRef.current = center;
          lastPinchDistRef.current = distance;
          return;
        }

        const stageScale = stage.scaleX();
        const scaleRatio = distance / lastPinchDistRef.current;
        const nextScale = Math.min(6, Math.max(0.15, stageScale * scaleRatio));
        const worldPoint = {
          x: (center.x - stage.x()) / stageScale,
          y: (center.y - stage.y()) / stageScale,
        };
        const deltaCenter = {
          x: center.x - lastPinchCenterRef.current.x,
          y: center.y - lastPinchCenterRef.current.y,
        };

        stage.scale({ x: nextScale, y: nextScale });
        stage.position({
          x: center.x - worldPoint.x * nextScale + deltaCenter.x,
          y: center.y - worldPoint.y * nextScale + deltaCenter.y,
        });
        stage.batchDraw();
        lastPinchCenterRef.current = center;
        lastPinchDistRef.current = distance;
        syncTransform();
      },
      [setManualView, syncTransform]
    );

    const handleTouchEnd = useCallback(() => {
      lastPinchCenterRef.current = null;
      lastPinchDistRef.current = null;
    }, []);

    const grid = useMemo(() => {
      const elements: React.JSX.Element[] = [];

      const padX = Math.max(widthPx * 2, 1400);
      const padY = Math.max(heightPx * 2, 1400);
      const gx0 = -padX;
      const gy0 = -padY;
      const gx1 = widthPx + padX;
      const gy1 = heightPx + padY;

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
        elements.push(
          <Line
            key={`vx-${x.toFixed(1)}`}
            points={[x, gy0, x, gy1]}
            {...lineStyle(isMajor, isCoarse, inside)}
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
        elements.push(
          <Line
            key={`hz-${y.toFixed(1)}`}
            points={[gx0, y, gx1, y]}
            {...lineStyle(isMajor, isCoarse, inside)}
            listening={false}
          />
        );
      }

      return elements;
    }, [design.field.ppm, heightPx, isDark, stepPx, widthPx]);

    const shapeNodes = useMemo(
      () =>
        designShapes.map((shape) => (
          <ShapeNode
            key={shape.id}
            designPpm={design.field.ppm}
            isPrimaryPolyline={primaryPolylineId === shape.id}
            shape={shape}
            zmax={zmax}
            zmin={zmin}
          />
        )),
      [design.field.ppm, designShapes, primaryPolylineId, zmax, zmin]
    );

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        style={{
          cursor: isStageDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        <div
          className="border-border/60 bg-card/80 text-muted-foreground pointer-events-none absolute z-20 flex max-w-[min(32rem,calc(100vw-7rem))] flex-col gap-1 rounded-md border px-2 py-1 text-[11px] backdrop-blur"
          style={{
            top: RULER_SIZE + 6,
            left: RULER_SIZE + 6,
            display: showDesktopCanvasChrome ? "flex" : "none",
          }}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {design.field.width}m × {design.field.height}m
            </span>
            <span className="text-border">·</span>
            <span>Grid {design.field.gridStep}m</span>
            <span className="text-border">·</span>
            <span>Drag to pan, wheel to zoom</span>
          </div>
        </div>
        <div
          className="absolute right-2 z-20"
          style={{
            top: RULER_SIZE + 34,
            display: showDesktopCanvasChrome ? "block" : "none",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setManualView(false);
              fitFieldToViewport();
            }}
            className="border-border/60 bg-card/85 text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-md border shadow-xs backdrop-blur transition-colors"
            aria-label="Fit to window"
          >
            <Scan className="size-3.5" />
          </button>
        </div>
        <Stage
          width={viewportSize.width}
          height={viewportSize.height}
          ref={stageRef}
          draggable
          onDragStart={() => {
            setManualView(true);
            setIsStageDragging(true);
          }}
          onDragMove={syncTransform}
          onDragEnd={() => {
            setIsStageDragging(false);
            syncTransform();
          }}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer listening={false}>
            <StableFieldContent
              designField={design.field}
              grid={grid}
              heightPx={heightPx}
              isDark={isDark}
              stepPx={stepPx}
              widthPx={widthPx}
            />
          </Layer>

          <Layer>{shapeNodes}</Layer>

          <Layer>
            {showObstacleNumbers &&
              obstacleNumberMap &&
              designShapes.map((shape) => {
                const obstacleNumber = obstacleNumberMap.get(shape.id);
                if (typeof obstacleNumber !== "number") return null;

                const bounds = getShapeLocalBounds(shape, design.field.ppm);
                if (!bounds) return null;

                const localX = bounds.x + bounds.width / 2;
                const localY = bounds.y - 16;
                const radians = (shape.rotation * Math.PI) / 180;
                const rotatedX =
                  localX * Math.cos(radians) - localY * Math.sin(radians);
                const rotatedY =
                  localX * Math.sin(radians) + localY * Math.cos(radians);
                const x =
                  m2px(
                    shape.kind === "polyline" ? 0 : shape.x,
                    design.field.ppm
                  ) + rotatedX;
                const y =
                  m2px(
                    shape.kind === "polyline" ? 0 : shape.y,
                    design.field.ppm
                  ) + rotatedY;

                return (
                  <Group key={`obstacle-number-${shape.id}`} listening={false}>
                    <Circle
                      x={x}
                      y={y}
                      radius={10}
                      fill="#111827"
                      stroke="#94a3b8"
                      strokeWidth={1}
                      opacity={0.96}
                    />
                    <Text
                      x={x - 10}
                      y={y - 9}
                      width={20}
                      height={20}
                      align="center"
                      verticalAlign="middle"
                      text={String(obstacleNumber)}
                      fontSize={11}
                      fontStyle="700"
                      fill="#f8fafc"
                    />
                  </Group>
                );
              })}
          </Layer>
        </Stage>

        {showRulers ? (
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
                borderRight: isDark ? "1px solid #1a2636" : "1px solid #c8d2db",
                borderBottom: isDark
                  ? "1px solid #1a2636"
                  : "1px solid #c8d2db",
              }}
            />
          </>
        ) : null}
      </div>
    );
  })
);

export default TrackCanvas;
