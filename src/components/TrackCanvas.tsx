"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line,
  Text,
  Group,
  Arrow,
  Shape as KonvaShape,
} from "react-konva";
import type { Vector2d } from "konva/lib/types";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { useEditor } from "@/store/editor";
import { m2px, px2m } from "@/lib/units";
import { zToColor, zRangeForDesign } from "@/lib/alt";
import type { EditorTool } from "@/store/editor";
import type {
  PolylinePoint,
  PolylineShape,
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  StartFinishShape,
  CheckpointShape,
  LadderShape,
  DiveGateShape,
  Shape,
} from "@/lib/types";
import { distance2D, smoothPolyline } from "@/lib/geometry";
import { CanvasRuler, RULER_SIZE } from "@/components/CanvasRuler";
import { useTheme } from "@/hooks/useTheme";

export interface TrackCanvasHandle {
  getStage: () => KonvaStage | null;
}

interface TrackCanvasProps {
  onCursorChange?: (pos: { x: number; y: number } | null) => void;
  onSnapChange?: (active: boolean) => void;
  readOnly?: boolean;
}

interface DraftPoint {
  x: number;
  y: number;
  z?: number;
}

interface CursorState {
  rawMeters: { x: number; y: number };
  snappedMeters: { x: number; y: number };
  rawPx: { x: number; y: number };
  snappedPx: { x: number; y: number };
}

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ToolDefaults = {
  gate: Pick<GateShape, "width" | "height" | "thick" | "color">;
  flag: Pick<FlagShape, "radius" | "poleHeight" | "color">;
  cone: Pick<ConeShape, "radius" | "color">;
  label: Pick<LabelShape, "text" | "fontSize" | "color">;
  startfinish: Pick<StartFinishShape, "width" | "color">;
  checkpoint: Pick<CheckpointShape, "width" | "color">;
  ladder: Pick<LadderShape, "width" | "height" | "rungs" | "color">;
  divegate: Pick<DiveGateShape, "size" | "thick" | "tilt" | "elevation" | "color">;
};

const toolDefaults: ToolDefaults = {
  gate: { width: 1.5, height: 1.5, thick: 0.20, color: "#3b82f6" },
  flag: { radius: 0.25, poleHeight: 3.5, color: "#a855f7" },
  cone: { radius: 0.2, color: "#f97316" },
  label: { text: "Gate A", fontSize: 18, color: "#e2e8f0" },
  startfinish: { width: 3.0, color: "#f59e0b" },
  checkpoint: { width: 2.5, color: "#22c55e" },
  ladder: { width: 1.5, height: 4.5, rungs: 3, color: "#f97316" },
  divegate: { size: 2.8, thick: 0.20, tilt: 0, elevation: 3.0, color: "#f97316" },
};

const isTypingInInput = (target: HTMLElement | null) => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest("[contenteditable=true]") !== null
  );
};

// Module-level clipboard — no re-render needed on copy
const clipboard: Shape[] = [];

const MIN_MARQUEE_SIZE = 8;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalizeRect = (origin: Vector2d, next: Vector2d): RectLike => {
  const w = next.x - origin.x;
  const h = next.y - origin.y;
  return {
    x: w < 0 ? next.x : origin.x,
    y: h < 0 ? next.y : origin.y,
    width: Math.abs(w),
    height: Math.abs(h),
  };
};

