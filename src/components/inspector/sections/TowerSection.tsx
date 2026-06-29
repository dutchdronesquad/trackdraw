"use client";
import { useTranslations } from "next-intl";
import {
  MeasurementNum,
  Num,
  Row,
  Section,
} from "@/components/inspector/shared";
import {
  getTowerElevationMax,
  getTowerElevationMin,
} from "@/lib/track/elements/visual";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { Shape, TowerShape } from "@/lib/types";

export function TowerDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
}: {
  shape: TowerShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
}) {
  const t = useTranslations("inspector");
  if (hasFixedCatalogDimensions) return null;

  const elevationMin = getTowerElevationMin(shape);
  const elevationMax = getTowerElevationMax(shape);
  const displayedElevation = Math.min(
    elevationMax ?? Infinity,
    Math.max(elevationMin, shape.elevation ?? elevationMin)
  );

  return (
    <>
      <Row label={t("dimensions.widthLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.width}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { width: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={t("dimensions.openingHeightLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { height: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={t("dimensions.elevationLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={displayedElevation}
          unitSystem={unitSystem}
          onChange={(value) =>
            updateShape(shape.id, {
              elevation: Math.min(
                elevationMax ?? Infinity,
                Math.max(elevationMin, value)
              ),
            })
          }
          minMeters={elevationMin}
          maxMeters={elevationMax ?? undefined}
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
    </>
  );
}

export function TowerSection({
  shape,
  updateShape,
  hasFixedCatalogDimensions,
  defaultOpen,
}: {
  shape: TowerShape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
  defaultOpen: boolean;
}) {
  const t = useTranslations("inspector");
  if (hasFixedCatalogDimensions) return null;
  return (
    <Section title={t("shapes.tower")} defaultOpen={defaultOpen}>
      <Row label={t("dimensions.levelsLabel")}>
        <Num
          value={shape.levels ?? 1}
          onChange={(value) =>
            updateShape(shape.id, {
              levels: Math.round(Math.max(1, Math.min(4, value))),
            })
          }
          step={1}
          min={1}
        />
      </Row>
    </Section>
  );
}
