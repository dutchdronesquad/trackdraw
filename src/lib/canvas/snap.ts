import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape } from "@/lib/types";

type SnapPoint = { x: number; y: number };

const ROUTE_WAYPOINT_SNAP_RADIUS_RATIO = 0.55;
const ROUTE_WAYPOINT_SNAP_RADIUS_MAX_METERS = 0.65;

interface FindNearestSnapCandidateOptions {
  candidates: Shape[];
  excludeIds?: Iterable<string>;
  pos: { x: number; y: number };
  snapRadiusMeters: number;
}

export interface ResolveSnapPositionOptions {
  pos: { x: number; y: number };
  snapToGrid: boolean;
  snapToRouteLines?: boolean;
  snapToRouteWaypoints?: boolean;
  snapToShapes: boolean;
  snapToAxisAlignment?: boolean;
  gridStep: number;
  magneticRadiusMeters: number;
  candidates: Shape[];
  routeCandidates?: PolylineShape[];
  excludeIds?: Iterable<string>;
}

function findNearestSnapCandidate({
  candidates,
  excludeIds,
  pos,
  snapRadiusMeters,
}: FindNearestSnapCandidateOptions) {
  const excludeIdSet = excludeIds ? new Set(excludeIds) : null;
  let nearest: Shape | null = null;
  let minDist = snapRadiusMeters;

  for (const candidate of candidates) {
    if (excludeIdSet?.has(candidate.id)) continue;
    const dist = Math.hypot(candidate.x - pos.x, candidate.y - pos.y);
    if (dist < minDist) {
      minDist = dist;
      nearest = candidate;
    }
  }

  return nearest;
}

function projectPointOntoSegment(
  point: SnapPoint,
  start: SnapPoint,
  end: SnapPoint
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 1e-9) {
    return {
      distance: Math.hypot(point.x - start.x, point.y - start.y),
      point: { x: start.x, y: start.y },
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
    distance: Math.hypot(
      point.x - projectedPoint.x,
      point.y - projectedPoint.y
    ),
    point: projectedPoint,
  };
}

function findNearestRouteSnapPoint({
  excludeIds,
  pos,
  routeCandidates = [],
  snapRadiusMeters,
}: {
  excludeIds?: Iterable<string>;
  pos: { x: number; y: number };
  routeCandidates?: PolylineShape[];
  snapRadiusMeters: number;
}) {
  const excludeIdSet = excludeIds ? new Set(excludeIds) : null;
  let nearest: SnapPoint | null = null;
  let minDist = snapRadiusMeters;

  for (const route of routeCandidates) {
    if (excludeIdSet?.has(route.id) || route.points.length < 2) continue;
    const routePoints = getPolyline2DDerived(route).smoothPoints;

    for (let index = 1; index < routePoints.length; index += 1) {
      const projection = projectPointOntoSegment(
        pos,
        routePoints[index - 1],
        routePoints[index]
      );
      if (projection.distance < minDist) {
        minDist = projection.distance;
        nearest = projection.point;
      }
    }
  }

  return nearest;
}

function getRouteWaypointSnapRadius(snapRadiusMeters: number) {
  return Math.min(
    ROUTE_WAYPOINT_SNAP_RADIUS_MAX_METERS,
    snapRadiusMeters * ROUTE_WAYPOINT_SNAP_RADIUS_RATIO
  );
}

function findNearestRouteWaypointCandidate({
  excludeIds,
  pos,
  routeCandidates = [],
  snapRadiusMeters,
}: {
  excludeIds?: Iterable<string>;
  pos: { x: number; y: number };
  routeCandidates?: PolylineShape[];
  snapRadiusMeters: number;
}) {
  const excludeIdSet = excludeIds ? new Set(excludeIds) : null;
  let nearest: { x: number; y: number; id: string } | null = null;
  let minDist = getRouteWaypointSnapRadius(snapRadiusMeters);

  for (const route of routeCandidates) {
    if (excludeIdSet?.has(route.id)) continue;

    for (const [index, point] of route.points.entries()) {
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = {
          x: point.x,
          y: point.y,
          id: `${route.id}:waypoint:${index}`,
        };
      }
    }
  }

  return nearest;
}

