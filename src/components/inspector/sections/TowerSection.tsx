import {
  MeasurementNum,
  Num,
  Row,
  Section,
} from "@/components/inspector/shared";
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
      <Row label={`Opening height (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.height}
          unitSystem={unitSystem}
          onChange={(value) => updateShape(shape.id, { height: value })}
          minMeters={0.5}
        />
      </Row>
      <Row label={`Elevation (${unitLabel})`}>
        <MeasurementNum
          valueMeters={shape.elevation ?? 0}
          unitSystem={unitSystem}
          onChange={(value) =>
            updateShape(shape.id, { elevation: Math.max(0, value) })
          }
          minMeters={0}
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
  if (hasFixedCatalogDimensions) return null;
  return (
    <Section title="Tower" defaultOpen={defaultOpen}>
      <Row label="Levels">
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
