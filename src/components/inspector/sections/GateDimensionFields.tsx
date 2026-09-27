"use client";

import { MeasurementNum, Row } from "@/components/inspector/shared";
import { RACEGOW_GATE_SIZE_METERS } from "@/lib/track/elements/catalog";
import { getGateVisualSpec } from "@/lib/track/elements/visual";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { GateShape, Shape } from "@/lib/types";
import { useTranslations } from "next-intl";

export function GateDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
}: {
  shape: GateShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
}) {
  const t = useTranslations("inspector");
  if (hasFixedCatalogDimensions) return null;
  // PVC set gates keep the catalog pipe diameter and the RaceGOW 24 in minimum.
  const isPvcSet = getGateVisualSpec(shape).variant === "pvc-set";
  const minSizeMeters = isPvcSet ? RACEGOW_GATE_SIZE_METERS : 0.5;
  return (
    <>
      <Row label={t("dimensions.widthLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.width}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { width: value })}
          minMeters={minSizeMeters}
        />
      </Row>
      <Row label={t("dimensions.heightLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { height: value })}
          minMeters={minSizeMeters}
        />
      </Row>
      {isPvcSet ? null : (
        <Row label={t("dimensions.thicknessLabel", { unit: unitLabel })}>
          <MeasurementNum
            valueMeters={shape.thick ?? 0.2}
            unitSystem={unitSystem}
            onChange={(value) => updateShape(shape.id, { thick: value })}
            minMeters={0.05}
          />
        </Row>
      )}
    </>
  );
}
