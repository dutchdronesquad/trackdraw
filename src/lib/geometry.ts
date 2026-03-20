import type { PolylinePoint, PolylineShape } from "./types";

export function distance2D(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function elevationSamples(
  path: PolylineShape
): Array<{ d: number; z: number }> {
  let d = 0;
  const out: Array<{ d: number; z: number }> = [];
  const pts = path.points;
  if (pts.length === 0) return out;
  out.push({ d: 0, z: pts[0].z ?? 0 });
  for (let i = 1; i < pts.length; i++) {
    d += distance2D(pts[i - 1], pts[i]);
    out.push({ d, z: pts[i].z ?? 0 });
  }
  return out;
}

export function totalLength2D(path: PolylineShape): number {
  return elevationSamples(path).at(-1)?.d ?? 0;
}

const catmull = (
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
};

export function smoothPolyline(
  points: PolylinePoint[],
  samplesPerSegment = 8
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points.map(({ x, y }) => ({ x, y }));
  const result: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1] ?? points[i];
    const p3 = points[i + 2] ?? p2;
    for (let j = 0; j < samplesPerSegment; j += 1) {
      const t = j / samplesPerSegment;
      result.push(catmull(t, p0, p1, p2, p3));
    }
  }
  const last = points.at(-1)!;
  result.push({ x: last.x, y: last.y });
  return result;
}

export function polylineLength(points: PolylinePoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance2D(points[i - 1], points[i]);
  }
  return total;
}

export function getAdaptiveCurveSegments(
  points: PolylinePoint[],
  density = 6
): number {
  if (points.length < 2) return 0;
  const length = polylineLength(points);
  const byLength = Math.round(length * density);
  const byPoints = (points.length - 1) * 10;
  return Math.max(24, Math.min(160, Math.max(byLength, byPoints)));
}

export function smoothPolyline3D(
  points: PolylinePoint[],
  samplesPerSegment = 10
): Array<{ x: number; y: number; z: number }> {
  if (points.length === 0) return [];
  if (points.length === 1) {
    const point = points[0];
    return [{ x: point.x, y: point.y, z: point.z ?? 0 }];
  }

  const xyPoints = smoothPolyline(points, samplesPerSegment);
  const sourceDistances = [0];
  for (let i = 1; i < points.length; i += 1) {
    sourceDistances.push(
      sourceDistances[i - 1] + distance2D(points[i - 1], points[i])
    );
  }

  let sampledDistance = 0;
  let segmentIndex = 1;

  return xyPoints.map((point, index) => {
    if (index > 0) {
      sampledDistance += distance2D(xyPoints[index - 1], point);
    }

    while (
      segmentIndex < sourceDistances.length - 1 &&
      sampledDistance > sourceDistances[segmentIndex]
    ) {
      segmentIndex += 1;
    }

    const prevIndex = Math.max(0, segmentIndex - 1);
    const segmentStart = sourceDistances[prevIndex];
    const segmentEnd = sourceDistances[segmentIndex] ?? segmentStart;
    const segmentSpan = Math.max(segmentEnd - segmentStart, 1e-6);
    const t = Math.min(
      1,
      Math.max(0, (sampledDistance - segmentStart) / segmentSpan)
    );
    const z0 = points[prevIndex]?.z ?? 0;
    const z1 = points[segmentIndex]?.z ?? z0;

    return {
      x: point.x,
      y: point.y,
      z: z0 + (z1 - z0) * t,
    };
  });
}
