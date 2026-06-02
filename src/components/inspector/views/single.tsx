"use client";

import { useState } from "react";
import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { shapeKindLabels } from "@/lib/editor-tools";
import { getSingleInspectorViewModel } from "@/lib/inspector/single/view-model";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import {
  getShapeTimingMarker,
  getTimingMarkerMeta,
  isTimingMarkerShape,
  type TimingRole,
} from "@/lib/track/timing";
import type { PolylinePoint, Shape } from "@/lib/types";
import {
  Copy,
  Link2,
  Lock,
  LockOpen,
  PencilLine,
  Trash2,
  Ungroup,
} from "lucide-react";
import {
  fmt,
  IconBtn,
  MeasurementNum,
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
import { PolylineWaypointList } from "./polyline/PolylineWaypointList";

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
  const { unitSystem } = useMeasurementUnitSystem();
  const unitLabel = unitSystem === "imperial" ? "ft" : "m";
  const [directionReversedByShape, setDirectionReversedByShape] = useState<
    Record<string, boolean>
  >({});
  const {
    actionBtnClass,
    actionBtnPrimaryClass,
    anchorPosition,
    defaultColor,
    groupId,
    groupName,
    shapeDisplayName,
    shapeKindLabel,
    showPathActions: showDefaultPathActions,
  } = getSingleInspectorViewModel(shape);
  const directionReversed = Boolean(directionReversedByShape[shape.id]);
  const showPathActions =
    shape.kind === "polyline" &&
    (Boolean(onResumeSelectedPath) || showDefaultPathActions);
  const timingMarker = getShapeTimingMarker(shape);
  const canSetTimingMarker = isTimingMarkerShape(shape);
  const secondarySectionDefaultOpen = !mobileInline;
  const timingSectionDefaultOpen = !mobileInline || Boolean(timingMarker);
  const timingRoleOptions: Array<{
    label: string;
    role: TimingRole | "none";
  }> = [
    { label: "Off", role: "none" },
    { label: "Start", role: "start_finish" },
    { label: "Split", role: "split" },
  ];
  const updateTimingMarker = (
    marker: {
      role: TimingRole;
      timingId?: string;
    } | null
  ) => {
    updateShape(shape.id, {
      meta: getTimingMarkerMeta(shape.meta, marker),
    } as Partial<Shape>);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <InspectorLead
            title={shapeDisplayName}
            subtitle={`Editing ${shapeKindLabel.toLowerCase()} properties and placement.`}
            meta={[
              shapeKindLabel,
              `${fmt(anchorPosition.x)}, ${fmt(anchorPosition.y)}`,
              ...(timingMarker
                ? [
                    timingMarker.role === "start_finish"
                      ? "timing: start"
                      : `timing: ${timingMarker.timingId || "split"}`,
                  ]
                : []),
              ...(groupId ? [groupName || "grouped"] : []),
              shape.locked ? "locked" : "editable",
            ]}
          />
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setShapesLocked([shape.id], !shape.locked)}
                title={shape.locked ? "Unlock" : "Lock"}
                aria-label={shape.locked ? "Unlock" : "Lock"}
                className={actionBtnClass}
              >
                {shape.locked ? (
                  <Lock className="size-3 text-amber-400" />
                ) : (
                  <LockOpen className="size-3" />
                )}
                <span>{shape.locked ? "Unlock" : "Lock"}</span>
              </button>
              <button
                type="button"
                onClick={() => duplicateShapes([shape.id])}
                title="Duplicate"
                aria-label="Duplicate"
                className={actionBtnClass}
              >
                <Copy className="size-3" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeShapes([shape.id]);
                  setSelection([]);
                }}
                title="Delete"
                aria-label="Delete"
                className={`${actionBtnClass} border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/12`}
              >
                <Trash2 className="size-3" />
                <span>Delete</span>
              </button>
            </div>
            {showPathActions ? (
              <div className="grid grid-cols-2 gap-1.5">
                {onResumeSelectedPath ? (
                  <button
                    type="button"
                    onClick={() => onResumeSelectedPath(shape.id)}
                    title="Continue editing"
                    aria-label="Continue editing"
                    disabled={shape.locked}
                    className={`${actionBtnPrimaryClass} w-full`}
                  >
                    <PencilLine className="size-3" />
                    <span>Continue editing</span>
                  </button>
                ) : null}
                {!shape.closed && shape.points.length >= 3 ? (
                  <button
                    type="button"
                    onClick={() => closePolyline(shape.id)}
                    title="Connect ends"
                    aria-label="Connect ends"
                    disabled={shape.locked}
                    className={`${actionBtnClass} w-full`}
                  >
                    <Link2 className="size-3" />
                    <span>Connect ends</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {shape.locked ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                Locked on the canvas. Unlock before moving, resizing, or
                continuing path edits.
              </p>
            ) : null}
          </div>
          {groupId && (
            <Section title="Group" defaultOpen={secondarySectionDefaultOpen}>
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
                  className="bg-muted/50 border-border/70 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
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
                className="bg-muted/50 border-border/70 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
              />
            </Row>
            <Row label="Position">
              <div className="grid grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="text-muted-foreground/65 mb-1 block text-[10px] font-semibold tracking-[0.12em] uppercase">
                    X ({unitLabel})
                  </span>
                  <MeasurementNum
                    valueMeters={fmt(anchorPosition.x)}
                    unitSystem={unitSystem}
                    onChange={(value) => updateShape(shape.id, { x: value })}
                  />
                </label>
                <label className="min-w-0">
                  <span className="text-muted-foreground/65 mb-1 block text-[10px] font-semibold tracking-[0.12em] uppercase">
                    Y ({unitLabel})
                  </span>
                  <MeasurementNum
                    valueMeters={fmt(anchorPosition.y)}
                    unitSystem={unitSystem}
                    onChange={(value) => updateShape(shape.id, { y: value })}
                  />
                </label>
              </div>
            </Row>
            {shape.kind !== "cone" && (
              <Row label="Rotation (deg)">
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
                <label className="group relative block cursor-pointer">
                  <span
                    className="border-border/45 block size-9 rounded-lg border shadow-xs transition-transform group-hover:scale-[1.03] lg:size-7"
                    style={{
                      background: `linear-gradient(135deg, ${defaultColor} 0%, color-mix(in oklab, ${defaultColor} 72%, black) 100%)`,
                    }}
                  />
                  <span className="absolute inset-0 rounded-lg ring-1 ring-white/18 ring-inset" />
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={defaultColor}
                    onFocus={startBatch}
                    onBlur={finishBatch}
                    onChange={(event) =>
                      updateShape(shape.id, { color: event.target.value })
                    }
                    aria-label="Pick color"
                  />
                </label>
                <span className="border-border/45 bg-muted/35 text-foreground/78 inline-flex h-8 items-center rounded-lg border px-2.5 font-mono text-[11px] lg:h-7">
                  {defaultColor}
                </span>
              </div>
            </Row>
          </Section>

          {canSetTimingMarker && (
            <Section title="Race timing" defaultOpen={timingSectionDefaultOpen}>
              <Row label="Role">
                <div
                  className="border-border/50 bg-background grid grid-cols-3 overflow-hidden rounded-md border p-0.5"
                  role="group"
                  aria-label="Timing role"
                >
                  {timingRoleOptions.map((option) => {
                    const active =
                      (timingMarker?.role ?? "none") === option.role;
                    return (
                      <button
                        key={option.role}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (option.role === "none") {
                            updateTimingMarker(null);
                            return;
                          }

                          updateTimingMarker({
                            role: option.role,
                            timingId:
                              option.role === "split"
                                ? timingMarker?.timingId
                                : undefined,
                          });
                        }}
                        className={`min-h-9 rounded-[5px] px-2 text-[11px] font-semibold transition-colors lg:min-h-7 ${
                          active
                            ? "bg-foreground text-background shadow-xs"
                            : "text-muted-foreground hover:bg-muted/55 hover:text-foreground"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </Row>
              {timingMarker?.role === "split" ? (
                <Row label="Split ID">
                  <Input
                    value={timingMarker.timingId ?? ""}
                    onFocus={startBatch}
                    onBlur={finishBatch}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                    onChange={(event) =>
                      updateTimingMarker({
                        role: timingMarker.role,
                        timingId: event.target.value,
                      })
                    }
                    placeholder="split-1"
                    className="bg-muted/50 border-border/70 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
                  />
                </Row>
              ) : null}
            </Section>
          )}

          {shape.kind === "gate" && (
            <Section title="Gate" defaultOpen={secondarySectionDefaultOpen}>
              <Row label="Width">
                <MeasurementNum
                  valueMeters={shape.width}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  minMeters={0.5}
                />
              </Row>
              <Row label="Height">
                <MeasurementNum
                  valueMeters={shape.height}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  minMeters={0.5}
                />
              </Row>
              <Row label="Thickness">
                <MeasurementNum
                  valueMeters={shape.thick ?? 0.2}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  minMeters={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "flag" && (
            <Section title="Flag" defaultOpen={secondarySectionDefaultOpen}>
              <Row label="Radius">
                <MeasurementNum
                  valueMeters={shape.radius}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  minMeters={0.05}
                />
              </Row>
              <Row label="Pole height">
                <MeasurementNum
                  valueMeters={shape.poleHeight ?? 3.5}
                  unitSystem={unitSystem}
                  onChange={(value) =>
                    updateShape(shape.id, { poleHeight: value })
                  }
                  minMeters={0}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "cone" && (
            <Section title="Cone" defaultOpen={secondarySectionDefaultOpen}>
              <Row label="Radius">
                <MeasurementNum
                  valueMeters={shape.radius}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { radius: value })}
                  minMeters={0.05}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "label" && (
            <Section title="Label" defaultOpen={secondarySectionDefaultOpen}>
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
              <Row label="Font size (px)">
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
            <Section
              title="Start Pads"
              defaultOpen={secondarySectionDefaultOpen}
            >
              <Row label="Width">
                <MeasurementNum
                  valueMeters={shape.width}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  minMeters={0.5}
                />
              </Row>
            </Section>
          )}

          {shape.kind === "ladder" && (
            <Section title="Ladder" defaultOpen={secondarySectionDefaultOpen}>
              <Row label="Width">
                <MeasurementNum
                  valueMeters={shape.width}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { width: value })}
                  minMeters={0.5}
                />
              </Row>
              <Row label="Height">
                <MeasurementNum
                  valueMeters={shape.height}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { height: value })}
                  minMeters={0.5}
                />
              </Row>
              <Row label="Elevation">
                <MeasurementNum
                  valueMeters={shape.elevation ?? 0}
                  unitSystem={unitSystem}
                  onChange={(value) =>
                    updateShape(shape.id, {
                      elevation: Math.max(0, value),
                    })
                  }
                  minMeters={0}
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
            <Section
              title="Dive Gate"
              defaultOpen={secondarySectionDefaultOpen}
            >
              <Row label="Size">
                <MeasurementNum
                  valueMeters={shape.size}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { size: value })}
                  minMeters={0.5}
                />
              </Row>
              <Row label="Elevation">
                <MeasurementNum
                  valueMeters={shape.elevation ?? 3}
                  unitSystem={unitSystem}
                  onChange={(value) =>
                    updateShape(shape.id, { elevation: value })
                  }
                  minMeters={0.1}
                />
              </Row>
              <Row label="Thickness">
                <MeasurementNum
                  valueMeters={shape.thick ?? 0.2}
                  unitSystem={unitSystem}
                  onChange={(value) => updateShape(shape.id, { thick: value })}
                  minMeters={0.05}
                />
              </Row>
              <Row label="Tilt (deg)">
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
            <Section
              title="Race Line"
              defaultOpen={secondarySectionDefaultOpen}
            >
              <Row label="Stroke width">
                <MeasurementNum
                  valueMeters={shape.strokeWidth ?? 0.26}
                  unitSystem={unitSystem}
                  onChange={(value) =>
                    updateShape(shape.id, { strokeWidth: value })
                  }
                  minMeters={0.05}
                />
              </Row>
              <Row label="Flow">
                <label className="flex h-full cursor-pointer items-center gap-2">
                  <Switch
                    checked={Boolean(shape.showArrows)}
                    onCheckedChange={(checked) =>
                      updateShape(shape.id, {
                        showArrows: checked,
                      })
                    }
                  />
                  <span className="text-muted-foreground text-[11px]">
                    {shape.showArrows ? "visible" : "hidden"}
                  </span>
                </label>
              </Row>
              {shape.showArrows && (
                <Row label="Direction">
                  <div className="flex h-full items-center gap-2">
                    <Switch
                      checked={directionReversed}
                      onCheckedChange={(checked) => {
                        reversePolylinePoints(shape.id);
                        setDirectionReversedByShape((current) => ({
                          ...current,
                          [shape.id]: checked,
                        }));
                      }}
                    />
                    <span className="text-muted-foreground text-[11px]">
                      {directionReversed ? "reversed" : "default"}
                    </span>
                  </div>
                </Row>
              )}
              {shape.showArrows && (
                <Row label="Arrow spacing">
                  <MeasurementNum
                    valueMeters={shape.arrowSpacing ?? 15}
                    unitSystem={unitSystem}
                    onChange={(value) =>
                      updateShape(shape.id, {
                        arrowSpacing: Math.max(1, Math.round(value * 2) / 2),
                      })
                    }
                    minMeters={1}
                  />
                </Row>
              )}
              <InspectorFooterMobile>
                <ElevationChart />
              </InspectorFooterMobile>

              <PolylineWaypointList
                appendPolylinePoint={appendPolylinePoint}
                finishBatch={finishBatch}
                insertPolylinePoint={insertPolylinePoint}
                removePolylinePoint={removePolylinePoint}
                setHoveredWaypoint={setHoveredWaypoint}
                shape={shape}
                startBatch={startBatch}
                updatePolylinePoint={updatePolylinePoint}
              />
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
