import type { PolylineShape, Shape, ShapeKind } from "@/lib/types";

export function isShapeKind<K extends ShapeKind>(
  shape: Shape,
  kind: K
): shape is Extract<Shape, { kind: K }> {
  return shape.kind === kind;
}

export function isPolylineShape(shape: Shape): shape is PolylineShape {
  return isShapeKind(shape, "polyline");
}
