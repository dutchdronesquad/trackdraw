import { getDesignShapes } from "@/lib/track/design";
import { distance2D } from "@/lib/track/geometry";
import {
  getObstacleRouteToleranceWidthFactor,
  isNumberedTrackObstacle,
} from "@/lib/track/items/registry";
import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

export type ObstacleNumberingStatus =
  | "empty"
  | "missing-route"
  | "no-numbered-obstacles"
  | "no-route-matches"
  | "partial"
  | "ready";

export interface ObstacleNumberingIssue {
  distance: number;
  shapeId: string;
  tolerance: number;
  type: "off-route";
}

export interface ObstacleNumberingReport {
  issueCount: number;
  issues: ObstacleNumberingIssue[];
  mappedObstacleCount: number;
  obstacleNumberMap: Map<string, number>;
  primaryPolylineId: string | null;
  status: ObstacleNumberingStatus;
  totalNumberedObstacleCount: number;
  unmappedObstacleCount: number;
}

interface ObstacleNumberingCandidate {
  distanceAlongPath: number;
  pathDistance: number;
  shape: Shape;
  shapeOrder: number;
  tolerance: number;
}

interface ObstaclePathSegment {
  end: { x: number; y: number };
  length: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  start: { x: number; y: number };
  startDistance: number;
}

export function isNumberedObstacle(shape: Shape) {
  return isNumberedTrackObstacle(shape);
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
  const width =
    "width" in shape && typeof shape.width === "number" ? shape.width : 0;
  const factor = getObstacleRouteToleranceWidthFactor(shape);
  return factor > 0 ? Math.max(width * factor, 1.15) : 1.1;
}

