import { m2px } from "@/lib/track/units";
import {
  getTowerVisualSpec,
  getDiveGateVisualSpec,
  getGateVisualSpec,
  getLadderVisualSpec,
} from "@/lib/track/elements/visual";
import {
  getMultiGpDiveGateArchLayout,
  getMultiGpLaunchGateLayout,
} from "@/lib/track/render3d-layout";
import type {
  BarrierShape,
  ConeShape,
  TowerShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  StartFinishShape,
} from "@/lib/types";

const DIVE_GATE_2D_BANNER_VISUAL_SCALE = 0.82;
const TRACKDRAW_FRAME_2D_DEPTH_METERS = 0.2;

export function getGate2DShape(shape: GateShape, ppm: number) {
  const visual = getGateVisualSpec(shape);
  const openingWidth = m2px(shape.width, ppm);

  if (visual.variant === "panel-frame") {
    const leftPanelWidth = m2px(visual.panels.left.widthMeters, ppm);
    const rightPanelWidth = m2px(visual.panels.right.widthMeters, ppm);
    const width = openingWidth + leftPanelWidth + rightPanelWidth;
    const depth = Math.max(
      m2px(visual.frame.diameterMeters, ppm),
      m2px(0.12, ppm)
    );

    return {
      color: visual.panels.top.color,
      depth,
      frame: {
        color: visual.frame.color,
        diameter: m2px(visual.frame.diameterMeters, ppm),
        placement: visual.frame.placement,
      },
      openingWidth,
      panels: {
        leftColor: visual.panels.left.color,
        leftWidth: leftPanelWidth,
        rightColor: visual.panels.right.color,
        rightWidth: rightPanelWidth,
        topColor: visual.panels.top.color,
      },
      radius: Math.min(12, depth / 2),
      variant: visual.variant,
      width,
    };
  }

  const depth = m2px(visual.frame.diameterMeters, ppm);
  return {
    color: visual.frame.color,
    depth,
    openingWidth,
    radius: Math.min(12, depth / 2),
    variant: visual.variant,
    width: openingWidth,
  };
}

export function getFlag2DShape(shape: FlagShape, ppm: number) {
  const radius = m2px(shape.radius, ppm);
  const selectionRadius = radius + m2px(0.18, ppm);
  const mastRadius = Math.max(m2px(0.07, ppm), radius * 0.42);
  const bannerLength = Math.max(m2px(0.95, ppm), radius * 2.75);
  const bannerWidth = Math.max(m2px(0.34, ppm), radius * 1.2);

  return {
    bounds: {
      x: -selectionRadius,
      y: -selectionRadius,
      width: selectionRadius + bannerLength + mastRadius,
      height: selectionRadius * 2,
    },
    bannerLength,
    bannerWidth,
    color: shape.color ?? "#a855f7",
    mastRadius,
    radius,
    selectionRadius,
  };
}

export function getCone2DShape(shape: ConeShape, ppm: number) {
  const radius = m2px(shape.radius, ppm);
  const selectionRadius = radius + m2px(0.16, ppm);

  return {
    bounds: {
      x: -radius,
      y: -radius,
      width: radius * 2,
      height: radius * 2,
    },
    color: shape.color ?? "#f97316",
    radius,
    selectionRadius,
  };
}

export function getStartFinish2DShape(shape: StartFinishShape, ppm: number) {
  const totalWidth = m2px(shape.width ?? 3, ppm);
  const spacing = totalWidth / 4;
  const padWidth = spacing * 0.78;
  const padDepth = padWidth * 1.2;

  return {
    color: shape.color ?? "#f59e0b",
    padDepth,
    padWidth,
    pads: Array.from({ length: 4 }, (_, index) => ({
      index,
      x: -totalWidth / 2 + spacing * index + spacing / 2,
    })),
    spacing,
    totalWidth,
  };
}

export function getLadder2DShape(shape: LadderShape, ppm: number) {
  const ladderVisual = getLadderVisualSpec(shape);
  const openingWidth = m2px(shape.width ?? 2, ppm);
  const depth = m2px(TRACKDRAW_FRAME_2D_DEPTH_METERS, ppm);

  if (ladderVisual?.variant === "panel-frame") {
    const leftPanelWidth = m2px(ladderVisual.panels.left.widthMeters, ppm);
    const rightPanelWidth = m2px(ladderVisual.panels.right.widthMeters, ppm);
    const width = openingWidth + leftPanelWidth + rightPanelWidth;
    return {
      color:
        ladderVisual.panels.top?.color ??
        ladderVisual.panels.left.color ??
        shape.color ??
        "#14b8a6",
      depth,
      radius: Math.min(12, depth / 2),
      variant: "panel-frame" as const,
      width,
    };
  }

  return {
    color: shape.color ?? "#14b8a6",
    depth,
    radius: Math.min(12, depth / 2),
    variant: "frame-only" as const,
    width: openingWidth,
  };
}

