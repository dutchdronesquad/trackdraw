"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Shape,
} from "@/lib/types";
import { distance2D, smoothPolyline } from "@/lib/geometry";

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
};

const toolDefaults: ToolDefaults = {
  gate: {
    width: 1.5,
    height: 1.2,
    thick: 0.35,
    color: "#1f2937",
  },
  flag: {
    radius: 0.25,
    poleHeight: 2.2,
    color: "#7c3aed",
  },
  cone: {
    radius: 0.2,
    color: "#f97316",
  },
  label: {
    text: "Gate A",
    fontSize: 18,
    color: "#111827",
  },
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

const MIN_MARQUEE_SIZE = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeRect = (origin: Vector2d, next: Vector2d): RectLike => {
  const width = next.x - origin.x;
  const height = next.y - origin.y;
  return {
    x: width < 0 ? next.x : origin.x,
    y: height < 0 ? next.y : origin.y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
};

const rectsIntersect = (a: RectLike, b: RectLike) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const mergeClientRects = (rects: RectLike[]): RectLike | null => {
  if (!rects.length) return null;
  let minX = rects[0].x;
  let minY = rects[0].y;
  let maxX = rects[0].x + rects[0].width;
  let maxY = rects[0].y + rects[0].height;

  for (let i = 1; i < rects.length; i += 1) {
    const rect = rects[i];
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export default function TrackCanvas() {
  const {
    design,
    selection,
    setSelection,
    updateShape,
    addShape,
    activeTool,
    setActiveTool,
    removeShape,
  } = useEditor();

  const stageRef = useRef<KonvaStage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shapeRefs = useRef<Record<string, KonvaGroup | null>>({});
  const dragSnapRef = useRef<boolean>(true);

  const [vertexSel, setVertexSel] = useState<{ shapeId: string; idx: number } | null>(
    null
  );
  const [draftPath, setDraftPath] = useState<DraftPoint[]>([]);
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<RectLike | null>(null);
  const marqueeOrigin = useRef<Vector2d | null>(null);
  const marqueeAdditive = useRef(false);
  const [selectionFrame, setSelectionFrame] = useState<RectLike | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isStageDragging, setIsStageDragging] = useState(false);

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

  const dragBound = useCallback(
    (pos: Vector2d): Vector2d => {
      const clamped = {
        x: clamp(pos.x, 0, widthPx),
        y: clamp(pos.y, 0, heightPx),
      };
      if (!dragSnapRef.current) return clamped;
      return {
        x: Math.round(clamped.x / stepPx) * stepPx,
        y: Math.round(clamped.y / stepPx) * stepPx,
      };
    },
    [heightPx, stepPx, widthPx]
  );

  const pointerToMeters = useCallback(
    (pointer: { x: number; y: number } | null, snap = true) => {
      if (!pointer) return null;
      const px = snap ? Math.round(pointer.x / stepPx) * stepPx : pointer.x;
      const py = snap ? Math.round(pointer.y / stepPx) * stepPx : pointer.y;
      return {
        x: px2m(px, design.field.ppm),
        y: px2m(py, design.field.ppm),
      };
    },
    [design.field.ppm, stepPx]
  );

  const createShapeForTool = useCallback(
    (tool: EditorTool, point: { x: number; y: number }): Omit<Shape, "id"> | null => {
      if (tool === "select" || tool === "polyline") return null;
      switch (tool) {
        case "gate":
          return {
            kind: "gate",
            x: point.x,
            y: point.y,
            rotation: 0,
            ...toolDefaults.gate,
          };
        case "flag":
          return {
            kind: "flag",
            x: point.x,
            y: point.y,
            rotation: 0,
            ...toolDefaults.flag,
          };
        case "cone":
          return {
            kind: "cone",
            x: point.x,
            y: point.y,
            rotation: 0,
            ...toolDefaults.cone,
          };
        case "label":
          return {
            kind: "label",
            x: point.x,
            y: point.y,
            rotation: 0,
            ...toolDefaults.label,
          };
        default:
          return null;
      }
    },
    []
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
      color: "#0284c7",
    });
    setSelection([id]);
    setVertexSel(null);
    setDraftPath([]);
    setActiveTool("select");
  }, [addShape, draftPath, setActiveTool, setSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isTypingInInput(target)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(true);
        return;
      }

      const key = e.key;

      if (key === "Escape") {
        if (draftPath.length) {
          setDraftPath([]);
        } else {
          setSelection([]);
          setVertexSel(null);
          setActiveTool("select");
        }
      }

      if (key === "Enter" && draftPath.length >= 2) {
        finalizePath();
      }

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
            if (pts.length > 2) {
              pts.splice(vertexSel.idx, 1);
              const patch: Partial<PolylineShape> = { points: pts };
              updateShape(s.id, patch);
            }
          }
          setVertexSel(null);
          return;
        }
        if (selection.length) {
          selection.forEach((id) => removeShape(id));
        }
      }

      const lower = key.toLowerCase();
      switch (lower) {
        case "v":
          setActiveTool("select");
          break;
        case "g":
          setActiveTool("gate");
          break;
        case "f":
          setActiveTool("flag");
          break;
        case "c":
          setActiveTool("cone");
          break;
        case "l":
          setActiveTool("label");
          break;
        case "p":
          setActiveTool("polyline");
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    activeTool,
    draftPath.length,
    design.shapes,
    finalizePath,
    removeShape,
    selection,
    setActiveTool,
    setSelection,
    updateShape,
    vertexSel,
  ]);

  useEffect(() => {
    if (!selection.length) {
      setVertexSel(null);
    }
  }, [selection.length]);

  useEffect(() => {
    if (activeTool !== "select") {
      setVertexSel(null);
    }
  }, [activeTool]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !selection.length) {
      setSelectionFrame(null);
      return;
    }
    const rects: RectLike[] = selection
      .map((id) => shapeRefs.current[id])
      .filter((node): node is KonvaGroup => Boolean(node))
      .map((node) => node.getClientRect({ relativeTo: stage }));

    setSelectionFrame(mergeClientRects(rects));
  }, [selection, design.shapes]);

  const [zmin, zmax] = zRangeForDesign(design);

  const grid = useMemo(() => {
    const elements: JSX.Element[] = [];
    const coarseMeters = 5;
    const coarseStepPx = m2px(coarseMeters, design.field.ppm);
    const coarseEvery = Math.max(1, Math.round(coarseStepPx / stepPx));

    for (let idx = 0, x = 0; x <= widthPx; idx += 1, x += stepPx) {
      const isCoarse = idx % coarseEvery === 0;
      elements.push(
        <Line
          key={`vx-${x}`}
          points={[x, 0, x, heightPx]}
          stroke={isCoarse ? "#cbd5f5" : "#e2e8f0"}
          strokeWidth={isCoarse ? 1.2 : 1}
          listening={false}
        />
      );
      if (isCoarse && idx !== 0) {
        const metersX = px2m(x, design.field.ppm);
        elements.push(
          <Text
            key={`vx-label-${x}`}
            x={x + 4}
            y={4}
            fontSize={11}
            fill="#94a3b8"
            text={`${metersX.toFixed(0)}m`}
            listening={false}
          />
        );
      }
    }

    for (let idx = 0, y = 0; y <= heightPx; idx += 1, y += stepPx) {
      const isCoarse = idx % coarseEvery === 0;
      elements.push(
        <Line
          key={`hz-${y}`}
          points={[0, y, widthPx, y]}
          stroke={isCoarse ? "#cbd5f5" : "#e2e8f0"}
          strokeWidth={isCoarse ? 1.2 : 1}
          listening={false}
        />
      );
      if (isCoarse && idx !== 0) {
        const metersY = px2m(y, design.field.ppm);
        elements.push(
          <Text
            key={`hz-label-${y}`}
            x={6}
            y={y + 6}
            fontSize={11}
            fill="#94a3b8"
            text={`${metersY.toFixed(0)}m`}
            listening={false}
          />
        );
      }
    }

    return elements;
  }, [design.field.ppm, heightPx, stepPx, widthPx]);

  const draftPointsPx = useMemo(() => {
    if (!draftPath.length) return [];
    return draftPath.flatMap((p) => [m2px(p.x, design.field.ppm), m2px(p.y, design.field.ppm)]);
  }, [design.field.ppm, draftPath]);

  const draftLength = useMemo(() => {
    if (draftPath.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < draftPath.length; i += 1) {
      total += distance2D(draftPath[i - 1], draftPath[i]);
    }
    return total;
  }, [draftPath]);

  const draftLengthWithCursor = useMemo(() => {
    if (activeTool !== "polyline" || draftPath.length === 0) return draftLength;
    if (!cursor) return draftLength;
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
    if (isPanning) return "grab";
    if (activeTool === "polyline") return "crosshair";
    if (marqueeRect) return "crosshair";
    return "default";
  }, [activeTool, isPanning, isStageDragging, marqueeRect]);

  const hoverCell = useMemo(() => {
    if (!cursor) return null;
    return {
      x: Math.floor(cursor.rawPx.x / stepPx) * stepPx,
      y: Math.floor(cursor.rawPx.y / stepPx) * stepPx,
    };
  }, [cursor, stepPx]);

  const stageWidth = Math.max(widthPx, 360);
  const stageHeight = Math.max(heightPx, 240);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: stageWidth, height: stageHeight, cursor: cursorStyle }}
    >
      <Stage
        width={widthPx}
        height={heightPx}
        ref={stageRef}
        draggable={isPanning}
        onDragStart={() => setIsStageDragging(true)}
        onDragEnd={() => setIsStageDragging(false)}
        onMouseDown={(e) => {
          const stage = stageRef.current;
          if (!stage) return;
          if (isPanning) return;

          const pointer = stage.getRelativePointerPosition();
          if (!pointer) return;

          if (e.evt.button !== 0) return;

          const snap = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);

          if (activeTool === "polyline") {
            if (e.evt.detail >= 2) {
              finalizePath();
              return;
            }
            const meters = pointerToMeters(pointer, snap);
            if (!meters) return;
            setDraftPath((prev) => {
              const last = prev.at(-1);
              if (last && distance2D(last, meters) < 0.05) return prev;
              return [...prev, { ...meters, z: 0 }];
            });
            setSelection([]);
            return;
          }

          if (activeTool !== "select") {
            const meters = pointerToMeters(pointer, snap);
            if (!meters) return;
            const shape = createShapeForTool(activeTool, meters);
            if (!shape) return;
            const id = addShape(shape);
            setSelection([id]);
            return;
          }

          if (e.target === stage) {
            if (!(e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)) {
              setSelection([]);
            }
            marqueeOrigin.current = pointer;
            marqueeAdditive.current = Boolean(
              e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey
            );
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
            setCursor({
              rawMeters,
              snappedMeters,
              rawPx: { x: pointer.x, y: pointer.y },
              snappedPx: {
                x: Math.round(pointer.x / stepPx) * stepPx,
                y: Math.round(pointer.y / stepPx) * stepPx,
              },
            });
          } else {
            setCursor(null);
          }

          if (marqueeOrigin.current) {
            const rect = normalizeRect(marqueeOrigin.current, pointer);
            setMarqueeRect(rect);
          }
        }}
        onMouseLeave={() => {
          setCursor(null);
          setMarqueeRect(null);
          marqueeOrigin.current = null;
        }}
        onMouseUp={() => {
          const stage = stageRef.current;
          if (!stage) return;
          if (!marqueeOrigin.current || !marqueeRect) {
            marqueeOrigin.current = null;
            setMarqueeRect(null);
            return;
          }

          const rect = marqueeRect;
          marqueeOrigin.current = null;
          setMarqueeRect(null);

          if (rect.width < MIN_MARQUEE_SIZE && rect.height < MIN_MARQUEE_SIZE) {
            return;
          }

          const selectedIds = Object.entries(shapeRefs.current)
            .filter(([, node]): node is [string, KonvaGroup] => Boolean(node))
            .filter(([, node]) => {
              const clientRect = node!.getClientRect({ relativeTo: stage });
              return rectsIntersect(rect, clientRect);
            })
            .map(([id]) => id);

          if (marqueeAdditive.current) {
            const union = new Set([...selection, ...selectedIds]);
            setSelection(Array.from(union));
          } else {
            setSelection(selectedIds);
          }
        }}
      >
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            fill="#f8fafc"
            stroke="#cbd5f5"
            strokeWidth={1}
          />
          {grid}
          {hoverCell && (
            <Rect
              x={hoverCell.x}
              y={hoverCell.y}
              width={stepPx}
              height={stepPx}
              stroke="#38bdf8"
              strokeWidth={1}
              dash={[4, 4]}
              opacity={0.4}
            />
          )}
          {selectionFrame && (
            <Rect
              x={selectionFrame.x}
              y={selectionFrame.y}
              width={selectionFrame.width}
              height={selectionFrame.height}
              stroke="#38bdf8"
              strokeWidth={1.2}
              dash={[6, 4]}
              listening={false}
            />
          )}
          {marqueeRect && (
            <Rect
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
              stroke="#0ea5e9"
              strokeWidth={1}
              dash={[6, 4]}
              fill="#0284c720"
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {design.shapes.map((shape) => {
            const s = shape;
            const selected = selection.includes(s.id);
            const allowInteraction = activeTool === "select" && !isPanning;
            return (
              <Group
                key={s.id}
                ref={(node) => {
                  shapeRefs.current[s.id] = node;
                }}
                x={m2px(s.x, design.field.ppm)}
                y={m2px(s.y, design.field.ppm)}
                rotation={s.rotation}
                draggable={allowInteraction && !s.locked}
                dragBoundFunc={dragBound}
                listening={allowInteraction}
                onDragStart={(e) => {
                  dragSnapRef.current = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                }}
                onDragEnd={(e) => {
                  const { x, y } = e.target.position();
                  const ppm = design.field.ppm;
                  const pxX = dragSnapRef.current
                    ? Math.round(x / stepPx) * stepPx
                    : clamp(x, 0, widthPx);
                  const pxY = dragSnapRef.current
                    ? Math.round(y / stepPx) * stepPx
                    : clamp(y, 0, heightPx);
                  e.target.position({ x: pxX, y: pxY });
                  updateShape(s.id, { x: px2m(pxX, ppm), y: px2m(pxY, ppm) });
                }}
                onMouseDown={(e) => {
                  if (!allowInteraction) return;
                  e.cancelBubble = true;
                  if (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey) {
                    const current = new Set(selection);
                    if (current.has(s.id)) {
                      current.delete(s.id);
                    } else {
                      current.add(s.id);
                    }
                    setSelection(Array.from(current));
                  } else {
                    setSelection([s.id]);
                  }
                }}
                onTap={(e) => {
                  if (!allowInteraction) return;
                  e.cancelBubble = true;
                  setSelection([s.id]);
                }}
              >
                {s.kind === "gate" && (() => {
                  const gate = s as GateShape;
                  const width = m2px(gate.width, design.field.ppm);
                  const depth = m2px(gate.thick ?? 0.35, design.field.ppm);
                  const color = gate.color || "#1f2937";
                  return (
                    <>
                      {selected && (
                        <Rect
                          width={width + m2px(0.3, design.field.ppm)}
                          height={depth + m2px(0.3, design.field.ppm)}
                          offsetX={(width + m2px(0.3, design.field.ppm)) / 2}
                          offsetY={(depth + m2px(0.3, design.field.ppm)) / 2}
                          stroke="#38bdf8"
                          dash={[6, 4]}
                          strokeWidth={1.6}
                          listening={false}
                        />
                      )}
                      <Rect
                        width={width}
                        height={depth}
                        offsetX={width / 2}
                        offsetY={depth / 2}
                        fill={color}
                        opacity={0.12}
                        strokeEnabled={false}
                      />
                      <Rect
                        width={width}
                        height={depth}
                        offsetX={width / 2}
                        offsetY={depth / 2}
                        stroke={color}
                        strokeWidth={2}
                        cornerRadius={Math.min(12, depth / 2)}
                      />
                    </>
                  );
                })()}

                {s.kind === "flag" && (() => {
                  const flag = s as FlagShape;
                  const r = m2px(flag.radius, design.field.ppm);
                  const pole = m2px(flag.poleHeight ?? 2, design.field.ppm);
                  const color = flag.color || "#7c3aed";
                  return (
                    <>
                      {selected && (
                        <Circle
                          radius={r + m2px(0.18, design.field.ppm)}
                          stroke="#38bdf8"
                          strokeWidth={1.4}
                          dash={[6, 4]}
                          listening={false}
                        />
                      )}
                      <Line
                        points={[0, 0, 0, -pole]}
                        stroke={color}
                        strokeWidth={3}
                        lineCap="round"
                      />
                      <Circle radius={r} fill={color} opacity={0.12} stroke={color} strokeWidth={2} />
                    </>
                  );
                })()}

                {s.kind === "cone" && (() => {
                  const cone = s as ConeShape;
                  const r = m2px(cone.radius, design.field.ppm);
                  const color = cone.color || "#f97316";
                  return (
                    <>
                      {selected && (
                        <Circle
                          radius={r + m2px(0.12, design.field.ppm)}
                          stroke="#38bdf8"
                          strokeWidth={1.3}
                          dash={[5, 4]}
                          listening={false}
                        />
                      )}
                      <Circle radius={r} fill={color} opacity={0.18} stroke={color} strokeWidth={2} />
                    </>
                  );
                })()}

                {s.kind === "label" && (() => {
                  const label = s as LabelShape;
                  const fontSize = label.fontSize ?? 18;
                  const color = label.color || "#111827";
                  const labelWidth = Math.max(label.text.length * fontSize * 0.45, 48);
                  return (
                    <Group offsetY={-fontSize / 2}>
                      {selected && (
                        <Rect
                          width={labelWidth + 12}
                          height={fontSize + 12}
                          y={-6}
                          offsetX={(labelWidth + 12) / 2}
                          stroke="#38bdf8"
                          strokeWidth={1.2}
                          dash={[6, 4]}
                          listening={false}
                        />
                      )}
                      <Text
                        text={label.text}
                        fontSize={fontSize}
                        fill={color}
                        align="center"
                        width={labelWidth}
                        offsetX={labelWidth / 2}
                      />
                    </Group>
                  );
                })()}

                {s.kind === "polyline" && (() => {
                  const path = s as PolylineShape;
                  const pointsPx = path.points.flatMap((pt) => [
                    m2px(pt.x, design.field.ppm),
                    m2px(pt.y, design.field.ppm),
                  ]);
                  const strokePx = m2px(path.strokeWidth ?? 0.18, design.field.ppm);
                  const showArrow = Boolean(path.showArrows);
                  const smoothPoints = (path.smooth ?? true)
                    ? smoothPolyline(path.points)
                    : path.points;
                  const smoothPx = smoothPoints.flatMap((pt) => [
                    m2px(pt.x, design.field.ppm),
                    m2px(pt.y, design.field.ppm),
                  ]);
                  const color = path.color || "#0284c7";

                  if (!pointsPx.length) return null;

                  return (
                    <>
                      {selected && (
                        <Line
                          points={pointsPx}
                          stroke="#38bdf8"
                          strokeWidth={strokePx + 3}
                          lineCap="round"
                          opacity={0.35}
                          listening={false}
                        />
                      )}

                      <Group listening={false}>
                        {path.points.map((pt, idx) => {
                          const pct = path.points.length > 1 ? idx / (path.points.length - 1) : 0;
                          const zColor = zToColor(pt.z ?? 0, zmin, zmax);
                          const segment = smoothPx.slice(idx * 2, idx * 2 + 4);
                          if (segment.length < 4) return null;
                          const segmentColor = path.color ? color : zColor;
                          return (
                            <Line
                              key={`${path.id}-seg-${idx}`}
                              points={segment}
                              stroke={segmentColor}
                              strokeWidth={strokePx}
                              lineCap="round"
                              lineJoin="round"
                              opacity={Math.max(0.35, 1 - pct * 0.15)}
                            />
                          );
                        })}
                        {showArrow && path.points.length >= 2 && (
                          <Arrow
                            points={smoothPx}
                            stroke={color}
                            fill={color}
                            strokeWidth={strokePx}
                            pointerLength={Math.max(10, strokePx * 3)}
                            pointerWidth={Math.max(8, strokePx * 2)}
                            lineCap="round"
                            lineJoin="round"
                            pointerAtEnding
                            pointerAtBeginning
                          />
                        )}
                      </Group>

                      {allowInteraction &&
                        path.points.map((pt, idx) => {
                          const cx = m2px(pt.x, design.field.ppm);
                          const cy = m2px(pt.y, design.field.ppm);
                          const r = Math.max(4, m2px(0.08, design.field.ppm));
                          const active =
                            vertexSel &&
                            vertexSel.shapeId === s.id &&
                            vertexSel.idx === idx;
                          return (
                            <Circle
                              key={`${s.id}-vh-${idx}`}
                              x={cx}
                              y={cy}
                              radius={r}
                              fill={active ? "#111827" : "#ffffff"}
                              stroke={active ? "#111827" : "#0ea5e9"}
                              strokeWidth={2}
                              draggable
                              dragBoundFunc={dragBound}
                              onDragStart={(e) => {
                                dragSnapRef.current = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                              }}
                              onDragEnd={(e) => {
                                const ppm = design.field.ppm;
                                const pxX = dragSnapRef.current
                                  ? Math.round(e.target.x() / stepPx) * stepPx
                                  : clamp(e.target.x(), 0, widthPx);
                                const pxY = dragSnapRef.current
                                  ? Math.round(e.target.y() / stepPx) * stepPx
                                  : clamp(e.target.y(), 0, heightPx);
                                e.target.position({ x: pxX, y: pxY });
                                const pts: PolylinePoint[] = path.points.map((point, pointIndex) =>
                                  pointIndex === idx
                                    ? { ...point, x: px2m(pxX, ppm), y: px2m(pxY, ppm) }
                                    : point
                                );
                                const patch: Partial<PolylineShape> = { points: pts };
                                updateShape(s.id, patch);
                              }}
                              onMouseDown={(e) => {
                                e.cancelBubble = true;
                                setSelection([s.id]);
                                setVertexSel({ shapeId: s.id, idx });
                              }}
                            />
                          );
                        })}
                    </>
                  );
                })()}
              </Group>
            );
          })}

          {draftPointsPx.length > 0 && (
            <Line
              points={draftPointsPx}
              stroke="#0284c7"
              strokeWidth={m2px(0.18, design.field.ppm)}
              dash={[6, 6]}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {draftPointsPx.length > 0 && cursor && (
            <Line
              points={[
                draftPointsPx[draftPointsPx.length - 2],
                draftPointsPx[draftPointsPx.length - 1],
                cursor.snappedPx.x,
                cursor.snappedPx.y,
              ]}
              stroke="#0ea5e9"
              strokeWidth={m2px(0.18, design.field.ppm)}
              dash={[4, 6]}
              opacity={0.7}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {cursor && (
            <Group listening={false}>
              <Line
                points={[
                  cursor.snappedPx.x,
                  cursor.snappedPx.y - 12,
                  cursor.snappedPx.x,
                  cursor.snappedPx.y + 12,
                ]}
                stroke="#94a3b8"
                strokeWidth={1}
                dash={[4, 4]}
              />
              <Line
                points={[
                  cursor.snappedPx.x - 12,
                  cursor.snappedPx.y,
                  cursor.snappedPx.x + 12,
                  cursor.snappedPx.y,
                ]}
                stroke="#94a3b8"
                strokeWidth={1}
                dash={[4, 4]}
              />
            </Group>
          )}
        </Layer>
      </Stage>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>
          Grid {design.field.gridStep.toFixed(1)} m • Scale {design.field.ppm} px/m
        </span>
        <span>Hold Space om te pannen • Shift voor multiselect • Alt zonder snap</span>
        {cursor && (
          <span>
            x {cursor.snappedMeters.x.toFixed(2)} m · y {cursor.snappedMeters.y.toFixed(2)} m
          </span>
        )}
      </div>

      {draftPath.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 py-2 text-[11px] text-slate-600">
          Klik om punten toe te voegen. Dubbelklik of Enter om te voltooien, Esc om te annuleren.
          {draftLengthWithCursor > 0 && (
            <span className="ml-2 text-slate-500">
              Lengte {draftLengthWithCursor.toFixed(1)} m
            </span>
          )}
        </div>
      )}
    </div>
  );
}
