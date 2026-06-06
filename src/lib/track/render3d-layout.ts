import type {
  PanelFrameGateVisualSpec,
  PanelFrameLadderVisualSpec,
} from "@/lib/track/elements/catalog";
import type { FlagShape, GateShape, LadderShape } from "@/lib/types";

export const PANEL_FRAME_PANEL_DEPTH = 0.018;
export const PANEL_FRAME_TEXTURE_SURFACE_OFFSET = 0.0015;
export const TEXTURED_PANEL_FRAME_TUBE_SCALE = 0.58;
const MULTIGP_FEATHER_FLAG_TEXTURE_ASPECT = 1134 / 5811;

export function getPanelFrameGateLayout(
  shape: GateShape,
  visual: PanelFrameGateVisualSpec
) {
  const h = shape.height ?? 2;
  const w = shape.width ?? 3;
  const leftPanelWidth = visual.panels.left.widthMeters;
  const rightPanelWidth = visual.panels.right.widthMeters;
  const topPanelHeight = visual.panels.top.heightMeters;
  const panelDepth = PANEL_FRAME_PANEL_DEPTH;
  const frameTube =
    visual.frame.diameterMeters * TEXTURED_PANEL_FRAME_TUBE_SCALE;
  const frameZ = panelDepth * 0.1;
  const frontZ = -(panelDepth / 2 + PANEL_FRAME_TEXTURE_SURFACE_OFFSET);
  const leftPanelX = -w / 2 - leftPanelWidth / 2;
  const rightPanelX = w / 2 + rightPanelWidth / 2;
  const topPanelY = h + topPanelHeight / 2;
  const topPanelW = w + leftPanelWidth + rightPanelWidth;
  const outerLeftX = -w / 2 - leftPanelWidth;
  const outerRightX = w / 2 + rightPanelWidth;
  const outerTopY = h + topPanelHeight;

  return {
    frameTube,
    frameZ,
    frontZ,
    h,
    leftPanelWidth,
    leftPanelX,
    outerLeftX,
    outerRightX,
    outerTopY,
    panelDepth,
    rightPanelWidth,
    rightPanelX,
    topPanelHeight,
    topPanelW,
    topPanelY,
    w,
  };
}

export function getPanelFrameLadderLayout(
  shape: LadderShape,
  visual: PanelFrameLadderVisualSpec
) {
  const w = shape.width ?? 1.5;
  const totalOpeningH = shape.height ?? 4.5;
  const rungs = Math.max(1, shape.rungs ?? 3);
  const baseY = Math.max(shape.elevation ?? 0, 0);
  const leftPanelWidth = visual.panels.left.widthMeters;
  const rightPanelWidth = visual.panels.right.widthMeters;
  const topPanelHeight = visual.panels.top.heightMeters;
  const panelDepth = PANEL_FRAME_PANEL_DEPTH;
  const frameTube =
    visual.frame.diameterMeters * TEXTURED_PANEL_FRAME_TUBE_SCALE;
  const frameZ = panelDepth * 0.1;
  const outerLeftX = -w / 2 - leftPanelWidth;
  const outerRightX = w / 2 + rightPanelWidth;
  const outerW = outerRightX - outerLeftX;
  const bannerH = topPanelHeight;
  const openingH = totalOpeningH / rungs;
  const gateH = openingH + bannerH;
  const totalH = gateH * rungs;
  const frontZ = -(panelDepth / 2 + PANEL_FRAME_TEXTURE_SURFACE_OFFSET);
  const tJunctionRadius = frameTube * 0.8;

  return {
    bannerH,
    baseY,
    frameTube,
    frameZ,
    frontZ,
    gateH,
    leftPanelWidth,
    openingH,
    outerLeftX,
    outerRightX,
    outerW,
    panelDepth,
    rightPanelWidth,
    rungs,
    tJunctionRadius,
    totalH,
    totalOpeningH,
    w,
  };
}

export function getLadderRenderedHeight(
  shape: LadderShape,
  visual: PanelFrameLadderVisualSpec | null
) {
  const height = shape.height ?? 4.5;
  if (!visual) return height;
  return getPanelFrameLadderLayout(shape, visual).totalH;
}

export function getCornerFlagLayout(shape: FlagShape, hasTextures = false) {
  const ph = shape.poleHeight ?? 3.5;
  const poleRadius = 0.03;
  const pw = ph * 0.18;
  const panelDepth = ph * 0.012;
  const panelStartY = ph * 0.08;
  const splitY = panelStartY + ph * 0.24;
  const bannerCenterY = (panelStartY + ph) / 2;
  const bannerHeight = ph - panelStartY;
  const bannerTextureWidth = Math.max(
    pw,
    bannerHeight * MULTIGP_FEATHER_FLAG_TEXTURE_ASPECT
  );
  const bannerLeftX = hasTextures ? 0 : poleRadius;
  const bannerTextureX = bannerLeftX + bannerTextureWidth / 2;
  const poleCapRadius = poleRadius * 1.06;
  const poleTipY = ph - poleCapRadius;
  const topCurveX = hasTextures
    ? bannerLeftX + bannerTextureWidth * 0.995
    : pw * 0.65;
  const polePoints = hasTextures
    ? [
        [0, 0],
        [0, panelStartY],
        [bannerLeftX, ph * 0.5],
        [bannerLeftX + bannerTextureWidth * 0.02, ph * 0.75],
        [bannerLeftX + bannerTextureWidth * 0.15, ph * 0.86],
        [bannerLeftX + bannerTextureWidth * 0.38, ph * 0.94],
        [topCurveX, poleTipY],
      ]
    : [
        [0, 0],
        [0, ph * 0.85],
        [topCurveX * 0.28, ph * 0.93],
        [topCurveX, poleTipY],
      ];

  return {
    bannerCenterY,
    bannerHeight,
    bannerLeftX,
    bannerTextureWidth,
    bannerTextureX,
    panelDepth,
    panelStartY,
    ph,
    poleCapRadius,
    polePoints,
    poleRadius,
    poleTipX: topCurveX,
    poleTipY,
    pw,
    splitY,
    topCurveX,
  };
}
