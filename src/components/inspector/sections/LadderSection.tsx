"use client";

import { useTranslations } from "next-intl";
import {
  MeasurementNum,
  Num,
  Row,
  Section,
} from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { LadderShape, Shape } from "@/lib/types";

export function LadderDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
}: {
  shape: LadderShape;
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
          minMeters={0.5}
        />
      </Row>
      <Row label={t("dimensions.heightLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { height: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={t("dimensions.elevationLabel", { unit: unitLabel })}>
        <MeasurementNum
          valueMeters={shape.elevation ?? 0}
          unitSystem={unitSystem}
          onChange={(value) =>
            updateShape(shape.id, { elevation: Math.max(0, value) })
          }
          minMeters={0}
        />
      </Row>
    </>
  );
}

export function LadderSection({
  shape,
  updateShape,
  hasFixedCatalogDimensions,
  defaultOpen,
}: {
  shape: LadderShape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
  defaultOpen: boolean;
}) {
  const t = useTranslations("inspector");
  if (hasFixedCatalogDimensions) return null;
  return (
    <Section title={t("ladder.sectionTitle")} defaultOpen={defaultOpen}>
      <Row label={t("dimensions.gatesLabel")}>
        <Num
          value={shape.rungs}
          onChange={(value) => {
            const clampedRungs = Math.round(Math.max(3, Math.min(5, value)));
            updateShape(shape.id, {
              rungs: clampedRungs,
              height: clampedRungs * 2,
            });
          }}
          step={1}
          min={3}
          max={5}
        />
      </Row>
    </Section>
  );
}
