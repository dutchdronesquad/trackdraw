"use client";

import type { Dispatch, SetStateAction } from "react";
import ElevationChart from "@/components/ElevationChart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import type { FieldSpec, Shape, TrackDesign } from "@/lib/types";
import {
  Copy,
  Lock,
  LockOpen,
  Plus,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import {
  fmt,
  IconBtn,
  Num,
  PanelHeader,
  Row,
  Section,
} from "@/components/inspector/shared";

type DesignMetaPatch = Partial<
  Pick<TrackDesign, "title" | "description" | "authorName" | "tags">
>;

interface EmptyInspectorViewProps {
  design: TrackDesign;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (patch: DesignMetaPatch) => void;
}

export function EmptyInspectorView({
  design,
  updateField,
  updateDesignMeta,
}: EmptyInspectorViewProps) {
  return (
    <div className="flex h-full flex-col">
      <PanelHeader title="Design" />
      <ScrollArea className="flex-1">
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <div>
            <p className="text-muted-foreground/50 mb-1.5 text-[10px] font-medium tracking-[0.08em] uppercase">
              Title
            </p>
            <Input
              value={design.title}
              onChange={(event) =>
                updateDesignMeta({ title: event.target.value })
              }
              placeholder="Untitled Track"
              className="bg-muted/40 border-border/40 h-9 text-sm lg:h-7"
            />
          </div>

          <Section title="Field">
            <Row label="Width (m)">
              <Num
                value={design.field.width}
                onChange={(value) => updateField({ width: value })}
                step={0.5}
                min={5}
              />
            </Row>
            <Row label="Height (m)">
              <Num
                value={design.field.height}
                onChange={(value) => updateField({ height: value })}
                step={0.5}
                min={5}
              />
            </Row>
            <Row label="Grid (m)">
              <Num
                value={design.field.gridStep}
                onChange={(value) => updateField({ gridStep: value })}
                step={0.5}
                min={0.5}
              />
            </Row>
            <Row label="Scale (px/m)">
              <Num
                value={design.field.ppm}
                onChange={(value) => updateField({ ppm: value })}
                step={5}
                min={5}
              />
            </Row>
          </Section>

          <Section title="Info">
            <Row label="Elements">
              <span className="text-foreground font-mono text-[11px]">
                {design.shapes.length}
              </span>
            </Row>
            <Row label="Size">
              <span className="text-foreground font-mono text-[11px]">
                {design.field.width}×{design.field.height} m
              </span>
            </Row>
          </Section>

          <div className="border-border/40 rounded-lg border border-dashed p-3 text-center">
            <p className="text-muted-foreground/40 text-[11px]">
              Click a shape to inspect it
            </p>
          </div>
        </div>
      </ScrollArea>
      <ElevationChart />
    </div>
  );
}

interface MultiInspectorViewProps {
  selectedShapes: Shape[];
  selection: string[];
  duplicateShapes: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setSelection: Dispatch<SetStateAction<string[]>> | ((ids: string[]) => void);
}

export function MultiInspectorView({
  selectedShapes,
  selection,
  duplicateShapes,
  removeShapes,
  setSelection,
}: MultiInspectorViewProps) {
  const kinds = selectedShapes.reduce<Record<Shape["kind"], number>>(
    (accumulator, shape) => {
      accumulator[shape.kind] = (accumulator[shape.kind] ?? 0) + 1;
      return accumulator;
    },
    {
      gate: 0,
      flag: 0,
      cone: 0,
      label: 0,
      polyline: 0,
      startfinish: 0,
      checkpoint: 0,
      ladder: 0,
      divegate: 0,
    }
  );

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={`${selectedShapes.length} selected`}
        actions={
          <>
            <IconBtn
              onClick={() => duplicateShapes(selection)}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                removeShapes(selection);
                setSelection([]);
              }}
              title="Delete"
              danger
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </>
        }
      />
      <div className="space-y-3 p-4 lg:space-y-2 lg:p-3">
        <div className="grid grid-cols-2 gap-2 lg:gap-1">
          {Object.entries(kinds)
            .filter(([, count]) => count > 0)
            .map(([kind, count]) => (
              <div
                key={kind}
                className="border-border/60 bg-muted/30 rounded-md border px-2.5 py-2"
              >
                <p className="text-muted-foreground text-[9px] tracking-wider uppercase">
                  {shapeKindLabels[kind as Shape["kind"]]}
                </p>
                <p className="text-sm font-semibold">{count}×</p>
              </div>
            ))}
        </div>
      </div>
      <ElevationChart />
    </div>
  );
}

interface SingleInspectorViewProps {
  shape: Shape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  duplicateShapes: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
}

