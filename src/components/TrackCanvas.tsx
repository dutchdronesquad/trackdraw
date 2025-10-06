"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Line, Text, Group, Arrow } from "react-konva";
import { useEditor } from "@/store/editor";
import { m2px, px2m } from "@/lib/units";
import { zToColor, zRangeForDesign } from "@/lib/alt";
import type { EditorTool } from "@/store/editor";
import type { PolylinePoint } from "@/lib/types";

interface DraftPoint {
  x: number;
  y: number;
  z?: number;
}

const toolDefaults: Record<Exclude<EditorTool, "select" | "polyline">, Record<string, any>> = {
  gate: {
    width: 1.5,
    height: 1.2,
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
  const stageRef = useRef<any>(null);
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
    (pointer: { x: number; y: number } | null) => {
      if (!pointer) return null;
      const snappedX = snapPx(pointer.x);
      const snappedY = snapPx(pointer.y);
      return {
        x: px2m(snappedX, design.field.ppm),
        y: px2m(snappedY, design.field.ppm),
      };
    },
    [design.field.ppm, snapPx]
  );

  const createShapeForTool = useCallback(
    (tool: EditorTool, point: { x: number; y: number }) => {
      if (tool === "select" || tool === "polyline") return null;
      const additions = toolDefaults[tool] ?? {};
      return {
        kind: tool,
        x: point.x,
        y: point.y,
        rotation: 0,
        ...additions,
      } as any;
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
      color: "#0284c7",
    } as any);
    setSelection([id]);
    setVertexSel(null);
    setDraftPath([]);
    setActiveTool("select");
  }, [draftPath, addShape, setActiveTool, setSelection]);

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
        if (vertexSel) {
          const s = design.shapes.find((sh) => sh.id === vertexSel.shapeId);
          if (s?.kind === "polyline") {
            const pts = [...(s as any).points];
            if (pts.length > 2) {
              pts.splice(vertexSel.idx, 1);
              updateShape(s.id, { points: pts } as any);
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

  return (
    <div
      className="relative"
      style={{ width: Math.max(widthPx, 320), height: Math.max(heightPx, 240) }}
    >
      <Stage
        width={widthPx}
        height={heightPx}
        ref={stageRef}
        draggable={activeTool === "select" && draftPath.length === 0}
        onMouseDown={(e) => {
          const stage = stageRef.current;
          if (!stage) return;
          const pointer = stage.getRelativePointerPosition();
          if (e.target === e.target.getStage()) {
            if (activeTool === "select") {
              setSelection([]);
              setVertexSel(null);
            }
          }

          if (e.evt.button !== 0) return;

          if (activeTool === "polyline") {
            const meters = pointerToMeters(pointer);
            if (!meters) return;
            setDraftPath((prev) => [...prev, { ...meters, z: 0 }]);
            setSelection([]);
            return;
          }

          if (activeTool !== "select") {
            const meters = pointerToMeters(pointer);
            if (!meters) return;
            const shape = createShapeForTool(activeTool, meters);
            if (!shape) return;
            const id = addShape(shape);
            setSelection([id]);
            return;
          }
        }}
        onDblClick={() => {
          if (activeTool === "polyline") finalizePath();
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
          {design.shapes.map((s) => {
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
                  const gx = snapPx(x);
                  const gy = snapPx(y);
                  e.target.position({ x: gx, y: gy });
                  updateShape(s.id, { x: gx / ppm, y: gy / ppm });
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
                  <>
                    {selected && (
                      <Rect
                        width={m2px((s as any).width, design.field.ppm) + 10}
                        height={m2px((s as any).height, design.field.ppm) + 10}
                        offsetX={
                          m2px((s as any).width, design.field.ppm) / 2 + 5
                        }
                        offsetY={
                          m2px((s as any).height, design.field.ppm) / 2 + 5
                        }
                        stroke="#38bdf8"
                        dash={[6, 4]}
                        strokeWidth={1.6}
                        listening={false}
                      />
                    )}
                    <Rect
                      width={m2px((s as any).width, design.field.ppm)}
                      height={m2px((s as any).height, design.field.ppm)}
                      offsetX={
                        m2px((s as any).width, design.field.ppm) / 2
                      }
                      offsetY={
                        m2px((s as any).height, design.field.ppm) / 2
                      }
                      stroke={s.color || "#1f2937"}
                      strokeWidth={2}
                      dashEnabled
                      fillEnabled={false}
                    />
                  </>
                )}

                {s.kind === "flag" && (
                  <>
                    {selected && (
                      <Circle
                        radius={
                          m2px((s as any).radius, design.field.ppm) +
                          m2px(0.1, design.field.ppm)
                        }
                        stroke="#38bdf8"
                        dash={[5, 4]}
                        strokeWidth={1.4}
                        listening={false}
                      />
                    )}
                    <Circle
                      radius={m2px((s as any).radius, design.field.ppm)}
                      stroke={s.color || "#7c3aed"}
                      strokeWidth={2}
                    />
                    <Line
                      points={[
                        0,
                        0,
                        0,
                        -m2px((s as any).poleHeight ?? 2, design.field.ppm),
                      ]}
                      stroke={s.color || "#7c3aed"}
                      strokeWidth={3}
                    />
                  </>
                )}

                {s.kind === "cone" && (
                  <>
                    <Circle
                      radius={m2px((s as any).radius, design.field.ppm)}
                      fill={s.color || "#f97316"}
                      opacity={0.75}
                    />
                    {selected && (
                      <Circle
                        radius={
                          m2px((s as any).radius, design.field.ppm) +
                          m2px(0.08, design.field.ppm)
                        }
                        stroke="#38bdf8"
                        dash={[4, 4]}
                        strokeWidth={1.4}
                        listening={false}
                      />
                    )}
                  </>
                )}

                {s.kind === "label" && (
                  <>
                    {selected && (
                      <Rect
                        x={-8}
                        y={-24}
                        width={(s as any).text.length * 8 + 16}
                        height={28}
                        stroke="#38bdf8"
                        dash={[6, 4]}
                        cornerRadius={6}
                        listening={false}
                      />
                    )}
                    <Text
                      text={(s as any).text}
                      fontSize={(s as any).fontSize ?? 18}
                      fill={s.color || "#111827"}
                      offsetY={8}
                    />
                  </>
                )}

                {s.kind === "polyline" && (
                  <>
                    {((s as any).points as any[])
                      .slice(0, -1)
                      .map((p: any, i: number) => {
                        const p2 = (s as any).points[i + 1];
                        const z1 = p.z ?? 0;
                        const z2 = p2.z ?? 0;
                        const color = zToColor((z1 + z2) / 2, zmin, zmax);
                        const strokePx = m2px(
                          (s as any).strokeWidth ?? 0.15,
                          design.field.ppm
                        );
                        const showArrow = Boolean((s as any).showArrows);
                        const points = [
                          m2px(p.x, design.field.ppm),
                          m2px(p.y, design.field.ppm),
                          m2px(p2.x, design.field.ppm),
                          m2px(p2.y, design.field.ppm),
                        ];
                        return (
                          <Group key={`${s.id}-seg-${i}`}>
                            <Line
                              points={points}
                              stroke={color}
                              strokeWidth={strokePx}
                              lineCap="round"
                              lineJoin="round"
                            />
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
                        points={(
                          (s as any).points as PolylinePoint[]
                        ).flatMap((pt) => [
                          m2px(pt.x, design.field.ppm),
                          m2px(pt.y, design.field.ppm),
                        ])}
                        stroke="#38bdf8"
                        strokeWidth={
                          m2px((s as any).strokeWidth ?? 0.15, design.field.ppm) +
                          3
                        }
                        lineCap="round"
                        opacity={0.35}
                      />
                    )}

                    {allowInteraction &&
                      ((s as any).points as any[]).map((p: any, idx: number) => {
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
                            onDragMove={(e) => {
                              const nx = snapPx(e.target.x());
                              const ny = snapPx(e.target.y());
                              e.target.position({ x: nx, y: ny });
                            }}
                            onDragEnd={(e) => {
                              const ppm = design.field.ppm;
                              const nx = px2m(snapPx(e.target.x()), ppm);
                              const ny = px2m(snapPx(e.target.y()), ppm);
                              const pts = [...(s as any).points];
                              pts[idx] = { ...pts[idx], x: nx, y: ny };
                              updateShape(s.id, { points: pts } as any);
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

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>
          Grid {design.field.gridStep.toFixed(1)} m • Scale {design.field.ppm} px/m
        </span>
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
