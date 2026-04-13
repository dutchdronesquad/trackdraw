import {
  getPolyline2DPoints,
  getPolylineSegment2DPoints,
  getPolylineSegment3DPoints,
  getPolylineArrowMarkers,
} from "./geometry";
import { getDesignShapes } from "./design";
import type { PolylinePoint, PolylineShape, TrackDesign } from "../types";
import { m2px } from "./units";

const POLYLINE_2D_SAMPLES_PER_SEGMENT = 18;

type Cached2DPolylineMetrics = {
  arrowMarkers: Array<{ x: number; y: number; angle: number }>;
  boundsByPpm: Map<
    number,
    { x: number; y: number; width: number; height: number }
  >;
  elevationSamples: Array<{ d: number; z: number }>;
  smoothSegmentPoints: Array<Array<{ x: number; y: number }>>;
  smoothPoints: Array<{ x: number; y: number }>;
  smoothPxByPpm: Map<number, number[]>;
  smoothSegmentPxByPpm: Map<number, number[][]>;
  totalLength2D: number;
};

const polyline2DCache = new WeakMap<
  PolylinePoint[],
  Map<string, Cached2DPolylineMetrics>
>();

function get2DCache(
  points: PolylinePoint[]
): Map<string, Cached2DPolylineMetrics> {
  let cached = polyline2DCache.get(points);
  if (!cached) {
    cached = new Map();
    polyline2DCache.set(points, cached);
  }
  return cached;
}

function get2DCacheKey(path: PolylineShape) {
  return `${path.closed ? 1 : 0}|${path.showArrows ? 1 : 0}|${path.arrowSpacing ?? 15}`;
}

export function getPolyline2DDerived(
  path: PolylineShape
): Cached2DPolylineMetrics {
  const cache = get2DCache(path.points);
  const cacheKey = get2DCacheKey(path);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let totalLength2D = 0;
  const elevationSamples: Array<{ d: number; z: number }> = [];
  if (path.points.length > 0) {
    elevationSamples.push({ d: 0, z: path.points[0].z ?? 0 });
    for (let index = 1; index < path.points.length; index += 1) {
      const previous = path.points[index - 1];
      const current = path.points[index];
      totalLength2D += Math.hypot(
        current.x - previous.x,
        current.y - previous.y
      );
      elevationSamples.push({ d: totalLength2D, z: current.z ?? 0 });
    }
  }

  const next: Cached2DPolylineMetrics = {
    arrowMarkers: path.showArrows
      ? getPolylineArrowMarkers(path.points, path.arrowSpacing ?? 15, {
          closed: path.closed ?? false,
          samplesPerSegment: POLYLINE_2D_SAMPLES_PER_SEGMENT,
        })
      : [],
    boundsByPpm: new Map(),
    elevationSamples,
    smoothSegmentPoints: getPolylineSegment2DPoints(path.points, {
      closed: path.closed ?? false,
      smooth: true,
      samplesPerSegment: POLYLINE_2D_SAMPLES_PER_SEGMENT,
    }),
    smoothPoints: getPolyline2DPoints(path.points, {
      closed: path.closed ?? false,
      smooth: true,
      samplesPerSegment: POLYLINE_2D_SAMPLES_PER_SEGMENT,
    }),
    smoothPxByPpm: new Map(),
    smoothSegmentPxByPpm: new Map(),
    totalLength2D,
  };
  cache.set(cacheKey, next);
  return next;
}

export function getPolylineElevationSamples(path: PolylineShape) {
  return getPolyline2DDerived(path).elevationSamples;
}

export function getPolylineTotalLength2D(path: PolylineShape) {
  return getPolyline2DDerived(path).totalLength2D;
}

export function getPolylineSmoothPointsPx(
  path: PolylineShape,
  ppm: number
): number[] {
  const metrics = getPolyline2DDerived(path);
  const cached = metrics.smoothPxByPpm.get(ppm);
  if (cached) return cached;

  const pointsPx = metrics.smoothPoints.flatMap((point) => [
    m2px(point.x, ppm),
    m2px(point.y, ppm),
  ]);
  metrics.smoothPxByPpm.set(ppm, pointsPx);
  return pointsPx;
}

export function getPolylineSmoothSegmentPointsPx(
  path: PolylineShape,
  ppm: number
): number[][] {
  const metrics = getPolyline2DDerived(path);
  const cached = metrics.smoothSegmentPxByPpm.get(ppm);
  if (cached) return cached;

  const next = metrics.smoothSegmentPoints.map((segment) =>
    segment.flatMap((point) => [m2px(point.x, ppm), m2px(point.y, ppm)])
  );
  metrics.smoothSegmentPxByPpm.set(ppm, next);
  return next;
}

