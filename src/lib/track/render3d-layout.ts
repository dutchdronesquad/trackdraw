import type {
  ArchDiveGateVisualSpec,
  GatePanelTextureVisualSpec,
  LaunchGateVisualSpec,
  PanelFrameGateVisualSpec,
  PanelFrameLadderVisualSpec,
  PanelTexturePlacementSpec,
  TextureOrientationSpec,
  TexturePanelEdge,
} from "@/lib/track/elements/catalog";
import { feetToMeters } from "@/lib/track/units";
import type {
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
} from "@/lib/types";

export const PANEL_FRAME_PANEL_DEPTH = 0.018;
export const PANEL_FRAME_TEXTURE_SURFACE_OFFSET = 0.0015;
export const TEXTURED_PANEL_FRAME_TUBE_SCALE = 0.58;
const MULTIGP_FEATHER_FLAG_TEXTURE_ASPECT = 1134 / 5811;

export type Point3Tuple = [number, number, number];

export interface TexturePanelTransform {
  flipX: boolean;
  flipY: boolean;
  rotation: number;
}

export interface ResolvedTexturePanel<T> extends TexturePanelTransform {
  texture: T;
  source: string;
}

export interface PanelFrameTextureMapping<T> {
  left: ResolvedTexturePanel<T>;
  right: ResolvedTexturePanel<T>;
  top: ResolvedTexturePanel<T> | null;
}

export interface LaunchGateBannerTextureMapping<T> {
  front: ResolvedTexturePanel<T>;
  rear: ResolvedTexturePanel<T>;
  left: ResolvedTexturePanel<T>;
  right: ResolvedTexturePanel<T>;
}

export interface ArchDiveGateBannerTextureMapping<T> {
  left: ResolvedTexturePanel<T>;
  right: ResolvedTexturePanel<T>;
  top: ResolvedTexturePanel<T>;
  bottom: ResolvedTexturePanel<T>;
}

export interface MultiGpDiveGateArchLayout {
  bannerH: number;
  centerY: number;
  cornerPoints: Point3Tuple[];
  couplerPoints: {
    height: number;
    postH: number;
    x: number;
    z: number;
  }[];
  pipeSegments: {
    end: Point3Tuple;
    start: Point3Tuple;
  }[];
  halfOpening: number;
  halfOuterH: number;
  halfOuterW: number;
  openingH: number;
  openingW: number;
  outerH: number;
  outerW: number;
  sidePanelW: number;
  tiltRad: number;
  topY: number;
}

export interface MultiGpLaunchGateLayout {
  couplerPoints: {
    height: number;
    postH: number;
    x: number;
    z: number;
  }[];
  halfOpeningD: number;
  halfOpeningW: number;
  halfOuterD: number;
  halfOuterW: number;
  openingD: number;
  openingW: number;
  outerD: number;
  outerW: number;
  pipeSegments: {
    end: Point3Tuple;
    start: Point3Tuple;
  }[];
  sidePanelW: number;
  endPanelD: number;
  topY: number;
}

const MULTIGP_DIVE_GATE_OPENING_W = feetToMeters(7);
const MULTIGP_DIVE_GATE_OPENING_H = feetToMeters(6);
const MULTIGP_DIVE_GATE_BANNER_H = feetToMeters(2);
const MULTIGP_DIVE_GATE_SIDE_PANEL_W = feetToMeters(2);
const MULTIGP_DIVE_GATE_FRONT_EDGE_H = feetToMeters(12);
const MULTIGP_DIVE_GATE_REAR_EDGE_H = feetToMeters(15);
const MULTIGP_DIVE_GATE_FRONT_COUPLER_H = feetToMeters(2);
const MULTIGP_DIVE_GATE_REAR_COUPLER_H = feetToMeters(5);
const MULTIGP_DIVE_GATE_REAR_LEG_OUTSET_W = feetToMeters(2);
const MULTIGP_LAUNCH_GATE_OPENING_W = feetToMeters(7);
const MULTIGP_LAUNCH_GATE_OPENING_D = feetToMeters(6);
const MULTIGP_LAUNCH_GATE_OUTER_W = feetToMeters(10);
const MULTIGP_LAUNCH_GATE_OUTER_D = feetToMeters(10);
const MULTIGP_LAUNCH_GATE_TOP_Y = feetToMeters(15);
const MULTIGP_LAUNCH_GATE_COUPLER_H = feetToMeters(5);