const rectsIntersect = (a: RectLike, b: RectLike) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const mergeClientRects = (rects: RectLike[]): RectLike | null => {
  if (!rects.length) return null;
  let minX = rects[0].x, minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width, maxY = rects[0].y + rects[0].height;
  for (let i = 1; i < rects.length; i++) {
    minX = Math.min(minX, rects[i].x);
    minY = Math.min(minY, rects[i].y);
    maxX = Math.max(maxX, rects[i].x + rects[i].width);
    maxY = Math.max(maxY, rects[i].y + rects[i].height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const TrackCanvas = forwardRef<TrackCanvasHandle, TrackCanvasProps>(function TrackCanvas({ onCursorChange, onSnapChange, readOnly = false }, ref) {
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
  } = useEditor();

  const stageRef = useRef<KonvaStage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shapeRefs = useRef<Record<string, KonvaGroup | null>>({});
  const dragSnapRef = useRef<boolean>(true);
  const lastPinchDistRef = useRef<number | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
  }));

  const [vertexSel, setVertexSel] = useState<{ shapeId: string; idx: number } | null>(null);
  const [draftPath, setDraftPath] = useState<DraftPoint[]>([]);
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [snapTarget, setSnapTarget] = useState<{ x: number; y: number; id: string } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<RectLike | null>(null);
  const marqueeOrigin = useRef<Vector2d | null>(null);
  const marqueeAdditive = useRef(false);
  const [selectionFrame, setSelectionFrame] = useState<RectLike | null>(null);
  const [isStageDragging, setIsStageDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 });
  const [stageTransform, setStageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const hasManualViewRef = useRef(false);
  const isDark = useTheme() === "dark";
  const middlePanRef = useRef(false);
  const middlePanLastRef = useRef({ x: 0, y: 0 });

  const syncTransform = useCallback(() => {
    const s = stageRef.current;
    if (!s) return;
    setStageTransform({ x: s.x(), y: s.y(), scale: s.scaleX() });
  }, []);

  const widthPx = useMemo(() => m2px(design.field.width, design.field.ppm), [design.field.width, design.field.ppm]);
  const heightPx = useMemo(() => m2px(design.field.height, design.field.ppm), [design.field.height, design.field.ppm]);
  const stepPx = useMemo(() => Math.max(1, m2px(design.field.gridStep, design.field.ppm)), [design.field.gridStep, design.field.ppm]);

  // Generous bounds — shapes can be placed well outside the field on the infinite canvas
  const dragBound = useCallback((pos: Vector2d): Vector2d => {
    const bound = { x: clamp(pos.x, -widthPx * 2, widthPx * 3), y: clamp(pos.y, -heightPx * 2, heightPx * 3) };
    if (!dragSnapRef.current) return bound;
    return { x: Math.round(bound.x / stepPx) * stepPx, y: Math.round(bound.y / stepPx) * stepPx };
  }, [heightPx, stepPx, widthPx]);

  const SNAP_RADIUS_M = Math.max(1.0, design.field.gridStep * 1.5);

  const pointerToMeters = useCallback((pointer: { x: number; y: number } | null, snap = true) => {
    if (!pointer) return null;
    const px = snap ? Math.round(pointer.x / stepPx) * stepPx : pointer.x;
    const py = snap ? Math.round(pointer.y / stepPx) * stepPx : pointer.y;
    const gridM = { x: px2m(px, design.field.ppm), y: px2m(py, design.field.ppm) };
    if (!snap) return gridM;
    // Prefer snapping to a nearby shape center over grid
    let nearest: { x: number; y: number } | null = null;
    let minDist = SNAP_RADIUS_M;
    for (const sh of design.shapes) {
      if (sh.kind === "polyline") continue;
      const dist = Math.sqrt((sh.x - gridM.x) ** 2 + (sh.y - gridM.y) ** 2);
      if (dist < minDist) { minDist = dist; nearest = { x: sh.x, y: sh.y }; }
    }
    return nearest ?? gridM;
  }, [design.field.ppm, stepPx, SNAP_RADIUS_M, design.shapes]);

  const fitFieldToViewport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const scaleX = viewportSize.width / widthPx;
    const scaleY = viewportSize.height / heightPx;
    const scale = Math.min(scaleX, scaleY) * 0.80; // leave room around field on infinite canvas
    const newX = (viewportSize.width - widthPx * scale) / 2;
    const newY = (viewportSize.height - heightPx * scale) / 2;
    stage.scale({ x: scale, y: scale });
    stage.position({ x: newX, y: newY });
    setZoom(scale);
    syncTransform();
  }, [heightPx, setZoom, syncTransform, viewportSize.height, viewportSize.width, widthPx]);

  const findSnapTarget = useCallback((meters: { x: number; y: number }) => {
    let nearest: { x: number; y: number; id: string } | null = null;
    let minDist = SNAP_RADIUS_M;
    for (const s of design.shapes) {
      if (s.kind === "polyline") continue;
      const dist = Math.sqrt((s.x - meters.x) ** 2 + (s.y - meters.y) ** 2);
      if (dist < minDist) { minDist = dist; nearest = { x: s.x, y: s.y, id: s.id }; }
    }
    return nearest;
  }, [design.shapes, SNAP_RADIUS_M]);

  const createShapeForTool = useCallback((tool: EditorTool, point: { x: number; y: number }): Omit<Shape, "id"> | null => {
    if (tool === "select" || tool === "polyline") return null;
    switch (tool) {
      case "gate":        return { kind: "gate",        x: point.x, y: point.y, rotation: 0, ...toolDefaults.gate };
      case "flag":        return { kind: "flag",        x: point.x, y: point.y, rotation: 0, ...toolDefaults.flag };
      case "cone":        return { kind: "cone",        x: point.x, y: point.y, rotation: 0, ...toolDefaults.cone };
      case "label":       return { kind: "label",       x: point.x, y: point.y, rotation: 0, ...toolDefaults.label };
      case "startfinish": return { kind: "startfinish", x: point.x, y: point.y, rotation: 0, ...toolDefaults.startfinish };
      case "checkpoint":  return { kind: "checkpoint",  x: point.x, y: point.y, rotation: 0, ...toolDefaults.checkpoint };
      case "ladder":      return { kind: "ladder",      x: point.x, y: point.y, rotation: 0, ...toolDefaults.ladder };
      case "divegate":    return { kind: "divegate",    x: point.x, y: point.y, rotation: 0, ...toolDefaults.divegate };
      default: return null;
    }
  }, []);

  const finalizePath = useCallback(() => {
    if (draftPath.length < 2) { setDraftPath([]); return; }
    const points: PolylinePoint[] = draftPath.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
    const id = addShape({ kind: "polyline", x: 0, y: 0, rotation: 0, points, strokeWidth: 0.18, showArrows: true, smooth: true, color: "#3b82f6" } as Omit<Shape, "id">);
    setSelection([id]);
    setVertexSel(null);
    setDraftPath([]);
    setActiveTool("select");
  }, [addShape, draftPath, setActiveTool, setSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isTypingInInput(target)) return;

      const meta = e.ctrlKey || e.metaKey;

      // Cmd+D — duplicate
      if (meta && e.key === "d") {
        e.preventDefault();
        if (selection.length) duplicateShapes(selection);
        return;
      }

      // Cmd+C — copy
      if (meta && e.key === "c") {
        e.preventDefault();
        clipboard.splice(0, clipboard.length, ...design.shapes.filter((s) => selection.includes(s.id)));
        return;
      }

      // Cmd+V — paste
      if (meta && e.key === "v") {
        e.preventDefault();
        if (!clipboard.length) return;
        const newIds: string[] = [];
        clipboard.forEach((s) => {
          const { id: _id, ...rest } = s;
          const newId = addShape({ ...rest, x: s.x + 1, y: s.y + 1 } as Omit<Shape, "id">);
          newIds.push(newId);
        });
        setSelection(newIds);
        return;
      }

      // Arrow key nudge
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selection.length > 0 && activeTool === "select") {
        e.preventDefault();
        const step = e.altKey ? 0.1 : design.field.gridStep;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeShapes(selection, dx, dy);
        return;
      }

      // 0 — fit field to viewport
      if (e.key === "0" && !meta) {
        e.preventDefault();
        hasManualViewRef.current = false;
        fitFieldToViewport();
        return;
      }

      const key = e.key;
      if (key === "Escape") {
        if (draftPath.length) setDraftPath([]);
        else { setSelection([]); setVertexSel(null); setActiveTool("select"); }
      }
      if (key === "Enter" && draftPath.length >= 2) finalizePath();
      if (key === "Backspace" || key === "Delete") {
        if (draftPath.length && activeTool === "polyline") {
          setDraftPath((prev) => prev.slice(0, Math.max(0, prev.length - 1)));
          return;
        }
        if (vertexSel) {
          const s = design.shapes.find((sh) => sh.id === vertexSel.shapeId);
          if (s?.kind === "polyline") {
            const polyline = s as PolylineShape;
            const pts = [...polyline.points];
            if (pts.length > 2) { pts.splice(vertexSel.idx, 1); updateShape(s.id, { points: pts }); }
          }
          setVertexSel(null);
          return;
        }
        if (selection.length) removeShapes(selection);
      }

      const lower = key.toLowerCase();
      switch (lower) {
        case "v": setActiveTool("select"); break;
        case "g": setActiveTool("gate"); break;
        case "f": setActiveTool("flag"); break;
        case "c": if (!meta) setActiveTool("cone"); break;
        case "l": setActiveTool("label"); break;
        case "p": setActiveTool("polyline"); break;
        case "s": if (!meta) setActiveTool("startfinish"); break;
        case "k": setActiveTool("checkpoint"); break;
        case "r": setActiveTool("ladder"); break;
        case "d": if (!meta) setActiveTool("divegate"); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, [activeTool, addShape, design.field.gridStep, design.shapes, draftPath.length, duplicateShapes, finalizePath, fitFieldToViewport, nudgeShapes, removeShapes, selection, setActiveTool, setSelection, updateShape, vertexSel]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.max(1, Math.floor(entry.contentRect.width));
      const nextHeight = Math.max(1, Math.floor(entry.contentRect.height));
      setViewportSize({ width: nextWidth, height: nextHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hasManualViewRef.current) return;
    fitFieldToViewport();
  }, [fitFieldToViewport, viewportSize.width, viewportSize.height, widthPx, heightPx]);

  // Middle-mouse-button pan — bypasses React state for zero-lag dragging
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      middlePanRef.current = true;
      middlePanLastRef.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!middlePanRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      hasManualViewRef.current = true;
      const dx = e.clientX - middlePanLastRef.current.x;
      const dy = e.clientY - middlePanLastRef.current.y;
      stage.position({ x: stage.x() + dx, y: stage.y() + dy });
      stage.batchDraw();
      middlePanLastRef.current = { x: e.clientX, y: e.clientY };
      syncTransform();
    };
    const onUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      middlePanRef.current = false;
      el.style.cursor = "";
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [syncTransform]);

  useEffect(() => { if (!selection.length) setVertexSel(null); }, [selection.length]);
  useEffect(() => { if (activeTool !== "select") setVertexSel(null); }, [activeTool]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !selection.length) { setSelectionFrame(null); return; }
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
    const gx0 = -padX, gy0 = -padY;
    const gx1 = widthPx + padX, gy1 = heightPx + padY;

    const coarseStepPx = m2px(5, design.field.ppm);
    const coarseEvery = Math.max(1, Math.round(coarseStepPx / stepPx));
    const majorEvery = coarseEvery * 2;

    const pmod = (n: number, m: number) => ((Math.round(n) % m) + m) % m;

    const maxLines = 320;
    const skipX = Math.max(1, Math.ceil(Math.ceil((gx1 - gx0) / stepPx) / maxLines));
    const skipY = Math.max(1, Math.ceil(Math.ceil((gy1 - gy0) / stepPx) / maxLines));
    const effStepX = stepPx * skipX;
    const effStepY = stepPx * skipY;

    // Theme-aware line styles — rulers handle labels so no text needed here
    const stroke = isDark
      ? { major: "#365a80", coarse: "#2a4060", minor: "#1e2f42" }
      : { major: "#6890b0", coarse: "#98b4cc", minor: "#bdd0e0" };
    const width  = { major: 1.4, coarse: 1, minor: 0.6 };
    const outOp  = isDark ? 0.20 : 0.28;

    const lineStyle = (isMajor: boolean, isCoarse: boolean, inside: boolean) => ({
      stroke: isMajor ? stroke.major : isCoarse ? stroke.coarse : stroke.minor,
      strokeWidth: isMajor ? width.major : isCoarse ? width.coarse : width.minor,
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
        <Line key={`vx-${x.toFixed(1)}`} points={[x, gy0, x, gy1]} {...s} listening={false} />
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
        <Line key={`hz-${y.toFixed(1)}`} points={[gx0, y, gx1, y]} {...s} listening={false} />
      );
    }

    return elements;
  }, [design.field.ppm, heightPx, isDark, stepPx, widthPx]);

  const draftPointsPx = useMemo(() => {
    if (!draftPath.length) return [];
    return draftPath.flatMap((p) => [m2px(p.x, design.field.ppm), m2px(p.y, design.field.ppm)]);
  }, [design.field.ppm, draftPath]);

  const draftLength = useMemo(() => {
    if (draftPath.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < draftPath.length; i++) total += distance2D(draftPath[i - 1], draftPath[i]);
    return total;
  }, [draftPath]);

  const draftLengthWithCursor = useMemo(() => {
    if (activeTool !== "polyline" || !draftPath.length || !cursor) return draftLength;
    return draftLength + distance2D(draftPath[draftPath.length - 1], { x: cursor.snappedMeters.x, y: cursor.snappedMeters.y });
  }, [activeTool, cursor, draftLength, draftPath]);

  const cursorStyle = useMemo(() => {
    if (isStageDragging) return "grabbing";
    if (activeTool !== "select") return "crosshair";
    if (marqueeRect) return "crosshair";
    return "default";
  }, [activeTool, isStageDragging, marqueeRect]);

  const hoverCell = useMemo(() => {
    if (!cursor || activeTool !== "select") return null;
    return { x: Math.floor(cursor.rawPx.x / stepPx) * stepPx, y: Math.floor(cursor.rawPx.y / stepPx) * stepPx };
  }, [cursor, stepPx, activeTool]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ cursor: cursorStyle, touchAction: "none" }}>
      <div className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur"
        style={{ top: RULER_SIZE + 6, left: RULER_SIZE + 6 }}>
        <span>{design.field.width}m × {design.field.height}m</span>
        <span className="text-border">·</span>
        <span>Grid {design.field.gridStep}m</span>
        <span className="text-border">·</span>
        <span>{activeTool === "polyline" ? "Smart snap" : "Grid snap"}</span>
      </div>
      <div className="pointer-events-none absolute right-2 z-20 rounded-md border border-border/60 bg-card/80 px-2 py-1 text-[10px] text-muted-foreground/70 backdrop-blur"
        style={{ top: RULER_SIZE + 6 }}>
        <span className="font-medium text-foreground/60">Mid-click</span> pan · <span className="font-medium text-foreground/60">Alt</span> free
      </div>
      <Stage
        width={viewportSize.width}
        height={viewportSize.height}
        ref={stageRef}
        draggable={false}
        onDragStart={() => { setIsStageDragging(true); hasManualViewRef.current = true; }}
        onDragMove={() => syncTransform()}
        onDragEnd={() => { setIsStageDragging(false); syncTransform(); }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const stage = stageRef.current;
          if (!stage) return;
          hasManualViewRef.current = true;
          const scaleBy = 1.08;
          const oldScale = stage.scaleX();
          const pointer = stage.getPointerPosition();
          if (!pointer) return;
          const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
          const clamped = Math.max(0.2, Math.min(5, newScale));
          const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
          stage.scale({ x: clamped, y: clamped });
          stage.position({ x: pointer.x - mousePointTo.x * clamped, y: pointer.y - mousePointTo.y * clamped });
          setZoom(clamped);
          syncTransform();
        }}
        onTouchStart={(e) => {
          if (e.evt.touches.length === 2) {
            e.evt.preventDefault();
            lastTouchPosRef.current = null;
            const t1 = e.evt.touches[0];
            const t2 = e.evt.touches[1];
            lastPinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          } else if (e.evt.touches.length === 1) {
            const t = e.evt.touches[0];
            lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
            lastPinchDistRef.current = null;
          }
        }}
        onTouchMove={(e) => {
          if (e.evt.touches.length === 1) {
            e.evt.preventDefault();
            const stage = stageRef.current;
            if (!stage) return;
            const t = e.evt.touches[0];
            const last = lastTouchPosRef.current;
            if (last) {
              hasManualViewRef.current = true;
              stage.position({ x: stage.x() + (t.clientX - last.x), y: stage.y() + (t.clientY - last.y) });
              stage.batchDraw();
              syncTransform();
            }
            lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
            return;
          }
          if (e.evt.touches.length !== 2) return;
          e.evt.preventDefault();
          const stage = stageRef.current;
          if (!stage) return;
          const t1 = e.evt.touches[0];
          const t2 = e.evt.touches[1];
          const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          const lastDist = lastPinchDistRef.current;
          if (lastDist === null) { lastPinchDistRef.current = dist; return; }
          const scaleBy = dist / lastDist;
          lastPinchDistRef.current = dist;
          hasManualViewRef.current = true;
          const oldScale = stage.scaleX();
          const newScale = Math.max(0.2, Math.min(5, oldScale * scaleBy));
          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;
          const stageBox = stage.container().getBoundingClientRect();
          const pointer = { x: midX - stageBox.left, y: midY - stageBox.top };
          const pointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
          stage.scale({ x: newScale, y: newScale });
          stage.position({ x: pointer.x - pointTo.x * newScale, y: pointer.y - pointTo.y * newScale });
          setZoom(newScale);
          syncTransform();
        }}
        onMouseDown={(e) => {
          const stage = stageRef.current;
          if (!stage || e.evt.button !== 0) return;
          const pointer = stage.getRelativePointerPosition();
          if (!pointer) return;
          const snap = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);

          if (activeTool === "polyline" && !readOnly) {
            if (e.evt.detail >= 2) { finalizePath(); return; }
            const meters = pointerToMeters(pointer, snap);
            if (!meters) return;
            // Prefer snapping to gate/flag/cone center over grid snap
            const pos = snapTarget ?? meters;
            setDraftPath((prev) => {
              const last = prev.at(-1);
              if (last && distance2D(last, pos) < 0.05) return prev;
              return [...prev, { ...pos, z: 0 }];
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
          if (e.target === stage) {
            if (!(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)) setSelection([]);
            marqueeOrigin.current = pointer;
            marqueeAdditive.current = Boolean(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);
            setMarqueeRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
          }
        }}
        onMouseMove={() => {
          const stage = stageRef.current;
          if (!stage) return;
          const pointer = stage.getRelativePointerPosition();
          if (!pointer) return;
          const rawMeters = pointerToMeters(pointer, false);
          const snappedMeters = pointerToMeters(pointer, true);
          if (rawMeters && snappedMeters) {
            setCursor({ rawMeters, snappedMeters, rawPx: { x: pointer.x, y: pointer.y }, snappedPx: { x: Math.round(pointer.x / stepPx) * stepPx, y: Math.round(pointer.y / stepPx) * stepPx } });
            onCursorChange?.(rawMeters);
            if (activeTool === "polyline") {
              const t = findSnapTarget(rawMeters);
              setSnapTarget(t);
              onSnapChange?.(t !== null);
            } else if (snapTarget) {
              setSnapTarget(null);
              onSnapChange?.(false);
            }
          }
          if (marqueeOrigin.current) setMarqueeRect(normalizeRect(marqueeOrigin.current, pointer));
        }}
        onMouseLeave={() => { setCursor(null); setSnapTarget(null); onCursorChange?.(null); onSnapChange?.(false); setMarqueeRect(null); marqueeOrigin.current = null; }}
        onMouseUp={() => {
          const stage = stageRef.current;
          if (!stage || !marqueeOrigin.current || !marqueeRect) { marqueeOrigin.current = null; setMarqueeRect(null); return; }
          const rect = marqueeRect;
          marqueeOrigin.current = null;
          setMarqueeRect(null);
          if (rect.width < MIN_MARQUEE_SIZE && rect.height < MIN_MARQUEE_SIZE) return;
          const selectedIds = Object.entries(shapeRefs.current)
            .filter((entry): entry is [string, KonvaGroup] => Boolean(entry[1]))
            .filter(([, node]) => rectsIntersect(rect, node.getClientRect({ relativeTo: stage })))
            .map(([id]) => id);
          if (marqueeAdditive.current) {
            setSelection(Array.from(new Set([...selection, ...selectedIds])));
          } else {
            setSelection(selectedIds);
          }
        }}
      >
        {/* Infinite grid + field boundary layer */}
        <Layer listening={false}>
          {grid}
          {/* Field fill — subtle lift over the surrounding infinite area */}
          <Rect
            x={0} y={0} width={widthPx} height={heightPx}
            fill={isDark ? "#0c1520" : "#ffffff"}
            opacity={isDark ? 0.40 : 0.28}
          />
          {/* Center axis lines — dashed, very subtle */}
          <Line
            points={[widthPx / 2, 0, widthPx / 2, heightPx]}
            stroke={isDark ? "#1c3048" : "#b8cce0"} strokeWidth={0.75}
            dash={[6, 8]} opacity={0.7} listening={false}
          />
          <Line
            points={[0, heightPx / 2, widthPx, heightPx / 2]}
            stroke={isDark ? "#1c3048" : "#b8cce0"} strokeWidth={0.75}
            dash={[6, 8]} opacity={0.7} listening={false}
          />
          {/* Field boundary — soft outer glow */}
          <Rect
            x={-1.5} y={-1.5} width={widthPx + 3} height={heightPx + 3}
            stroke={isDark ? "#1a2d44" : "#8fa8c0"}
            strokeWidth={4} opacity={0.35} listening={false}
          />
          {/* Field boundary — crisp inner edge */}
          <Rect
            x={0} y={0} width={widthPx} height={heightPx}
            stroke={isDark ? "#2a4060" : "#6888a8"}
            strokeWidth={1} listening={false}
          />
          {/* Corner L-brackets */}
          {([[0,0,1,1],[widthPx,0,-1,1],[0,heightPx,1,-1],[widthPx,heightPx,-1,-1]] as [number,number,number,number][]).map(([cx,cy,sx,sy]) => (
            <Group key={`bracket-${cx}-${cy}`} listening={false}>
              <Line points={[cx, cy, cx + sx * 14, cy]}
                stroke={isDark ? "#3a5878" : "#5878a0"} strokeWidth={2} lineCap="square" />
              <Line points={[cx, cy, cx, cy + sy * 14]}
                stroke={isDark ? "#3a5878" : "#5878a0"} strokeWidth={2} lineCap="square" />
            </Group>
          ))}
          {/* Origin cross */}
          <Line points={[-7, 0, 7, 0]} stroke={isDark ? "#3a5878" : "#5878a0"} strokeWidth={1.5} lineCap="round" listening={false} />
          <Line points={[0, -7, 0, 7]} stroke={isDark ? "#3a5878" : "#5878a0"} strokeWidth={1.5} lineCap="round" listening={false} />
          {/* Origin label */}
          <Text x={6} y={6} text="0,0" fontSize={9}
            fill={isDark ? "#3a5878" : "#6888a8"} listening={false} />
          {/* Field size — bottom-right */}
          <Text
            x={widthPx - 6} y={heightPx - 14}
            text={`${design.field.width}×${design.field.height}m`}
            fontSize={9} fill={isDark ? "#3a5878" : "#6888a8"} align="right" listening={false}
          />
          {/* Hover cell */}
          {hoverCell && (
            <Rect x={hoverCell.x} y={hoverCell.y} width={stepPx} height={stepPx}
              fill={isDark ? "#2563eb16" : "#2563eb0e"}
              stroke={isDark ? "#3b82f628" : "#2563eb22"} strokeWidth={1} />
          )}
          {/* Selection frame */}
          {selectionFrame && (
            <Rect
              x={selectionFrame.x} y={selectionFrame.y}
              width={selectionFrame.width} height={selectionFrame.height}
              stroke="#3b82f6" strokeWidth={1} dash={[5, 4]} listening={false} />
          )}
          {/* Marquee */}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x} y={marqueeRect.y}
              width={marqueeRect.width} height={marqueeRect.height}
              stroke="#3b82f6" strokeWidth={1} dash={[5, 4]}
              fill="#3b82f610" listening={false} />
          )}
        </Layer>

        {/* Shapes layer */}
        <Layer>
          {design.shapes.map((shape) => {
            const s = shape;
            const selected = selection.includes(s.id);
            const allowInteraction = activeTool === "select" && !readOnly;
            return (
              <Group
                key={s.id}
                ref={(node) => { shapeRefs.current[s.id] = node; }}
                x={m2px(s.x, design.field.ppm)}
                y={m2px(s.y, design.field.ppm)}
                rotation={s.rotation}
                draggable={allowInteraction && !s.locked}
                dragBoundFunc={dragBound}
                listening={allowInteraction}
                onDragStart={(e) => {
                  if (e.target !== e.currentTarget) return;
                  dragSnapRef.current = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                }}
                onDragEnd={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const { x, y } = e.target.position();
                  const ppm = design.field.ppm;
                  const pxX = dragSnapRef.current ? Math.round(x / stepPx) * stepPx : clamp(x, 0, widthPx);
                  const pxY = dragSnapRef.current ? Math.round(y / stepPx) * stepPx : clamp(y, 0, heightPx);
                  e.target.position({ x: pxX, y: pxY });
                  updateShape(s.id, { x: px2m(pxX, ppm), y: px2m(pxY, ppm) });
                }}
                onMouseDown={(e) => {
                  if (!allowInteraction) return;
                  e.cancelBubble = true;
                  if (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey) {
                    const current = new Set(selection);
                    if (current.has(s.id)) current.delete(s.id); else current.add(s.id);
                    setSelection(Array.from(current));
                  } else {
                    setSelection([s.id]);
                  }
                }}
                onTap={(e) => { if (!allowInteraction) return; e.cancelBubble = true; setSelection([s.id]); }}
              >
                {s.kind === "gate" && (() => {
                  const gate = s as GateShape;
                  const width = m2px(gate.width, design.field.ppm);
                  const depth = m2px(gate.thick ?? 0.20, design.field.ppm);
                  const color = gate.color ?? "#3b82f6";
                  return (
                    <>
                      {selected && <Rect width={width + m2px(0.3, design.field.ppm)} height={depth + m2px(0.3, design.field.ppm)} offsetX={(width + m2px(0.3, design.field.ppm)) / 2} offsetY={(depth + m2px(0.3, design.field.ppm)) / 2} stroke="#60a5fa" strokeWidth={1} opacity={0.85} cornerRadius={2} listening={false} />}
                      <Rect width={width} height={depth} offsetX={width / 2} offsetY={depth / 2} fill={color} opacity={0.15} strokeEnabled={false} />
                      <Rect width={width} height={depth} offsetX={width / 2} offsetY={depth / 2} stroke={color} strokeWidth={2} cornerRadius={Math.min(12, depth / 2)} />
                    </>
                  );
                })()}

                {s.kind === "flag" && (() => {
                  const flag = s as FlagShape;
                  const r = m2px(flag.radius, design.field.ppm);
                  const poleVis = Math.min(m2px(flag.poleHeight ?? 3.5, design.field.ppm), m2px(1.0, design.field.ppm));
                  const color = flag.color ?? "#a855f7";
                  const fw = poleVis * 0.42;
                  const fh = poleVis * 0.30;
                  return (
                    <>
                      {selected && <Circle radius={r + m2px(0.18, design.field.ppm)} stroke="#3b82f6" strokeWidth={1.4} dash={[6, 4]} listening={false} />}
                      {/* Pole */}
                      <Line points={[0, 0, 0, -poleVis]} stroke={color} strokeWidth={2} lineCap="round" />
                      {/* Teardrop flag fabric at top */}
                      <KonvaShape
                        sceneFunc={(ctx, shape) => {
                          ctx.beginPath();
                          ctx.moveTo(0, -poleVis);
                          ctx.bezierCurveTo(fw, -poleVis, fw * 1.1, -poleVis + fh * 0.5, fw * 0.8, -poleVis + fh);
                          ctx.bezierCurveTo(fw * 0.5, -poleVis + fh * 1.4, 0.06, -poleVis + fh * 1.5, 0, -poleVis + fh * 1.5);
                          ctx.closePath();
                          ctx.fillStrokeShape(shape);
                        }}
                        fill={color}
                        opacity={0.80}
                      />
                      {/* Small base dot */}
                      <Circle radius={Math.max(3, m2px(0.06, design.field.ppm))} fill={color} />
                    </>
                  );
                })()}

                {s.kind === "cone" && (() => {
                  const cone = s as ConeShape;
                  const r = m2px(cone.radius, design.field.ppm);
                  const color = cone.color ?? "#f97316";
                  return (
                    <>
                      {selected && <Circle radius={r + m2px(0.12, design.field.ppm)} stroke="#3b82f6" strokeWidth={1.3} dash={[5, 4]} listening={false} />}
                      <Circle radius={r} fill={color} opacity={0.2} stroke={color} strokeWidth={2} />
                    </>
                  );
                })()}

                {s.kind === "label" && (() => {
                  const label = s as LabelShape;
                  const fontSize = label.fontSize ?? 18;
                  const color = label.color ?? "#e2e8f0";
                  const labelWidth = Math.max(label.text.length * fontSize * 0.45, 48);
                  return (
                    <Group offsetY={-fontSize / 2}>
                      {selected && <Rect width={labelWidth + 12} height={fontSize + 12} y={-6} offsetX={(labelWidth + 12) / 2} stroke="#3b82f6" strokeWidth={1.2} dash={[6, 4]} listening={false} />}
                      <Text text={label.text} fontSize={fontSize} fill={color} align="center" width={labelWidth} offsetX={labelWidth / 2} />
                    </Group>
                  );
                })()}

                {s.kind === "startfinish" && (() => {
                  const sf = s as StartFinishShape;
                  const totalW = m2px(sf.width ?? 3, design.field.ppm);
                  const color = sf.color ?? "#f59e0b";
                  const spacing = totalW / 4;
                  const padW = spacing * 0.78;
                  const padD = padW * 1.2;
                  return (
                    <>
                      {selected && <Rect width={totalW + m2px(0.3, design.field.ppm)} height={padD + m2px(0.3, design.field.ppm)} offsetX={(totalW + m2px(0.3, design.field.ppm)) / 2} offsetY={(padD + m2px(0.3, design.field.ppm)) / 2} stroke="#60a5fa" strokeWidth={1} opacity={0.85} cornerRadius={2} listening={false} />}
                      {Array.from({ length: 4 }).map((_, i) => {
                        const px = -totalW / 2 + spacing * i + spacing / 2;
                        return (
                          <Group key={i} x={px}>
                            <Rect width={padW} height={padD} offsetX={padW / 2} offsetY={padD / 2} fill={color} opacity={0.25} cornerRadius={2} />
                            <Rect width={padW} height={padD} offsetX={padW / 2} offsetY={padD / 2} stroke={color} strokeWidth={1.5} cornerRadius={2} />
                            <Text text={String(i + 1)} fontSize={Math.max(7, padW * 0.45)} fill={color} align="center" width={padW} offsetX={padW / 2} offsetY={Math.max(7, padW * 0.45) / 2} opacity={0.7} listening={false} />
                          </Group>
                        );
                      })}
                    </>
                  );
                })()}

                {s.kind === "checkpoint" && (() => {
                  const cp = s as CheckpointShape;
                  const w = m2px(cp.width ?? 2.5, design.field.ppm);
                  const depth = m2px(0.15, design.field.ppm);
                  const color = cp.color ?? "#22c55e";
                  return (
                    <>
                      {selected && <Rect width={w + m2px(0.3, design.field.ppm)} height={depth + m2px(0.3, design.field.ppm)} offsetX={(w + m2px(0.3, design.field.ppm)) / 2} offsetY={(depth + m2px(0.3, design.field.ppm)) / 2} stroke="#60a5fa" strokeWidth={1} opacity={0.85} cornerRadius={2} listening={false} />}
                      <Rect width={w} height={depth} offsetX={w / 2} offsetY={depth / 2} fill={color} opacity={0.18} stroke={color} strokeWidth={1.8} dash={[8, 5]} cornerRadius={2} />
                      <Line points={[-(w / 2), 0, w / 2, 0]} stroke={color} strokeWidth={2} dash={[6, 4]} opacity={0.8} listening={false} />
                    </>
                  );
                })()}

                {s.kind === "ladder" && (() => {
                  const ld = s as LadderShape;
                  const w = m2px(ld.width ?? 1.5, design.field.ppm);
                  const depth = m2px(0.08, design.field.ppm);
                  const color = ld.color ?? "#f97316";
                  return (
                    <>
                      {selected && <Rect width={w + m2px(0.3, design.field.ppm)} height={depth + m2px(0.3, design.field.ppm)} offsetX={(w + m2px(0.3, design.field.ppm)) / 2} offsetY={(depth + m2px(0.3, design.field.ppm)) / 2} stroke="#60a5fa" strokeWidth={1} opacity={0.85} cornerRadius={2} listening={false} />}
                      <Rect width={w} height={depth} offsetX={w / 2} offsetY={depth / 2} fill={color} opacity={0.25} strokeEnabled={false} />
                      <Rect width={w} height={depth} offsetX={w / 2} offsetY={depth / 2} stroke={color} strokeWidth={2} cornerRadius={Math.min(12, depth / 2)} />
                    </>
                  );
                })()}

                {s.kind === "divegate" && (() => {
                  const dg = s as DiveGateShape;
                  const sz = m2px(dg.size ?? 2.8, design.field.ppm);
                  const thick = m2px(dg.thick ?? 0.20, design.field.ppm);
                  const tilt = dg.tilt ?? 0;
                  const visibleDepth = Math.max(thick * 2 + 4, sz * Math.cos((tilt * Math.PI) / 180));
                  const color = dg.color ?? "#f97316";
                  const postR = Math.max(3, thick * 0.5);
                  return (
                    <>
                      {selected && <Rect width={sz + m2px(0.3, design.field.ppm)} height={visibleDepth + m2px(0.3, design.field.ppm)} offsetX={(sz + m2px(0.3, design.field.ppm)) / 2} offsetY={(visibleDepth + m2px(0.3, design.field.ppm)) / 2} stroke="#60a5fa" strokeWidth={1} opacity={0.85} cornerRadius={2} listening={false} />}
                      <Rect width={sz} height={visibleDepth} offsetX={sz / 2} offsetY={visibleDepth / 2} stroke={color} strokeWidth={2.5} fill={color} opacity={0.10} cornerRadius={4} />
                      <Rect width={sz - thick * 2} height={Math.max(4, visibleDepth - thick * 2)} offsetX={(sz - thick * 2) / 2} offsetY={Math.max(4, visibleDepth - thick * 2) / 2} stroke={color} strokeWidth={1} opacity={0.5} cornerRadius={2} />
                      {/* Post footprints at all 4 frame corners */}
                      <Circle x={-sz / 2} y={-visibleDepth / 2} radius={postR} fill={color} />
                      <Circle x={ sz / 2} y={-visibleDepth / 2} radius={postR} fill={color} />
                      <Circle x={-sz / 2} y={ visibleDepth / 2} radius={postR} fill={color} />
                      <Circle x={ sz / 2} y={ visibleDepth / 2} radius={postR} fill={color} />
                    </>
                  );
                })()}

                {s.kind === "polyline" && (() => {
                  const path = s as PolylineShape;
                  const pointsPx = path.points.flatMap((pt) => [m2px(pt.x, design.field.ppm), m2px(pt.y, design.field.ppm)]);
                  const strokePx = m2px(path.strokeWidth ?? 0.18, design.field.ppm);
                  const smoothPoints = (path.smooth ?? true) ? smoothPolyline(path.points) : path.points;
                  const smoothPx = smoothPoints.flatMap((pt) => [m2px(pt.x, design.field.ppm), m2px(pt.y, design.field.ppm)]);
                  const color = path.color ?? "#3b82f6";
                  if (!pointsPx.length) return null;
                  return (
                    <>
                      {selected && <Line points={pointsPx} stroke="#3b82f6" strokeWidth={strokePx + 4} lineCap="round" opacity={0.3} listening={false} />}
                      <Group listening={false}>
                        {path.points.map((pt, idx) => {
                          const pct = path.points.length > 1 ? idx / (path.points.length - 1) : 0;
                          const zColor = zToColor(pt.z ?? 0, zmin, zmax);
                          const segment = smoothPx.slice(idx * 2, idx * 2 + 4);
                          if (segment.length < 4) return null;
                          const segmentColor = path.color ? color : zColor;
                          return <Line key={`${path.id}-seg-${idx}`} points={segment} stroke={segmentColor} strokeWidth={strokePx} lineCap="round" lineJoin="round" opacity={Math.max(0.4, 1 - pct * 0.15)} />;
                        })}
                        {path.showArrows && path.points.length >= 2 && (
                          <Arrow points={smoothPx} stroke={color} fill={color} strokeWidth={strokePx} pointerLength={Math.max(10, strokePx * 3)} pointerWidth={Math.max(8, strokePx * 2)} lineCap="round" lineJoin="round" pointerAtEnding pointerAtBeginning />
                        )}
                      </Group>
                      {allowInteraction && path.points.map((pt, idx) => {
                        const cx = m2px(pt.x, design.field.ppm);
                        const cy = m2px(pt.y, design.field.ppm);
                        const r = Math.max(4, m2px(0.08, design.field.ppm));
                        const active = vertexSel && vertexSel.shapeId === s.id && vertexSel.idx === idx;
                        const hovered = hoveredWaypoint?.shapeId === s.id && hoveredWaypoint?.idx === idx;
                        return (
                          <Circle key={`${s.id}-vh-${idx}`} x={cx} y={cy} radius={hovered ? r * 1.6 : r} fill={active ? "#3b82f6" : hovered ? "#f59e0b" : "#1e293b"} stroke={active ? "#ffffff" : hovered ? "#ffffff" : "#3b82f6"} strokeWidth={hovered ? 2.5 : 2} draggable dragBoundFunc={dragBound}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              dragSnapRef.current = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                              const ppm = design.field.ppm;
                              const pxX = dragSnapRef.current ? Math.round(e.target.x() / stepPx) * stepPx : clamp(e.target.x(), 0, widthPx);
                              const pxY = dragSnapRef.current ? Math.round(e.target.y() / stepPx) * stepPx : clamp(e.target.y(), 0, heightPx);
                              e.target.position({ x: pxX, y: pxY });
                              const pts: PolylinePoint[] = path.points.map((point, i) => i === idx ? { ...point, x: px2m(pxX, ppm), y: px2m(pxY, ppm) } : point);
                              updateShape(s.id, { points: pts });
                            }}
                            onMouseDown={(e) => { e.cancelBubble = true; setSelection([s.id]); setVertexSel({ shapeId: s.id, idx }); }}
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </Group>
            );
          })}

          {/* Snap-to-element indicator (polyline drawing mode) */}
          {snapTarget && activeTool === "polyline" && (() => {
            const sx = m2px(snapTarget.x, design.field.ppm);
            const sy = m2px(snapTarget.y, design.field.ppm);
            const r = Math.max(m2px(SNAP_RADIUS_M * 0.55, design.field.ppm), 14);
            return (
              <Group listening={false}>
                <Circle x={sx} y={sy} radius={r} stroke="#22c55e" strokeWidth={1.5} dash={[5, 4]} opacity={0.85} />
                <Circle x={sx} y={sy} radius={4} fill="#22c55e" opacity={0.9} />
              </Group>
            );
          })()}

          {/* Draft polyline */}
          {draftPointsPx.length > 0 && <Line points={draftPointsPx} stroke="#3b82f6" strokeWidth={m2px(0.18, design.field.ppm)} dash={[6, 6]} lineCap="round" lineJoin="round" />}
          {draftPointsPx.length > 0 && cursor && (() => {
            const endX = snapTarget ? m2px(snapTarget.x, design.field.ppm) : cursor.snappedPx.x;
            const endY = snapTarget ? m2px(snapTarget.y, design.field.ppm) : cursor.snappedPx.y;
            return (
              <Line points={[draftPointsPx[draftPointsPx.length - 2], draftPointsPx[draftPointsPx.length - 1], endX, endY]} stroke={snapTarget ? "#22c55e" : "#60a5fa"} strokeWidth={m2px(0.18, design.field.ppm)} dash={[4, 6]} opacity={0.7} lineCap="round" />
            );
          })()}

          {/* Cursor crosshair */}
          {cursor && (
            <Group listening={false}>
              <Line points={[cursor.snappedPx.x, cursor.snappedPx.y - 10, cursor.snappedPx.x, cursor.snappedPx.y + 10]} stroke="#4a5568" strokeWidth={1} dash={[3, 3]} />
              <Line points={[cursor.snappedPx.x - 10, cursor.snappedPx.y, cursor.snappedPx.x + 10, cursor.snappedPx.y]} stroke="#4a5568" strokeWidth={1} dash={[3, 3]} />
            </Group>
          )}
        </Layer>
      </Stage>

      {/* Rulers */}
      {/* Horizontal ruler — top edge, inset by RULER_SIZE to leave room for corner */}
      <div className="absolute z-10 pointer-events-none" style={{ top: 0, left: RULER_SIZE }}>
        <div style={{ position: "relative", width: viewportSize.width - RULER_SIZE, height: RULER_SIZE }}>
          <CanvasRuler
            orientation="h"
            stageTransform={{ ...stageTransform, x: stageTransform.x - RULER_SIZE }}
            ppm={design.field.ppm}
            gridStep={design.field.gridStep}
            length={viewportSize.width - RULER_SIZE}
            isDark={isDark}
          />
        </div>
      </div>
      {/* Vertical ruler — left edge, inset by RULER_SIZE to leave room for corner */}
      <div className="absolute z-10 pointer-events-none" style={{ top: RULER_SIZE, left: 0 }}>
        <div style={{ position: "relative", width: RULER_SIZE, height: viewportSize.height - RULER_SIZE }}>
          <CanvasRuler
            orientation="v"
            stageTransform={{ ...stageTransform, y: stageTransform.y - RULER_SIZE }}
            ppm={design.field.ppm}
            gridStep={design.field.gridStep}
            length={viewportSize.height - RULER_SIZE}
            isDark={isDark}
          />
        </div>
      </div>
      {/* Corner square */}
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          top: 0, left: 0,
          width: RULER_SIZE, height: RULER_SIZE,
          background: isDark ? "#070b12" : "#f2f4f7",
          borderRight: isDark ? "1px solid #1a2636" : "1px solid #c8d2db",
          borderBottom: isDark ? "1px solid #1a2636" : "1px solid #c8d2db",
        }}
      />

      {/* Status overlay */}
      {draftPath.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-[11px] text-primary/70 bg-background/80 border-t border-border/40">
          Click to add points · Double-click or <span className="font-medium text-foreground/60">Enter</span> to finish · <span className="font-medium text-foreground/60">Esc</span> to cancel
          {draftLengthWithCursor > 0 && <span className="ml-3 text-muted-foreground/60">{draftLengthWithCursor.toFixed(1)} m</span>}
        </div>
      )}
    </div>
  );
});

export default TrackCanvas;
