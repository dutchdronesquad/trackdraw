import "server-only";

import { getDesignShapes, serializeDesign } from "@/lib/track/design";
import {
  getObstacleNumberingReport,
  isNumberedObstacle,
} from "@/lib/track/obstacleNumbering";
import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import { getDesignTimingMarkers } from "@/lib/track/timing";
import type { StoredProject } from "@/lib/server/projects";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSnakeCaseKey(key: string) {
  return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function toSnakeCaseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSnakeCaseValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      toSnakeCaseKey(key),
      toSnakeCaseValue(entry),
    ])
  );
}

export function toApiProjectSummary(project: StoredProject) {
  return {
    type: "project" as const,
    id: project.id,
    title: project.title,
    field: {
      width: project.fieldWidth ?? project.design.field.width,
      height: project.fieldHeight ?? project.design.field.height,
      unit: "m" as const,
    },
    shape_count: project.shapeCount,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function toApiShape(shape: Shape) {
  const {
    locked: _locked,
    frontOffsetDeg: _frontOffsetDeg,
    meta: _meta,
    ...shapeData
  } = shape;
  return toSnakeCaseValue(shapeData) as Record<string, unknown>;
}

function toApiPoint(point: { x: number; y: number; z?: number }) {
  return {
    x: point.x,
    y: point.y,
    ...(typeof point.z === "number" ? { z: point.z } : {}),
  };
}

function getPrimaryRoute(design: TrackDesign) {
  return (
    getDesignShapes(design).find(
      (shape): shape is PolylineShape =>
        shape.kind === "polyline" && shape.points.length >= 2
    ) ?? null
  );
}

function getPointSequenceLength(points: Array<{ x: number; y: number }>) {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    length += Math.hypot(end.x - start.x, end.y - start.y);
  }

  return length;
}

function projectPointOntoRoute(
  point: { x: number; y: number },
  routePoints: Array<{ x: number; y: number }>,
  routeLength: number
) {
  if (routePoints.length < 2 || routeLength <= 0) {
    return null;
  }

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestDistanceAlongRoute = 0;
  let bestProjectedPoint = routePoints[0];
  let runningLength = 0;

  for (let index = 1; index < routePoints.length; index += 1) {
    const start = routePoints[index - 1];
    const end = routePoints[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const segmentLength = Math.sqrt(lengthSquared);

    if (lengthSquared <= 1e-9) {
      continue;
    }

    const segmentProgress = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
      )
    );
    const projectedPoint = {
      x: start.x + dx * segmentProgress,
      y: start.y + dy * segmentProgress,
    };
    const distance = Math.hypot(
      point.x - projectedPoint.x,
      point.y - projectedPoint.y
    );
    const distanceAlongRoute = runningLength + segmentLength * segmentProgress;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestDistanceAlongRoute = distanceAlongRoute;
      bestProjectedPoint = projectedPoint;
    }

    runningLength += segmentLength;
  }

  if (!Number.isFinite(bestDistance)) {
    return null;
  }

  return {
    distance_m: bestDistanceAlongRoute,
    progress: bestDistanceAlongRoute / routeLength,
    x: bestProjectedPoint.x,
    y: bestProjectedPoint.y,
    offset_m: bestDistance,
  };
}

function toOverlayObstacle(
  shape: Shape,
  routeNumber: number | null,
  routePosition: ReturnType<typeof projectPointOntoRoute>
) {
  const base = {
    id: shape.id,
    kind: shape.kind,
    name: shape.name ?? null,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    route_number: routeNumber,
    route_position: routePosition,
  };

  switch (shape.kind) {
    case "gate":
      return {
        ...base,
        width: shape.width,
        height: shape.height,
      };
    case "ladder":
      return {
        ...base,
        width: shape.width,
        height: shape.height,
        rungs: shape.rungs,
        elevation: shape.elevation ?? 0,
      };
    case "divegate":
      return {
        ...base,
        size: shape.size,
        tilt: shape.tilt ?? 0,
        elevation: shape.elevation ?? 3,
      };
    default:
      return base;
  }
}

export function toApiTrackPackage(project: StoredProject) {
  const shapes = getDesignShapes(project.design);

  return {
    type: "track" as const,
    schema: "trackdraw.track.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    field: {
      width: project.design.field.width,
      height: project.design.field.height,
      origin: project.design.field.origin,
      unit: "m" as const,
    },
    shape_count: shapes.length,
    timing_markers: getDesignTimingMarkers(project.design).map((marker) => ({
      shape_id: marker.shape.id,
      role: marker.marker.role,
      timing_id: marker.marker.timingId ?? null,
      title: marker.title,
    })),
    updated_at: project.designUpdatedAt,
    shapes: shapes.map(toApiShape),
  };
}

export function toApiOverlayPackage(project: StoredProject) {
  const route = getPrimaryRoute(project.design);
  const routeMetrics = route ? getPolyline2DDerived(route) : null;
  const routePoints = routeMetrics?.smoothPoints ?? [];
  const routeLength = getPointSequenceLength(routePoints);
  const obstacleReport = getObstacleNumberingReport(project.design);
  const shapes = getDesignShapes(project.design);
  const routeObstacles = shapes.filter(isNumberedObstacle);

  return {
    type: "overlay_track" as const,
    schema: "trackdraw.overlay.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    field: {
      width: project.design.field.width,
      height: project.design.field.height,
      origin: project.design.field.origin,
      unit: "m" as const,
    },
    route: route
      ? {
          shape_id: route.id,
          closed: Boolean(route.closed),
          length_m: routeLength,
          waypoints: route.points.map(toApiPoint),
          sampled_points: routePoints,
        }
      : null,
    route_status: obstacleReport.status,
    route_obstacles: routeObstacles.map((shape) =>
      toOverlayObstacle(
        shape,
        obstacleReport.obstacleNumberMap.get(shape.id) ?? null,
        projectPointOntoRoute(shape, routePoints, routeLength)
      )
    ),
    timing_markers: getDesignTimingMarkers(project.design).map((marker) => ({
      shape_id: marker.shape.id,
      role: marker.marker.role,
      timing_id: marker.marker.timingId ?? null,
      title: marker.title,
      position: {
        x: marker.shape.x,
        y: marker.shape.y,
      },
      route_position: projectPointOntoRoute(
        marker.shape,
        routePoints,
        routeLength
      ),
    })),
    updated_at: project.designUpdatedAt,
  };
}

export function toApiTrackDrawExport(project: StoredProject) {
  return {
    type: "export" as const,
    schema: "trackdraw.export.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    updated_at: project.designUpdatedAt,
    design: serializeDesign(project.design),
  };
}