function getObstacleNumberingStatus(options: {
  hasAnyShape: boolean;
  mappedObstacleCount: number;
  primaryPolyline: PolylineShape | null;
  totalNumberedObstacleCount: number;
  unmappedObstacleCount: number;
}): ObstacleNumberingStatus {
  const {
    hasAnyShape,
    mappedObstacleCount,
    primaryPolyline,
    totalNumberedObstacleCount,
    unmappedObstacleCount,
  } = options;

  if (!hasAnyShape) return "empty";
  if (totalNumberedObstacleCount === 0) return "no-numbered-obstacles";
  if (!primaryPolyline) return "missing-route";
  if (mappedObstacleCount === 0) return "no-route-matches";
  if (unmappedObstacleCount > 0) return "partial";
  return "ready";
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

function buildObstaclePathSegments(
  pathPoints: Array<{ x: number; y: number }>
) {
  const segments: ObstaclePathSegment[] = [];
  let runningLength = 0;

  for (let index = 1; index < pathPoints.length; index += 1) {
    const start = pathPoints[index - 1];
    const end = pathPoints[index];
    const length = distance2D(start, end);

    segments.push({
      end,
      length,
      maxX: Math.max(start.x, end.x),
      maxY: Math.max(start.y, end.y),
      minX: Math.min(start.x, end.x),
      minY: Math.min(start.y, end.y),
      start,
      startDistance: runningLength,
    });

    runningLength += length;
  }

  return segments;
}

function getNearbyObstaclePathSegments(
  anchor: { x: number; y: number },
  tolerance: number,
  segments: ObstaclePathSegment[]
) {
  const nearby = segments.filter(
    (segment) =>
      anchor.x >= segment.minX - tolerance &&
      anchor.x <= segment.maxX + tolerance &&
      anchor.y >= segment.minY - tolerance &&
      anchor.y <= segment.maxY + tolerance
  );

  return nearby.length > 0 ? nearby : segments;
}

function findNearestObstaclePathPosition(
  anchor: { x: number; y: number },
  tolerance: number,
  segments: ObstaclePathSegment[]
) {
  const scanSegments = (candidates: ObstaclePathSegment[]) => {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestDistanceAlongPath = Number.POSITIVE_INFINITY;

    for (const segment of candidates) {
      const projection = projectPointOntoSegment(
        anchor,
        segment.start,
        segment.end
      );
      const distanceAlongPath =
        segment.startDistance + segment.length * projection.progress;

      if (projection.distance < bestDistance) {
        bestDistance = projection.distance;
        bestDistanceAlongPath = distanceAlongPath;
      }
    }

    return { bestDistance, bestDistanceAlongPath };
  };

  const nearbySegments = getNearbyObstaclePathSegments(
    anchor,
    tolerance,
    segments
  );
  const nearbyResult = scanSegments(nearbySegments);
  if (nearbySegments === segments || nearbyResult.bestDistance <= tolerance) {
    return nearbyResult;
  }

  return scanSegments(segments);
}

function getObstacleNumberingCandidates(design: TrackDesign) {
  const shapes = getDesignShapes(design);
  const primaryPolyline = getPrimaryPolyline(design);
  const numberedObstacles = shapes.filter(isNumberedObstacle);
  if (!primaryPolyline) {
    return {
      candidates: [] as ObstacleNumberingCandidate[],
      numberedObstacles,
      primaryPolyline,
      shapes,
    };
  }

  const pathPoints = getPolyline2DDerived(primaryPolyline).smoothPoints;
  if (pathPoints.length < 2) {
    return {
      candidates: [] as ObstacleNumberingCandidate[],
      numberedObstacles,
      primaryPolyline,
      shapes,
    };
  }

  const pathSegments = buildObstaclePathSegments(pathPoints);

  return {
    candidates: numberedObstacles.map((shape, shapeOrder) => {
      const anchor = getObstacleNumberAnchor(shape);
      const tolerance = getObstaclePathTolerance(shape);
      const { bestDistance, bestDistanceAlongPath } =
        findNearestObstaclePathPosition(anchor, tolerance, pathSegments);

      return {
        shape,
        shapeOrder,
        distanceAlongPath: bestDistanceAlongPath,
        pathDistance: bestDistance,
        tolerance,
      };
    }),
    numberedObstacles,
    primaryPolyline,
    shapes,
  };
}

function getSortedMappedCandidates(candidates: ObstacleNumberingCandidate[]) {
  return candidates
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
}

export function getObstacleNumberMap(design: TrackDesign) {
  const map = new Map<string, number>();
  const { candidates } = getObstacleNumberingCandidates(design);

  for (const [index, candidate] of getSortedMappedCandidates(
    candidates
  ).entries()) {
    map.set(candidate.shape.id, index + 1);
  }

  return map;
}

export function getObstacleNumberingReport(
  design: TrackDesign
): ObstacleNumberingReport {
  const { candidates, numberedObstacles, primaryPolyline, shapes } =
    getObstacleNumberingCandidates(design);
  const mappedCandidates = getSortedMappedCandidates(candidates);
  const obstacleNumberMap = new Map<string, number>();

  for (const [index, candidate] of mappedCandidates.entries()) {
    obstacleNumberMap.set(candidate.shape.id, index + 1);
  }

  const mappedObstacleIds = new Set(
    mappedCandidates.map((candidate) => candidate.shape.id)
  );
  const issues = candidates
    .filter((candidate) => !mappedObstacleIds.has(candidate.shape.id))
    .map((candidate) => ({
      distance: candidate.pathDistance,
      shapeId: candidate.shape.id,
      tolerance: candidate.tolerance,
      type: "off-route" as const,
    }));
  const unmappedObstacleCount =
    numberedObstacles.length - obstacleNumberMap.size;

  return {
    issueCount: unmappedObstacleCount,
    issues,
    mappedObstacleCount: obstacleNumberMap.size,
    obstacleNumberMap,
    primaryPolylineId: primaryPolyline?.id ?? null,
    status: getObstacleNumberingStatus({
      hasAnyShape: shapes.length > 0,
      mappedObstacleCount: obstacleNumberMap.size,
      primaryPolyline,
      totalNumberedObstacleCount: numberedObstacles.length,
      unmappedObstacleCount,
    }),
    totalNumberedObstacleCount: numberedObstacles.length,
    unmappedObstacleCount,
  };
}
