import type {
  TrackDesign,
  Shape,
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  PolylineShape,
  StartFinishShape,
  CheckpointShape,
  LadderShape,
  DiveGateShape,
} from "../types";
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
  const thick = m(s.thick ?? 0.2, ppm);
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
    <circle r="${r}" fill="${color}" opacity="0.65"/>
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
  const pts =
    s.smooth && s.points.length >= 3
      ? smoothPolyline(s.points)
      : s.points.map(({ x, y }) => ({ x, y }));
  if (pts.length < 2) return "";
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${m(p.x, ppm)},${m(p.y, ppm)}`)
    .join(" ");
  const sw = m(s.strokeWidth ?? 0.18, ppm);
  const color = s.color ?? "#3b82f6";
  const closed = s.closed ? " Z" : "";
  // glow pass behind + crisp line on top
  return `<g>
    <path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw * 3.5}" stroke-opacity="0.22" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function startfinishToSvg(s: StartFinishShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const w = m(s.width ?? 3, ppm);
  const depth = m(0.3, ppm);
  const color = s.color ?? "#f59e0b";
  const segments = 8;
  const segW = w / segments;
  let checker = "";
  for (let i = 0; i < segments; i++) {
    checker += `<rect x="${cx - w / 2 + i * segW}" y="${cy - depth / 2}" width="${segW - 1}" height="${depth}" fill="${i % 2 === 0 ? "#ffffff" : "#111111"}" opacity="0.5"/>`;
  }
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - w / 2}" y="${cy - depth / 2}" width="${w}" height="${depth}" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.30"/>
    ${checker}
  </g>`;
}

function checkpointToSvg(s: CheckpointShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const w = m(s.width ?? 2.5, ppm);
  const depth = m(0.15, ppm);
  const color = s.color ?? "#22c55e";
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - w / 2}" y="${cy - depth / 2}" width="${w}" height="${depth}" stroke="${color}" stroke-width="1.5" stroke-dasharray="8,5" fill="${color}" fill-opacity="0.35"/>
    <line x1="${cx - w / 2}" y1="${cy}" x2="${cx + w / 2}" y2="${cy}" stroke="${color}" stroke-width="2" stroke-dasharray="6,4"/>
  </g>`;
}

function ladderToSvg(s: LadderShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const w = m(s.width ?? 1.5, ppm);
  const depth = m(0.08, ppm);
  const color = s.color ?? "#f97316";
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - w / 2}" y="${cy - depth / 2}" width="${w}" height="${depth}" fill="${color}" fill-opacity="0.25"/>
    <rect x="${cx - w / 2}" y="${cy - depth / 2}" width="${w}" height="${depth}" stroke="${color}" stroke-width="2" fill="none" rx="2"/>
  </g>`;
}

function diveGateToSvg(s: DiveGateShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const sz = m(s.size ?? 2.8, ppm);
  const thick = m(s.thick ?? 0.2, ppm);
  const tilt = s.tilt ?? 0;
  const color = s.color ?? "#f97316";
  // Project size: cos(tilt) shrinks the visible depth dimension
  const visibleSz = sz * Math.cos((tilt * Math.PI) / 180);
  const outer = visibleSz;
  const inner = outer - thick * 2;
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - outer / 2}" y="${cy - outer / 2}" width="${outer}" height="${outer}" stroke="${color}" stroke-width="1.5" fill="${color}" fill-opacity="0.08"/>
    <rect x="${cx - inner / 2}" y="${cy - inner / 2}" width="${inner}" height="${inner}" stroke="${color}" stroke-width="1" fill="none" stroke-dasharray="4,3" opacity="0.5"/>
  </g>`;
}

function shapeToSvg(shape: Shape, ppm: number): string {
  switch (shape.kind) {
    case "gate":
      return gateToSvg(shape, ppm);
    case "flag":
      return flagToSvg(shape, ppm);
    case "cone":
      return coneToSvg(shape, ppm);
    case "label":
      return labelToSvg(shape, ppm);
    case "polyline":
      return polylineToSvg(shape, ppm);
    case "startfinish":
      return startfinishToSvg(shape, ppm);
    case "checkpoint":
      return checkpointToSvg(shape, ppm);
    case "ladder":
      return ladderToSvg(shape, ppm);
    case "divegate":
      return diveGateToSvg(shape, ppm);
    default:
      return "";
  }
}

export type ExportTheme = "dark" | "light";

