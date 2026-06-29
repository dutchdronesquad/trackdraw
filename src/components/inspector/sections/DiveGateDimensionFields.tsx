"use client";

import { MeasurementNum, Num, Row } from "@/components/inspector/shared";
import {
  getDiveGateElevationMax,
  getDiveGateElevationMin,
} from "@/lib/track/elements/visual";
import { resolveDiveGateElevation } from "@/lib/track/render3d-layout";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { DiveGateShape, Shape } from "@/lib/types";
import { useTranslations } from "next-intl";

export function DiveGateDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
  fixedDiveGateElevationVariant,
}: {
  shape: DiveGateShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
  fixedDiveGateElevationVariant: "arch" | "launch" | "generic";
}) {
  const t = useTranslations("inspector");
  if (!hasFixedCatalogDimensions) {
    return (
      <>
        <Row label={t("dimensions.sizeLabel", { unit: unitLabel })}>
          <MeasurementNum
            valueMeters={shape.width}
            unitSystem={unitSystem}
            onChange={(value) => updateShape(shape.id, { width: value })}
            minMeters={0.5}
          />
        </Row>
        <Row label={t("dimensions.elevationLabel", { unit: unitLabel })}>
          <MeasurementNum
            valueMeters={shape.elevation ?? 3}
            unitSystem={unitSystem}
            onChange={(value) => updateShape(shape.id, { elevation: value })}
            minMeters={0.1}
          />
        </Row>
        <Row label={t("dimensions.thicknessLabel", { unit: unitLabel })}>
          <MeasurementNum
            valueMeters={shape.thick ?? 0.2}
            unitSystem={unitSystem}
            onChange={(value) => updateShape(shape.id, { thick: value })}
            minMeters={0.05}
          />
        </Row>
        <Row label={t("dimensions.tiltLabel")}>
          <Num
            value={shape.tilt ?? 0}
            onChange={(value) =>
              updateShape(shape.id, {
                tilt: Math.round(Math.max(0, Math.min(90, value))),
              })
            }
            step={5}
            min={0}
          />
        </Row>
      </>
    );
  }

  return (
    <Row label={`Elevation (${unitLabel})`}>
      <MeasurementNum
        valueMeters={resolveDiveGateElevation(
          shape.elevation,
          fixedDiveGateElevationVariant
        )}
        unitSystem={unitSystem}
        onChange={(value) => updateShape(shape.id, { elevation: value })}
        minMeters={getDiveGateElevationMin(shape)}
        maxMeters={getDiveGateElevationMax(shape) ?? undefined}
      />
    </Row>
  );
}
