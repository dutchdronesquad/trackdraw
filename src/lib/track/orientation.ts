import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  LabelShape,
  Shape,
  StartFinishShape,
  TowerShape,
} from "@/lib/types";
import {
  getShapeOrientationBaseOffset,
  hasFrontBackItemOrientation,
  type OrientationSurface,
} from "@/lib/track/items/registry";

export type FrontBackShape =
  | GateShape
  | StartFinishShape
  | LadderShape
  | TowerShape
  | DiveGateShape;

export function hasFrontBackOrientation(shape: Shape): shape is FrontBackShape {
  return hasFrontBackItemOrientation(shape);
}

export function normalizeRotationDegrees(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function getShapeFacingDegrees(shape: FrontBackShape) {
  return resolveShapeOrientationDegrees(shape, "facing");
}

type OrientationShape =
  | GateShape
  | LadderShape
  | TowerShape
  | StartFinishShape
  | DiveGateShape
  | FlagShape
  | LabelShape;

export function resolveShapeOrientationDegrees(
  shape: OrientationShape,
  surface: OrientationSurface
) {
  const baseOffset = getShapeOrientationBaseOffset(shape.kind, surface);
  const frontOffset = shape.frontOffsetDeg ?? 0;
  return normalizeRotationDegrees(shape.rotation + baseOffset + frontOffset);
}

export function getCanvasRotationGuideAngleDeg(shape: OrientationShape) {
  return resolveShapeOrientationDegrees(shape, "canvasGuide");
}

export function getPreviewRotationGuideDegrees(
  shape:
    | GateShape
    | LadderShape
    | TowerShape
    | StartFinishShape
    | DiveGateShape
    | FlagShape
) {
  return resolveShapeOrientationDegrees(shape, "previewGuide");
}
