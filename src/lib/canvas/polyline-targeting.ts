import type { Vector2d } from "konva/lib/types";
import type { PolylineShape, Shape } from "@/lib/types";
import { getPolylineSmoothSegmentPointsPx } from "@/lib/track/polyline-derived";

export type PolylineTarget = {
  distanceSq: number;
  pointPx: Vector2d;
  segmentIndex: number;
  shape: PolylineShape;
};

export function resolveClosestPointOnPolyline(
  points: number[],
  pointer: Vector2d
) {
  let bestPoint = { x: pointer.x, y: pointer.y };
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= points.length - 4; index += 2) {
    const startX = points[index];
    const startY = points[index + 1];
    const endX = points[index + 2];
    const endY = points[index + 3];
    const dx = endX - startX;
    const dy = endY - startY;
    const lengthSq = dx * dx + dy * dy;
    const t =
      lengthSq > 0
        ? Math.max(
            0,
            Math.min(
              1,
              ((pointer.x - startX) * dx + (pointer.y - startY) * dy) / lengthSq
            )
          )
        : 0;
    const projectedX = startX + dx * t;
    const projectedY = startY + dy * t;
    const distanceSq =
      (pointer.x - projectedX) ** 2 + (pointer.y - projectedY) ** 2;

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestPoint = { x: projectedX, y: projectedY };
    }
  }

  return { distanceSq: bestDistanceSq, pointPx: bestPoint };
}

export function findPolylineTarget({
  designPpm,
  maxDistancePx,
  pointer,
  shapes,
}: {
  designPpm: number;
  maxDistancePx: number;
  pointer: Vector2d;
  shapes: Shape[];
}): PolylineTarget | null {
  let best: PolylineTarget | null = null;
  const maxDistanceSq = maxDistancePx * maxDistancePx;

  for (const shape of shapes) {
    if (shape.kind !== "polyline" || shape.locked || shape.points.length < 2) {
      continue;
    }

    const segmentPoints = getPolylineSmoothSegmentPointsPx(shape, designPpm);
    for (
      let segmentIndex = 0;
      segmentIndex < segmentPoints.length;
      segmentIndex += 1
    ) {
      const points = segmentPoints[segmentIndex];
      if (points.length < 4) continue;
      const candidate = resolveClosestPointOnPolyline(points, pointer);
      if (
        candidate.distanceSq <= maxDistanceSq &&
        (!best || candidate.distanceSq < best.distanceSq)
      ) {
        best = {
          ...candidate,
          segmentIndex,
          shape,
        };
      }
    }
  }

  return best;
}
