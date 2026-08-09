"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, MapPinned, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ElevationChart from "@/components/inspector/ElevationChart";
import { PreflightSummary } from "@/components/inspector/PreflightSummary";
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
import { getTrackPreflightReport } from "@/lib/track/preflight";
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
import {
  InspectorFooterDesktop,
  InspectorFooterMobile,
  InspectorScrollBody,
  useIsDesktopInspector,
} from "./layout";
import {
  getListableTrackItems,
  type DesignMetaPatch,
  ItemOverviewList,
} from "./list-panel";
import { useTranslations } from "next-intl";

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
                  aria-label={t("layout.mapReference.fields.opacity")}
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
  const report = useMemo(() => getObstacleNumberingReport(design), [design]);
  const generatedRaceLine = shapes.find(isGeneratedRaceLine) ?? null;
  const hasGeneratedRaceLine = Boolean(generatedRaceLine);
  const hasWarnings =
    report.status === "partial" ||
    report.status === "no-route-matches" ||
    report.status === "missing-route";
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

  if (!canGenerate) return null;

  return (
    <Section title={t("layout.sections.routeNumbering")}>
      <button
        type="button"
        onClick={handleGenerateRaceLine}
        className={cn(
          "focus-visible:ring-ring/40 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-hidden lg:h-8 lg:text-[11px]",
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
  const inventoryActive = inventoryKinds.some((kind) => inventory[kind] > 0);
  const inventoryComparison = getInventoryComparison(design, tShapes);
  const obstacleNumberingReport = useMemo(
    () => getObstacleNumberingReport(design),
    [design]
  );
  const preflightReport = useMemo(
    () => getTrackPreflightReport(design),
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
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          {t("layout.inventory.description")}
        </p>
        <div className="space-y-1">
          {inventoryKinds.map((kind) => {
            const comparison = inventoryComparison.find(
              (item) => item.kind === kind
            );
            const missing = inventoryActive ? (comparison?.missing ?? 0) : 0;
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
                        : inventoryActive
                          ? "shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 font-mono text-[10px] font-medium text-emerald-500"
                          : "border-border/35 bg-muted/25 text-muted-foreground/55 shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] font-medium"
                    }
                  >
                    {missing > 0
                      ? `-${missing}`
                      : inventoryActive
                        ? t("layout.inventory.stockOk")
                        : "—"}
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
      <div>
        <p className="text-muted-foreground/70 mb-1.5 text-[11px] font-medium tracking-[0.08em] uppercase">
          {tCommon("labels.title")}
        </p>
        <Input
          aria-label={tCommon("labels.title")}
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
          className="bg-muted/40 border-border/40 focus-visible:border-border/80 focus-visible:ring-ring/20 h-11 rounded-lg px-3 text-base shadow-none focus-visible:ring-1 lg:h-9 lg:rounded-md lg:px-2.5 lg:text-sm"
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
      </Section>
      <Section title={t("layout.sections.advanced")} defaultOpen={false}>
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
      <PreflightSummary
        report={preflightReport}
        shapes={shapes}
        setSelection={setSelection}
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
        {panel === "layout" ? (
          <InspectorFooterDesktop>
            <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
          </InspectorFooterDesktop>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {panel === "project" ? projectContent : layoutContent}
          {panel === "layout" ? (
            <InspectorFooterMobile>
              <ElevationChart />
            </InspectorFooterMobile>
          ) : null}
        </div>
      </InspectorScrollBody>
    </div>
  );
}
