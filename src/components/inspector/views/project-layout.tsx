"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, MapPinned, Trash2 } from "lucide-react";
import ElevationChart from "@/components/inspector/ElevationChart";
import { MapReferenceDialog } from "@/components/map-reference/MapReferenceDialog";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import {
  getInventoryComparison,
  inventoryKinds,
  normalizeInventoryProfile,
} from "@/lib/planning/inventory";
import { getObstacleNumberingReport } from "@/lib/track/obstacleNumbering";
import type {
  FieldSpec,
  InventoryShapeKind,
  MapReference,
  Shape,
  TrackDesign,
} from "@/lib/types";
import {
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
  useIsDesktopInspector,
} from "./layout";
import { type DesignMetaPatch, ItemOverviewList } from "./list-panel";

function getShapeDisplayName(shape: Shape, index: number) {
  return shape.name?.trim() || `${shapeKindLabels[shape.kind]} ${index + 1}`;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const reference = design.mapReference ?? null;
  const actionBtnClass =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/45 bg-background/80 px-2.5 text-[11px] font-medium text-foreground/82 transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8";
  const actionBtnPrimaryClass =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary/8 px-2.5 text-[11px] font-medium text-brand-primary transition-colors hover:bg-brand-primary/12 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8";

  return (
    <Section title="Map reference">
      <div className="space-y-3">
        {reference ? (
          <>
            <Row label="Opacity">
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
                  className="h-2 min-w-0 flex-1 accent-neutral-800 dark:accent-neutral-200"
                />
                <span className="text-muted-foreground/70 w-9 text-right text-[10px] font-medium tabular-nums">
                  {Math.round(reference.opacity * 100)}%
                </span>
              </div>
            </Row>
            <Row label="Rotation">
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
          className={reference ? "grid grid-cols-3 gap-1.5" : "grid gap-1.5"}
        >
          <button
            type="button"
            title={reference ? "Edit map reference" : "Add map reference"}
            aria-label={reference ? "Edit map reference" : "Add map reference"}
            className={actionBtnPrimaryClass}
            onClick={() => setDialogOpen(true)}
          >
            <MapPinned className="size-3" />
            <span>{reference ? "Edit" : "Add map"}</span>
          </button>
          {reference ? (
            <>
              <button
                type="button"
                title={
                  reference.visible === false
                    ? "Show map reference"
                    : "Hide map reference"
                }
                aria-label={
                  reference.visible === false
                    ? "Show map reference"
                    : "Hide map reference"
                }
                className={actionBtnClass}
                onClick={() =>
                  setMapReferenceVisibility(reference.visible === false)
                }
              >
                {reference.visible === false ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeOff className="size-3" />
                )}
                <span>{reference.visible === false ? "Show" : "Hide"}</span>
              </button>
              <button
                type="button"
                title="Remove map reference"
                aria-label="Remove map reference"
                className={`${actionBtnClass} border-red-500/20 bg-red-500/6 text-red-500 hover:bg-red-500/12`}
                onClick={clearMapReference}
              >
                <Trash2 className="size-3" />
                <span>Remove</span>
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

function RouteNumberingOverview({
  design,
  shapes,
}: {
  design: TrackDesign;
  shapes: Shape[];
}) {
  const report = useMemo(() => getObstacleNumberingReport(design), [design]);
  const shapeOrder = useMemo(
    () => new Map(shapes.map((shape, index) => [shape.id, index] as const)),
    [shapes]
  );
  const issueNames = report.issues.slice(0, 3).map((issue) => {
    const shape = shapes[shapeOrder.get(issue.shapeId) ?? -1];
    return shape
      ? getShapeDisplayName(shape, shapeOrder.get(shape.id) ?? 0)
      : issue.shapeId;
  });
  const extraIssueCount = Math.max(0, report.unmappedObstacleCount - 3);
  const isClear =
    report.status === "ready" ||
    report.status === "empty" ||
    report.status === "no-numbered-obstacles";
  const statusLabel =
    report.status === "ready"
      ? "Ready"
      : report.status === "partial"
        ? "Needs review"
        : report.status === "no-route-matches"
          ? "No matches"
          : report.status === "missing-route"
            ? "Missing route"
            : report.status === "no-numbered-obstacles"
              ? "No route obstacles"
              : "Empty";
  const message =
    report.status === "ready"
      ? `${report.mappedObstacleCount} route obstacle${report.mappedObstacleCount === 1 ? "" : "s"} numbered.`
      : report.status === "partial"
        ? `${report.mappedObstacleCount} of ${report.totalNumberedObstacleCount} route obstacles are numbered.`
        : report.status === "no-route-matches"
          ? `${report.totalNumberedObstacleCount} route obstacle${report.totalNumberedObstacleCount === 1 ? "" : "s"} found, but none sit close enough to the race line.`
          : report.status === "missing-route"
            ? `${report.totalNumberedObstacleCount} route obstacle${report.totalNumberedObstacleCount === 1 ? "" : "s"} need a race line before numbering can be derived.`
            : report.status === "no-numbered-obstacles"
              ? "Gates, ladders, and dive gates will appear in route numbering."
              : "Add route obstacles and a race line to derive numbering.";

  return (
    <Section title="Route numbering">
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Status
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {statusLabel}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Numbered
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {report.mappedObstacleCount}/{report.totalNumberedObstacleCount}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Issues
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {report.issueCount}
            </p>
          </div>
        </div>
        <div
          className={
            isClear
              ? "rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-2 text-emerald-500"
              : "rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-amber-500"
          }
        >
          <p className="text-[11px] leading-relaxed">{message}</p>
          {issueNames.length > 0 ? (
            <p className="mt-1 text-[10px] leading-relaxed opacity-80">
              Off route: {issueNames.join(", ")}
              {extraIssueCount > 0 ? ` +${extraIssueCount} more` : ""}
            </p>
          ) : null}
        </div>
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
  mobileInline = false,
}: ProjectLayoutInspectorViewProps) {
  const { startBatch, finishBatch } = useInspectorInputBatch();
  const isDesktop = useIsDesktopInspector();
  const inventory = normalizeInventoryProfile(design.inventory);
  const inventoryComparison = getInventoryComparison(design);
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
    <Section title="Inventory">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Status
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {totalMissing === 0 ? "Buildable" : "Short"}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Missing
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {totalMissing}
            </p>
          </div>
          <div className="border-border/40 bg-muted/25 rounded-md border px-2.5 py-2">
            <p className="text-muted-foreground/70 text-[9px] tracking-[0.12em] uppercase">
              Types
            </p>
            <p className="text-foreground text-[12px] font-semibold">
              {kindsMissing}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          TrackDraw compares the current layout against the obstacle stock saved
          in this project.
        </p>
        <div className="space-y-1">
          {inventoryKinds.map((kind) => {
            const comparison = inventoryComparison.find(
              (item) => item.kind === kind
            );
            const missing = comparison?.missing ?? 0;
            return (
              <Row key={kind} label={shapeKindLabels[kind]}>
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
                    need {comparison?.required ?? 0}
                  </span>
                  <span
                    className={
                      missing > 0
                        ? "shrink-0 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-medium text-amber-500"
                        : "shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 font-mono text-[10px] font-medium text-emerald-500"
                    }
                  >
                    {missing > 0 ? `-${missing}` : "ok"}
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
        title={design.title.trim() || "Untitled Track"}
        subtitle="Tune the project title, field setup, and available obstacle stock."
        meta={[
          `${shapes.length} items`,
          `${design.field.width}x${design.field.height} m`,
          `grid ${design.field.gridStep} m`,
        ]}
      />
      <div>
        <p className="text-muted-foreground/70 mb-1.5 text-[11px] font-medium tracking-[0.08em] uppercase">
          Title
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
          placeholder="Untitled Track"
          className="bg-muted/40 border-border/40 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-sm shadow-none focus-visible:ring-1 lg:h-7 lg:px-2 lg:text-[11px]"
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
      {inventoryContent}
    </>
  );

  const layoutContent = (
    <>
      <InspectorLead
        title="Current layout"
        subtitle="Review placed items, route numbering, and buildability for the current layout."
        meta={[
          `${shapes.length} items`,
          totalMissing === 0
            ? "buildable"
            : `short ${totalMissing} item${totalMissing === 1 ? "" : "s"}`,
          kindsMissing > 0
            ? `${kindsMissing} type${kindsMissing === 1 ? "" : "s"} short`
            : "stock covered",
          obstacleNumberingReport.status === "ready"
            ? `${obstacleNumberingReport.mappedObstacleCount} numbered`
            : obstacleNumberingReport.status === "no-numbered-obstacles" ||
                obstacleNumberingReport.status === "empty"
              ? "numbering idle"
              : "numbering needs review",
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
        <RouteNumberingOverview design={design} shapes={shapes} />
        {shapes.length > 0 ? (
          <ItemOverviewList
            design={design}
            shapes={shapes}
            setSelection={setSelection}
            removeShapes={removeShapes}
            setHoveredShapeId={setHoveredShapeId}
            obstacleNumberingReport={obstacleNumberingReport}
          />
        ) : (
          <div className="border-border/40 rounded-lg border border-dashed px-3 py-4 text-center">
            <p className="text-foreground/75 text-[11px] font-medium">
              No items placed yet
            </p>
            <p className="text-muted-foreground/70 mt-1 text-[11px] leading-relaxed">
              Add a few objects on the canvas to review the layout and compare
              it against your inventory.
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
