import type {
  TrackDesign,
  Shape,
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  PolylineShape,
  StartFinishShape,
  LadderShape,
  DiveGateShape,
} from "../types";
import { getDesignShapes } from "../design";
import {
  getPolyline2DDerived,
  getPolylineRouteWarningSegmentVisuals,
  getPolylineSmoothSegmentPointsPx,
} from "../polyline-derived";
import {
  getCone2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "../shape2d";

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
  const { color, depth, radius, width } = getGate2DShape(s, ppm);
  const rot = s.rotation;

  return `<g transform="translate(${cx},${cy}) rotate(${rot})">
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="${color}" fill-opacity="0.15" rx="${radius}"/>
    <rect x="${-width / 2}" y="${-depth / 2}" width="${width}" height="${depth}" fill="none" stroke="${color}" stroke-width="2" rx="${radius}"/>
  </g>`;
}

function flagToSvg(s: FlagShape, ppm: number): string {
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

function coneToSvg(s: ConeShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, radius } = getCone2DShape(s, ppm);
  return `<g transform="translate(${cx},${cy})">
    <circle r="${radius}" fill="${color}" stroke="${color}" stroke-width="2"/>
  </g>`;
}

function labelToSvg(s: LabelShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const fs = s.fontSize ?? 14;
  const color = s.color ?? "#e2e8f0";
  return `<text x="${cx}" y="${cy}" font-size="${fs}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${s.rotation},${cx},${cy})">${escapeXml(s.text)}</text>`;
}

function polylineToSvg(
  s: PolylineShape,
  ppm: number,
  showWarningVisuals = false
): string {
  const pts = getPolyline2DDerived(s).smoothPoints;
  if (pts.length < 2) return "";
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${m(p.x, ppm)},${m(p.y, ppm)}`)
    .join(" ");
  const sw = m(s.strokeWidth ?? 0.26, ppm);
  const color = s.color ?? "#3b82f6";
  const closed = s.closed ? " Z" : "";
  const warningSegments = showWarningVisuals
    ? getPolylineRouteWarningSegmentVisuals(s)
    : [];
  const warningKindBySegment = new Map(
    warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
  );
  const smoothSegmentPx = showWarningVisuals
    ? getPolylineSmoothSegmentPointsPx(s, ppm)
    : [];
  const segmentMarkup =
    showWarningVisuals && warningSegments.length
      ? smoothSegmentPx
          .map((points, segmentIndex) => {
            if (!points || points.length < 4) return "";
            const warningKind = warningKindBySegment.get(segmentIndex);
            const stroke = !warningKind
              ? color
              : warningKind === "close-points"
                ? "#ef4444"
                : warningKind === "steep"
                  ? "#f97316"
                  : "#fbbf24";
            const segmentPath = points
              .reduce<string[]>((commands, value, index) => {
                if (index % 2 === 0) {
                  commands.push(
                    `${index === 0 ? "M" : "L"}${value},${points[index + 1]}`
                  );
                }
                return commands;
              }, [])
              .join(" ");
            return `<path d="${segmentPath}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
          })
          .join("")
      : "";

  return `<g>
    <path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw * 2}" stroke-opacity="0.12" stroke-linecap="round" stroke-linejoin="round"/>
    ${
      showWarningVisuals && warningSegments.length
        ? segmentMarkup
        : `<path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  </g>`;
}

function startfinishToSvg(s: StartFinishShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, padDepth, padWidth, pads } = getStartFinish2DShape(s, ppm);
  const padMarkup = pads
    .map(({ index, x }) => {
      const fontSize = Math.max(7, padWidth * 0.45);
      return `<g transform="translate(${x},0)">
        <rect x="${-padWidth / 2}" y="${-padDepth / 2}" width="${padWidth}" height="${padDepth}" fill="${color}" fill-opacity="0.25" rx="2"/>
        <rect x="${-padWidth / 2}" y="${-padDepth / 2}" width="${padWidth}" height="${padDepth}" fill="none" stroke="${color}" stroke-width="1.5" rx="2"/>
        <text x="0" y="${fontSize * 0.35}" font-size="${fontSize}" fill="${color}" fill-opacity="0.7" text-anchor="middle">${index + 1}</text>
      </g>`;
    })
    .join("");
  return `<g transform="translate(${cx},${cy}) rotate(${s.rotation})">
    ${padMarkup}
  </g>`;
}

function ladderToSvg(s: LadderShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, depth, radius, width } = getLadder2DShape(s, ppm);
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - width / 2}" y="${cy - depth / 2}" width="${width}" height="${depth}" fill="${color}" fill-opacity="0.16" rx="${radius}"/>
    <rect x="${cx - width / 2}" y="${cy - depth / 2}" width="${width}" height="${depth}" stroke="${color}" stroke-width="2" fill="none" rx="${radius}"/>
  </g>`;
}

function diveGateToSvg(s: DiveGateShape, ppm: number): string {
  const cx = m(s.x, ppm);
  const cy = m(s.y, ppm);
  const { color, inset, postRadius, size, visibleDepth } = getDiveGate2DShape(
    s,
    ppm
  );
  return `<g transform="rotate(${s.rotation},${cx},${cy})">
    <rect x="${cx - size / 2}" y="${cy - visibleDepth / 2}" width="${size}" height="${visibleDepth}" fill="${color}" fill-opacity="0.03" rx="4"/>
    <rect x="${cx - size / 2}" y="${cy - visibleDepth / 2}" width="${size}" height="${visibleDepth}" stroke="${color}" stroke-width="2" fill="none" rx="4" opacity="0.95"/>
    <circle cx="${cx - size / 2 + inset}" cy="${cy - visibleDepth / 2 + inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx + size / 2 - inset}" cy="${cy - visibleDepth / 2 + inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx - size / 2 + inset}" cy="${cy + visibleDepth / 2 - inset}" r="${postRadius}" fill="${color}"/>
    <circle cx="${cx + size / 2 - inset}" cy="${cy + visibleDepth / 2 - inset}" r="${postRadius}" fill="${color}"/>
  </g>`;
}

function shapeToSvg(
  shape: Shape,
  ppm: number,
  primaryPolylineId: string | null
): string {
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
      return polylineToSvg(shape, ppm, primaryPolylineId === shape.id);
    case "startfinish":
      return startfinishToSvg(shape, ppm);
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

  const shapeSvg = getDesignShapes(design);
  const primaryPolylineId =
    shapeSvg.find((shape): shape is PolylineShape => shape.kind === "polyline")
      ?.id ?? null;
  const shapeMarkup = shapeSvg
    .map((s) => shapeToSvg(s, ppm, primaryPolylineId))
    .join("\n  ");

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
  ${shapeMarkup}
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
