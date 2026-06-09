import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { GateShape, Shape } from "@/lib/types";

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
  if (hasFixedCatalogDimensions) return null;
  return (
    <>
      <Row label={`Width (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.width}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { width: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={`Height (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { height: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={`Thickness (${unitLabel})`}>
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
