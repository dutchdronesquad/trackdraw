import {
  getDiveGateArchPanelPath,
  getDiveGate2DShape,
} from "@/lib/track/shape2d";
import type { DiveGateShape } from "@/lib/types";
import { m } from "./utils";

export function diveGateToSvg(s: DiveGateShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const diveGate = getDiveGate2DShape(s, ppm);
  if (diveGate.variant === "arch" || diveGate.variant === "launch") {
    const {
      color,
      couplerPoints,
      couplerRadius,
      frameColor,
      frameTube,
      openingDepth,
      openingW,
      outerDepth,
      outerW,
      pipeSegments,
    } = diveGate;
    const pipes = pipeSegments
      .map(
        (segment) =>
          `<line x1="${segment.start.x}" y1="${segment.start.y}" x2="${segment.end.x}" y2="${segment.end.y}" stroke="${frameColor}" stroke-width="${Math.max(1, frameTube * 0.58)}" stroke-linecap="round" opacity="0.55"/>`
      )
      .join("");
    const couplers = couplerPoints
      .map(
        (point) =>
          `<circle cx="${point.x}" cy="${point.y}" r="${couplerRadius}" fill="#d6d9de" stroke="${frameColor}" stroke-width="${Math.max(1, frameTube * 0.22)}"/>`
      )
      .join("");
    const panelPath = getDiveGateArchPanelPath(diveGate);

    return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
      <path d="${panelPath.svgPath}" fill="${color}" fill-opacity="0.88" fill-rule="evenodd"/>
      <rect x="${-outerW / 2}" y="${-outerDepth / 2}" width="${outerW}" height="${outerDepth}" fill="none" stroke="${frameColor}" stroke-width="${Math.max(1, frameTube * 0.55)}" rx="3"/>
      <rect x="${-openingW / 2}" y="${-openingDepth / 2}" width="${openingW}" height="${openingDepth}" fill="none" stroke="${frameColor}" stroke-width="${Math.max(1, frameTube * 0.35)}" rx="2"/>
      ${pipes}
      ${couplers}
    </g>`;
  }

  const { color, inset, postRadius, size, visibleDepth } = diveGate;
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - size / 2}" y="${cy - visibleDepth / 2}" width="${size}" height="${visibleDepth}" fill="${color}" fill-opacity="0.03" rx="4"/>
    <rect x="${cx - size / 2}" y="${cy - visibleDepth / 2}" width="${size}" height="${visibleDepth}" stroke="${color}" stroke-width="2" fill="none" rx="4" opacity="0.95"/>
    <circle cx="${cx - size / 2 + inset}" cy="${cy - visibleDepth / 2 + inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx + size / 2 - inset}" cy="${cy - visibleDepth / 2 + inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx - size / 2 + inset}" cy="${cy + visibleDepth / 2 - inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx + size / 2 - inset}" cy="${cy + visibleDepth / 2 - inset}" r="${postRadius}" fill="${color}"/>
  </g>`;
}
