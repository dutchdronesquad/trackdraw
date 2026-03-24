"use client";

import ElevationChart from "@/components/inspector/ElevationChart";
import { Input } from "@/components/ui/input";
import type { FieldSpec, Shape, TrackDesign } from "@/lib/types";
import {
  Num,
  PanelHeader,
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
import { type DesignMetaPatch, ItemOverviewList } from "./list-panel";

export interface EmptyInspectorViewProps {
  design: TrackDesign;
  shapes: Shape[];
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
  setSelection,
  updateField,
  updateDesignMeta,
  removeShapes,
  setHoveredShapeId,
  mobileInline = false,
}: EmptyInspectorViewProps) {
  const { startBatch, finishBatch } = useInspectorInputBatch();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Design" />
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-5 px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-4 lg:px-3 lg:py-3 lg:pb-3">
          <InspectorLead
            title="Project settings"
            subtitle="Tune the field, review the placed items, or jump into an object from the list below."
            meta={[
              `${shapes.length} items`,
              `${design.field.width}x${design.field.height} m`,
              `grid ${design.field.gridStep} m`,
            ]}
          />
          <div>
            <p className="text-muted-foreground/50 mb-1.5 text-[10px] font-medium tracking-[0.08em] uppercase">
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
          {shapes.length > 0 ? (
            <ItemOverviewList
              shapes={shapes}
              setSelection={setSelection}
              removeShapes={removeShapes}
              setHoveredShapeId={setHoveredShapeId}
            />
          ) : (
            <div className="border-border/40 rounded-lg border border-dashed px-3 py-4 text-center">
              <p className="text-foreground/75 text-[11px] font-medium">
                Nothing selected yet
              </p>
              <p className="text-muted-foreground/50 mt-1 text-[11px] leading-relaxed">
                Place or click a shape on the canvas to open its settings here.
              </p>
            </div>
          )}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}