export function getPolylineBounds(path: PolylineShape, ppm: number) {
  const metrics = getPolyline2DDerived(path);
  const cached = metrics.boundsByPpm.get(ppm);
  if (cached) return cached;
  if (!metrics.smoothPoints.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of metrics.smoothPoints) {
    const x = m2px(point.x, ppm);
    const y = m2px(point.y, ppm);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const strokePx = m2px(path.strokeWidth ?? 0.26, ppm);
  const bounds = {
    x: minX - strokePx,
    y: minY - strokePx,
    width: maxX - minX + strokePx * 2,
    height: maxY - minY + strokePx * 2,
  };
  metrics.boundsByPpm.set(ppm, bounds);
  return bounds;
}

export function getPolylineSmoothSegmentPoints3D(
  path: PolylineShape,
  heightOffset = 0,
  samplesPerSegment = 18
): Array<Array<[number, number, number]>> {
  return getPolylineSegment3DPoints(path.points, {
    closed: path.closed ?? false,
    samplesPerSegment,
  }).map((segment) =>
    segment.map(
      (point) =>
        [point.x, Math.max(point.z, 0) + heightOffset, point.y] as [
          number,
          number,
          number,
        ]
    )
  );
}

export type RouteWarningKind =
  | "stub"
  | "flat"
  | "steep"
  | "hairpin"
  | "close-points"
  | "spacing-shift"
  | "rhythm-break"
  | "alignment-drift";

export interface RouteWarning {
  kind: RouteWarningKind;
  waypointIndex?: number;
}

type SegmentWarningKind = Exclude<RouteWarningKind, "flat" | "stub">;

export interface RouteWarningVisual {
  kind: SegmentWarningKind;
  waypointIndex: number;
  point: PolylinePoint;
  previousPoint?: PolylinePoint;
}

export interface RouteWarningSegmentVisual {
  kind: SegmentWarningKind;
  segmentIndex: number;
  startPoint: PolylinePoint;
  endPoint: PolylinePoint;
}

/**
 * Returns lightweight route-review cues for a polyline:
 * - stub: fewer than 2 waypoints — path cannot form a route
 * - flat: no elevation data set (all z = 0)
 * - steep: segment gradient > 50%
 * - hairpin: interior vertex angle < 45°
 * - close-points: consecutive waypoints < 0.5 m apart
 * - spacing-shift: abrupt jump from a short segment into a much longer one
 * - rhythm-break: short corrective segment between longer sections
 * - alignment-drift: a small kink breaks an otherwise straighter line
 */
export function getPolylineRouteWarnings(path: PolylineShape): RouteWarning[] {
  const pts = path.points;
  if (pts.length < 2) return [{ kind: "stub" }];

  const warnings: RouteWarning[] = [];
  const segmentLengths: number[] = [];
  const turnAnglesByWaypoint = new Map<number, number>();

  const hasElevation = pts.some((p) => (p.z ?? 0) !== 0);
  if (!hasElevation) {
    warnings.push({ kind: "flat" });
  }

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const horizDist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    segmentLengths.push(horizDist);

    if (horizDist < 0.5) {
      warnings.push({ kind: "close-points", waypointIndex: i });
      continue;
    }

    if (hasElevation) {
      const dz = Math.abs((curr.z ?? 0) - (prev.z ?? 0));
      if (dz / horizDist > 0.5) {
        warnings.push({ kind: "steep", waypointIndex: i });
      }
    }
  }

  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const ax = prev.x - curr.x;
    const ay = prev.y - curr.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const magA = Math.hypot(ax, ay);
    const magB = Math.hypot(bx, by);
    if (magA > 0.1 && magB > 0.1) {
      const cos = (ax * bx + ay * by) / (magA * magB);
      const angleDeg =
        Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
      turnAnglesByWaypoint.set(i, angleDeg);
      if (angleDeg < 45) {
        warnings.push({ kind: "hairpin", waypointIndex: i });
      }
    }
  }

  for (let i = 1; i < pts.length - 1; i += 1) {
    const previous = pts[i - 1];
    const current = pts[i];
    const next = pts[i + 1];
    const previousLength = segmentLengths[i - 1];
    const nextLength = segmentLengths[i];
    const angleDeg = turnAnglesByWaypoint.get(i);

    if (
      !previous ||
      !current ||
      !next ||
      typeof previousLength !== "number" ||
      typeof nextLength !== "number" ||
      typeof angleDeg !== "number"
    ) {
      continue;
    }

    if (previousLength < 2.5 || nextLength < 2.5) continue;
    if (angleDeg < 150 || angleDeg > 172) continue;

    const baselineLength = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (baselineLength < 4) continue;

    const offset =
      Math.abs(
        (next.x - previous.x) * (previous.y - current.y) -
          (previous.x - current.x) * (next.y - previous.y)
      ) / baselineLength;

    if (offset >= 0.35 && offset <= 1.6) {
      warnings.push({ kind: "alignment-drift", waypointIndex: i });
    }
  }

  const spacingShiftWaypoints = new Set<number>();
  for (let i = 1; i < pts.length - 1; i += 1) {
    const previousLength = segmentLengths[i - 1];
    const nextLength = segmentLengths[i];
    if (
      typeof previousLength !== "number" ||
      typeof nextLength !== "number" ||
      previousLength < 0.5 ||
      nextLength < 0.5
    ) {
      continue;
    }

    const shorter = Math.min(previousLength, nextLength);
    const longer = Math.max(previousLength, nextLength);
    if (shorter <= 1.6 && longer >= 3.8 && longer / shorter >= 2.4) {
      spacingShiftWaypoints.add(i);
      warnings.push({ kind: "spacing-shift", waypointIndex: i });
    }
  }

  for (
    let segmentIndex = 1;
    segmentIndex < segmentLengths.length - 1;
    segmentIndex += 1
  ) {
    const previousLength = segmentLengths[segmentIndex - 1];
    const currentLength = segmentLengths[segmentIndex];
    const nextLength = segmentLengths[segmentIndex + 1];
    const startTurn = turnAnglesByWaypoint.get(segmentIndex);
    const endTurn = turnAnglesByWaypoint.get(segmentIndex + 1);

    if (
      typeof startTurn !== "number" ||
      typeof endTurn !== "number" ||
      currentLength < 0.5
    ) {
      continue;
    }

    if (
      currentLength <= 1.8 &&
      previousLength >= currentLength * 1.9 &&
      nextLength >= currentLength * 1.9 &&
      startTurn < 135 &&
      endTurn < 135 &&
      !spacingShiftWaypoints.has(segmentIndex) &&
      !spacingShiftWaypoints.has(segmentIndex + 1)
    ) {
      warnings.push({ kind: "rhythm-break", waypointIndex: segmentIndex + 1 });
    }
  }

  return warnings;
}

