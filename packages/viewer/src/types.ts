// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

// Re-exports from the vendored ./lib/types.ts (issue #870) - kept as a
// stable public entry point (packages/viewer/src/index.ts re-exports these)
// so internal files can keep importing the shape-kind union from one place
// without duplicating the ~150-line discriminated union in more than one spot.
export type {
  BarrierShape,
  BarrierVariant,
  ConeShape,
  DiveGateShape,
  FieldSpec,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  PolylinePoint,
  PolylineShape,
  Shape,
  ShapeKind,
  StartFinishShape,
  TowerShape,
  TrackDesign,
} from "./lib/types";

export type { MeasurementUnitSystem } from "./lib/track/units";
