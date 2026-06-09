import { MeasurementNum, Row } from "@/components/inspector/shared";
import type { MeasurementUnitSystem } from "@/lib/track/units";
import type { Shape, StartFinishShape } from "@/lib/types";

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
  return (
    <Row label={`Width (${unitLabel})`}>
      <MeasurementNum
        valueMeters={shape.width}
        unitSystem={unitSystem}
        onChange={(value) => updateShape(shape.id, { width: value })}
        minMeters={0.5}
      />
    </Row>
  );
}
