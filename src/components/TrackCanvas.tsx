"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group, Arrow } from "react-konva";
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

type KonvaStage = import("konva/lib/Stage").Stage;

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
  const [vertexSel, setVertexSel] = useState<{ shapeId: string; idx: number } | null>(
    null
  );
  const [draftPath, setDraftPath] = useState<DraftPoint[]>([]);
  const [cursorMeters, setCursorMeters] = useState<{ x: number; y: number } | null>(
    null
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

  const snapPx = useCallback(
    (value: number) => {
      if (!isFinite(stepPx) || stepPx <= 1) return Math.round(value);
      return Math.round(value / stepPx) * stepPx;
    },
    [stepPx]
  );

  const pointerToMeters = useCallback(
    (pointer: { x: number; y: number } | null, snap = true) => {
      if (!pointer) return null;
      const px = snap ? snapPx(pointer.x) : pointer.x;
      const py = snap ? snapPx(pointer.y) : pointer.y;
      return {
        x: px2m(px, design.field.ppm),
        y: px2m(py, design.field.ppm),
      };
    },
    [design.field.ppm, snapPx]
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
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isTypingInInput(target)) return;

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

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const cursorPx = useMemo(() => {
    if (!cursorMeters) return null;
    return {
      x: m2px(cursorMeters.x, design.field.ppm),
      y: m2px(cursorMeters.y, design.field.ppm),
    };
  }, [cursorMeters, design.field.ppm]);

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
    if (!cursorMeters) return draftLength;
    return draftLength + distance2D(draftPath[draftPath.length - 1], cursorMeters);
  }, [activeTool, cursorMeters, draftLength, draftPath]);

  return (
    <div
      className="relative"
      style={{ width: Math.max(widthPx, 320), height: Math.max(heightPx, 240) }}
    >
      <Stage
        width={widthPx}
        height={heightPx}
        ref={stageRef}
        draggable={activeTool === "select" && draftPath.length === 0 && !vertexSel}
        onMouseDown={(e) => {
          const stage = stageRef.current;
          if (!stage) return;
          const pointer = stage.getRelativePointerPosition();
          const snap = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
          if (e.target === e.target.getStage()) {
            if (activeTool === "select") {
              setSelection([]);
              setVertexSel(null);
            }
          }

          if (e.evt.button !== 0) return;

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
        }}
        onDblClick={(evt) => {
          if (activeTool === "polyline") {
            evt.evt.preventDefault();
          }
        }}
        onMouseMove={() => {
          const stage = stageRef.current;
          if (!stage) return;
          const pointer = stage.getRelativePointerPosition();
          const meters = pointerToMeters(pointer);
          if (meters) {
            setCursorMeters(meters);
          }
        }}
        onMouseLeave={() => setCursorMeters(null)}
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
        </Layer>

        <Layer>
          {design.shapes.map((shape) => {
            const s = shape;
            const selected = selection.includes(s.id);
            const allowInteraction = activeTool === "select";
            const base = (
              <Group
                key={s.id}
                x={m2px(s.x, design.field.ppm)}
                y={m2px(s.y, design.field.ppm)}
                rotation={s.rotation}
                draggable={allowInteraction && !s.locked}
                listening={allowInteraction}
                onDragEnd={(e) => {
                  const { x, y } = e.target.position();
                  const ppm = design.field.ppm;
                  const shouldSnap = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                  const pxX = shouldSnap ? snapPx(x) : x;
                  const pxY = shouldSnap ? snapPx(y) : y;
                  e.target.position({ x: pxX, y: pxY });
                  updateShape(s.id, { x: px2m(pxX, ppm), y: px2m(pxY, ppm) });
                }}
                onClick={(e) => {
                  if (!allowInteraction) return;
                  e.cancelBubble = true;
                  setSelection([s.id]);
                }}
                onTap={(e) => {
                  if (!allowInteraction) return;
                  e.cancelBubble = true;
                  setSelection([s.id]);
                }}
              >
                {s.kind === "gate" && (
                  (() => {
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
                          fillEnabled={false}
                        />
                        <Line
                          points={[0, -depth / 2, 0, depth / 2]}
                          stroke={color}
                          strokeWidth={Math.max(2, depth / 3)}
                          opacity={0.7}
                        />
                      </>
                    );
                  })()
                )}

                {s.kind === "flag" && (
                  (() => {
                    const flag = s as FlagShape;
                    const color = flag.color || "#7c3aed";
                    const radius = m2px(flag.radius, design.field.ppm);
                    const pole = m2px(flag.poleHeight ?? 2, design.field.ppm);
                    return (
                      <>
                        {selected && (
                          <Circle
                            radius={radius + m2px(0.1, design.field.ppm)}
                            stroke="#38bdf8"
                            dash={[5, 4]}
                            strokeWidth={1.4}
                            listening={false}
                          />
                        )}
                        <Circle radius={radius} stroke={color} strokeWidth={2} />
                        <Line points={[0, 0, 0, -pole]} stroke={color} strokeWidth={3} />
                      </>
                    );
                  })()
                )}

                {s.kind === "cone" && (
                  (() => {
                    const cone = s as ConeShape;
                    const radius = m2px(cone.radius, design.field.ppm);
                    const color = cone.color || "#f97316";
                    return (
                      <>
                        <Circle radius={radius} fill={color} opacity={0.75} />
                        {selected && (
                          <Circle
                            radius={radius + m2px(0.08, design.field.ppm)}
                            stroke="#38bdf8"
                            dash={[4, 4]}
                            strokeWidth={1.4}
                            listening={false}
                          />
                        )}
                      </>
                    );
                  })()
                )}

                {s.kind === "label" && (
                  (() => {
                    const label = s as LabelShape;
                    const color = label.color || "#111827";
                    const text = label.text;
                    const fontSize = label.fontSize ?? 18;
                    return (
                      <>
                        {selected && (
                          <Rect
                            x={-8}
                            y={-24}
                            width={text.length * 8 + 16}
                            height={28}
                            stroke="#38bdf8"
                            dash={[6, 4]}
                            cornerRadius={6}
                            listening={false}
                          />
                        )}
                        <Text text={text} fontSize={fontSize} fill={color} offsetY={8} />
                      </>
                    );
                  })()
                )}

                {s.kind === "polyline" && (
                  <>
                    {(s as PolylineShape).points
                      .slice(0, -1)
                      .map((p, i: number) => {
                        const polyline = s as PolylineShape;
                        const nextPoint = polyline.points[i + 1];
                        const z1 = p.z ?? 0;
                        const z2 = nextPoint.z ?? 0;
                        const color = zToColor((z1 + z2) / 2, zmin, zmax);
                        const strokePx = m2px(
                          (polyline.strokeWidth ?? 0.15),
                          design.field.ppm
                        );
                        const baseStroke = Math.max(1, strokePx * (polyline.smooth ? 0.6 : 1));
                        const baseOpacity = polyline.smooth ? 0.45 : 1;
                        const showArrow = Boolean(polyline.showArrows);
                        const points = [
                          m2px(p.x, design.field.ppm),
                          m2px(p.y, design.field.ppm),
                          m2px(nextPoint.x, design.field.ppm),
                          m2px(nextPoint.y, design.field.ppm),
                        ];
                        return (
                          <Group key={`${s.id}-seg-${i}`}>
                            <Line
                              points={points}
                              stroke={color}
                              strokeWidth={baseStroke}
                              lineCap="round"
                              lineJoin="round"
                              opacity={baseOpacity}
                            />
                            {allowInteraction && (
                              <Line
                                points={points}
                                stroke="rgba(0,0,0,0.01)"
                                strokeWidth={Math.max(4, strokePx)}
                                hitStrokeWidth={Math.max(20, strokePx + 20)}
                                onDblClick={(event) => {
                                  if (!allowInteraction) return;
                                  event.cancelBubble = true;
                                  const stage = event.target.getStage();
                                  if (!stage) return;
                                  const pointer = stage.getRelativePointerPosition();
                                  const useSnap =
                                    !(event.evt.altKey || event.evt.metaKey || event.evt.shiftKey);
                                  const meters = pointerToMeters(pointer, useSnap);
                                  if (!meters) return;
                                  const toInsert: PolylinePoint = {
                                    x: meters.x,
                                    y: meters.y,
                                    z: (z1 + z2) / 2,
                                  };
                                  const updatedPoints = [...polyline.points];
                                  updatedPoints.splice(i + 1, 0, toInsert);
                                  updateShape(polyline.id, { points: updatedPoints });
                                }}
                              />
                            )}
                            {showArrow && (
                              <Arrow
                                points={points}
                                stroke={color}
                                fill={color}
                                strokeWidth={strokePx}
                                pointerLength={Math.max(10, strokePx * 3)}
                                pointerWidth={Math.max(8, strokePx * 2)}
                                lineCap="round"
                                lineJoin="round"
                                pointerAtEnding
                                pointerAtBeginning={i === 0}
                              />
                            )}
                          </Group>
                        );
                      })}

                    {selected && (
                      <Line
                        points={(s as PolylineShape).points.flatMap((pt) => [
                          m2px(pt.x, design.field.ppm),
                          m2px(pt.y, design.field.ppm),
                        ])}
                        stroke="#38bdf8"
                        strokeWidth={
                          m2px(((s as PolylineShape).strokeWidth ?? 0.15), design.field.ppm) +
                          3
                        }
                        lineCap="round"
                        opacity={0.35}
                      />
                    )}

                    {((s as PolylineShape).smooth ?? true) && (
                      <Line
                        points={smoothPolyline((s as PolylineShape).points).flatMap((pt) => [
                          m2px(pt.x, design.field.ppm),
                          m2px(pt.y, design.field.ppm),
                        ])}
                        stroke={(s as PolylineShape).color || "#0284c7"}
                        strokeWidth={m2px(((s as PolylineShape).strokeWidth ?? 0.15), design.field.ppm)}
                        opacity={0.85}
                        lineCap="round"
                        lineJoin="round"
                        listening={false}
                      />
                    )}

                    {allowInteraction &&
                      (s as PolylineShape).points.map((p, idx: number) => {
                        const cx = m2px(p.x, design.field.ppm);
                        const cy = m2px(p.y, design.field.ppm);
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
                            onDragEnd={(e) => {
                              const ppm = design.field.ppm;
                              const shouldSnap = !(e.evt.altKey || e.evt.metaKey || e.evt.shiftKey);
                              const pxX = shouldSnap ? snapPx(e.target.x()) : e.target.x();
                              const pxY = shouldSnap ? snapPx(e.target.y()) : e.target.y();
                              e.target.position({ x: pxX, y: pxY });
                              const polyline = s as PolylineShape;
                              const pts: PolylinePoint[] = polyline.points.map((pt, pointIndex) =>
                                pointIndex === idx
                                  ? { ...pt, x: px2m(pxX, ppm), y: px2m(pxY, ppm) }
                                  : pt
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
                )}
              </Group>
            );

            return base;
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

          {draftPointsPx.length > 0 && cursorPx && (
            <Line
              points={[
                draftPointsPx[draftPointsPx.length - 2],
                draftPointsPx[draftPointsPx.length - 1],
                cursorPx.x,
                cursorPx.y,
              ]}
              stroke="#0ea5e9"
              strokeWidth={m2px(0.18, design.field.ppm)}
              dash={[4, 6]}
              opacity={0.7}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {cursorPx && (
            <Group listening={false}>
              <Line
                points={[cursorPx.x, cursorPx.y - 12, cursorPx.x, cursorPx.y + 12]}
                stroke="#94a3b8"
                strokeWidth={1}
                dash={[4, 4]}
              />
              <Line
                points={[cursorPx.x - 12, cursorPx.y, cursorPx.x + 12, cursorPx.y]}
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
        {draftPath.length > 0 && activeTool === "polyline" && (
          <span>Pad-lengte {draftLengthWithCursor.toFixed(1)} m</span>
        )}
        {cursorMeters && (
          <span>
            x {cursorMeters.x.toFixed(2)} m · y {cursorMeters.y.toFixed(2)} m
          </span>
        )}
      </div>

      {draftPath.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 py-2 text-[11px] text-slate-600">
          Klik om punten toe te voegen. Dubbelklik of druk op Enter om te voltooien, Esc om te annuleren.
        </div>
      )}
    </div>
  );
}
