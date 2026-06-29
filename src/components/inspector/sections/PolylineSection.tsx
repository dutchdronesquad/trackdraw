"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ElevationChart from "@/components/inspector/ElevationChart";
import { PolylineWaypointList } from "@/components/inspector/views/polyline/PolylineWaypointList";
import { MeasurementNum, Row, Section } from "@/components/inspector/shared";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_POLYLINE_STROKE_WIDTH } from "@/lib/track/constants";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { PolylinePoint, PolylineShape, Shape } from "@/lib/types";
import { InspectorFooterMobile } from "@/components/inspector/views/layout";

export function PolylineSection({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  startBatch,
  finishBatch,
  defaultOpen,
  appendPolylinePoint,
  insertPolylinePoint,
  removePolylinePoint,
  updatePolylinePoint,
  reversePolylinePoints,
  setHoveredWaypoint,
}: {
  shape: PolylineShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  startBatch: () => void;
  finishBatch: () => void;
  defaultOpen: boolean;
  appendPolylinePoint: (id: string, point: PolylinePoint) => void;
  insertPolylinePoint: (
    id: string,
    index: number,
    point: PolylinePoint
  ) => void;
  removePolylinePoint: (id: string, index: number) => void;
  updatePolylinePoint: (
    id: string,
    index: number,
    patch: Partial<PolylinePoint>
  ) => void;
  reversePolylinePoints: (id: string) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
}) {
  const t = useTranslations("inspector");
  const [directionReversedByShape, setDirectionReversedByShape] = useState<
    Record<string, boolean>
  >({});
  const directionReversed = Boolean(directionReversedByShape[shape.id]);

  return (
    <Section title={t("polyline.sectionTitle")} defaultOpen={defaultOpen}>
      <Row label={`Stroke width (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.strokeWidth ?? DEFAULT_POLYLINE_STROKE_WIDTH}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { strokeWidth: value })}
          minMeters={0.05}
        />
      </Row>
      <Row label={t("polyline.flowLabel")}>
        <label className="flex h-full cursor-pointer items-center gap-2">
          <Switch
            checked={Boolean(shape.showArrows)}
            onCheckedChange={(checked) =>
              updateShape(shape.id, { showArrows: checked })
            }
          />
          <span className="text-muted-foreground text-[11px]">
            {shape.showArrows ? "visible" : "hidden"}
          </span>
        </label>
      </Row>
      {shape.showArrows && (
        <Row label={t("polyline.directionLabel")}>
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
        <Row label={`Arrow spacing (${unitLabel})`}>
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
  );
}