const TEXTURE_TOP_EDGE_ROTATIONS: Record<TexturePanelEdge, number> = {
  top: 0,
  right: Math.PI / 2,
  bottom: Math.PI,
  left: -Math.PI / 2,
};

export function resolveTexturePanelTransform(
  orientation?: TextureOrientationSpec
): TexturePanelTransform {
  return {
    flipX: Boolean(orientation?.flipX),
    flipY: Boolean(orientation?.flipY),
    rotation:
      TEXTURE_TOP_EDGE_ROTATIONS[orientation?.textureTopEdgeFaces ?? "top"],
  };
}

function resolvePanelTexture<T, TSource extends string>(
  placement: PanelTexturePlacementSpec<TSource> | undefined,
  fallback: PanelTexturePlacementSpec<TSource>,
  textures: Record<TSource, T>
): ResolvedTexturePanel<T> {
  const resolvedPlacement = placement ?? fallback;
  return {
    texture: textures[resolvedPlacement.source],
    source: resolvedPlacement.source as string,
    ...resolveTexturePanelTransform(resolvedPlacement.orientation),
  };
}

export function resolvePanelFrameTextureMapping<T>(
  textureSpec: GatePanelTextureVisualSpec,
  loaded: { left: T; right: T; top: T | null }
): PanelFrameTextureMapping<T> {
  const symmetric = textureSpec.left === textureSpec.right;
  const topSource = textureSpec.top ? "top" : "left";
  const leftFallback: PanelTexturePlacementSpec<"left" | "right" | "top"> =
    symmetric
      ? {
          source: "left",
          orientation: { textureTopEdgeFaces: "bottom" },
        }
      : { source: "right" };
  const rightFallback: PanelTexturePlacementSpec<"left" | "right" | "top"> = {
    source: "left",
  };

  return {
    left: resolvePanelTexture(
      textureSpec.placement?.left,
      leftFallback,
      loaded as Record<"left" | "right" | "top", T>
    ),
    right: resolvePanelTexture(
      textureSpec.placement?.right,
      rightFallback,
      loaded as Record<"left" | "right" | "top", T>
    ),
    top: loaded.top
      ? resolvePanelTexture(
          textureSpec.placement?.top,
          { source: topSource },
          loaded as Record<"left" | "right" | "top", T>
        )
      : null,
  };
}

export function resolveLaunchGateBannerTextureMapping<T>(
  banner: LaunchGateVisualSpec["banner"],
  loaded: { side: T; top: T }
): LaunchGateBannerTextureMapping<T> {
  return {
    front: resolvePanelTexture(
      banner.placement?.front,
      { source: "top", orientation: { flipX: true } },
      loaded
    ),
    rear: resolvePanelTexture(
      banner.placement?.rear,
      {
        source: "top",
        orientation: { textureTopEdgeFaces: "bottom", flipX: true },
      },
      loaded
    ),
    left: resolvePanelTexture(
      banner.placement?.left,
      { source: "side", orientation: { flipX: true } },
      loaded
    ),
    right: resolvePanelTexture(
      banner.placement?.right,
      { source: "side", orientation: { flipY: true } },
      loaded
    ),
  };
}

export function resolveArchDiveGateBannerTextureMapping<T>(
  banner: ArchDiveGateVisualSpec["banner"],
  loaded: { side: T; top: T }
): ArchDiveGateBannerTextureMapping<T> {
  return {
    left: resolvePanelTexture(
      banner.placement?.left,
      { source: "side" },
      loaded
    ),
    right: resolvePanelTexture(
      banner.placement?.right,
      { source: "side" },
      loaded
    ),
    top: resolvePanelTexture(banner.placement?.top, { source: "top" }, loaded),
    bottom: resolvePanelTexture(
      banner.placement?.bottom,
      { source: "top" },
      loaded
    ),
  };
}