export function designToSvg(
  design: TrackDesign,
  theme: ExportTheme = "dark"
): string {
  const { width, height, ppm, gridStep } = design.field;
  const W = m(width, ppm);
  const H = m(height, ppm);
  const step = m(gridStep, ppm);
  const coarseStep = step * 5;
  const majorStep = step * 10;
  const bl = 12; // corner bracket arm length

  const isDark = theme === "dark";
  const colors = {
    bg: isDark ? "#0b0f18" : "#ffffff",
    fieldFill: isDark ? "#0c1520" : "#f8fafc",
    fieldFillOp: isDark ? "0.6" : "1",
    gridMajor: isDark ? "#1e3550" : "#c8d8e8",
    gridCoarse: isDark ? "#172c42" : "#dce8f0",
    gridMinor: isDark ? "#111f30" : "#eaf0f6",
    gridOp: isDark ? "0.85" : "0.7",
    borderGlow: isDark ? "#1a2d44" : "#b0c8e0",
    border: isDark ? "#2a4060" : "#7a9ab8",
    brackets: isDark ? "#3a5878" : "#6a8aa8",
    footerBg: isDark ? "#060a10" : "#f0f4f8",
    footerLine: isDark ? "#1e3550" : "#c0d0e0",
    footerTitle: isDark ? "#6a9abf" : "#1a3050",
    footerMeta: isDark ? "#3a6080" : "#4a6a88",
  };

  // Grid lines — three levels (kept subtle so shapes read clearly)
  let gridLines = "";
  for (let x = 0; x <= W + 0.01; x += step) {
    const isMajor = Math.abs(x % majorStep) < 0.5;
    const isCoarse = !isMajor && Math.abs(x % coarseStep) < 0.5;
    const stroke = isMajor
      ? colors.gridMajor
      : isCoarse
        ? colors.gridCoarse
        : colors.gridMinor;
    const sw = isMajor ? 0.7 : isCoarse ? 0.5 : 0.3;
    gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
  for (let y = 0; y <= H + 0.01; y += step) {
    const isMajor = Math.abs(y % majorStep) < 0.5;
    const isCoarse = !isMajor && Math.abs(y % coarseStep) < 0.5;
    const stroke = isMajor
      ? colors.gridMajor
      : isCoarse
        ? colors.gridCoarse
        : colors.gridMinor;
    const sw = isMajor ? 0.7 : isCoarse ? 0.5 : 0.3;
    gridLines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }

  const shapeSvg = design.shapes.map((s) => shapeToSvg(s, ppm)).join("\n  ");

  const titleText = design.title.trim() || "Untitled Track";
  const sizeText = `${width}×${height} m`;
  const dateText = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const FOOTER = 26;
  const fBase = H - 8; // text baseline inside footer

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${colors.bg}"/>
  <!-- Field fill -->
  <rect width="${W}" height="${H}" fill="${colors.fieldFill}" opacity="${colors.fieldFillOp}"/>
  <!-- Grid -->
  <g opacity="${colors.gridOp}">${gridLines}</g>
  <!-- Field border glow -->
  <rect x="-1.5" y="-1.5" width="${W + 3}" height="${H + 3}" stroke="${colors.borderGlow}" stroke-width="4" fill="none" opacity="0.5"/>
  <!-- Field border -->
  <rect width="${W}" height="${H}" stroke="${colors.border}" stroke-width="1" fill="none"/>
  <!-- Corner brackets -->
  <g stroke="${colors.brackets}" stroke-width="2" fill="none" stroke-linecap="square">
    <polyline points="0,${bl} 0,0 ${bl},0"/>
    <polyline points="${W - bl},0 ${W},0 ${W},${bl}"/>
    <polyline points="0,${H - bl} 0,${H} ${bl},${H}"/>
    <polyline points="${W - bl},${H} ${W},${H} ${W},${H - bl}"/>
  </g>
  <!-- Shapes -->
  ${shapeSvg}
  <!-- Footer bar -->
  <rect x="0" y="${H - FOOTER}" width="${W}" height="${FOOTER}" fill="${colors.footerBg}" opacity="0.85"/>
  <line x1="0" y1="${H - FOOTER}" x2="${W}" y2="${H - FOOTER}" stroke="${colors.footerLine}" stroke-width="0.75"/>
  <text x="10" y="${fBase}" font-size="11" font-weight="600" fill="${colors.footerTitle}" font-family="ui-monospace,monospace">${escapeXml(titleText)}</text>
  <text x="${W / 2}" y="${fBase}" font-size="10" fill="${colors.footerMeta}" font-family="ui-monospace,monospace" text-anchor="middle">${sizeText}</text>
  <text x="${W - 10}" y="${fBase}" font-size="10" fill="${colors.footerMeta}" font-family="ui-monospace,monospace" text-anchor="end">${dateText}</text>
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

export function exportSvg(
  design: TrackDesign,
  filename = "track.svg",
  theme: ExportTheme = "dark"
): void {
  downloadText(designToSvg(design, theme), filename, "image/svg+xml");
}
