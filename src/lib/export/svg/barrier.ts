import { getBarrier2DShape } from "@/lib/track/shape2d";
import type { BarrierShape } from "@/lib/types";
import { m } from "./utils";

export function barrierToSvg(s: BarrierShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, depth, radius, variant, width } = getBarrier2DShape(s, ppm);
  const x = cx - width / 2;
  const y = cy - depth / 2;
  const r = radius;

  const fill = `fill="${color}" fill-opacity="0.16"`;
  const stroke = `stroke="${color}" stroke-width="1.5" fill="none"`;
  const rect = (attrs: string) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${depth}" rx="${r}" ${attrs}/>`;

  const inner = getBarrierInnerSvg(variant, cx, cy, width, depth, color);

  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    ${rect(fill)}
    ${rect(stroke)}
    ${inner}
  </g>`;
}

function getBarrierInnerSvg(
  variant: BarrierShape["variant"],
  cx: number,
  cy: number,
  width: number,
  height: number,
  color: string
): string {
  const hw = width / 2;
  const hh = height / 2;

  if (variant === "hurdle") {
    const stripeCount = Math.max(2, Math.floor(width / 12));
    const spacing = width / stripeCount;
    return Array.from({ length: stripeCount - 1 }, (_, i) => {
      const sx = cx - hw + spacing * (i + 1);
      return `<line x1="${sx - hh}" y1="${cy - hh}" x2="${sx + hh}" y2="${cy + hh}" stroke="${color}" stroke-width="0.8" opacity="0.5"/>`;
    }).join("\n    ");
  }

  if (variant === "fence") {
    const postCount = Math.max(2, Math.floor(width / 14));
    const spacing = width / postCount;
    return Array.from({ length: postCount - 1 }, (_, i) => {
      const px = cx - hw + spacing * (i + 1);
      return `<line x1="${px}" y1="${cy - hh}" x2="${px}" y2="${cy + hh}" stroke="${color}" stroke-width="0.8" opacity="0.5"/>`;
    }).join("\n    ");
  }

  if (variant === "net") {
    const colCount = Math.max(2, Math.floor(width / 14));
    const colSpacing = width / colCount;
    const cols = Array.from({ length: colCount - 1 }, (_, i) => {
      const px = cx - hw + colSpacing * (i + 1);
      return `<line x1="${px}" y1="${cy - hh}" x2="${px}" y2="${cy + hh}" stroke="${color}" stroke-width="0.6" opacity="0.4"/>`;
    }).join("\n    ");
    const hLine = `<line x1="${cx - hw}" y1="${cy}" x2="${cx + hw}" y2="${cy}" stroke="${color}" stroke-width="0.6" opacity="0.4"/>`;
    return `${cols}\n    ${hLine}`;
  }

  // banner: chevron arrow marks
  const arrowCount = Math.max(3, Math.floor(width / 13));
  const spacing = width / (arrowCount + 1);
  const arm = hh * 0.65;
  const tip = spacing * 0.3;
  return Array.from({ length: arrowCount }, (_, i) => {
    const ax = cx - hw + spacing * (i + 1);
    return `<polyline points="${ax - tip},${cy - arm} ${ax + tip},${cy} ${ax - tip},${cy + arm}" stroke="${color}" stroke-width="1.2" fill="none" stroke-linejoin="round" opacity="0.5"/>`;
  }).join("\n    ");
}