export function SingleInspectorView({
  shape,
  updateShape,
  duplicateShapes,
  removeShapes,
  setSelection,
  setHoveredWaypoint,
}: SingleInspectorViewProps) {
  const defaultColor = shape.color ?? "#3b82f6";

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={shapeKindLabels[shape.kind]}
        actions={
          <>
            <IconBtn
              onClick={() => updateShape(shape.id, { locked: !shape.locked })}
              title={shape.locked ? "Unlock" : "Lock"}
            >
              {shape.locked ? (
                <Lock className="size-3 text-amber-400" />
              ) : (
                <LockOpen className="size-3" />
              )}
            </IconBtn>
            <IconBtn
              onClick={() => duplicateShapes([shape.id])}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                removeShapes([shape.id]);
                setSelection([]);
              }}
              title="Delete"
              danger
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </>
        }
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <Section title="Transform">
            <Row label="X">
              <Num
                value={fmt(shape.x)}
                onChange={(value) => updateShape(shape.id, { x: value })}
              />
            </Row>
            <Row label="Y">
              <Num
                value={fmt(shape.y)}
                onChange={(value) => updateShape(shape.id, { y: value })}
              />
            </Row>
            <Row label="Rotation">
              <Num
                value={shape.rotation}
                onChange={(value) => updateShape(shape.id, { rotation: value })}
                step={1}
              />
            </Row>
            <Row label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="border-border/40 size-9 cursor-pointer rounded-md border bg-transparent lg:size-6 lg:rounded"
                  value={defaultColor}
                  onChange={(event) =>
                    updateShape(shape.id, { color: event.target.value })
                  }
                />
                <span className="text-muted-foreground font-mono text-[11px]">
                  {defaultColor}
                </span>
              </div>
            </Row>
          </Section>

          {shape.kind === "gate" && (
            <Section title="Gate">
              <Row label="Width">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height">
                <Num
                  value={shape.height}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={shape.thick ?? 0.2}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "flag" && (
            <Section title="Flag">
              <Row label="Radius">
                <Num
                  value={shape.radius}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Pole height">
                <Num
                  value={shape.poleHeight ?? 3.5}
                  onChange={(value) =>
                    updateShape(shape.id, { poleHeight: value })
                  }
                  step={0.1}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "cone" && (
            <Section title="Cone">
              <Row label="Radius">
                <Num
                  value={shape.radius}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "label" && (
            <Section title="Label">
              <Row label="Text">
                <textarea
                  rows={2}
                  className="border-border/40 bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-ring/30 w-full resize-none rounded-md border px-3 py-2 text-xs focus-visible:ring-1 focus-visible:outline-none lg:rounded lg:px-2 lg:py-1 lg:text-[11px]"
                  value={shape.text}
                  onChange={(event) =>
                    updateShape(shape.id, { text: event.target.value })
                  }
                />
              </Row>
              <Row label="Font size">
                <Num
                  value={shape.fontSize ?? 18}
                  onChange={(value) =>
                    updateShape(shape.id, { fontSize: value })
                  }
                  step={1}
                  min={8}
                />
              </Row>
              <Row label="3D mode">
                <select
                  className="border-border/40 bg-muted/40 text-foreground h-9 w-full rounded-md border px-3 py-1 text-xs focus-visible:outline-none lg:h-7 lg:rounded lg:px-2 lg:text-[11px]"
                  value={shape.project ? "ground" : "float"}
                  onChange={(event) =>
                    updateShape(shape.id, {
                      project: event.target.value === "ground",
                    })
                  }
                >
                  <option value="float">Float (billboard)</option>
                  <option value="ground">Project on ground</option>
                </select>
              </Row>
            </Section>
          )}

          {shape.kind === "startfinish" && (
            <Section title="Start Pads">
              <Row label="Width">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "checkpoint" && (
            <Section title="Checkpoint">
              <Row label="Width">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "ladder" && (
            <Section title="Ladder">
              <Row label="Width (m)">
                <Num
                  value={shape.width}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Height (m)">
                <Num
                  value={shape.height}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Gates">
                <Num
                  value={shape.rungs}
                  onChange={(value) => {
                    const clampedRungs = Math.round(
                      Math.max(1, Math.min(10, value))
                    );
                    updateShape(shape.id, {
                      rungs: clampedRungs,
                      height: clampedRungs * 1.5,
                    });
                  }}
                  step={1}
                  min={1}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "divegate" && (
            <Section title="Dive Gate">
              <Row label="Size (m)">
                <Num
                  value={shape.size}
                  onChange={(value) => updateShape(shape.id, { size: value })}
                  step={0.1}
                  min={0.5}
                />
              </Row>
              <Row label="Elevation (m)">
                <Num
                  value={shape.elevation ?? 3}
                  onChange={(value) =>
                    updateShape(shape.id, { elevation: value })
                  }
                  step={0.1}
                  min={0.1}
                />
              </Row>
              <Row label="Thickness">
                <Num
                  value={shape.thick ?? 0.2}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Tilt (°)">
                <Num
                  value={shape.tilt ?? 0}
                  onChange={(value) =>
                    updateShape(shape.id, {
                      tilt: Math.round(Math.max(0, Math.min(90, value))),
                    })
                  }
                  step={5}
                  min={0}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "polyline" && (
            <Section title="Race Line">
              <Row label="Stroke">
                <Num
                  value={shape.strokeWidth ?? 0.18}
                  onChange={(value) =>
                    updateShape(shape.id, { strokeWidth: value })
                  }
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Smooth">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-foreground size-4 lg:size-3"
                    checked={shape.smooth ?? true}
                    onChange={(event) =>
                      updateShape(shape.id, { smooth: event.target.checked })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">on</span>
                </label>
              </Row>
              <Row label="Arrows">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-foreground size-4 lg:size-3"
                    checked={Boolean(shape.showArrows)}
                    onChange={(event) =>
                      updateShape(shape.id, {
                        showArrows: event.target.checked,
                      })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">
                    show
                  </span>
                </label>
              </Row>

              <div className="border-border/50 bg-background/60 mt-2 overflow-hidden rounded-xl border">
                <div className="border-border/40 bg-muted/20 flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber-400/80" />
                    <span className="text-foreground/70 text-[11px] font-semibold">
                      {shape.points.length} waypoints
                    </span>
                  </div>
                  <div className="flex gap-3 pr-0.5">
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      x, y
                    </span>
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      elev
                    </span>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto lg:max-h-56">
                  {shape.points.map((point, index) => (
                    <div
                      key={index}
                      className="group/row border-border/20 relative flex items-center gap-2.5 border-b py-2 pr-3 pl-3 transition-colors last:border-b-0 hover:bg-amber-500/5 lg:py-1 lg:pr-2"
                      onMouseEnter={() =>
                        setHoveredWaypoint({ shapeId: shape.id, idx: index })
                      }
                      onMouseLeave={() => setHoveredWaypoint(null)}
                    >
                      <span className="absolute top-0 bottom-0 left-0 w-0.5 rounded-r-full bg-amber-400 opacity-0 transition-opacity group-hover/row:opacity-100" />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/15 text-[10px] leading-none font-bold text-amber-400 tabular-nums lg:size-5">
                        {index}
                      </span>
                      <span className="text-foreground/60 flex-1 font-mono text-[11px] leading-none tabular-nums">
                        {point.x.toFixed(1)},&thinsp;{point.y.toFixed(1)}
                      </span>
                      <input
                        type="number"
                        step={0.5}
                        title="Elevation (m)"
                        className="text-foreground/70 focus:bg-muted/40 focus:text-foreground hover:border-border/40 h-8 w-16 rounded-md border border-transparent bg-transparent px-2 py-1 text-right font-mono text-xs transition-colors focus:border-amber-400/50 focus:outline-none lg:h-auto lg:w-14 lg:px-1.5 lg:py-0.5 lg:text-[11px]"
                        value={point.z ?? 0}
                        onChange={(event) => {
                          const nextPoints = [...shape.points];
                          nextPoints[index] = {
                            ...nextPoints[index],
                            z: +event.target.value,
                          };
                          updateShape(shape.id, { points: nextPoints });
                        }}
                      />
                      <div className="flex w-[52px] shrink-0 items-center justify-end gap-1 opacity-100 transition-opacity lg:w-[42px] lg:gap-0.5 lg:opacity-0 lg:group-hover/row:opacity-100">
                        {index < shape.points.length - 1 && (
                          <button
                            title="Insert point after"
                            className="text-muted-foreground/50 hover:text-primary hover:bg-primary/10 flex size-6 items-center justify-center rounded-md transition-colors lg:size-5 lg:rounded"
                            onClick={() => {
                              const current = shape.points[index];
                              const next = shape.points[index + 1];
                              const midpoint = {
                                x: +((current.x + next.x) / 2).toFixed(2),
                                y: +((current.y + next.y) / 2).toFixed(2),
                                z: +(
                                  ((current.z ?? 0) + (next.z ?? 0)) /
                                  2
                                ).toFixed(2),
                              };
                              const nextPoints = [...shape.points];
                              nextPoints.splice(index + 1, 0, midpoint);
                              updateShape(shape.id, { points: nextPoints });
                            }}
                          >
                            <PlusCircle className="size-3" />
                          </button>
                        )}
                        <button
                          title="Remove point"
                          className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex size-6 items-center justify-center rounded-md transition-colors lg:size-5 lg:rounded"
                          onClick={() => {
                            if (shape.points.length <= 2) return;
                            const nextPoints = shape.points.filter(
                              (_, pointIndex) => pointIndex !== index
                            );
                            updateShape(shape.id, { points: nextPoints });
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  className="border-border/40 text-muted-foreground/60 hover:text-foreground hover:bg-muted/20 flex h-10 w-full items-center justify-center gap-1.5 border-t py-2 text-xs font-medium transition-colors lg:h-auto lg:text-[11px]"
                  onClick={() => {
                    const points = [...shape.points];
                    const lastPoint = points[points.length - 1] ?? {
                      x: 0,
                      y: 0,
                      z: 0,
                    };
                    points.push({
                      x: +(lastPoint.x + 1).toFixed(2),
                      y: +(lastPoint.y + 1).toFixed(2),
                      z: lastPoint.z ?? 0,
                    });
                    updateShape(shape.id, { points });
                  }}
                >
                  <Plus className="size-3" /> Add point
                </button>
              </div>
            </Section>
          )}
        </div>
      </ScrollArea>

      <ElevationChart />
    </div>
  );
}
