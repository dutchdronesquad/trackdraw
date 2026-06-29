"use client";
import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { BarrierShape, Shape } from "@/lib/types";
import { useTranslations } from "next-intl";

export function BarrierDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
}: {
  shape: BarrierShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
}) {
  const t = useTranslations("inspector");
  if (hasFixedCatalogDimensions) return null;
  return (
    <>
      <Row label={t("dimensions.widthLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.width}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { width: value })}
          minMeters={0.3}
        />
      </Row>
      <Row label={t("dimensions.heightLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) =>
            updateShape(shape.id, { height: Math.max(0.1, value) })
          }
          minMeters={0.1}
        />
      </Row>
    </>
  );
}
