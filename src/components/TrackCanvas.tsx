"use client";
import { Stage, Layer, Rect, Circle, Line, Text, Group } from "react-konva";
import { useRef, useState, useMemo, useEffect } from "react";
import { useEditor } from "@/store/editor";
import { m2px, px2m } from "@/lib/units";
import { zToColor, zRangeForDesign } from "@/lib/alt";
import { JSX } from "react/jsx-runtime";

export default function TrackCanvas() {
  const { design, selection, setSelection, updateShape } = useEditor();
  const stageRef = useRef<any>(null);
  const [vertexSel, setVertexSel] = useState<{
    shapeId: string;
    idx: number;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Backspace" || e.key === "Delete") && vertexSel) {
        const s = design.shapes.find((sh) => sh.id === vertexSel.shapeId);
        if (s?.kind === "polyline") {
          const pts = [...(s as any).points];
          if (pts.length > 2) {
            pts.splice(vertexSel.idx, 1);
            updateShape(s.id, { points: pts } as any);
            setVertexSel(null);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vertexSel, design, updateShape]);

  const widthPx = useMemo(
    () => m2px(design.field.width, design.field.ppm),
    [design.field]
  );
  const heightPx = useMemo(
    () => m2px(design.field.height, design.field.ppm),
    [design.field]
  );

  const grid: JSX.Element[] = [];
  const step = m2px(design.field.gridStep, design.field.ppm);
  const snapPx = (v: number) => Math.round(v / step) * step;

  for (let x = 0; x <= widthPx; x += step)
    grid.push(
      <Line key={`vx-${x}`} points={[x, 0, x, heightPx]} stroke="#eee" />
    );
  for (let y = 0; y <= heightPx; y += step)
    grid.push(
      <Line key={`hz-${y}`} points={[0, y, widthPx, y]} stroke="#eee" />
    );

  const [zmin, zmax] = zRangeForDesign(design);

  return (
    <Stage
      width={widthPx}
      height={heightPx}
      ref={stageRef}
      draggable
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) {
          setSelection([]);
          setVertexSel(null);
        }
      }}
    >
      <Layer listening={false}>
        <Rect
          x={0}
          y={0}
          width={widthPx}
          height={heightPx}
          fill="#fafafa"
          stroke="#ccc"
        />
        {grid}
      </Layer>

      <Layer>
        {design.shapes.map((s) => {
          const base = (
            <Group
              key={s.id}
              x={m2px(s.x, design.field.ppm)}
              y={m2px(s.y, design.field.ppm)}
              rotation={s.rotation}
              draggable={!s.locked}
              onDragEnd={(e) => {
                const { x, y } = e.target.position();
                const ppm = design.field.ppm;
                const gx = snapPx(x);
                const gy = snapPx(y);
                e.target.position({ x: gx, y: gy });
                updateShape(s.id, { x: gx / ppm, y: gy / ppm });
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelection([s.id]);
              }}
            >
              {s.kind === "gate" && (
                <Rect
                  width={m2px((s as any).width, design.field.ppm)}
                  height={m2px((s as any).height, design.field.ppm)}
                  offsetX={m2px((s as any).width, design.field.ppm) / 2}
                  offsetY={m2px((s as any).height, design.field.ppm) / 2}
                  fill="transparent"
                  stroke={s.color || "#1f2937"}
                  dashEnabled
                />
              )}

              {s.kind === "flag" && (
                <>
                  <Circle
                    radius={m2px((s as any).radius, design.field.ppm)}
                    stroke={s.color || "#7c3aed"}
                  />
                  <Line
                    points={[
                      0,
                      0,
                      0,
                      -m2px((s as any).poleHeight ?? 2, design.field.ppm),
                    ]}
                    stroke={s.color || "#7c3aed"}
                  />
                </>
              )}

              {s.kind === "cone" && (
                <Circle
                  radius={m2px((s as any).radius, design.field.ppm)}
                  fill={s.color || "#f59e0b"}
                  opacity={0.6}
                />
              )}

              {s.kind === "label" && (
                <Text
                  text={(s as any).text}
                  fontSize={(s as any).fontSize ?? 14}
                  fill={s.color || "#111827"}
                  offsetY={8}
                />
              )}

              {s.kind === "polyline" && (
                <>
                  {((s as any).points as any[])
                    .slice(0, -1)
                    .map((p: any, i: number) => {
                      const p2 = (s as any).points[i + 1];
                      const z1 = p.z ?? 0,
                        z2 = p2.z ?? 0;
                      const color = zToColor((z1 + z2) / 2, zmin, zmax);
                      return (
                        <Line
                          key={`${s.id}-seg-${i}`}
                          points={[
                            m2px(p.x, design.field.ppm),
                            m2px(p.y, design.field.ppm),
                            m2px(p2.x, design.field.ppm),
                            m2px(p2.y, design.field.ppm),
                          ]}
                          stroke={color}
                          strokeWidth={m2px(
                            (s as any).strokeWidth ?? 0.15,
                            design.field.ppm
                          )}
                          lineCap="round"
                          lineJoin="round"
                        />
                      );
                    })}

                  {/* Vertex handles (select polyline en versleep punten) */}
                  {((s as any).points as any[]).map((p: any, idx: number) => {
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
      </Layer>
    </Stage>
  );
}
