"use client";

import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import { getShapeGroupId, getShapeGroupName } from "@/lib/shape-groups";
import type { PolylinePoint, Shape } from "@/lib/types";
import {
  Copy,
  FlipHorizontal2,
  Lock,
  LockOpen,
  PencilLine,
  Plus,
  PlusCircle,
  Scan,
  Trash2,
  Ungroup,
  X,
} from "lucide-react";
import {
  fmt,
  IconBtn,
  Num,
  Row,
  Section,
  useInspectorInputBatch,
} from "@/components/inspector/shared";
import {
  InspectorFooterDesktop,
  InspectorFooterMobile,
  InspectorLead,
  InspectorScrollBody,
} from "./layout";
import { ListPanel } from "./list-panel";

export interface SingleInspectorViewProps {
  shape: Shape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  setShapesLocked: (ids: string[], locked: boolean) => void;
  updatePolylinePoint: (
    id: string,
    index: number,
    patch: Partial<PolylinePoint>
  ) => void;
  insertPolylinePoint: (
    id: string,
    index: number,
    point: PolylinePoint
  ) => void;
  removePolylinePoint: (id: string, index: number) => void;
  appendPolylinePoint: (id: string, point: PolylinePoint) => void;
  reversePolylinePoints: (id: string) => void;
  closePolyline: (id: string) => boolean;
  duplicateShapes: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setGroupName: (ids: string[], name: string) => void;
  setSelection: (ids: string[]) => void;
  ungroupSelection: (ids: string[]) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
  onResumeSelectedPath?: (shapeId: string) => void;
  mobileInline?: boolean;
}