function shouldRenderLadderTopPanel(
  visual: PanelFrameLadderVisualSpec,
  sectionIndex: number,
  rungs: number
) {
  return (
    visual.topPanelPlacement !== "lower-sections" || sectionIndex < rungs - 1
  );
}

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
  const topPanelCount =
    visual.topPanelPlacement === "lower-sections"
      ? Math.max(0, rungs - 1)
      : rungs;
  const totalH = openingH * rungs + bannerH * topPanelCount;
  const sections = Array.from({ length: rungs }, (_, index) => {
    const renderedTopPanelsBefore =
      visual.topPanelPlacement === "lower-sections"
        ? Math.min(index, Math.max(0, rungs - 1))
        : index;
    const sectionY = index * openingH + renderedTopPanelsBefore * bannerH;
    const hasTopPanel = shouldRenderLadderTopPanel(visual, index, rungs);
    const barY = sectionY + openingH + (hasTopPanel ? bannerH : 0);
    const bannerMidY = sectionY + openingH + bannerH / 2;
    const openingMidY = sectionY + openingH / 2;

    return {
      bannerMidY,
      barY,
      hasTopPanel,
      isIntermediate: index < rungs - 1,
      openingMidY,
      sectionY,
    };
  });
  const frontZ = -(panelDepth / 2 + PANEL_FRAME_TEXTURE_SURFACE_OFFSET);
  const tJunctionRadius = frameTube * 0.8;

  return {
    bannerH,
    baseY,
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    openingH,
    outerLeftX,
    outerRightX,
    outerW,
    panelDepth,
    rightPanelWidth,
    rungs,
    sections,
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

export function getMultiGpDiveGateArchTopY() {
  return MULTIGP_DIVE_GATE_REAR_EDGE_H;
}

export function getMultiGpDiveGateArchLayout(
  shape: Pick<DiveGateShape, "width" | "height">
): MultiGpDiveGateArchLayout {
  const openingW = shape.width ?? MULTIGP_DIVE_GATE_OPENING_W;
  const openingH = shape.height ?? MULTIGP_DIVE_GATE_OPENING_H;
  const halfOpening = openingW / 2;
  const outerW = openingW + MULTIGP_DIVE_GATE_SIDE_PANEL_W * 2;
  const outerH = openingH + MULTIGP_DIVE_GATE_BANNER_H * 2;
  const halfOuterW = outerW / 2;
  const halfOuterH = outerH / 2;
  const verticalSpan =
    MULTIGP_DIVE_GATE_REAR_EDGE_H - MULTIGP_DIVE_GATE_FRONT_EDGE_H;
  const tiltRad = -Math.acos(Math.min(1, verticalSpan / outerH));
  const centerY =
    (MULTIGP_DIVE_GATE_FRONT_EDGE_H + MULTIGP_DIVE_GATE_REAR_EDGE_H) / 2;

  const panelPoint = (x: number, y: number): Point3Tuple => [
    x,
    centerY + y * Math.cos(tiltRad),
    y * Math.sin(tiltRad),
  ];
  const cornerPoints = [
    panelPoint(-halfOuterW, -halfOuterH),
    panelPoint(halfOuterW, -halfOuterH),
    panelPoint(-halfOuterW, halfOuterH),
    panelPoint(halfOuterW, halfOuterH),
  ];
  const rearLeftSupportTop: Point3Tuple = [
    cornerPoints[2][0] - MULTIGP_DIVE_GATE_REAR_LEG_OUTSET_W,
    cornerPoints[2][1],
    cornerPoints[2][2],
  ];
  const rearRightSupportTop: Point3Tuple = [
    cornerPoints[3][0] + MULTIGP_DIVE_GATE_REAR_LEG_OUTSET_W,
    cornerPoints[3][1],
    cornerPoints[3][2],
  ];
  const pipeSegments = [
    {
      start: [cornerPoints[0][0], 0, cornerPoints[0][2]] as Point3Tuple,
      end: cornerPoints[0],
    },
    {
      start: [cornerPoints[1][0], 0, cornerPoints[1][2]] as Point3Tuple,
      end: cornerPoints[1],
    },
    {
      start: cornerPoints[2],
      end: rearLeftSupportTop,
    },
    {
      start: [rearLeftSupportTop[0], 0, rearLeftSupportTop[2]] as Point3Tuple,
      end: rearLeftSupportTop,
    },
    {
      start: cornerPoints[3],
      end: rearRightSupportTop,
    },
    {
      start: [rearRightSupportTop[0], 0, rearRightSupportTop[2]] as Point3Tuple,
      end: rearRightSupportTop,
    },
  ];
  const couplerPoints = [
    {
      height: MULTIGP_DIVE_GATE_FRONT_COUPLER_H,
      postH: cornerPoints[0][1],
      x: cornerPoints[0][0],
      z: cornerPoints[0][2],
    },
    {
      height: MULTIGP_DIVE_GATE_FRONT_COUPLER_H,
      postH: cornerPoints[1][1],
      x: cornerPoints[1][0],
      z: cornerPoints[1][2],
    },
    {
      height: MULTIGP_DIVE_GATE_REAR_COUPLER_H,
      postH: rearLeftSupportTop[1],
      x: rearLeftSupportTop[0],
      z: rearLeftSupportTop[2],
    },
    {
      height: MULTIGP_DIVE_GATE_REAR_COUPLER_H,
      postH: rearRightSupportTop[1],
      x: rearRightSupportTop[0],
      z: rearRightSupportTop[2],
    },
  ];

  return {
    bannerH: MULTIGP_DIVE_GATE_BANNER_H,
    centerY,
    cornerPoints,
    couplerPoints,
    halfOpening,
    halfOuterH,
    halfOuterW,
    openingH,
    openingW,
    outerH,
    outerW,
    pipeSegments,
    sidePanelW: MULTIGP_DIVE_GATE_SIDE_PANEL_W,
    tiltRad,
    topY: MULTIGP_DIVE_GATE_REAR_EDGE_H,
  };
}

export function getMultiGpLaunchGateTopY() {
  return MULTIGP_LAUNCH_GATE_TOP_Y;
}

export function getMultiGpLaunchGateLayout(
  shape: Pick<DiveGateShape, "width" | "height">
): MultiGpLaunchGateLayout {
  const openingW = shape.width ?? MULTIGP_LAUNCH_GATE_OPENING_W;
  const openingD = shape.height ?? MULTIGP_LAUNCH_GATE_OPENING_D;
  const outerW = MULTIGP_LAUNCH_GATE_OUTER_W;
  const outerD = MULTIGP_LAUNCH_GATE_OUTER_D;
  const sidePanelW = (outerW - openingW) / 2;
  const endPanelD = (outerD - openingD) / 2;
  const halfOpeningW = openingW / 2;
  const halfOpeningD = openingD / 2;
  const halfOuterW = outerW / 2;
  const halfOuterD = outerD / 2;
  const topY = MULTIGP_LAUNCH_GATE_TOP_Y;
  const legTops: Point3Tuple[] = [
    [-halfOuterW, topY, -halfOuterD],
    [halfOuterW, topY, -halfOuterD],
    [halfOuterW, topY, halfOuterD],
    [-halfOuterW, topY, halfOuterD],
  ];
  const topSegments: Array<[Point3Tuple, Point3Tuple]> = [
    [
      [-halfOuterW, topY, -halfOuterD],
      [halfOuterW, topY, -halfOuterD],
    ],
    [
      [halfOuterW, topY, -halfOuterD],
      [halfOuterW, topY, halfOuterD],
    ],
    [
      [halfOuterW, topY, halfOuterD],
      [-halfOuterW, topY, halfOuterD],
    ],
    [
      [-halfOuterW, topY, halfOuterD],
      [-halfOuterW, topY, -halfOuterD],
    ],
    [
      [-halfOpeningW, topY, -halfOpeningD],
      [halfOpeningW, topY, -halfOpeningD],
    ],
    [
      [halfOpeningW, topY, -halfOpeningD],
      [halfOpeningW, topY, halfOpeningD],
    ],
    [
      [halfOpeningW, topY, halfOpeningD],
      [-halfOpeningW, topY, halfOpeningD],
    ],
    [
      [-halfOpeningW, topY, halfOpeningD],
      [-halfOpeningW, topY, -halfOpeningD],
    ],
  ];
  const pipeSegments = [
    ...legTops.map((end) => ({
      start: [end[0], 0, end[2]] as Point3Tuple,
      end,
    })),
    ...topSegments.map(([start, end]) => ({ start, end })),
  ];
  const couplerPoints = legTops.map(([x, , z]) => ({
    height: MULTIGP_LAUNCH_GATE_COUPLER_H,
    postH: topY,
    x,
    z,
  }));

  return {
    couplerPoints,
    halfOpeningD,
    halfOpeningW,
    halfOuterD,
    halfOuterW,
    openingD,
    openingW,
    outerD,
    outerW,
    pipeSegments,
    sidePanelW,
    endPanelD,
    topY,
  };
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
