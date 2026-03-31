import {
  getCone2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "@/lib/track/shape2d";
import { getPolylineBounds } from "@/lib/track/polyline-derived";
import type { Shape } from "@/lib/types";

export function getShapeLocalBounds(shape: Shape, ppm: number) {
  switch (shape.kind) {
    case "gate": {
      const { width, depth } = getGate2DShape(shape, ppm);
      return {
        x: -width / 2,
        y: -depth / 2,
        width,
        height: depth,
      };
    }
    case "flag": {
      return getFlag2DShape(shape, ppm).bounds;
    }
    case "cone": {
      return getCone2DShape(shape, ppm).bounds;
    }
    case "label": {
      const fontSize = shape.fontSize ?? 18;
      const labelWidth = Math.max(shape.text.length * fontSize * 0.45, 48);
      return {
        x: -labelWidth / 2,
        y: -fontSize,
        width: labelWidth,
        height: fontSize + 8,
      };
    }
    case "startfinish": {
      const { totalWidth, padDepth } = getStartFinish2DShape(shape, ppm);
      return {
        x: -totalWidth / 2,
        y: -padDepth / 2,
        width: totalWidth,
        height: padDepth,
      };
    }
    case "ladder": {
      const { width, depth } = getLadder2DShape(shape, ppm);
      return {
        x: -width / 2,
        y: -depth / 2,
        width,
        height: depth,
      };
    }
    case "divegate": {
      const { size, visibleDepth } = getDiveGate2DShape(shape, ppm);
      return {
        x: -size / 2,
        y: -visibleDepth / 2,
        width: size,
        height: visibleDepth,
      };
    }
    case "polyline": {
      return getPolylineBounds(shape, ppm);
    }
  }
}
