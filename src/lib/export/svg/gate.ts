import { getGate2DShape } from "@/lib/track/shape2d";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type { GateShape } from "@/lib/types";
import { m } from "./utils";

export function gateToSvg(s: GateShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const marker = getShapeTimingMarker(s);
  const base = getGate2DShape(s, ppm);
  const color = marker ? getTimingMarkerColor(marker) : base.color;
  const { depth, radius, width } = base;
  const rot = s.rotation;

  if (base.variant === "pvc-set") {
    const tube = Math.max(depth, 2);
    const postRadius = Math.max(base.fittings.sleeveDiameter / 2, tube * 0.75);
    const half = Math.max(base.fittings.footSpan, tube * 3.2) / 2;
    const strokeColor = marker ? color : base.outlineColor;
    const strokeWidth = marker ? 2 : 1;
    const footWidth = Math.max(1, tube * 0.45);
    const feet = [-width / 2, width / 2]
      .map(
        (x) =>
          `<path d="M${x - half} 0H${x + half}M${x} ${-half}V${half}" stroke="${base.outlineColor}" stroke-width="${footWidth}" stroke-linecap="round" stroke-opacity="0.9" fill="none"/>`
      )
      .join("\n    ");
    const posts = [-width / 2, width / 2]
      .map(
        (x) =>
          `<circle cx="${x}" cy="0" r="${postRadius}" fill="${base.fittings.color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`
      )
      .join("\n    ");

    return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    ${feet}
    <rect x="${-width / 2}" y="${-tube / 2}" width="${width}" height="${tube}" fill="${base.color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" rx="${tube / 2}"/>
    ${posts}
  </g>`;
  }

  if (base.variant === "panel-frame") {
    const centerWidth = base.openingWidth;
    const strokeColor = marker ? color : base.frame.color;

    return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${base.panels.leftWidth}" height="${depth}" fill="${base.panels.leftColor}" fill-opacity="0.94" rx="${radius}"/>
    <rect x="${-centerWidth / 2}" y="${-depth / 2}" width="${centerWidth}" height="${depth}" fill="${base.panels.topColor}" fill-opacity="0.9"/>
    <rect x="${width / 2 - base.panels.rightWidth}" y="${-depth / 2}" width="${base.panels.rightWidth}" height="${depth}" fill="${base.panels.rightColor}" fill-opacity="0.94" rx="${radius}"/>
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="none" stroke="${strokeColor}" stroke-width="${marker ? 3 : 2}" rx="${radius}"/>
  </g>`;
  }

  return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="${color}" fill-opacity="0.15" rx="${radius}"/>
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="none" stroke="${color}" stroke-width="${marker ? 3 : 2}" rx="${radius}"/>
  </g>`;
}
