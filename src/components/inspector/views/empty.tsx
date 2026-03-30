"use client";

import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import {
  getInventoryComparison,
  inventoryKinds,
  normalizeInventoryProfile,
} from "@/lib/inventory";
import type {
  FieldSpec,
  InventoryShapeKind,
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

export interface EmptyInspectorViewProps {
  design: TrackDesign;
  shapes: Shape[];
  panel?: "project" | "layout";
  setSelection: (ids: string[]) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (patch: DesignMetaPatch) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  mobileInline?: boolean;
}

export function EmptyInspectorView({
  design,
  shapes,
  panel = "project",
  setSelection,
  updateField,
  updateDesignMeta,
  removeShapes,
  setHoveredShapeId,
  mobileInline = false,
}: EmptyInspectorViewProps) {
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

  const projectContent = (
    <>
      <InspectorLead
        title={design.title.trim() || "Untitled Track"}
        subtitle="Tune the project title and field setup for this layout."
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
    </>
  );

  const layoutContent = (
    <>
      <InspectorLead
        title="Current layout"
        subtitle="Review placed items, compare them against available stock, and jump into an object from the list."
        meta={[
          `${shapes.length} items`,
          totalMissing === 0
            ? "buildable"
            : `short ${totalMissing} item${totalMissing === 1 ? "" : "s"}`,
          kindsMissing > 0
            ? `${kindsMissing} kind${kindsMissing === 1 ? "" : "s"} missing`
            : "stock covered",
        ]}
      />
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
                Kinds
              </p>
              <p className="text-foreground text-[12px] font-semibold">
                {kindsMissing}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
            TrackDraw compares the current layout against the obstacle stock
            saved in this project.
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
      {shapes.length > 0 ? (
        <ItemOverviewList
          design={design}
          shapes={shapes}
          setSelection={setSelection}
          removeShapes={removeShapes}
          setHoveredShapeId={setHoveredShapeId}
        />
      ) : (
        <div className="border-border/40 rounded-lg border border-dashed px-3 py-4 text-center">
          <p className="text-foreground/75 text-[11px] font-medium">
            No items placed yet
          </p>
          <p className="text-muted-foreground/70 mt-1 text-[11px] leading-relaxed">
            Add a few objects on the canvas to review the layout and compare it
            against your inventory.
          </p>
        </div>
      )}
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
