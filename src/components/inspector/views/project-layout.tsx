"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPinned,
  Route,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ElevationChart from "@/components/inspector/ElevationChart";
import { MeasurementUnitToggle } from "@/components/MeasurementUnitToggle";
import { MapReferenceDialog } from "@/components/map-reference/MapReferenceDialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import {
  getInventoryComparison,
  inventoryKinds,
  normalizeInventoryProfile,
} from "@/lib/planning/inventory";
import { getObstacleNumberingReport } from "@/lib/track/obstacleNumbering";
import {
  generateRaceLineDraft,
  isGeneratedRaceLine,
  type GeneratedRouteWarning,
} from "@/lib/track/generated-route";
import type {
  FieldSpec,
  InventoryShapeKind,
  MapReference,
  PolylineShape,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";
import {
  MeasurementNum,
  Num,
  Row,
  Section,
  useInspectorInputBatch,
} from "@/components/inspector/shared";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { formatFieldSize, formatMeasurement } from "@/lib/track/units";
import {
  InspectorFooterDesktop,
  InspectorFooterMobile,
  InspectorLead,
  InspectorScrollBody,
  useIsDesktopInspector,
} from "./layout";
import {
  getListableTrackItems,
  type DesignMetaPatch,
  ItemOverviewList,
} from "./list-panel";
import { useTranslations } from "next-intl";

function getShapeDisplayName(shape: Shape, index: number, t: Translate) {
  return (
    shape.name?.trim() || `${getShapeKindLabel(shape.kind, t)} ${index + 1}`
  );
}

function MapReferenceSection({
  design,
  setMapReference,
  clearMapReference,
  setMapReferenceVisibility,
  setMapReferenceOpacity,
  setMapReferenceRotation,
}: {
  design: TrackDesign;
  setMapReference: (reference: MapReference) => void;
  clearMapReference: () => void;
  setMapReferenceVisibility: (visible: boolean) => void;
  setMapReferenceOpacity: (opacity: number) => void;
  setMapReferenceRotation: (rotationDeg: number) => void;
}) {
  const t = useTranslations("inspector");
  const tCommon = useTranslations("common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const reference = design.mapReference ?? null;
  const actionBtnClass =
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border/45 bg-background/80 px-2.5 text-xs font-medium text-foreground/82 transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8 lg:text-[11px]";
  const actionBtnPrimaryClass =
    "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary/8 px-2.5 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/12 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8 lg:text-[11px]";

  return (
    <Section title={t("layout.mapReference.title")}>
      <div className="space-y-3">
        {reference ? (
          <>
            <Row label={t("layout.mapReference.fields.opacity")}>
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={reference.opacity}
                  onChange={(event) =>
                    setMapReferenceOpacity(Number(event.target.value))
                  }
                  className="h-3 min-w-0 flex-1 accent-neutral-800 lg:h-2 dark:accent-neutral-200"
                />
                <span className="text-muted-foreground/70 w-9 text-right text-[10px] font-medium tabular-nums">
                  {Math.round(reference.opacity * 100)}%
                </span>
              </div>
            </Row>
            <Row label={t("layout.mapReference.fields.rotation")}>
              <Num
                value={reference.rotationDeg}
                onChange={setMapReferenceRotation}
                step={1}
                min={0}
              />
            </Row>
          </>
        ) : null}

        <div
          className={
            reference
              ? "grid grid-cols-3 gap-2 lg:gap-1.5"
              : "grid gap-2 lg:gap-1.5"
          }
        >
          <button
            type="button"
            title={
              reference
                ? t("layout.mapReference.actions.editTitle")
                : t("layout.mapReference.actions.addTitle")
            }
            aria-label={
              reference
                ? t("layout.mapReference.actions.editTitle")
                : t("layout.mapReference.actions.addTitle")
            }
            className={actionBtnPrimaryClass}
            onClick={() => setDialogOpen(true)}
          >
            <MapPinned className="size-4 lg:size-3" />
            <span>
              {reference
                ? t("layout.mapReference.actions.edit")
                : t("layout.mapReference.actions.add")}
            </span>
          </button>
          {reference ? (
            <>
              <button
                type="button"
                title={
                  reference.visible === false
                    ? t("layout.mapReference.actions.showTitle")
                    : t("layout.mapReference.actions.hideTitle")
                }
                aria-label={
                  reference.visible === false
                    ? t("layout.mapReference.actions.showTitle")
                    : t("layout.mapReference.actions.hideTitle")
                }
                className={actionBtnClass}
                onClick={() =>
                  setMapReferenceVisibility(reference.visible === false)
                }
              >
                {reference.visible === false ? (
                  <Eye className="size-4 lg:size-3" />
                ) : (
                  <EyeOff className="size-4 lg:size-3" />
                )}
                <span>
                  {reference.visible === false
                    ? t("layout.mapReference.actions.show")
                    : tCommon("actions.hide")}
                </span>
              </button>
              <button
                type="button"
                title={t("layout.mapReference.actions.removeTitle")}
                aria-label={t("layout.mapReference.actions.removeTitle")}
                className={`${actionBtnClass} border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/12`}
                onClick={clearMapReference}
              >
                <Trash2 className="size-4 lg:size-3" />
                <span>{tCommon("actions.remove")}</span>
              </button>
            </>
          ) : null}
        </div>
        {dialogOpen ? (
          <MapReferenceDialog
            field={design.field}
            initialReference={reference}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onConfirm={setMapReference}
          />
        ) : null}
      </div>
    </Section>
  );
}

function summarizeGeneratedRouteWarnings(
  warnings: GeneratedRouteWarning[],
  t: ReturnType<typeof useTranslations<"inspector">>
): string {
  const unsupportedCount = warnings.filter(
    (warning) => warning.type === "unsupported-shape"
  ).length;
  const tooFewObstacles = warnings.some(
    (warning) => warning.type === "too-few-obstacles"
  );
  const closeObstacleCount = warnings.filter(
    (warning) => warning.type === "close-obstacles"
  ).length;

  const parts: string[] = [];
  if (unsupportedCount > 0) {
    parts.push(
      t("routeNumbering.generate.warnings.unsupportedShapes", {
        count: unsupportedCount,
      })
    );
  }
  if (tooFewObstacles) {
    parts.push(t("routeNumbering.generate.warnings.tooFewObstacles"));
  }
  if (closeObstacleCount > 0) {
    parts.push(
      t("routeNumbering.generate.warnings.closeObstacles", {
        count: closeObstacleCount,
      })
    );
  }

  return parts.join(" ");
}

function RouteNumberingOverview({
  design,
  shapes,
  addShape,
  removeShapes,
  setSelection,
}: {
  design: TrackDesign;
  shapes: Shape[];
  addShape: (draft: ShapeDraft<PolylineShape>) => string;
  removeShapes: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
}) {
  const t = useTranslations("inspector");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const report = useMemo(() => getObstacleNumberingReport(design), [design]);
  const shapeOrder = useMemo(
    () => new Map(shapes.map((shape, index) => [shape.id, index] as const)),
    [shapes]
  );
  const issueNames = report.issues.slice(0, 3).map((issue) => {
    const shape = shapes[shapeOrder.get(issue.shapeId) ?? -1];
    return shape
      ? getShapeDisplayName(shape, shapeOrder.get(shape.id) ?? 0, tShapes)
      : issue.shapeId;
  });
  const extraIssueCount = Math.max(0, report.unmappedObstacleCount - 3);
  const isClear =
    report.status === "ready" ||
    report.status === "empty" ||
    report.status === "no-numbered-obstacles";
  const hasExistingRaceLine = Boolean(report.primaryPolylineId);
  const generatedRaceLine = shapes.find(isGeneratedRaceLine) ?? null;
  const hasGeneratedRaceLine = Boolean(generatedRaceLine);
  const hasWarnings =
    report.status === "partial" ||
    report.status === "no-route-matches" ||
    report.status === "missing-route";
  const statusLabel =
    report.status === "ready"
      ? t("routeNumbering.status.ready")
      : report.status === "partial"
        ? t("routeNumbering.status.partial")
        : report.status === "no-route-matches"
          ? t("routeNumbering.status.noRouteMatches")
          : report.status === "missing-route"
            ? t("routeNumbering.status.missingRoute")
            : report.status === "no-numbered-obstacles"
              ? t("routeNumbering.status.noNumberedObstacles")
              : t("routeNumbering.status.empty");
  const message =
    report.status === "ready"
      ? t("routeNumbering.messages.ready", {
          count: report.mappedObstacleCount,
        })
      : report.status === "partial"
        ? t("routeNumbering.messages.partial", {
            mapped: report.mappedObstacleCount,
            total: report.totalNumberedObstacleCount,
          })
        : report.status === "no-route-matches"
          ? t("routeNumbering.messages.noRouteMatches", {
              count: report.totalNumberedObstacleCount,
            })
          : report.status === "missing-route"
            ? t("routeNumbering.messages.missingRoute")
            : report.status === "no-numbered-obstacles"
              ? t("routeNumbering.messages.noNumberedObstacles")
              : t("routeNumbering.messages.empty");

  const canGenerate =
    report.status === "missing-route" ||
    report.status === "ready" ||
    report.status === "partial" ||
    report.status === "no-route-matches";

  function handleGenerateRaceLine() {
    const { draft, report: genReport } = generateRaceLineDraft(design);
    if (!draft) {
      toast.error(t("routeNumbering.generate.errors.noObstacles"));
      return;
    }

    if (generatedRaceLine) {
      removeShapes([generatedRaceLine.id]);
    }

    const newId = addShape(draft);
    setSelection([newId]);

    const warningText = summarizeGeneratedRouteWarnings(genReport.warnings, t);
    toast.success(
      warningText
        ? `${t("routeNumbering.generate.success")}. ${warningText}`
        : t("routeNumbering.generate.success")
    );
  }

  return (
    <Section title={t("layout.sections.routeNumbering")}>
      <div className="space-y-3">
        <div
          className={cn(
            "rounded-md border px-2.5 py-2",
            hasWarnings
              ? "border-amber-500/25 bg-amber-500/8"
              : isClear
                ? "border-emerald-500/20 bg-emerald-500/8"
                : "border-border/40 bg-muted/25"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm",
                hasWarnings
                  ? "bg-amber-500/12 text-amber-600"
                  : isClear
                    ? "bg-emerald-500/12 text-emerald-600"
                    : "bg-muted text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {hasWarnings ? (
                <AlertTriangle className="size-3" />
              ) : isClear ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <Route className="size-3" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p
                  className={cn(
                    "text-[12px] font-semibold",
                    hasWarnings
                      ? "text-amber-600"
                      : isClear
                        ? "text-emerald-600"
                        : "text-foreground"
                  )}
                >
                  {statusLabel}
                </p>
                {hasExistingRaceLine ? (
                  <span className="border-border/45 bg-background/65 text-muted-foreground inline-flex items-center rounded-sm border px-1.5 py-px text-[10px] font-medium">
                    {t("routeNumbering.meta.raceLine")}
                  </span>
                ) : null}
                {message ? (
                  <span className="text-muted-foreground/80 text-[11px] leading-snug">
                    {message}
                  </span>
                ) : null}
              </div>
              {issueNames.length > 0 ? (
                <p className="mt-1 text-[10px] leading-snug text-amber-600/85">
                  {t("routeNumbering.issues.offRoutePrefix", {
                    names: issueNames.join(", "),
                  })}
                  {extraIssueCount > 0
                    ? t("routeNumbering.issues.moreSuffix", {
                        count: extraIssueCount,
                      })
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              {t("routeNumbering.meta.numbered")}
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {report.mappedObstacleCount}/{report.totalNumberedObstacleCount}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              {t("routeNumbering.meta.issues")}
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {report.issueCount}
            </p>
          </div>
        </div>

        {canGenerate ? (
          <button
            type="button"
            onClick={handleGenerateRaceLine}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors lg:h-8 lg:text-[11px]",
              hasWarnings
                ? "border-amber-500/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/16 dark:text-amber-400"
                : "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 hover:bg-emerald-500/14 dark:text-emerald-400"
            )}
          >
            <Sparkles className="size-4 lg:size-3" />
            <span>
              {hasGeneratedRaceLine
                ? t("routeNumbering.generate.regenerateButton")
                : t("routeNumbering.generate.button")}
            </span>
          </button>
        ) : null}
      </div>
    </Section>
  );
}

export interface ProjectLayoutInspectorViewProps {
  design: TrackDesign;
  shapes: Shape[];
  panel?: "project" | "layout";
  setSelection: (ids: string[]) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (patch: DesignMetaPatch) => void;
  setMapReference: (reference: MapReference) => void;
  clearMapReference: () => void;
  setMapReferenceVisibility: (visible: boolean) => void;
  setMapReferenceOpacity: (opacity: number) => void;
  setMapReferenceRotation: (rotationDeg: number) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  addShape: (draft: ShapeDraft<PolylineShape>) => string;
  reorderShapes: (fromId: string, beforeId: string | null) => void;
  mobileInline?: boolean;
}

export function ProjectLayoutInspectorView({
  design,
  shapes,
  panel = "project",
  setSelection,
  updateField,
  updateDesignMeta,
  setMapReference,
  clearMapReference,
  setMapReferenceVisibility,
  setMapReferenceOpacity,
  setMapReferenceRotation,
  removeShapes,
  setHoveredShapeId,
  addShape,
  reorderShapes,
  mobileInline = false,
}: ProjectLayoutInspectorViewProps) {
  const t = useTranslations("inspector");
  const tCommon = useTranslations("common");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const { startBatch, finishBatch } = useInspectorInputBatch();
  const { unitSystem } = useMeasurementUnitSystem();
  const fieldUnitLabel = unitSystem === "imperial" ? "ft" : "m";
  const isDesktop = useIsDesktopInspector();
  const inventory = normalizeInventoryProfile(design.inventory);
  const inventoryComparison = getInventoryComparison(design, tShapes);
  const totalMissing = inventoryComparison.reduce(
    (sum, item) => sum + item.missing,
    0
  );
  const kindsMissing = inventoryComparison.filter(
    (item) => item.missing > 0
  ).length;
  const obstacleNumberingReport = useMemo(
    () => getObstacleNumberingReport(design),
    [design]
  );
  const trackItemShapes = useMemo(
    () => getListableTrackItems(shapes),
    [shapes]
  );

  const updateInventoryCount = (kind: InventoryShapeKind, value: number) => {
    updateDesignMeta({
      inventory: {
        ...inventory,
        [kind]:
          typeof value === "number" && Number.isFinite(value)
            ? Math.max(0, Math.floor(value))
            : 0,
      },
    });
  };

  const inventoryContent = (
    <Section title={t("layout.sections.inventory")}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              {tCommon("labels.status")}
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {totalMissing === 0
                ? t("layout.inventory.status.buildable")
                : t("layout.inventory.status.short")}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              {t("layout.inventory.labels.missing")}
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {totalMissing}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              {t("layout.inventory.labels.types")}
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {kindsMissing}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          {t("layout.inventory.description")}
        </p>
        <div className="space-y-1">
          {inventoryKinds.map((kind) => {
            const comparison = inventoryComparison.find(
              (item) => item.kind === kind
            );
            const missing = comparison?.missing ?? 0;
            return (
              <Row key={kind} label={getShapeKindLabel(kind, tShapes)}>
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <Num
                      value={inventory[kind]}
                      onChange={(value) => updateInventoryCount(kind, value)}
                      step={1}
                      min={0}
                    />
                  </div>
                  <span className="text-muted-foreground/65 shrink-0 text-[10px] font-medium tracking-[0.08em] uppercase">
                    {t("layout.inventory.needCountSuffix", {
                      count: comparison?.required ?? 0,
                    })}
                  </span>
                  <span
                    className={
                      missing > 0
                        ? "shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-medium text-amber-500"
                        : "shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 font-mono text-[10px] font-medium text-emerald-500"
                    }
                  >
                    {missing > 0
                      ? `-${missing}`
                      : t("layout.inventory.stockOk")}
                  </span>
                </div>
              </Row>
            );
          })}
        </div>
      </div>
    </Section>
  );

  const projectContent = (
    <>
      <InspectorLead
        title={design.title.trim() || t("layout.project.titlePlaceholder")}
        subtitle={t("layout.project.subtitle")}
        meta={[
          t("layout.meta.itemsCount", { count: shapes.length }),
          formatFieldSize(design.field.width, design.field.height, unitSystem),
          t("layout.meta.grid", {
            grid: formatMeasurement(design.field.gridStep, unitSystem, {
              precision: 1,
            }),
          }),
        ]}
      />
      <div>
        <p className="text-muted-foreground/70 mb-1.5 text-[11px] font-medium tracking-[0.08em] uppercase">
          {tCommon("labels.title")}
        </p>
        <Input
          value={design.title}
          onFocus={startBatch}
          onBlur={finishBatch}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          onChange={(event) => updateDesignMeta({ title: event.target.value })}
          placeholder={t("layout.project.titlePlaceholder")}
          className="bg-muted/40 border-border/40 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-sm shadow-none focus-visible:ring-1 lg:h-7 lg:px-2 lg:text-[11px]"
        />
      </div>
      <Section title={t("layout.sections.field")}>
        <Row label={t("layout.field.unitsLabel")}>
          <MeasurementUnitToggle />
        </Row>
        <Row label={t("dimensions.widthLabel", { unit: fieldUnitLabel })}>
          <MeasurementNum
            valueMeters={design.field.width}
            unitSystem={unitSystem}
            onChange={(value) => updateField({ width: value })}
            minMeters={5}
          />
        </Row>
        <Row label={t("dimensions.heightLabel", { unit: fieldUnitLabel })}>
          <MeasurementNum
            valueMeters={design.field.height}
            unitSystem={unitSystem}
            onChange={(value) => updateField({ height: value })}
            minMeters={5}
          />
        </Row>
        <Row label={t("dimensions.gridLabel", { unit: fieldUnitLabel })}>
          <MeasurementNum
            valueMeters={design.field.gridStep}
            unitSystem={unitSystem}
            onChange={(value) => updateField({ gridStep: value })}
            minMeters={0.5}
          />
        </Row>
        <Row label={t("layout.field.renderScaleLabel")}>
          <div
            className="flex min-w-0 items-center gap-2"
            title={t("layout.field.renderScaleTooltip")}
          >
            <div className="min-w-0 flex-1">
              <Num
                value={design.field.ppm}
                onChange={(value) => updateField({ ppm: value })}
                step={5}
                min={5}
              />
            </div>
            <span
              className="text-muted-foreground/65 shrink-0 text-[10px] font-medium tracking-[0.08em] uppercase"
              aria-label={t("layout.field.pxPerMeterAriaLabel")}
            >
              px/m
            </span>
          </div>
        </Row>
      </Section>
      {inventoryContent}
    </>
  );

  const layoutContent = (
    <>
      <InspectorLead
        title={t("layout.overview.title")}
        subtitle={t("layout.overview.subtitle")}
        meta={[
          t("layout.meta.itemsCount", { count: trackItemShapes.length }),
          totalMissing === 0
            ? t("layout.meta.buildable")
            : t("layout.meta.shortItems", { count: totalMissing }),
          kindsMissing > 0
            ? t("layout.meta.typesShort", { count: kindsMissing })
            : t("layout.meta.stockCovered"),
          obstacleNumberingReport.status === "ready"
            ? t("layout.meta.numbered", {
                count: obstacleNumberingReport.mappedObstacleCount,
              })
            : obstacleNumberingReport.status === "no-numbered-obstacles" ||
                obstacleNumberingReport.status === "empty"
              ? t("layout.meta.numberingIdle")
              : t("layout.meta.numberingNeedsReview"),
        ]}
      />
      <div className="space-y-4">
        <MapReferenceSection
          design={design}
          setMapReference={setMapReference}
          clearMapReference={clearMapReference}
          setMapReferenceVisibility={setMapReferenceVisibility}
          setMapReferenceOpacity={setMapReferenceOpacity}
          setMapReferenceRotation={setMapReferenceRotation}
        />
        <RouteNumberingOverview
          design={design}
          shapes={shapes}
          addShape={addShape}
          removeShapes={removeShapes}
          setSelection={setSelection}
        />
        {trackItemShapes.length > 0 ? (
          <ItemOverviewList
            design={design}
            shapes={shapes}
            setSelection={setSelection}
            removeShapes={removeShapes}
            setHoveredShapeId={setHoveredShapeId}
            obstacleNumberingReport={obstacleNumberingReport}
            reorderShapes={reorderShapes}
          />
        ) : (
          <div className="border-border/40 rounded-lg border border-dashed px-3 py-4 text-center">
            <p className="text-foreground/75 text-[11px] font-medium">
              {t("layout.overview.emptyTitle")}
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[11px] leading-relaxed">
              {t("layout.overview.emptyDescription")}
            </p>
          </div>
        )}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <InspectorScrollBody>
          <div className="space-y-4 px-3 py-3">
            {panel === "project" ? projectContent : layoutContent}
          </div>
        </InspectorScrollBody>
        <InspectorFooterDesktop>
          <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
        </InspectorFooterDesktop>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {panel === "project" ? projectContent : layoutContent}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
    </div>
  );
}
