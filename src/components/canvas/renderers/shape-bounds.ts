import {
  getCone2DShape,
  getTower2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "@/lib/track/shape2d";
import { getPolylineBounds } from "@/lib/track/polyline-derived";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  PolylineShape,
  Shape,
  ShapeKind,
  StartFinishShape,
  TowerShape,
} from "@/lib/types";

type Bounds = { x: number; y: number; width: number; height: number };

const shapeBoundsDispatch: Record<
  ShapeKind,
  (shape: Shape, ppm: number) => Bounds | null
> = {
  gate: (shape, ppm) => {
    const { width, depth } = getGate2DShape(shape as GateShape, ppm);
    return { x: -width / 2, y: -depth / 2, width, height: depth };
  },
  tower: (shape, ppm) => {
    const { width, totalDepth } = getTower2DShape(shape as TowerShape, ppm);
    return {
      x: -width / 2,
      y: -totalDepth / 2,
      width,
      height: totalDepth,
    };
  },
  flag: (shape, ppm) => getFlag2DShape(shape as FlagShape, ppm).bounds,
  cone: (shape, ppm) => getCone2DShape(shape as ConeShape, ppm).bounds,
  label: (shape) => {
    const s = shape as LabelShape;
    const fontSize = s.fontSize ?? 18;
    const labelWidth = Math.max(s.text.length * fontSize * 0.45, 48);
    return {
      x: -labelWidth / 2,
      y: -fontSize,
      width: labelWidth,
      height: fontSize + 8,
    };
  },
  startfinish: (shape, ppm) => {
    const { totalWidth, padDepth } = getStartFinish2DShape(
      shape as StartFinishShape,
      ppm
    );
    return {
      x: -totalWidth / 2,
      y: -padDepth / 2,
      width: totalWidth,
      height: padDepth,
    };
  },
  ladder: (shape, ppm) => {
    const { width, depth } = getLadder2DShape(shape as LadderShape, ppm);
    return { x: -width / 2, y: -depth / 2, width, height: depth };
  },
  divegate: (shape, ppm) => {
    const diveGate = getDiveGate2DShape(shape as DiveGateShape, ppm);
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
  },
  polyline: (shape, ppm) => getPolylineBounds(shape as PolylineShape, ppm),
};

export function getShapeLocalBounds(shape: Shape, ppm: number): Bounds | null {
  return shapeBoundsDispatch[shape.kind](shape, ppm);
}
