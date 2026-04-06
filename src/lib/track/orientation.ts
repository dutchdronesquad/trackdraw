import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  LabelShape,
  ShapeKind,
  Shape,
  StartFinishShape,
} from "@/lib/types";

export type FrontBackShape =
  | GateShape
  | StartFinishShape
  | LadderShape
  | DiveGateShape;

export function hasFrontBackOrientation(shape: Shape): shape is FrontBackShape {
  return (
    shape.kind === "gate" ||
    shape.kind === "startfinish" ||
    shape.kind === "ladder" ||
    shape.kind === "divegate"
  );
}

export function normalizeRotationDegrees(rotation: number) {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function getShapeFacingDegrees(shape: FrontBackShape) {
  return resolveShapeOrientationDegrees(shape, "facing");
}

type OrientationSurface = "facing" | "canvasGuide" | "previewGuide";

const ORIENTATION_BASE_OFFSETS: Record<
  ShapeKind,
  Partial<Record<OrientationSurface, number>>
> = {
  gate: { facing: 0, canvasGuide: -90, previewGuide: 180 },
  flag: { facing: 0, canvasGuide: 0, previewGuide: -90 },
  cone: { facing: 0, canvasGuide: -90, previewGuide: 0 },
  label: { facing: 0, canvasGuide: -90, previewGuide: 0 },
  polyline: { facing: 0, canvasGuide: -90, previewGuide: 0 },
  startfinish: { facing: 0, canvasGuide: -90, previewGuide: 0 },
  ladder: { facing: 0, canvasGuide: -90, previewGuide: 180 },
  divegate: { facing: 90, canvasGuide: 90, previewGuide: 0 },
};

type OrientationShape =
  | GateShape
  | LadderShape
  | StartFinishShape
  | DiveGateShape
  | FlagShape
  | LabelShape;

export function resolveShapeOrientationDegrees(
  shape: OrientationShape,
  surface: OrientationSurface
) {
  const baseOffset = ORIENTATION_BASE_OFFSETS[shape.kind][surface] ?? 0;
  const frontOffset = shape.frontOffsetDeg ?? 0;
  return normalizeRotationDegrees(shape.rotation + baseOffset + frontOffset);
}

export function getCanvasRotationGuideAngleDeg(shape: OrientationShape) {
  return resolveShapeOrientationDegrees(shape, "canvasGuide");
}

export function getPreviewRotationGuideDegrees(
  shape: GateShape | LadderShape | StartFinishShape | DiveGateShape | FlagShape
) {
  return resolveShapeOrientationDegrees(shape, "previewGuide");
}
