import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { ConeShape, Shape } from "@/lib/types";

export function ConeDimensionFields({
  shape,
  unitSystem,
  unitLabel,
  updateShape,
}: {
  shape: ConeShape;
  unitSystem: MeasurementUnitSystem;
  unitLabel: string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}) {
  return (
    <Row label={`Radius (${unitLabel})`}>
      <MeasurementNum
        valueMeters={shape.radius}
        unitSystem={unitSystem}
        onChange={(value) => updateShape(shape.id, { radius: value })}
        minMeters={0.05}
      />
    </Row>
  );
}
