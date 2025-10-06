import type { PolylineShape } from "./types";

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
