import * as THREE from "three";
import { getAdaptiveCurveSegments, smoothPolyline3D } from "./geometry";
import type { PolylinePoint, PolylineShape } from "../types";

type PolylineCurve3Data = {
  curve: THREE.CatmullRomCurve3;
  segmentCount: number;
};

type Cached3DPolylineMetrics = {
  curveData: PolylineCurve3Data | null;
  previewPoints: [number, number, number][];
};

const polyline3DCache = new WeakMap<
  PolylinePoint[],
  Map<string, Cached3DPolylineMetrics>
>();

function get3DCache(
  points: PolylinePoint[]
): Map<string, Cached3DPolylineMetrics> {
  let cached = polyline3DCache.get(points);
  if (!cached) {
    cached = new Map();
    polyline3DCache.set(points, cached);
  }
  return cached;
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

export function getPolylineCurve3Derived(
  path: PolylineShape,
  options?: {
    heightOffset?: number;
    samplesPerSegment?: number;
    density?: number;
  }
): PolylineCurve3Data | null {
  const cache = get3DCache(path.points);
  const cacheKey = get3DCacheKey(path, options);
  const cached = cache.get(cacheKey);
  if (cached) return cached.curveData;

  if (path.points.length < 2) {
    cache.set(cacheKey, { curveData: null, previewPoints: [] });
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
    curveData: { curve, segmentCount },
    previewPoints: path.points.map((point) => [
      point.x,
      Math.max(point.z ?? 0, 0) + heightOffset,
      point.y,
    ]) as [number, number, number][],
  };
  cache.set(cacheKey, next);
  return next.curveData;
}

export function getPolylinePreview3DPoints(
  path: PolylineShape,
  heightOffset = 0
): [number, number, number][] {
  const cache = get3DCache(path.points);
  const cacheKey = get3DCacheKey(path, { heightOffset });
  const cached = cache.get(cacheKey);
  if (cached) return cached.previewPoints;

  getPolylineCurve3Derived(path, { heightOffset });
  return cache.get(cacheKey)?.previewPoints ?? [];
}
