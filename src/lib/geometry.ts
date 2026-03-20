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

interface SmoothPolylineOptions {
  alpha?: number;
  closed?: boolean;
  samplesPerSegment?: number;
}

function normalizeSmoothOptions(
  samplesPerSegmentOrOptions?: number | SmoothPolylineOptions
): Required<SmoothPolylineOptions> {
  if (typeof samplesPerSegmentOrOptions === "number") {
    return {
      alpha: 0.5,
      closed: false,
      samplesPerSegment: samplesPerSegmentOrOptions,
    };
  }

  return {
    alpha: samplesPerSegmentOrOptions?.alpha ?? 0.5,
    closed: samplesPerSegmentOrOptions?.closed ?? false,
    samplesPerSegment: samplesPerSegmentOrOptions?.samplesPerSegment ?? 8,
  };
}

function getWrappedPoint<T>(points: T[], index: number, closed: boolean): T {
  if (closed) {
    const wrappedIndex =
      ((index % points.length) + points.length) % points.length;
    return points[wrappedIndex];
  }

  return points[Math.max(0, Math.min(points.length - 1, index))];
}

function extrapolatePoint(
  anchor: PolylinePoint,
  neighbor: PolylinePoint
): PolylinePoint {
  return {
    x: anchor.x * 2 - neighbor.x,
    y: anchor.y * 2 - neighbor.y,
    z: (anchor.z ?? 0) * 2 - (neighbor.z ?? 0),
  };
}

function getControlPoint(
  points: PolylinePoint[],
  index: number,
  closed: boolean
): PolylinePoint {
  if (closed) return getWrappedPoint(points, index, true);

  if (index < 0) {
    return extrapolatePoint(points[0], points[1] ?? points[0]);
  }

  if (index >= points.length) {
    return extrapolatePoint(
      points[points.length - 1],
      points[points.length - 2] ?? points[points.length - 1]
    );
  }

  return points[index];
}

function chordLength(
  a: { x: number; y: number },
  b: { x: number; y: number },
  alpha: number
): number {
  return Math.max(distance2D(a, b) ** alpha, 1e-4);
}

function interpolateChannel(
  t: number,
  t0: number,
  t1: number,
  t2: number,
  t3: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const safeLerp = (
    startT: number,
    endT: number,
    startValue: number,
    endValue: number
  ) => {
    const span = endT - startT;
    if (Math.abs(span) < 1e-6) return startValue;
    return ((endT - t) / span) * startValue + ((t - startT) / span) * endValue;
  };

  const a1 = safeLerp(t0, t1, p0, p1);
  const a2 = safeLerp(t1, t2, p1, p2);
  const a3 = safeLerp(t2, t3, p2, p3);
  const b1 = safeLerp(t0, t2, a1, a2);
  const b2 = safeLerp(t1, t3, a2, a3);
  return safeLerp(t1, t2, b1, b2);
}

function sampleCatmullRomPoint(
  t: number,
  p0: PolylinePoint,
  p1: PolylinePoint,
  p2: PolylinePoint,
  p3: PolylinePoint,
  alpha: number
) {
  const t0 = 0;
  const t1 = t0 + chordLength(p0, p1, alpha);
  const t2 = t1 + chordLength(p1, p2, alpha);
  const t3 = t2 + chordLength(p2, p3, alpha);
  const sampleT = t1 + (t2 - t1) * t;

  return {
    x: interpolateChannel(sampleT, t0, t1, t2, t3, p0.x, p1.x, p2.x, p3.x),
    y: interpolateChannel(sampleT, t0, t1, t2, t3, p0.y, p1.y, p2.y, p3.y),
    z: interpolateChannel(
      sampleT,
      t0,
      t1,
      t2,
      t3,
      p0.z ?? 0,
      p1.z ?? 0,
      p2.z ?? 0,
      p3.z ?? 0
    ),
  };
}

function getClosedPolylinePoints(points: PolylinePoint[]): PolylinePoint[] {
  if (!points.length) return [];
  return [...points, { ...points[0] }];
}

function getSegmentCount(points: PolylinePoint[], closed: boolean): number {
  if (points.length < 2) return 0;
  return closed ? points.length : points.length - 1;
}