export function getTower2DShape(shape: TowerShape, ppm: number) {
  const visual = getTowerVisualSpec(shape);
  const openingWidth = m2px(shape.width ?? 2, ppm);
  const levelCount = Math.max(1, Math.min(4, Math.round(shape.levels ?? 1)));
  const depth =
    visual?.variant === "panel-frame"
      ? Math.max(m2px(visual.frame.diameterMeters, ppm), m2px(0.12, ppm))
      : Math.max(
          m2px(shape.thick ?? TRACKDRAW_FRAME_2D_DEPTH_METERS, ppm),
          m2px(TRACKDRAW_FRAME_2D_DEPTH_METERS, ppm)
        );

  if (visual?.variant === "panel-frame") {
    const leftPanelWidth = m2px(visual.panels.left.widthMeters, ppm);
    const rightPanelWidth = m2px(visual.panels.right.widthMeters, ppm);
    const width = openingWidth + leftPanelWidth + rightPanelWidth;
    return {
      color: visual.panels.top.color,
      depth,
      frame: {
        color: visual.frame.color,
        diameter: m2px(visual.frame.diameterMeters, ppm),
        placement: visual.frame.placement,
      },
      levelCount,
      openingWidth,
      panels: {
        leftColor: visual.panels.left.color,
        leftWidth: leftPanelWidth,
        rightColor: visual.panels.right.color,
        rightWidth: rightPanelWidth,
        topColor: visual.panels.top.color,
      },
      radius: Math.min(12, depth / 2),
      totalDepth: depth,
      variant: visual.variant,
      width,
    };
  }

  return {
    color: shape.color ?? "#3b82f6",
    depth,
    levelCount,
    openingWidth,
    radius: Math.min(12, depth / 2),
    totalDepth: depth,
    variant: "frame-only" as const,
    width: openingWidth,
  };
}

export function getBarrier2DShape(shape: BarrierShape, ppm: number) {
  const width = m2px(shape.width, ppm);
  const depth = Math.max(m2px(0.15, ppm), 6);
  const radius = Math.min(4, depth / 4);
  const color = shape.color ?? getBarrierDefaultColor(shape.variant);
  return { color, depth, radius, variant: shape.variant, width };
}

function getBarrierDefaultColor(variant: BarrierShape["variant"]): string {
  switch (variant) {
    case "hurdle":
      return "#f59e0b";
    case "banner":
      return "#ec4899";
    case "fence":
      return "#94a3b8";
    case "net":
      return "#06b6d4";
  }
}

export function getDiveGateArchPanelPath(options: {
  openingDepth: number;
  openingW: number;
  outerDepth: number;
  outerW: number;
}) {
  const { openingDepth, openingW, outerDepth, outerW } = options;
  const outerRadius = Math.min(3, outerW / 2, outerDepth / 2);
  const outer = {
    height: outerDepth,
    radius: outerRadius,
    width: outerW,
    x: -outerW / 2,
    y: -outerDepth / 2,
  };
  const opening = {
    height: openingDepth,
    width: openingW,
    x: -openingW / 2,
    y: -openingDepth / 2,
  };
  const outerPath = [
    `M ${outer.x + outer.radius} ${outer.y}`,
    `H ${outer.x + outer.width - outer.radius}`,
    `Q ${outer.x + outer.width} ${outer.y} ${outer.x + outer.width} ${outer.y + outer.radius}`,
    `V ${outer.y + outer.height - outer.radius}`,
    `Q ${outer.x + outer.width} ${outer.y + outer.height} ${outer.x + outer.width - outer.radius} ${outer.y + outer.height}`,
    `H ${outer.x + outer.radius}`,
    `Q ${outer.x} ${outer.y + outer.height} ${outer.x} ${outer.y + outer.height - outer.radius}`,
    `V ${outer.y + outer.radius}`,
    `Q ${outer.x} ${outer.y} ${outer.x + outer.radius} ${outer.y}`,
    "Z",
  ].join(" ");
  const openingPath = [
    `M ${opening.x} ${opening.y}`,
    `H ${opening.x + opening.width}`,
    `V ${opening.y + opening.height}`,
    `H ${opening.x}`,
    "Z",
  ].join(" ");

  return {
    opening,
    outer,
    svgPath: `${outerPath} ${openingPath}`,
  };
}