export function getPolylineRouteWarningVisuals(
  path: PolylineShape
): RouteWarningVisual[] {
  const visuals: RouteWarningVisual[] = [];

  for (const warning of getPolylineRouteWarnings(path)) {
    if (warning.kind === "flat" || warning.kind === "stub") continue;
    if (typeof warning.waypointIndex !== "number") continue;

    const point = path.points[warning.waypointIndex];
    if (!point) continue;

    visuals.push({
      kind: warning.kind,
      waypointIndex: warning.waypointIndex,
      point,
      previousPoint:
        warning.waypointIndex > 0
          ? path.points[warning.waypointIndex - 1]
          : undefined,
    });
  }

  return visuals;
}

const ROUTE_WARNING_PRIORITY: Record<SegmentWarningKind, number> = {
  hairpin: 1,
  "spacing-shift": 2,
  "alignment-drift": 3,
  "rhythm-break": 4,
  steep: 5,
  "close-points": 6,
};

export function getRouteWarningSegmentColor(
  kind: SegmentWarningKind | undefined,
  defaultColor: string
) {
  if (!kind) return defaultColor;
  if (kind === "close-points") return "#ef4444";
  if (kind === "steep") return "#f97316";
  if (kind === "alignment-drift") return "#84cc16";
  if (kind === "rhythm-break") return "#f59e0b";
  if (kind === "spacing-shift") return "#eab308";
  return "#fbbf24";
}

export function getPolylineRouteWarningSegmentVisuals(
  path: PolylineShape
): RouteWarningSegmentVisual[] {
  const segments = new Map<number, RouteWarningSegmentVisual>();

  const assignSegment = (segmentIndex: number, kind: SegmentWarningKind) => {
    if (segmentIndex < 0 || segmentIndex >= path.points.length - 1) return;

    const startPoint = path.points[segmentIndex];
    const endPoint = path.points[segmentIndex + 1];
    if (!startPoint || !endPoint) return;

    const existing = segments.get(segmentIndex);
    if (
      existing &&
      ROUTE_WARNING_PRIORITY[existing.kind] >= ROUTE_WARNING_PRIORITY[kind]
    ) {
      return;
    }

    segments.set(segmentIndex, {
      kind,
      segmentIndex,
      startPoint,
      endPoint,
    });
  };

  for (const warning of getPolylineRouteWarnings(path)) {
    if (warning.kind === "flat" || warning.kind === "stub") continue;
    if (typeof warning.waypointIndex !== "number") continue;

    if (
      warning.kind === "steep" ||
      warning.kind === "close-points" ||
      warning.kind === "spacing-shift"
    ) {
      assignSegment(warning.waypointIndex - 1, warning.kind);
      continue;
    }

    if (
      warning.kind === "hairpin" ||
      warning.kind === "rhythm-break" ||
      warning.kind === "alignment-drift"
    ) {
      assignSegment(warning.waypointIndex - 1, warning.kind);
      assignSegment(warning.waypointIndex, warning.kind);
    }
  }

  return Array.from(segments.values()).sort(
    (left, right) => left.segmentIndex - right.segmentIndex
  );
}

export function getDesignPolylineZRange(design: TrackDesign): [number, number] {
  let zmin = 0;
  let zmax = 0;
  let seen = false;

  for (const shape of getDesignShapes(design)) {
    if (shape.kind !== "polyline") continue;
    for (const point of shape.points) {
      const z = point.z ?? 0;
      if (!seen) {
        zmin = z;
        zmax = z;
        seen = true;
      } else {
        zmin = Math.min(zmin, z);
        zmax = Math.max(zmax, z);
      }
    }
  }

  return [zmin, zmax];
}
