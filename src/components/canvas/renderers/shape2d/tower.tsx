"use client";

import { Line, Rect } from "react-konva";
import { getTower2DShape } from "@/lib/track/shape2d";
import { m2px } from "@/lib/track/units";
import type { TowerShape } from "@/lib/types";

export function renderTower(shape: TowerShape, selected: boolean, ppm: number) {
  const tower = getTower2DShape(shape, ppm);
  const { depth, levelCount, radius, totalDepth, width } = tower;
  const selectionPad = m2px(0.3, ppm);

  const strokeColor =
    tower.variant === "panel-frame" ? tower.frame.color : tower.color;

  return (
    <>
      {selected && (
        <Rect
          width={width + selectionPad}
          height={totalDepth + selectionPad}
          offsetX={(width + selectionPad) / 2}
          offsetY={(totalDepth + selectionPad) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={3}
          listening={false}
        />
      )}
      {tower.variant === "panel-frame" ? (
        <>
          <Rect
            x={-width / 2}
            y={-depth / 2}
            width={tower.panels.leftWidth}
            height={depth}
            fill={tower.panels.leftColor}
            opacity={0.94}
            cornerRadius={[radius, 0, 0, radius]}
            strokeEnabled={false}
          />
          <Rect
            x={-tower.openingWidth / 2}
            y={-depth / 2}
            width={tower.openingWidth}
            height={depth}
            fill={tower.panels.topColor}
            opacity={0.9}
            strokeEnabled={false}
          />
          <Rect
            x={width / 2 - tower.panels.rightWidth}
            y={-depth / 2}
            width={tower.panels.rightWidth}
            height={depth}
            fill={tower.panels.rightColor}
            opacity={0.94}
            cornerRadius={[0, radius, radius, 0]}
            strokeEnabled={false}
          />
        </>
      ) : (
        <Rect
          width={width}
          height={depth}
          offsetX={width / 2}
          offsetY={depth / 2}
          fill={tower.color}
          opacity={0.88}
          cornerRadius={radius}
          strokeEnabled={false}
        />
      )}
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        fillEnabled={false}
        stroke={strokeColor}
        strokeWidth={1}
        opacity={0.88}
        cornerRadius={radius}
      />
      <Line
        points={[-width / 2, 0, width / 2, 0]}
        stroke={strokeColor}
        strokeWidth={1}
        opacity={levelCount > 1 ? 0.62 : 0.28}
        dash={levelCount > 1 ? [3, 2] : [2, 4]}
        listening={false}
      />
    </>
  );
}