export function getDiveGate2DShape(shape: DiveGateShape, ppm: number) {
  const visual = getDiveGateVisualSpec(shape);
  if (visual?.variant === "launch") {
    const layout = getMultiGpLaunchGateLayout(shape);
    const toPoint = ([x, , z]: [number, number, number]) => ({
      x: m2px(x, ppm),
      y: m2px(z, ppm),
    });
    const pipeSegments = layout.pipeSegments.map(({ end, start }) => ({
      end: toPoint(end),
      start: toPoint(start),
    }));
    const couplerPoints = layout.couplerPoints.map(({ x, z }) => ({
      x: m2px(x, ppm),
      y: m2px(z, ppm),
    }));
    const outerW = m2px(layout.outerW, ppm);
    const outerDepth = m2px(layout.outerD, ppm);
    const openingW = m2px(layout.openingW, ppm);
    const openingDepth = m2px(layout.openingD, ppm);
    const frameTube = Math.max(2, m2px(shape.thick ?? 0.055, ppm));
    const allPoints = [
      ...pipeSegments.flatMap((segment) => [segment.start, segment.end]),
      ...couplerPoints,
      { x: -outerW / 2, y: -outerDepth / 2 },
      { x: outerW / 2, y: outerDepth / 2 },
    ];
    const minX = Math.min(...allPoints.map((point) => point.x)) - frameTube;
    const maxX = Math.max(...allPoints.map((point) => point.x)) + frameTube;
    const minY = Math.min(...allPoints.map((point) => point.y)) - frameTube;
    const maxY = Math.max(...allPoints.map((point) => point.y)) + frameTube;

    return {
      bounds: {
        height: maxY - minY,
        width: maxX - minX,
        x: minX,
        y: minY,
      },
      color: visual.banner.color,
      couplerRadius: Math.max(2.5, frameTube * 0.75),
      couplerPoints,
      frameColor: visual.frame.color,
      frameTube,
      openingDepth,
      openingW,
      outerDepth,
      outerW,
      pipeSegments,
      variant: "launch" as const,
    };
  }

  if (visual?.variant === "arch") {
    const layout = getMultiGpDiveGateArchLayout(shape);
    const toPoint = ([x, , z]: [number, number, number]) => ({
      x: m2px(x, ppm),
      y: m2px(z, ppm),
    });
    const pipeSegments = layout.pipeSegments.map(({ end, start }) => ({
      end: toPoint(end),
      start: toPoint(start),
    }));
    const couplerPoints = layout.couplerPoints.map(({ x, z }) => ({
      x: m2px(x, ppm),
      y: m2px(z, ppm),
    }));
    const projectedDepthScale = Math.abs(Math.sin(layout.tiltRad));
    const sidePanelW = m2px(layout.sidePanelW, ppm);
    const sidePanelVisualW = sidePanelW * DIVE_GATE_2D_BANNER_VISUAL_SCALE;
    const openingW = m2px(layout.openingW, ppm);
    const openingDepth = Math.max(
      m2px(0.18, ppm),
      m2px(layout.openingH * projectedDepthScale, ppm)
    );
    const bannerDepth = Math.max(
      m2px(0.16, ppm),
      m2px(
        layout.bannerH * projectedDepthScale * DIVE_GATE_2D_BANNER_VISUAL_SCALE,
        ppm
      )
    );
    const outerDepth = openingDepth + bannerDepth * 2;
    const outerW = openingW + sidePanelVisualW * 2;
    const frameTube = Math.max(2, m2px(shape.thick ?? 0.055, ppm));
    const allPoints = [
      ...pipeSegments.flatMap((segment) => [segment.start, segment.end]),
      ...couplerPoints,
      { x: -outerW / 2, y: -outerDepth / 2 },
      { x: outerW / 2, y: outerDepth / 2 },
    ];
    const minX = Math.min(...allPoints.map((point) => point.x)) - frameTube;
    const maxX = Math.max(...allPoints.map((point) => point.x)) + frameTube;
    const minY = Math.min(...allPoints.map((point) => point.y)) - frameTube;
    const maxY = Math.max(...allPoints.map((point) => point.y)) + frameTube;

    return {
      bounds: {
        height: maxY - minY,
        width: maxX - minX,
        x: minX,
        y: minY,
      },
      color: visual.banner.color,
      bannerDepth,
      couplerRadius: Math.max(2.5, frameTube * 0.75),
      couplerPoints,
      frameColor: visual.frame.color,
      frameTube,
      openingDepth,
      openingW,
      outerDepth,
      outerW,
      pipeSegments,
      sidePanelW,
      variant: "arch" as const,
    };
  }

  const size = m2px(shape.width ?? 2.8, ppm);
  const thick = m2px(shape.thick ?? 0.2, ppm);
  const tilt = shape.tilt ?? 0;
  const visibleDepth = Math.max(
    thick * 2 + 4,
    size * Math.max(0.2, Math.cos((tilt * Math.PI) / 180))
  );
  const postRadius = Math.max(3, thick * 0.5);
  const inset = Math.max(postRadius * 0.85, thick * 0.75);

  return {
    color: shape.color ?? "#f97316",
    inset,
    postRadius,
    size,
    variant: "frame-only" as const,
    visibleDepth,
  };
}
