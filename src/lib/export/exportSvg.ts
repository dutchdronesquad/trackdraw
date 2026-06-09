import type {
  TrackDesign,
  Shape,
  ShapeKind,
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  PolylineShape,
  StartFinishShape,
  LadderShape,
  TowerShape,
  DiveGateShape,
} from "../types";
import { getDesignShapes } from "../track/design";
import {
  getObstacleNumberMap,
  isNumberedObstacle,
} from "../track/obstacleNumbering";
import {
  formatCompactFieldSize,
  type MeasurementUnitSystem,
} from "../track/units";
import {
  getDiveGate2DShape,
  getGate2DShape,
  getLadder2DShape,
  getTower2DShape,
} from "../track/shape2d";
import { coneToSvg } from "./svg/cone";
import { diveGateToSvg } from "./svg/divegate";
import { flagToSvg } from "./svg/flag";
import { gateToSvg } from "./svg/gate";
import { labelToSvg } from "./svg/label";
import { ladderToSvg } from "./svg/ladder";
import { polylineToSvg } from "./svg/polyline";
import { startfinishToSvg } from "./svg/startfinish";
import { towerToSvg } from "./svg/tower";
import { escapeXml, m } from "./svg/utils";

const MIN_EXPORT_GRID_SPACING_PX = 8;

function getExportGridStepPx(gridStepMeters: number, ppm: number) {
  return Math.max(m(gridStepMeters, ppm), MIN_EXPORT_GRID_SPACING_PX);
}

const shapeToSvgDispatch: Record<
  ShapeKind,
  (shape: Shape, ppm: number, primaryPolylineId: string | null) => string
> = {
  gate: (shape, ppm) => gateToSvg(shape as GateShape, ppm),
  flag: (shape, ppm) => flagToSvg(shape as FlagShape, ppm),
  cone: (shape, ppm) => coneToSvg(shape as ConeShape, ppm),
  label: (shape, ppm) => labelToSvg(shape as LabelShape, ppm),
  polyline: (shape, ppm, primaryPolylineId) =>
    polylineToSvg(shape as PolylineShape, ppm, primaryPolylineId === shape.id),
  startfinish: (shape, ppm) => startfinishToSvg(shape as StartFinishShape, ppm),
  ladder: (shape, ppm) => ladderToSvg(shape as LadderShape, ppm),
  tower: (shape, ppm) => towerToSvg(shape as TowerShape, ppm),
  divegate: (shape, ppm) => diveGateToSvg(shape as DiveGateShape, ppm),
};

function shapeToSvg(
  shape: Shape,
  ppm: number,
  primaryPolylineId: string | null
): string {
  return shapeToSvgDispatch[shape.kind](shape, ppm, primaryPolylineId);
}

function getNumberedShapeBounds(shape: Shape, ppm: number) {
  switch (shape.kind) {
    case "gate": {
      const { width, depth } = getGate2DShape(shape, ppm);
      return { x: -width / 2, y: -depth / 2, width, height: depth };
    }
    case "ladder": {
      const { width, depth } = getLadder2DShape(shape, ppm);
      return { x: -width / 2, y: -depth / 2, width, height: depth };
    }
    case "tower": {
      const { width, totalDepth } = getTower2DShape(shape, ppm);
      return { x: -width / 2, y: -totalDepth / 2, width, height: totalDepth };
    }
    case "divegate": {
      const diveGate = getDiveGate2DShape(shape, ppm);
      if (diveGate.variant === "arch" || diveGate.variant === "launch") {
        return diveGate.bounds;
      }

      const { size, visibleDepth } = diveGate;
      return {
        x: -size / 2,
        y: -visibleDepth / 2,
        width: size,
        height: visibleDepth,
      };
    }
    default:
      return null;
  }
}

function rotatePoint(
  point: { x: number; y: number },
  rotation: number
): { x: number; y: number } {
  const radians = (rotation * Math.PI) / 180;
  return {
    x: point.x * Math.cos(radians) - point.y * Math.sin(radians),
    y: point.x * Math.sin(radians) + point.y * Math.cos(radians),
  };
}