function smoothPolylinePoints(
  points: PolylinePoint[],
  samplesPerSegmentOrOptions?: number | SmoothPolylineOptions
) {
  const { alpha, closed, samplesPerSegment } = normalizeSmoothOptions(
    samplesPerSegmentOrOptions
  );

  if (points.length < 2) return points.map((point) => ({ ...point }));
  if (points.length < 3) {
    return (closed ? getClosedPolylinePoints(points) : points).map((point) => ({
      ...point,
    }));
  }

  const segmentCount = getSegmentCount(points, closed);
  const result: PolylinePoint[] = [];

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
    const p0 = getControlPoint(points, segmentIndex - 1, closed);
    const p1 = getControlPoint(points, segmentIndex, closed);
    const p2 = getControlPoint(points, segmentIndex + 1, closed);
    const p3 = getControlPoint(points, segmentIndex + 2, closed);

    for (
      let sampleIndex = segmentIndex === 0 ? 0 : 1;
      sampleIndex < samplesPerSegment;
      sampleIndex += 1
    ) {
      result.push(
        sampleCatmullRomPoint(
          sampleIndex / samplesPerSegment,
          p0,
          p1,
          p2,
          p3,
          alpha
        )
      );
    }
  }

  result.push(...(closed ? [{ ...points[0] }] : [{ ...points.at(-1)! }]));
  return result;
}

function withClosedPoint<T extends { x: number; y: number }>(
  points: T[],
  closed: boolean
) {
  if (!closed || !points.length) return points;
  return [...points, { ...points[0] }];
}

export function smoothPolyline(
  points: PolylinePoint[],
  samplesPerSegmentOrOptions?: number | SmoothPolylineOptions
): Array<{ x: number; y: number }> {
  return smoothPolylinePoints(points, samplesPerSegmentOrOptions).map(
    ({ x, y }) => ({ x, y })
  );
}

export function getPolyline2DPoints(
  points: PolylinePoint[],
  options?: SmoothPolylineOptions & { smooth?: boolean }
): Array<{ x: number; y: number }> {
  const smooth = options?.smooth ?? true;
  const closed = options?.closed ?? false;

  if (!smooth) {
    return withClosedPoint(
      points.map(({ x, y }) => ({ x, y })),
      closed
    );
  }

  return smoothPolyline(points, options);
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

  const getTurnWeight = (
    prev: PolylinePoint,
    current: PolylinePoint,
    next: PolylinePoint
  ) => {
    const ax = current.x - prev.x;
    const ay = current.y - prev.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;
    const aLen = Math.hypot(ax, ay);
    const bLen = Math.hypot(bx, by);
    if (aLen < 1e-4 || bLen < 1e-4) return 0;

    const dot = (ax * bx + ay * by) / (aLen * bLen);
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const turnAngle = Math.acos(clampedDot);
    const turnStrength = turnAngle / Math.PI;
    const localScale = Math.min((aLen + bLen) / 2, 6);
    return turnStrength * localScale;
  };

  const length = polylineLength(points);
  const byLength = Math.round(length * density);
  const byPoints = (points.length - 1) * 16;
  let turnBonus = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    turnBonus += getTurnWeight(
      points[index - 1],
      points[index],
      points[index + 1]
    );
  }

  const byTurns = Math.round(turnBonus * density * 1.8);
  return Math.max(32, Math.min(360, Math.max(byLength, byPoints, byTurns)));
}

export function smoothPolyline3D(
  points: PolylinePoint[],
  samplesPerSegmentOrOptions?: number | SmoothPolylineOptions
): Array<{ x: number; y: number; z: number }> {
  return smoothPolylinePoints(points, samplesPerSegmentOrOptions).map(
    ({ x, y, z }) => ({
      x,
      y,
      z: z ?? 0,
    })
  );
}

export function getPolylineArrowMarkers(
  points: PolylinePoint[],
  spacing: number,
  options?: SmoothPolylineOptions
): Array<{ x: number; y: number; angle: number }> {
  const closed = options?.closed ?? false;
  const smoothPoints = getPolyline2DPoints(points, {
    ...options,
    closed,
    smooth: true,
  });

  if (smoothPoints.length < 2 || spacing <= 0) return [];

  const distances = [0];
  for (let index = 1; index < smoothPoints.length; index += 1) {
    distances.push(
      distances[index - 1] +
        distance2D(smoothPoints[index - 1], smoothPoints[index])
    );
  }

  const totalLength = distances.at(-1) ?? 0;
  if (totalLength < spacing) return [];

  const startOffset = closed ? spacing / 2 : spacing;
  const markers: Array<{ x: number; y: number; angle: number }> = [];

  for (let target = startOffset; target < totalLength; target += spacing) {
    let segmentIndex = 1;
    while (
      segmentIndex < distances.length &&
      distances[segmentIndex] < target
    ) {
      segmentIndex += 1;
    }

    if (segmentIndex >= smoothPoints.length) break;

    const prev = smoothPoints[segmentIndex - 1];
    const next = smoothPoints[segmentIndex];
    const segmentStart = distances[segmentIndex - 1];
    const segmentEnd = distances[segmentIndex];
    const span = Math.max(segmentEnd - segmentStart, 1e-6);
    const t = (target - segmentStart) / span;
    const x = prev.x + (next.x - prev.x) * t;
    const y = prev.y + (next.y - prev.y) * t;
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x);

    markers.push({ x, y, angle });
  }

  return markers;
}
