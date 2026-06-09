import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { FlagShape, Shape } from "@/lib/types";

export function FlagDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
  hasFixedCatalogDimensions,
}: {
  shape: FlagShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  hasFixedCatalogDimensions: boolean;
}) {
  if (hasFixedCatalogDimensions) return null;
  return (
    <>
      <Row label={`Radius (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.radius}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { radius: value })}
          minMeters={0.05}
        />
      </Row>
      <Row label={`Pole height (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.poleHeight ?? 3.5}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { poleHeight: value })}
          minMeters={0}
        />
      </Row>
    </>
  );
}
