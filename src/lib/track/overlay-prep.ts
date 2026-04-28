import { getDesignShapes } from "@/lib/track/design";
import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import { getDesignTimingMarkers } from "@/lib/track/timing";
import type {
  PolylineShape,
  Shape,
  StartFinishShape,
  TrackDesign,
} from "@/lib/types";

export type OverlayPrepIssueType =
  | "duplicate-start-finish"
  | "duplicate-timing-id"
  | "missing-route"
  | "missing-split-id"
  | "missing-start-finish"
  | "multiple-routes"
  | "timing-point-off-route";

export interface OverlayPrepIssue {
  distance?: number;
  routeId?: string;
  severity: "error";
  shapeId?: string;
  shapeIds?: string[];
  timingId?: string;
  tolerance?: number;
  type: OverlayPrepIssueType;
}

export interface OverlayPrepTimingPoint {
  pathDistance: number | null;
  projectedPoint: { x: number; y: number } | null;
  routeDistance: number | null;
  routeProgress: number | null;
  shapeId: string;
  timingId?: string;
  title: string;
  role: "start_finish" | "split";
}

export interface OverlayPrepReport {
  issues: OverlayPrepIssue[];
  raceRouteId: string | null;
  routeLength: number | null;
  status: "blocked" | "ready";
  timingPoints: OverlayPrepTimingPoint[];
}

function getUsableRaceRoutes(shapes: Shape[]) {
  return shapes.filter(
    (shape): shape is PolylineShape =>
      shape.kind === "polyline" && shape.points.length >= 2
  );
}

function getTimingPointRouteTolerance(shape: Shape) {
  switch (shape.kind) {
    case "gate":
      return Math.max(shape.width * 0.55, 1.5);
    case "startfinish":
      return Math.max((shape as StartFinishShape).width * 0.55, 1.5);
    default:
      return 1.5;
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
      distance: Math.hypot(point.x - start.x, point.y - start.y),
      progress: 0,
      projectedPoint: start,
      segmentLength: 0,
    };
  }

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  const projectedPoint = {
    x: start.x + dx * progress,
    y: start.y + dy * progress,
  };

  return {
    distance: Math.hypot(
      point.x - projectedPoint.x,
      point.y - projectedPoint.y
    ),
    progress,
    projectedPoint,
    segmentLength: Math.sqrt(lengthSquared),
  };
}

function getRouteProjection(
  route: PolylineShape,
  point: { x: number; y: number }
) {
  const pathPoints = getPolyline2DDerived(route).smoothPoints;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestRouteDistance = Number.POSITIVE_INFINITY;
  let bestProjectedPoint: { x: number; y: number } | null = null;
  let routeLength = 0;

  for (let index = 1; index < pathPoints.length; index += 1) {
    const start = pathPoints[index - 1];
    const end = pathPoints[index];
    const projection = projectPointOntoSegment(point, start, end);
    const routeDistance =
      routeLength + projection.segmentLength * projection.progress;

    if (projection.distance < bestDistance) {
      bestDistance = projection.distance;
      bestRouteDistance = routeDistance;
      bestProjectedPoint = projection.projectedPoint;
    }

    routeLength += projection.segmentLength;
  }

  return {
    pathDistance: bestDistance,
    projectedPoint: bestProjectedPoint,
    routeDistance: bestRouteDistance,
    routeLength,
    routeProgress:
      routeLength > 0 && Number.isFinite(bestRouteDistance)
        ? bestRouteDistance / routeLength
        : null,
  };
}

function getSmoothRouteLength(route: PolylineShape) {
  const pathPoints = getPolyline2DDerived(route).smoothPoints;
  let routeLength = 0;

  for (let index = 1; index < pathPoints.length; index += 1) {
    const start = pathPoints[index - 1];
    const end = pathPoints[index];
    routeLength += Math.hypot(end.x - start.x, end.y - start.y);
  }

  return routeLength;
}

export function getOverlayPrepReport(design: TrackDesign): OverlayPrepReport {
  const shapes = getDesignShapes(design);
  const routes = getUsableRaceRoutes(shapes);
  const timingMarkers = getDesignTimingMarkers(design);
  const issues: OverlayPrepIssue[] = [];
  const raceRoute = routes.length === 1 ? routes[0] : null;

  if (routes.length === 0) {
    issues.push({ severity: "error", type: "missing-route" });
  } else if (routes.length > 1) {
    issues.push({
      severity: "error",
      shapeIds: routes.map((route) => route.id),
      type: "multiple-routes",
    });
  }

  const startFinishMarkers = timingMarkers.filter(
    (point) => point.marker.role === "start_finish"
  );
  if (startFinishMarkers.length === 0) {
    issues.push({ severity: "error", type: "missing-start-finish" });
  } else if (startFinishMarkers.length > 1) {
    issues.push({
      severity: "error",
      shapeIds: startFinishMarkers.map((point) => point.shape.id),
      type: "duplicate-start-finish",
    });
  }

  const timingIds = new Map<string, string[]>();
  timingMarkers.forEach((point) => {
    const timingId = point.marker.timingId?.trim();
    if (point.marker.role === "split" && !timingId) {
      issues.push({
        severity: "error",
        shapeId: point.shape.id,
        type: "missing-split-id",
      });
      return;
    }

    if (!timingId) return;
    timingIds.set(timingId, [
      ...(timingIds.get(timingId) ?? []),
      point.shape.id,
    ]);
  });

  timingIds.forEach((shapeIds, timingId) => {
    if (shapeIds.length <= 1) return;
    issues.push({
      severity: "error",
      shapeIds,
      timingId,
      type: "duplicate-timing-id",
    });
  });

  let routeLength = raceRoute ? getSmoothRouteLength(raceRoute) : null;
  const timingPoints = timingMarkers
    .map<OverlayPrepTimingPoint>((point) => {
      if (!raceRoute) {
        return {
          pathDistance: null,
          projectedPoint: null,
          routeDistance: null,
          routeProgress: null,
          role: point.marker.role,
          shapeId: point.shape.id,
          timingId: point.marker.timingId,
          title: point.title,
        };
      }

      const projection = getRouteProjection(raceRoute, point.shape);
      routeLength = projection.routeLength;
      const tolerance = getTimingPointRouteTolerance(point.shape);
      if (projection.pathDistance > tolerance) {
        issues.push({
          distance: projection.pathDistance,
          routeId: raceRoute.id,
          severity: "error",
          shapeId: point.shape.id,
          tolerance,
          type: "timing-point-off-route",
        });
      }

      return {
        pathDistance: projection.pathDistance,
        projectedPoint: projection.projectedPoint,
        routeDistance: projection.routeDistance,
        routeProgress: projection.routeProgress,
        role: point.marker.role,
        shapeId: point.shape.id,
        timingId: point.marker.timingId,
        title: point.title,
      };
    })
    .sort((a, b) => {
      if (a.routeDistance === null && b.routeDistance === null) return 0;
      if (a.routeDistance === null) return 1;
      if (b.routeDistance === null) return -1;
      return a.routeDistance - b.routeDistance;
    });

  return {
    issues,
    raceRouteId: raceRoute?.id ?? null,
    routeLength,
    status: issues.length ? "blocked" : "ready",
    timingPoints,
  };
}
