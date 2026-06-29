"use client";

import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { Shape, StartFinishShape } from "@/lib/types";
import { useTranslations } from "next-intl";

export function StartFinishDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
}: {
  shape: StartFinishShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}) {
  const t = useTranslations("inspector");
  return (
    <Row label={t("dimensions.widthLabel", { unit: unitLabel })}>
      <MeasurementNum
        valueMeters={shape.width}
        unitSystem={unitSystem}
        onChange={(value) => updateShape(shape.id, { width: value })}
        minMeters={0.5}
      />
    </Row>
  );
}
