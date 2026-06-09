"use client";

import { Rect } from "react-konva";
import { getLadder2DShape } from "@/lib/track/shape2d";
import { m2px } from "@/lib/track/units";
import type { LadderShape } from "@/lib/types";

export function renderLadder(
  shape: LadderShape,
  selected: boolean,
  ppm: number
) {
  const ladder2d = getLadder2DShape(shape, ppm);
  const barHeight = Math.max(ladder2d.depth, 7);
  const selectionPad = m2px(0.3, ppm);
  const { color, radius, width } = ladder2d;
  return (
    <>
      {selected && (
        <Rect
          width={width + selectionPad}
          height={barHeight + selectionPad}
          offsetX={(width + selectionPad) / 2}
          offsetY={(barHeight + selectionPad) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Rect
        width={width}
        height={barHeight}
        offsetX={width / 2}
        offsetY={barHeight / 2}
        fill={color}
        opacity={0.88}
        cornerRadius={radius}
        strokeEnabled={false}
      />
    </>
  );
}