export function SingleInspectorView({
  shape,
  updateShape,
  setShapesLocked,
  updatePolylinePoint,
  insertPolylinePoint,
  removePolylinePoint,
  appendPolylinePoint,
  reversePolylinePoints,
  closePolyline,
  duplicateShapes,
  removeShapes,
  setGroupName,
  setSelection,
  ungroupSelection,
  setHoveredWaypoint,
  onResumeSelectedPath,
  mobileInline = false,
}: SingleInspectorViewProps) {
  const { startBatch, finishBatch } = useInspectorInputBatch();
  const defaultColor = shape.color ?? "#3b82f6";
  const polylineAnchor =
    shape.kind === "polyline" && shape.points.length
      ? shape.points.reduce(
          (accumulator, point) => ({
            x: accumulator.x + point.x,
            y: accumulator.y + point.y,
          }),
          { x: 0, y: 0 }
        )
      : null;
  const anchorPosition =
    polylineAnchor && shape.kind === "polyline"
      ? {
          x: polylineAnchor.x / shape.points.length,
          y: polylineAnchor.y / shape.points.length,
        }
      : { x: shape.x, y: shape.y };
  const shapeDisplayName = shape.name?.trim() || shapeKindLabels[shape.kind];
  const groupId = getShapeGroupId(shape);
  const groupName = getShapeGroupName(shape) ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <InspectorLead
            title={shapeDisplayName}
            subtitle={`Editing ${shapeKindLabels[shape.kind].toLowerCase()} properties and placement.`}
            meta={[
              shapeKindLabels[shape.kind],
              `${fmt(anchorPosition.x)}, ${fmt(anchorPosition.y)}`,
              ...(groupId ? [groupName || "grouped"] : []),
              shape.locked ? "locked" : "editable",
            ]}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <IconBtn
              onClick={() => setShapesLocked([shape.id], !shape.locked)}
              title={shape.locked ? "Unlock" : "Lock"}
              label={shape.locked ? "Unlock" : "Lock"}
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
              label="Duplicate"
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
              label="Delete"
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </div>
          {groupId && (
            <Section title="Group">
              <Row label="Group name">
                <Input
                  value={groupName}
                  onFocus={startBatch}
                  onBlur={finishBatch}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  onChange={(event) =>
                    setGroupName([shape.id], event.target.value)
                  }
                  placeholder="Optional group name"
                  className="bg-muted/50 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
                />
              </Row>
              <div className="pt-1">
                <IconBtn
                  onClick={() => ungroupSelection([shape.id])}
                  title="Ungroup"
                  label="Ungroup"
                >
                  <Ungroup className="size-3" />
                </IconBtn>
              </div>
            </Section>
          )}
          <Section title="Transform">
            <Row label="Name">
              <Input
                value={shape.name ?? ""}
                onFocus={startBatch}
                onBlur={finishBatch}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                onChange={(event) =>
                  updateShape(shape.id, { name: event.target.value })
                }
                placeholder={`${shapeKindLabels[shape.kind]} name`}
                className="bg-muted/50 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
              />
            </Row>
            <Row label="X">
              <Num
                value={fmt(anchorPosition.x)}
                onChange={(value) => updateShape(shape.id, { x: value })}
              />
            </Row>
            <Row label="Y">
              <Num
                value={fmt(anchorPosition.y)}
                onChange={(value) => updateShape(shape.id, { y: value })}
              />
            </Row>
            {shape.kind !== "cone" && (
              <Row label="Rotation">
                <Num
                  value={shape.rotation}
                  onChange={(value) =>
                    updateShape(shape.id, { rotation: value })
                  }
                  step={1}
                />
              </Row>
            )}
            <Row label="Color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="border-border/40 size-9 cursor-pointer rounded-md border bg-transparent lg:size-6 lg:rounded"
                  value={defaultColor}
                  onFocus={startBatch}
                  onBlur={finishBatch}
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
                  className="border-border/40 bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-ring/30 w-full resize-none rounded-md border px-3 py-2 text-xs focus-visible:ring-1 focus-visible:outline-hidden lg:rounded lg:px-2 lg:py-1 lg:text-[11px]"
                  value={shape.text}
                  onFocus={startBatch}
                  onBlur={finishBatch}
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
                  className="border-border/40 bg-muted/40 text-foreground h-9 w-full rounded-md border px-3 py-1 text-xs focus-visible:outline-hidden lg:h-7 lg:rounded lg:px-2 lg:text-[11px]"
                  value={shape.project ? "ground" : "float"}
                  onFocus={startBatch}
                  onBlur={finishBatch}
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
                  value={shape.strokeWidth ?? 0.26}
                  onChange={(value) =>
                    updateShape(shape.id, { strokeWidth: value })
                  }
                  step={0.05}
                  min={0.05}
                />
              </Row>
              <Row label="Flow">
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
                    show direction
                  </span>
                </label>
              </Row>
              {shape.showArrows && (
                <Row label="Every (m)">
                  <Num
                    value={shape.arrowSpacing ?? 15}
                    onChange={(value) =>
                      updateShape(shape.id, {
                        arrowSpacing: Math.max(1, Math.round(value * 2) / 2),
                      })
                    }
                    step={0.5}
                    min={1}
                  />
                </Row>
              )}
              <div className="border-border/15 mt-3 border-t pt-3">
                <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
                  {onResumeSelectedPath ? (
                    <button
                      className="border-border/35 bg-primary/6 text-primary hover:bg-primary/10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors lg:h-7"
                      onClick={() => onResumeSelectedPath(shape.id)}
                    >
                      <PencilLine className="size-3" />
                      Continue editing
                    </button>
                  ) : null}
                  <button
                    className="border-border/35 hover:bg-muted/10 text-foreground/75 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors lg:h-7"
                    onClick={() => {
                      reversePolylinePoints(shape.id);
                    }}
                  >
                    <FlipHorizontal2 className="size-3" />
                    Flip path
                  </button>
                  {!shape.closed && shape.points.length >= 3 && (
                    <button
                      className="border-border/35 hover:bg-muted/10 text-foreground/75 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors lg:h-7"
                      onClick={() => closePolyline(shape.id)}
                    >
                      <Scan className="size-3" />
                      Close loop
                    </button>
                  )}
                </div>
              </div>

              <InspectorFooterMobile>
                <ElevationChart />
              </InspectorFooterMobile>

              <div className="mt-3">
                <ListPanel
                  title="Waypoints"
                  subtitle="Adjust each point and its elevation."
                  meta={
                    <span className="text-muted-foreground/65 text-[11px]">
                      {shape.points.length}
                    </span>
                  }
                >
                  <div className="border-border/15 grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b px-3 py-1.5">
                    <span className="text-muted-foreground/65 text-[11px] font-medium tracking-[0.08em] uppercase">
                      #
                    </span>
                    <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
                      x, y
                    </span>
                    <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
                      elev
                    </span>
                    <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
                      edit
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {shape.points.map((point, index) => (
                      <div
                        key={index}
                        className="group/row border-border/10 hover:bg-primary/6 relative grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b py-2 pr-3 pl-3 transition-colors last:border-b-0 lg:py-1.5 lg:pr-2"
                        onMouseEnter={() =>
                          setHoveredWaypoint({ shapeId: shape.id, idx: index })
                        }
                        onMouseLeave={() => setHoveredWaypoint(null)}
                      >
                        <span className="bg-primary/40 absolute top-0 bottom-0 left-0 w-px opacity-0 transition-opacity group-hover/row:opacity-100" />
                        <span className="border-border/30 bg-primary/8 text-primary/80 flex h-5 w-5 items-center justify-center rounded-xs border font-mono text-[10px] tabular-nums">
                          {index}
                        </span>
                        <div className="min-w-0">
                          <span className="text-foreground/85 block font-mono text-[11px] leading-none tabular-nums">
                            {point.x.toFixed(1)}, {point.y.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="number"
                          step={0.5}
                          title="Elevation (m)"
                          className="text-foreground/90 focus:bg-primary/6 focus:text-foreground hover:border-border/25 focus:border-primary/30 h-7 w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] transition-colors focus:outline-hidden"
                          value={point.z ?? 0}
                          onFocus={startBatch}
                          onBlur={finishBatch}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                          onChange={(event) => {
                            updatePolylinePoint(shape.id, index, {
                              z: +event.target.value,
                            });
                          }}
                        />
                        <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/row:opacity-100">
                          {index < shape.points.length - 1 && (
                            <button
                              title="Insert point after"
                              className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
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
                                insertPolylinePoint(
                                  shape.id,
                                  index + 1,
                                  midpoint
                                );
                              }}
                            >
                              <PlusCircle className="size-3" />
                            </button>
                          )}
                          <button
                            title="Remove point"
                            className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
                            onClick={() => {
                              removePolylinePoint(shape.id, index);
                            }}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="border-border/15 text-muted-foreground/55 hover:text-foreground hover:bg-muted/6 flex h-10 w-full items-center justify-center gap-1.5 border-t py-2 text-xs font-medium transition-colors lg:h-auto lg:text-[11px]"
                    onClick={() => {
                      const lastPoint = shape.points[
                        shape.points.length - 1
                      ] ?? {
                        x: 0,
                        y: 0,
                        z: 0,
                      };
                      appendPolylinePoint(shape.id, {
                        x: +(lastPoint.x + 1).toFixed(2),
                        y: +(lastPoint.y + 1).toFixed(2),
                        z: lastPoint.z ?? 0,
                      });
                    }}
                  >
                    <Plus className="size-3" /> Add point
                  </button>
                </ListPanel>
              </div>
            </Section>
          )}
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}
