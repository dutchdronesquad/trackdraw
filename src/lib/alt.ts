import type { TrackDesign } from "./types";

export function zToColor(z: number, zmin: number, zmax: number): string {
  const t = zmax === zmin ? 0 : (z - zmin) / (zmax - zmin);
  const h = 240 - 240 * Math.max(0, Math.min(1, t)); // blue->red
  return `hsl(${h}, 80%, 45%)`;
}

export function zRangeForDesign(design: TrackDesign): [number, number] {
  let zmin = 0,
    zmax = 0,
    seen = false;
  for (const s of design.shapes)
    if (s.kind === "polyline") {
      for (const p of (s as any).points as Array<{ z?: number }>) {
        const z = p.z ?? 0;
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
