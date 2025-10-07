export type UUID = string;

export type ShapeKind = "gate" | "flag" | "cone" | "label" | "polyline";

export interface BaseShape {
  id: UUID;
  kind: ShapeKind;
  name?: string;
  x: number; // meters
  y: number; // meters
  rotation: number; // degrees
  locked?: boolean;
  color?: string; // #RRGGBB or CSS color
  meta?: Record<string, unknown>;
}

export interface GateShape extends BaseShape {
  kind: "gate";
  width: number; // m (inner)
  height: number; // m (clearance height)
  thick?: number; // m
}

export interface FlagShape extends BaseShape {
  kind: "flag";
  radius: number; // m footprint
  poleHeight?: number; // m AGL
}

export interface ConeShape extends BaseShape {
  kind: "cone";
  radius: number; // m
}

export interface LabelShape extends BaseShape {
  kind: "label";
  text: string;
  fontSize?: number; // px
}

export interface PolylinePoint {
  x: number;
  y: number;
  z?: number;
} // z in meters AGL

export interface PolylineShape extends BaseShape {
  kind: "polyline";
  points: PolylinePoint[];
  closed?: boolean;
  strokeWidth?: number; // m
  showArrows?: boolean;
  smooth?: boolean;
}

export type Shape =
  | GateShape
  | FlagShape
  | ConeShape
  | LabelShape
  | PolylineShape;

export interface FieldSpec {
  width: number; // m
  height: number; // m
  origin: "tl" | "bl";
  gridStep: number; // m
  ppm: number; // pixels per meter
}

export interface TrackDesign {
  id: UUID;
  title: string;
  description?: string;
  field: FieldSpec;
  shapes: Shape[];
  createdAt: string;
  updatedAt: string;
  version: 1;
}
