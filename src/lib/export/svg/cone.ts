import { getCone2DShape } from "@/lib/track/shape2d";
import type { ConeShape } from "@/lib/types";
import { m } from "./utils";

export function coneToSvg(s: ConeShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, radius } = getCone2DShape(s, ppm);
  return `<g transform="translate(${cx},${cy})">
    <circle r="${radius}" fill="${color}" stroke="${color}" stroke-width="2"/>
  </g>`;
}
