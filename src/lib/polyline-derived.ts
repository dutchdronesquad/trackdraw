import * as THREE from "three";
import {
  getAdaptiveCurveSegments,
  getPolyline2DPoints,
  getPolylineArrowMarkers,
  smoothPolyline3D,
} from "./geometry";
import { getDesignShapes } from "./design";
import type { PolylinePoint, PolylineShape, TrackDesign } from "./types";
import { m2px } from "./units";

type PolylineCurve3Data = {
  curve: THREE.CatmullRomCurve3;
  segmentCount: number;
};

const POLYLINE_2D_SAMPLES_PER_SEGMENT = 18;

type Cached2DPolylineMetrics = {
  arrowMarkers: Array<{ x: number; y: number; angle: number }>;
  boundsByPpm: Map<
    number,
    { x: number; y: number; width: number; height: number }
  >;
  elevationSamples: Array<{ d: number; z: number }>;
  smoothPoints: Array<{ x: number; y: number }>;
  smoothPxByPpm: Map<number, number[]>;
  totalLength2D: number;
};

type Cached3DPolylineMetrics = {
  curveData: PolylineCurve3Data | null;
  previewPoints: [number, number, number][];
};

type PolylineDerivedCache = {
  metrics2D: Map<string, Cached2DPolylineMetrics>;
  metrics3D: Map<string, Cached3DPolylineMetrics>;
};

const polylineDerivedCache = new WeakMap<
  PolylinePoint[],
  PolylineDerivedCache
>();

function getPolylineCache(points: PolylinePoint[]): PolylineDerivedCache {
  let cached = polylineDerivedCache.get(points);
  if (!cached) {
    cached = {
      metrics2D: new Map(),
      metrics3D: new Map(),
    };
    polylineDerivedCache.set(points, cached);
  }
  return cached;
}

function get2DCacheKey(path: PolylineShape) {
  return `${path.closed ? 1 : 0}|${path.showArrows ? 1 : 0}|${path.arrowSpacing ?? 15}`;
}

function get3DCacheKey(
  path: PolylineShape,
  options?: {
    heightOffset?: number;
    samplesPerSegment?: number;
    density?: number;
  }
) {
  return [
    path.closed ? 1 : 0,
    options?.heightOffset ?? 0,
    options?.samplesPerSegment ?? 18,
    options?.density ?? 12,
  ].join("|");
}

export function getPolyline2DDerived(
  path: PolylineShape
): Cached2DPolylineMetrics {
  const cache = getPolylineCache(path.points);
  const cacheKey = get2DCacheKey(path);
  const cached = cache.metrics2D.get(cacheKey);
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
    smoothPoints: getPolyline2DPoints(path.points, {
      closed: path.closed ?? false,
      smooth: true,
      samplesPerSegment: POLYLINE_2D_SAMPLES_PER_SEGMENT,
    }),
    smoothPxByPpm: new Map(),
    totalLength2D,
  };
  cache.metrics2D.set(cacheKey, next);
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

export function getPolylineCurve3Derived(
  path: PolylineShape,
  options?: {
    heightOffset?: number;
    samplesPerSegment?: number;
    density?: number;
  }
): PolylineCurve3Data | null {
  const cache = getPolylineCache(path.points);
  const cacheKey = get3DCacheKey(path, options);
  const cached = cache.metrics3D.get(cacheKey);
  if (cached) return cached.curveData;

  if (path.points.length < 2) {
    cache.metrics3D.set(cacheKey, {
      curveData: null,
      previewPoints: [],
    });
    return null;
  }

  const closed = path.closed ?? false;
  const heightOffset = options?.heightOffset ?? 0;
  const samplesPerSegment = options?.samplesPerSegment ?? 18;
  const density = options?.density ?? 12;
  const smoothPoints = smoothPolyline3D(path.points, {
    closed,
    samplesPerSegment,
  });
  const baseVectors = smoothPoints.map(
    (point) =>
      new THREE.Vector3(point.x, Math.max(point.z, 0) + heightOffset, point.y)
  );
  const baseCurve = new THREE.CatmullRomCurve3(
    baseVectors,
    closed,
    "centripetal"
  );
  const segmentCount = getAdaptiveCurveSegments(smoothPoints, density);
  const spacedPoints = baseCurve.getSpacedPoints(segmentCount);
  const curve = new THREE.CatmullRomCurve3(spacedPoints, closed, "centripetal");
  curve.arcLengthDivisions = Math.max(240, segmentCount * 3);

  const next = {
    curveData: {
      curve,
      segmentCount,
    },
    previewPoints: path.points.map((point) => [
      point.x,
      Math.max(point.z ?? 0, 0) + heightOffset,
      point.y,
    ]) as [number, number, number][],
  };
  cache.metrics3D.set(cacheKey, next);
  return next.curveData;
}

export function getPolylinePreview3DPoints(
  path: PolylineShape,
  heightOffset = 0
): [number, number, number][] {
  const cache = getPolylineCache(path.points);
  const cacheKey = get3DCacheKey(path, { heightOffset });
  const cached = cache.metrics3D.get(cacheKey);
  if (cached) return cached.previewPoints;

  getPolylineCurve3Derived(path, { heightOffset });
  return cache.metrics3D.get(cacheKey)?.previewPoints ?? [];
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
