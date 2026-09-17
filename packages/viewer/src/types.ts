// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

// PHASE 1 SHORTCUT: type-only import from the main app so the 2D/3D renderers
// keep full shape-kind fidelity without duplicating the ~150-line discriminated
// union. Type-only imports are erased at compile time (zero runtime coupling),
// but this is still a *source* dependency on src/lib/types.ts. Phase 2's real
// package build must vendor these types instead once the package leaves this
// repo's TypeScript project.
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
} from "@/lib/types";

export type { MeasurementUnitSystem } from "@/lib/track/units";
