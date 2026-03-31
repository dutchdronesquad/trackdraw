import { m2px } from "@/lib/track/units";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LadderShape,
  StartFinishShape,
} from "@/lib/types";

export function getGate2DShape(shape: GateShape, ppm: number) {
  const width = m2px(shape.width, ppm);
  const depth = m2px(shape.thick ?? 0.2, ppm);
  return {
    color: shape.color ?? "#3b82f6",
    depth,
    radius: Math.min(12, depth / 2),
    width,
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
  const width = m2px(shape.width ?? 2, ppm);
  const depth = m2px(0.18, ppm);
  return {
    color: shape.color ?? "#14b8a6",
    depth,
    radius: Math.min(12, depth / 2),
    width,
  };
}

export function getDiveGate2DShape(shape: DiveGateShape, ppm: number) {
  const size = m2px(shape.size ?? 2.8, ppm);
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
    visibleDepth,
  };
}
