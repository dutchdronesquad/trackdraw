"use client";

import { CatalogTypeSection } from "@/components/inspector/catalog/CatalogTypeSection";
import { BarrierDimensionFields } from "@/components/inspector/sections/BarrierSection";
import { ConeDimensionFields } from "@/components/inspector/sections/ConeDimensionFields";
import { DiveGateDimensionFields } from "@/components/inspector/sections/DiveGateDimensionFields";
import { FlagDimensionFields } from "@/components/inspector/sections/FlagDimensionFields";
import { GateDimensionFields } from "@/components/inspector/sections/GateDimensionFields";
import {
  LabelSection,
  LabelTransformField,
} from "@/components/inspector/sections/LabelSection";
import {
  LadderDimensionFields,
  LadderSection,
} from "@/components/inspector/sections/LadderSection";
import { PolylineSection } from "@/components/inspector/sections/PolylineSection";
import { StartFinishDimensionFields } from "@/components/inspector/sections/StartFinishDimensionFields";
import {
  TowerDimensionFields,
  TowerSection,
} from "@/components/inspector/sections/TowerSection";
import { Input } from "@/components/ui/input";
import { buildCatalogTypePatch } from "@/lib/editor/catalog-type-patch";
import {
  getSingleInspectorViewModel,
  inspectorActionBtnClass,
  inspectorActionBtnPrimaryClass,
} from "@/lib/inspector/single/view-model";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import {
  getCatalogEntriesByKind,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import {
  getDefaultCatalogEntryId,
  getShapeKindLabel,
  type Translate,
} from "@/lib/track/items/registry";
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
import ElevationChart from "@/components/inspector/ElevationChart";
import {
  InspectorFooterDesktop,
  InspectorLead,
  InspectorScrollBody,
} from "./layout";
import { useTranslations } from "next-intl";

type SingleCatalogKind =
  | "gate"
  | "flag"
  | "ladder"
  | "tower"
  | "divegate"
  | "barrier";

function getSingleDefaultCatalogEntryId(
  kind: SingleCatalogKind
): TrackElementCatalogId {
  const entryId = getDefaultCatalogEntryId(kind);
  if (!entryId) {
    throw new Error(`Missing default catalog entry for ${kind}`);
  }
  return entryId;
}

function getSingleCatalogKind(shape: Shape): SingleCatalogKind | null {
  if (
    shape.kind === "gate" ||
    shape.kind === "flag" ||
    shape.kind === "ladder" ||
    shape.kind === "tower" ||
    shape.kind === "divegate" ||
    shape.kind === "barrier"
  ) {
    return shape.kind;
  }
  return null;
}

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
  const t = useTranslations("inspector");
  const tCommon = useTranslations("common");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const { startBatch, finishBatch } = useInspectorInputBatch();
  const { unitSystem } = useMeasurementUnitSystem();
  const unitLabel = unitSystem === "imperial" ? "ft" : "m";
  const actionBtnClass = inspectorActionBtnClass;
  const actionBtnPrimaryClass = inspectorActionBtnPrimaryClass;
  const {
    anchorPosition,
    defaultColor,
    groupId,
    groupName,
    shapeDisplayName,
    shapeKindLabel,
    showPathActions: showDefaultPathActions,
  } = getSingleInspectorViewModel(shape, tShapes);
  const showPathActions =
    shape.kind === "polyline" &&
    (Boolean(onResumeSelectedPath) || showDefaultPathActions);
  const timingMarker = getShapeTimingMarker(shape);
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  const catalogEntry = getTrackElementCatalogEntry(catalogIdentity?.elementId);
  const catalogShapeKind = getSingleCatalogKind(shape);
  const catalogEntries = catalogShapeKind
    ? getCatalogEntriesByKind(catalogShapeKind)
    : null;
  const activeCatalogEntryId: TrackElementCatalogId | null = catalogShapeKind
    ? catalogEntry?.kind === catalogShapeKind
      ? (catalogIdentity!.elementId as TrackElementCatalogId)
      : getSingleDefaultCatalogEntryId(catalogShapeKind)
    : null;
  const hasFixedCatalogDimensions =
    catalogShapeKind !== null &&
    catalogEntry?.kind === catalogShapeKind &&
    catalogEntry.editable?.dimensions === false;
  const fixedDiveGateElevationVariant =
    shape.kind === "divegate" &&
    catalogEntry?.kind === "divegate" &&
    (catalogEntry.visual?.variant === "arch" ||
      catalogEntry.visual?.variant === "launch")
      ? catalogEntry.visual.variant
      : "generic";

  const hasFixedCatalogColor =
    catalogIdentity !== null && catalogEntry?.editable?.color === false;
  const canSetTimingMarker = isTimingMarkerShape(shape);
  const secondarySectionDefaultOpen = !mobileInline;
  const timingSectionDefaultOpen = !mobileInline || canSetTimingMarker;
  const timingRoleOptions: Array<{
    label: string;
    role: TimingRole | "none";
  }> = [
    { label: tCommon("status.off"), role: "none" },
    { label: t("raceTiming.roleStart"), role: "start_finish" },
    { label: t("raceTiming.roleSplit"), role: "split" },
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
            subtitle={t("transform.editingSubtitle", {
              kind: shapeKindLabel.toLowerCase(),
            })}
            meta={[
              shapeKindLabel,
              `${fmt(anchorPosition.x)}, ${fmt(anchorPosition.y)}`,
              ...(timingMarker
                ? [
                    timingMarker.role === "start_finish"
                      ? t("raceTiming.metaTimingStart")
                      : t("raceTiming.metaTimingSplit", {
                          id: timingMarker.timingId || "split",
                        }),
                  ]
                : []),
              ...(groupId ? [groupName || t("raceTiming.metaGrouped")] : []),
              shape.locked
                ? t("raceTiming.metaLocked")
                : t("raceTiming.metaEditable"),
            ]}
          />
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setShapesLocked([shape.id], !shape.locked)}
                title={shape.locked ? t("actions.unlock") : t("actions.lock")}
                aria-label={
                  shape.locked ? t("actions.unlock") : t("actions.lock")
                }
                className={`${actionBtnClass} min-w-0`}
              >
                {shape.locked ? (
                  <Lock className="size-3 shrink-0 text-amber-400" />
                ) : (
                  <LockOpen className="size-3 shrink-0" />
                )}
                <span className="truncate">
                  {shape.locked ? t("actions.unlock") : t("actions.lock")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => duplicateShapes([shape.id])}
                title={t("actions.duplicate")}
                aria-label={t("actions.duplicate")}
                className={`${actionBtnClass} min-w-0`}
              >
                <Copy className="size-3 shrink-0" />
                <span className="truncate">{t("actions.duplicate")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  removeShapes([shape.id]);
                  setSelection([]);
                }}
                title={t("actions.delete")}
                aria-label={t("actions.delete")}
                className={`${actionBtnClass} min-w-0 border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/12`}
              >
                <Trash2 className="size-3 shrink-0" />
                <span className="truncate">{t("actions.delete")}</span>
              </button>
            </div>
            {showPathActions ? (
              <div className="grid grid-cols-2 gap-1.5">
                {onResumeSelectedPath ? (
                  <button
                    type="button"
                    onClick={() => onResumeSelectedPath(shape.id)}
                    title={t("actions.continueEditing")}
                    aria-label={t("actions.continueEditing")}
                    disabled={shape.locked}
                    className={`${actionBtnPrimaryClass} w-full min-w-0`}
                  >
                    <PencilLine className="size-3 shrink-0" />
                    <span className="truncate">
                      {t("actions.continueEditing")}
                    </span>
                  </button>
                ) : null}
                {!shape.closed && shape.points.length >= 3 ? (
                  <button
                    type="button"
                    onClick={() => closePolyline(shape.id)}
                    title={t("actions.connectEnds")}
                    aria-label={t("actions.connectEnds")}
                    disabled={shape.locked}
                    className={`${actionBtnClass} w-full min-w-0`}
                  >
                    <Link2 className="size-3 shrink-0" />
                    <span className="truncate">{t("actions.connectEnds")}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {shape.locked ? (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                {t("hints.locked")}
              </p>
            ) : null}
          </div>
          {groupId && (
            <Section
              title={t("group.sectionTitle")}
              defaultOpen={secondarySectionDefaultOpen}
            >
              <Row label={t("group.nameLabel")}>
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
                  placeholder={t("group.namePlaceholder")}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 text-[11px] shadow-none focus-visible:ring-0 lg:h-7 lg:px-2"
                />
              </Row>
              <div className="pt-1">
                <IconBtn
                  onClick={() => ungroupSelection([shape.id])}
                  title={t("actions.ungroup")}
                  label={t("actions.ungroup")}
                >
                  <Ungroup className="size-3" />
                </IconBtn>
              </div>
            </Section>
          )}
          {catalogEntries && activeCatalogEntryId ? (
            <CatalogTypeSection
              activeEntryId={activeCatalogEntryId}
              catalogEntry={catalogEntry}
              catalogIdentity={catalogIdentity}
              disabled={shape.locked}
              entries={catalogEntries}
              onChange={(entryId) => {
                const patch = buildCatalogTypePatch(shape, entryId);
                if (patch) updateShape(shape.id, patch);
              }}
            />
          ) : null}

          {canSetTimingMarker && (
            <Section
              title={t("raceTiming.sectionTitle")}
              defaultOpen={timingSectionDefaultOpen}
            >
              <Row label={tCommon("labels.role")}>
                <div
                  className="border-border/50 bg-background grid grid-cols-3 overflow-hidden rounded-md border p-0.5"
                  role="group"
                  aria-label={t("raceTiming.ariaLabel")}
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
                <Row label={t("raceTiming.splitIdLabel")}>
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
                    placeholder={t("raceTiming.splitIdPlaceholder")}
                    className="bg-muted/50 border-border/70 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-[11px] focus-visible:ring-1 lg:h-7 lg:px-2"
                  />
                </Row>
              ) : null}
            </Section>
          )}

          <Section title={t("transform.sectionTitle")}>
            <Row label={tCommon("labels.name")}>
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
                placeholder={getShapeKindLabel(shape.kind, tShapes)}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="bg-background border-border/50 focus-visible:border-border/80 h-8 rounded-md px-2.5 text-[11px] shadow-none focus-visible:ring-0 lg:h-7 lg:px-2"
              />
            </Row>
            <Row label={t("transform.positionLabel")}>
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
              <Row label={t("transform.rotationLabel")}>
                <Num
                  value={shape.rotation}
                  onChange={(value) =>
                    updateShape(shape.id, { rotation: value })
                  }
                  step={1}
                />
              </Row>
            )}
            {!hasFixedCatalogColor ? (
              <Row label={t("transform.colorLabel")}>
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
                      aria-label={t("transform.pickColorAriaLabel")}
                    />
                  </label>
                  <span className="border-border/45 bg-muted/35 text-foreground/78 inline-flex h-8 items-center rounded-lg border px-2.5 font-mono text-[11px] lg:h-7">
                    {defaultColor}
                  </span>
                </div>
              </Row>
            ) : null}
            {shape.kind === "gate" && (
              <GateDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              />
            )}
            {shape.kind === "flag" && (
              <FlagDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              />
            )}
            {shape.kind === "cone" && (
              <ConeDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
              />
            )}
            {shape.kind === "label" && (
              <LabelTransformField shape={shape} updateShape={updateShape} />
            )}
            {shape.kind === "startfinish" && (
              <StartFinishDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
              />
            )}
            {shape.kind === "ladder" && (
              <LadderDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              />
            )}
            {shape.kind === "tower" && (
              <TowerDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              />
            )}
            {shape.kind === "divegate" && (
              <DiveGateDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
                fixedDiveGateElevationVariant={fixedDiveGateElevationVariant}
              />
            )}
            {shape.kind === "barrier" && (
              <BarrierDimensionFields
                shape={shape}
                unitSystem={unitSystem}
                unitLabel={unitLabel}
                updateShape={updateShape}
                hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              />
            )}
          </Section>

          {shape.kind === "label" && (
            <LabelSection
              shape={shape}
              updateShape={updateShape}
              startBatch={startBatch}
              finishBatch={finishBatch}
              defaultOpen={secondarySectionDefaultOpen}
            />
          )}

          {shape.kind === "ladder" && (
            <LadderSection
              shape={shape}
              updateShape={updateShape}
              hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              defaultOpen={secondarySectionDefaultOpen}
            />
          )}

          {shape.kind === "tower" && (
            <TowerSection
              shape={shape}
              updateShape={updateShape}
              hasFixedCatalogDimensions={hasFixedCatalogDimensions}
              defaultOpen={secondarySectionDefaultOpen}
            />
          )}

          {shape.kind === "polyline" && (
            <PolylineSection
              shape={shape}
              unitSystem={unitSystem}
              unitLabel={unitLabel}
              updateShape={updateShape}
              startBatch={startBatch}
              finishBatch={finishBatch}
              defaultOpen={secondarySectionDefaultOpen}
              appendPolylinePoint={appendPolylinePoint}
              insertPolylinePoint={insertPolylinePoint}
              removePolylinePoint={removePolylinePoint}
              updatePolylinePoint={updatePolylinePoint}
              reversePolylinePoints={reversePolylinePoints}
              setHoveredWaypoint={setHoveredWaypoint}
            />
          )}
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}
