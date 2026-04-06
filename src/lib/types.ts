export type UUID = string;

export type ShapeKind =
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline"
  | "startfinish"
  | "ladder"
  | "divegate";

export type InventoryShapeKind = Extract<
  ShapeKind,
  "gate" | "flag" | "cone" | "startfinish" | "ladder" | "divegate"
>;

export type InventoryProfile = Record<InventoryShapeKind, number>;

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
  width: number; // m (inner opening)
  height: number; // m (clearance height)
  thick?: number; // m (post thickness)
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
  fontSize?: number; // px on canvas
  project?: boolean; // if true: flat on ground in 3D; if false (default): billboard float
}

export interface StartFinishShape extends BaseShape {
  kind: "startfinish";
  width: number; // m (inner opening)
}

export interface LadderShape extends BaseShape {
  kind: "ladder";
  width: number; // m horizontal span
  height: number; // m gate opening height (3D) / ladder footprint depth (2D top-down)
  rungs: number; // count of rungs
  elevation?: number; // m bottom clearance above ground (default 0)
}

export interface DiveGateShape extends BaseShape {
  kind: "divegate";
  size: number; // m outer dimension (square frame)
  thick?: number; // m frame/panel width (default 0.20)
  tilt?: number; // degrees from vertical: 0=vertical wall, 90=flat/horizontal
  elevation?: number; // m height of frame center above ground (default 3.0)
}

export interface PolylinePoint {
  x: number;
  y: number;
  z?: number; // meters AGL
}

export interface PolylineShape extends BaseShape {
  kind: "polyline";
  points: PolylinePoint[];
  closed?: boolean;
  strokeWidth?: number; // m
  showArrows?: boolean;
  arrowSpacing?: number; // m
  smooth?: boolean;
}

export type Shape =
  | GateShape
  | FlagShape
  | ConeShape
  | LabelShape
  | PolylineShape
  | StartFinishShape
  | LadderShape
  | DiveGateShape;

export type ShapeDraft<T extends Shape = Shape> = T extends Shape
  ? Omit<T, "id">
  : never;

export interface FieldSpec {
  width: number; // m
  height: number; // m
  origin: "tl" | "bl";
  gridStep: number; // m
  ppm: number; // pixels per meter
}

export interface TrackDesign {
  id: UUID;
  version: 1;
  title: string;
  description?: string;
  tags?: string[];
  authorName?: string;
  inventory: InventoryProfile;
  field: FieldSpec;
  shapeOrder: UUID[];
  shapeById: Record<UUID, Shape>;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export interface SerializedTrackDesign {
  id: UUID;
  version: 1;
  title: string;
  description?: string;
  tags?: string[];
  authorName?: string;
  inventory: InventoryProfile;
  field: FieldSpec;
  shapes: Shape[];
  createdAt: string;
  updatedAt: string;
}
