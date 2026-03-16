import type { TrackDesign, Shape, GateShape, FlagShape, ConeShape, LabelShape, PolylineShape } from "../types";
import { smoothPolyline } from "../geometry";

function m(v: number, ppm: number) {
  return v * ppm;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function gateToSvg(s: GateShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const w = m(s.width, ppm);
  const h = m(s.height, ppm);
  const thick = m(s.thick ?? 0.15, ppm);
  const color = s.color ?? "#3b82f6";
  const rot = s.rotation;

  return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <rect x="${-w / 2 - thick}" y="${-h / 2 - thick}" width="${thick}" height="${h + thick * 2}" fill="${color}"/>
    <rect x="${w / 2}" y="${-h / 2 - thick}" width="${thick}" height="${h + thick * 2}" fill="${color}"/>
    <rect x="${-w / 2 - thick}" y="${-h / 2 - thick}" width="${w + thick * 2}" height="${thick}" fill="${color}"/>
  </g>`;
}

function flagToSvg(s: FlagShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const r = m(s.radius, ppm);
  const color = s.color ?? "#f59e0b";
  return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
    <circle r="${r}" fill="${color}" opacity="0.3"/>
    <circle r="${Math.max(2, r * 0.25)}" fill="${color}"/>
    <line x1="0" y1="0" x2="0" y2="${-m(s.poleHeight ?? 1.5, ppm)}" stroke="${color}" stroke-width="2"/>
  </g>`;
}

function coneToSvg(s: ConeShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const r = m(s.radius, ppm);
  const color = s.color ?? "#f97316";
  return `<g transform="translate(${cx},${cy})">
    <polygon points="0,${-r * 1.4} ${r},${r * 0.7} ${-r},${r * 0.7}" fill="${color}"/>
  </g>`;
}

function labelToSvg(s: LabelShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const fs = s.fontSize ?? 14;
  const color = s.color ?? "#e2e8f0";
  return `<text x="${cx}" y="${cy}" font-size="${fs}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${s.rotation},${cx},${cy})">${escapeXml(s.text)}</text>`;
}

function polylineToSvg(s: PolylineShape, ppm: number): string {
  const pts = s.smooth && s.points.length >= 3
    ? smoothPolyline(s.points)
    : s.points.map(({ x, y }) => ({ x, y }));
  if (pts.length < 2) return "";
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${m(p.x, ppm)},${m(p.y, ppm)}`).join(" ");
  const sw = m(s.strokeWidth ?? 0.18, ppm);
  const color = s.color ?? "#3b82f6";
  return `<path d="${d}${s.closed ? " Z" : ""}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function shapeToSvg(shape: Shape, ppm: number): string {
  switch (shape.kind) {
    case "gate": return gateToSvg(shape, ppm);
    case "flag": return flagToSvg(shape, ppm);
    case "cone": return coneToSvg(shape, ppm);
    case "label": return labelToSvg(shape, ppm);
    case "polyline": return polylineToSvg(shape, ppm);
    default: return "";
  }
}

export function designToSvg(design: TrackDesign): string {
  const { width, height, ppm, gridStep } = design.field;
  const W = m(width, ppm);
  const H = m(height, ppm);
  const step = m(gridStep, ppm);

  let gridLines = "";
  for (let x = 0; x <= W; x += step) {
    gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#334155" stroke-width="0.5"/>`;
  }
  for (let y = 0; y <= H; y += step) {
    gridLines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#334155" stroke-width="0.5"/>`;
  }

  const shapeSvg = design.shapes.map((s) => shapeToSvg(s, ppm)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0f1117"/>
  <g opacity="0.4">${gridLines}</g>
  ${shapeSvg}
  <text x="8" y="${H - 8}" font-size="10" fill="#64748b" font-family="system-ui">${escapeXml(design.title)} — ${width}×${height}m</text>
</svg>`;
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSvg(design: TrackDesign, filename = "track.svg"): void {
  downloadText(designToSvg(design), filename, "image/svg+xml");
}