function resolveAxisAlignmentSnap({
  candidates,
  excludeIds,
  pos,
  snapRadiusMeters,
}: FindNearestSnapCandidateOptions) {
  const excludeIdSet = excludeIds ? new Set(excludeIds) : null;
  let x = pos.x;
  let y = pos.y;
  let bestXDistance = snapRadiusMeters;
  let bestYDistance = snapRadiusMeters;

  for (const candidate of candidates) {
    if (excludeIdSet?.has(candidate.id)) continue;

    const dx = Math.abs(candidate.x - pos.x);
    if (dx < bestXDistance) {
      bestXDistance = dx;
      x = candidate.x;
    }

    const dy = Math.abs(candidate.y - pos.y);
    if (dy < bestYDistance) {
      bestYDistance = dy;
      y = candidate.y;
    }
  }

  return {
    x,
    y,
    snapped: x !== pos.x || y !== pos.y,
  };
}

export function findNearestSnapPoint(
  options: FindNearestSnapCandidateOptions
): { x: number; y: number } | null {
  const nearest = findNearestSnapCandidate(options);
  return nearest ? { x: nearest.x, y: nearest.y } : null;
}

export function findNearestSnapTarget(
  options: FindNearestSnapCandidateOptions
): { x: number; y: number; id: string } | null {
  const nearest = findNearestSnapCandidate(options);
  return nearest ? { x: nearest.x, y: nearest.y, id: nearest.id } : null;
}

export function findNearestSnapTargetWithRoutes(
  options: FindNearestSnapCandidateOptions & {
    routeCandidates?: PolylineShape[];
  }
): { x: number; y: number; id: string } | null {
  return (
    findNearestSnapTarget(options) ?? findNearestRouteWaypointCandidate(options)
  );
}

export function resolveSnapPosition({
  pos,
  snapToGrid,
  snapToRouteLines = true,
  snapToRouteWaypoints = true,
  snapToShapes,
  snapToAxisAlignment = true,
  gridStep,
  magneticRadiusMeters,
  candidates,
  routeCandidates,
  excludeIds,
}: ResolveSnapPositionOptions): { x: number; y: number } {
  if (snapToShapes) {
    const shapeSnap = findNearestSnapPoint({
      candidates,
      excludeIds,
      pos,
      snapRadiusMeters: magneticRadiusMeters,
    });
    if (shapeSnap) {
      return shapeSnap;
    }

    const waypointSnap = snapToRouteWaypoints
      ? findNearestRouteWaypointCandidate({
          excludeIds,
          pos,
          routeCandidates,
          snapRadiusMeters: magneticRadiusMeters,
        })
      : null;
    if (waypointSnap) {
      return { x: waypointSnap.x, y: waypointSnap.y };
    }

    const routeSnap = findNearestRouteSnapPoint({
      excludeIds,
      pos,
      routeCandidates: snapToRouteLines ? routeCandidates : [],
      snapRadiusMeters: magneticRadiusMeters * 0.45,
    });
    if (routeSnap) {
      return routeSnap;
    }

    if (snapToAxisAlignment) {
      const alignmentSnap = resolveAxisAlignmentSnap({
        candidates,
        excludeIds,
        pos,
        snapRadiusMeters: magneticRadiusMeters,
      });
      if (alignmentSnap.snapped) {
        return { x: alignmentSnap.x, y: alignmentSnap.y };
      }
    }
  }

  if (!snapToGrid) {
    return pos;
  }

  const snapX = Math.round(pos.x / gridStep) * gridStep;
  const snapY = Math.round(pos.y / gridStep) * gridStep;

  return {
    x: Math.abs(pos.x - snapX) <= magneticRadiusMeters ? snapX : pos.x,
    y: Math.abs(pos.y - snapY) <= magneticRadiusMeters ? snapY : pos.y,
  };
}
