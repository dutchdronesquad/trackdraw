"use client";

import { Group, Rect, Text } from "react-konva";
import { getStartFinish2DShape } from "@/lib/track/shape2d";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import { m2px } from "@/lib/track/units";
import type { StartFinishShape } from "@/lib/types";

export function renderStartFinish(
  shape: StartFinishShape,
  selected: boolean,
  ppm: number
) {
  const marker = getShapeTimingMarker(shape);
  const base = getStartFinish2DShape(shape, ppm);
  const color = marker ? getTimingMarkerColor(marker) : base.color;
  const { padDepth, padWidth, pads, totalWidth } = base;
  return (
    <>
      {selected && (
        <Rect
          width={totalWidth + m2px(0.3, ppm)}
          height={padDepth + m2px(0.3, ppm)}
          offsetX={(totalWidth + m2px(0.3, ppm)) / 2}
          offsetY={(padDepth + m2px(0.3, ppm)) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={2}
          listening={false}
        />
      )}
      {pads.map(({ index, x }) => {
        return (
          <Group key={index} x={x}>
            <Rect
              width={padWidth}
              height={padDepth}
              offsetX={padWidth / 2}
              offsetY={padDepth / 2}
              fill={color}
              opacity={0.25}
              cornerRadius={2}
            />
            <Rect
              width={padWidth}
              height={padDepth}
              offsetX={padWidth / 2}
              offsetY={padDepth / 2}
              stroke={color}
              strokeWidth={marker ? 2.4 : 1.5}
              cornerRadius={2}
            />
            <Text
              text={String(index + 1)}
              fontSize={Math.max(7, padWidth * 0.45)}
              fill={color}
              align="center"
              width={padWidth}
              offsetX={padWidth / 2}
              offsetY={Math.max(7, padWidth * 0.45) / 2}
              opacity={0.7}
              listening={false}
            />
          </Group>
        );
      })}
    </>
  );
}
