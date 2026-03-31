import { getDesignShapes } from "@/lib/track/design";
import { distance2D } from "@/lib/track/geometry";
import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

const NUMBERED_KINDS = new Set<Shape["kind"]>(["gate", "ladder", "divegate"]);

export function isNumberedObstacle(shape: Shape) {
  return NUMBERED_KINDS.has(shape.kind);
}

function getPrimaryPolyline(design: TrackDesign): PolylineShape | null {
  return (
    getDesignShapes(design).find(
      (shape): shape is PolylineShape =>
        shape.kind === "polyline" && shape.points.length >= 2
    ) ?? null
  );
}

function getObstacleNumberAnchor(shape: Shape) {
  return { x: shape.x, y: shape.y };
}

function getObstaclePathTolerance(shape: Shape) {
  switch (shape.kind) {
    case "gate":
    case "ladder":
      return Math.max(shape.width * 0.42, 1.15);
    case "divegate":
      return Math.max(shape.size * 0.38, 1.15);
    default:
      return 1.1;
  }
}

function projectPointOntoSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 1e-9) {
    return {
      distance: distance2D(point, start),
      progress: 0,
      projectedPoint: start,
      segmentLength: 0,
    };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  const projectedPoint = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };

  return {
    distance: distance2D(point, projectedPoint),
    progress: t,
    projectedPoint,
    segmentLength: Math.sqrt(lengthSquared),
  };
}

export function getObstacleNumberMap(design: TrackDesign) {
  const map = new Map<string, number>();
  const primaryPolyline = getPrimaryPolyline(design);
  if (!primaryPolyline) return map;

  const pathPoints = getPolyline2DDerived(primaryPolyline).smoothPoints;
  if (pathPoints.length < 2) return map;

  const candidates = getDesignShapes(design)
    .filter(isNumberedObstacle)
    .map((shape, shapeOrder) => {
      const anchor = getObstacleNumberAnchor(shape);
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDistanceAlongPath = Number.POSITIVE_INFINITY;
      let runningLength = 0;

      for (let index = 1; index < pathPoints.length; index += 1) {
        const start = pathPoints[index - 1];
        const end = pathPoints[index];
        const projection = projectPointOntoSegment(anchor, start, end);
        const distanceAlongPath =
          runningLength + projection.segmentLength * projection.progress;

        if (projection.distance < bestDistance) {
          bestDistance = projection.distance;
          bestDistanceAlongPath = distanceAlongPath;
        }

        runningLength += projection.segmentLength;
      }
      return {
        shape,
        shapeOrder,
        distanceAlongPath: bestDistanceAlongPath,
        pathDistance: bestDistance,
        tolerance: getObstaclePathTolerance(shape),
      };
    })
    .filter(
      (candidate) =>
        Number.isFinite(candidate.distanceAlongPath) &&
        candidate.pathDistance <= candidate.tolerance
    )
    .sort((a, b) => {
      if (a.distanceAlongPath !== b.distanceAlongPath) {
        return a.distanceAlongPath - b.distanceAlongPath;
      }
      if (a.pathDistance !== b.pathDistance) {
        return a.pathDistance - b.pathDistance;
      }
      return a.shapeOrder - b.shapeOrder;
    });

  let index = 1;
  for (const candidate of candidates) {
    map.set(candidate.shape.id, index);
    index += 1;
  }

  return map;
}
