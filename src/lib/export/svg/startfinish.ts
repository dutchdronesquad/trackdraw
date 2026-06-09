import { getStartFinish2DShape } from "@/lib/track/shape2d";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type { StartFinishShape } from "@/lib/types";
import { m } from "./utils";

export function startfinishToSvg(s: StartFinishShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const marker = getShapeTimingMarker(s);
  const base = getStartFinish2DShape(s, ppm);
  const color = marker ? getTimingMarkerColor(marker) : base.color;
  const { padDepth, padWidth, pads } = base;
  const padMarkup = pads
    .map(({ index, x }) => {
      const fontSize = Math.max(7, padWidth * 0.45);
      return `<g transform="translate(${x},0)">
        <rect x="${-padWidth / 2}" y="${-padDepth / 2}" width="${padWidth}" height="${padDepth}" fill="${color}" fill-opacity="0.25" rx="2"/>
        <rect x="${-padWidth / 2}" y="${-padDepth / 2}" width="${padWidth}" height="${padDepth}" fill="none" stroke="${color}" stroke-width="${marker ? 2.4 : 1.5}" rx="2"/>
        <text x="0" y="${fontSize * 0.35}" font-size="${fontSize}" fill="${color}" fill-opacity="0.7" text-anchor="middle">${index + 1}</text>
      </g>`;
    })
    .join("");
  return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
    ${padMarkup}
  </g>`;
}
