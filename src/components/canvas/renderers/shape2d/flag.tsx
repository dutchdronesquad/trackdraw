"use client";

import { Circle, Shape as KonvaShape } from "react-konva";
import { getFlag2DShape } from "@/lib/track/shape2d";
import type { FlagShape } from "@/lib/types";

export function renderFlag(shape: FlagShape, selected: boolean, ppm: number) {
  const { bannerLength, bannerWidth, color, mastRadius, selectionRadius } =
    getFlag2DShape(shape, ppm);
  return (
    <>
      {selected && (
        <Circle
          radius={selectionRadius}
          stroke="#3b82f6"
          strokeWidth={1.4}
          dash={[6, 4]}
          listening={false}
        />
      )}
      <KonvaShape
        sceneFunc={(ctx, shapeNode) => {
          ctx.beginPath();
          ctx.moveTo(mastRadius * 0.2, -bannerWidth * 0.34);
          ctx.bezierCurveTo(
            bannerLength * 0.22,
            -bannerWidth * 0.62,
            bannerLength * 0.76,
            -bannerWidth * 0.42,
            bannerLength,
            0
          );
          ctx.bezierCurveTo(
            bannerLength * 0.76,
            bannerWidth * 0.42,
            bannerLength * 0.22,
            bannerWidth * 0.62,
            mastRadius * 0.2,
            bannerWidth * 0.34
          );
          ctx.quadraticCurveTo(0, bannerWidth * 0.14, 0, 0);
          ctx.quadraticCurveTo(
            0,
            -bannerWidth * 0.14,
            mastRadius * 0.2,
            -bannerWidth * 0.34
          );
          ctx.closePath();
          ctx.fillStrokeShape(shapeNode);
        }}
        fill={color}
        opacity={0.8}
      />
      <Circle radius={mastRadius} fill={color} />
      <Circle
        radius={Math.max(1.5, mastRadius * 0.38)}
        fill="#ffffff"
        opacity={0.78}
      />
    </>
  );
}
