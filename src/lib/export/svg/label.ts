import type { LabelShape } from "@/lib/types";
import { escapeXml, m } from "./utils";

export function labelToSvg(s: LabelShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const fs = s.fontSize ?? 14;
  const color = s.color ?? "#e2e8f0";
  return `<text x="${cx}" y="${cy}" font-size="${fs}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${s.rotation},${cx},${cy})">${escapeXml(s.text)}</text>`;
}
