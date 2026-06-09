import { getLadder2DShape } from "@/lib/track/shape2d";
import type { LadderShape } from "@/lib/types";
import { m } from "./utils";

export function ladderToSvg(s: LadderShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, depth, radius, width } = getLadder2DShape(s, ppm);
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - width / 2}" y="${cy - depth / 2}" width="${width}" height="${depth}" fill="${color}" fill-opacity="0.16" rx="${radius}"/>
    <rect x="${cx - width / 2}" y="${cy - depth / 2}" width="${width}" height="${depth}" stroke="${color}" stroke-width="2" fill="none" rx="${radius}"/>
  </g>`;
}
