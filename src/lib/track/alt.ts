import { getDesignPolylineZRange } from "./polyline-derived";
import type { TrackDesign } from "../types";

export function zToColor(z: number, zmin: number, zmax: number): string {
  const t = zmax === zmin ? 0 : (z - zmin) / (zmax - zmin);
  const h = 240 - 240 * Math.max(0, Math.min(1, t)); // blue->red
  return `hsl(${h}, 80%, 45%)`;
}

export function zRangeForDesign(design: TrackDesign): [number, number] {
  return getDesignPolylineZRange(design);
}