function obstacleNumbersToSvg(
  design: TrackDesign,
  shapes: Shape[],
  ppm: number,
  theme: ExportTheme,
  boundsCache?: Map<string, ReturnType<typeof getNumberedShapeBounds>>
) {
  const obstacleNumberMap = getObstacleNumberMap(design);
  if (!obstacleNumberMap.size) return "";

  const badgeFill = theme === "dark" ? "#111827" : "#0f172a";
  const badgeStroke = theme === "dark" ? "#94a3b8" : "#cbd5e1";
  const textFill = "#f8fafc";

  return shapes
    .filter(
      (shape) => isNumberedObstacle(shape) && obstacleNumberMap.has(shape.id)
    )
    .map((shape) => {
      const number = obstacleNumberMap.get(shape.id);
      const bounds =
        boundsCache?.get(shape.id) ?? getNumberedShapeBounds(shape, ppm);
      if (!bounds || typeof number !== "number") return "";

      const localPoint = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y - 16,
      };
      const rotatedPoint = rotatePoint(localPoint, shape.rotation);
      const cx = m(shape.x, ppm) + rotatedPoint.x;
      const cy = m(shape.y, ppm) + rotatedPoint.y;

      return `<g>
    <circle cx="${cx}" cy="${cy}" r="10" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1"/>
    <text x="${cx}" y="${cy + 3.7}" font-size="11" font-weight="700" fill="${textFill}" text-anchor="middle">${number}</text>
  </g>`;
    })
    .join("");
}

export type ExportTheme = "dark" | "light";
export interface Export2DOptions {
  includeObstacleNumbers?: boolean;
  preset?: "standard" | "race-day";
  unitSystem?: MeasurementUnitSystem;
}

export function designToSvg(
  design: TrackDesign,
  theme: ExportTheme = "dark",
  options?: Export2DOptions
): string {
  const { width, height, ppm, gridStep } = design.field;
  const W = m(width, ppm);
  const H = m(height, ppm);
  const rawStep = m(gridStep, ppm);
  const step = getExportGridStepPx(gridStep, ppm);
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

  // Grid lines — three levels (kept subtle so shapes read clearly). Very fine
  // grid settings are clamped for export so large layouts do not produce
  // enormous SVG/PDF/PNG payloads.
  let gridLines = "";
  for (let x = 0; x <= W + 0.01; x += step) {
    const isMajor = Math.abs(x % majorStep) < Math.max(0.5, rawStep / 2);
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
    const isMajor = Math.abs(y % majorStep) < Math.max(0.5, rawStep / 2);
    const isCoarse = !isMajor && Math.abs(y % coarseStep) < 0.5;
    const stroke = isMajor
      ? colors.gridMajor
      : isCoarse
        ? colors.gridCoarse
        : colors.gridMinor;
    const sw = isMajor ? 0.7 : isCoarse ? 0.5 : 0.3;
    gridLines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }

  const shapes = getDesignShapes(design);
  const primaryPolylineId =
    shapes.find((shape): shape is PolylineShape => shape.kind === "polyline")
      ?.id ?? null;
  const shapeBoundsCache = new Map<
    string,
    ReturnType<typeof getNumberedShapeBounds>
  >();
  const shapeMarkup = shapes
    .map((s) => {
      if (isNumberedObstacle(s))
        shapeBoundsCache.set(s.id, getNumberedShapeBounds(s, ppm));
      return shapeToSvg(s, ppm, primaryPolylineId);
    })
    .join("\n  ");
  const obstacleNumberMarkup =
    options?.includeObstacleNumbers === false
      ? ""
      : obstacleNumbersToSvg(design, shapes, ppm, theme, shapeBoundsCache);
  const titleText = design.title.trim() || "Untitled Track";
  const sizeText = formatCompactFieldSize(
    width,
    height,
    options?.unitSystem ?? "metric"
  );
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
  <!-- Obstacle numbers -->
  ${obstacleNumberMarkup}
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
  theme: ExportTheme = "dark",
  options?: Export2DOptions
): void {
  downloadText(designToSvg(design, theme, options), filename, "image/svg+xml");
}
