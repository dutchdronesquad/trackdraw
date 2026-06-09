import { getFlag2DShape } from "@/lib/track/shape2d";
import type { FlagShape } from "@/lib/types";
import { m } from "./utils";

export function flagToSvg(s: FlagShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { bannerLength, bannerWidth, color, mastRadius } = getFlag2DShape(
    s,
    ppm
  );
  return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
    <path d="M${mastRadius * 0.2} ${-bannerWidth * 0.34} C ${bannerLength * 0.22} ${-bannerWidth * 0.62}, ${bannerLength * 0.76} ${-bannerWidth * 0.42}, ${bannerLength} 0 C ${bannerLength * 0.76} ${bannerWidth * 0.42}, ${bannerLength * 0.22} ${bannerWidth * 0.62}, ${mastRadius * 0.2} ${bannerWidth * 0.34} Q 0 ${bannerWidth * 0.14}, 0 0 Q 0 ${-bannerWidth * 0.14}, ${mastRadius * 0.2} ${-bannerWidth * 0.34} Z" fill="${color}" fill-opacity="0.8"/>
    <circle r="${mastRadius}" fill="${color}"/>
    <circle r="${Math.max(1.5, mastRadius * 0.38)}" fill="#ffffff" fill-opacity="0.78"/>
  </g>`;
}
