"use client";

import { Line, Rect } from "react-konva";
import { getTower2DShape } from "@/lib/track/shape2d";
import { m2px } from "@/lib/track/units";
import type { TowerShape } from "@/lib/types";

export function renderTower(shape: TowerShape, selected: boolean, ppm: number) {
  const tower = getTower2DShape(shape, ppm);
  const { depth, levelCount, radius, width } = tower;
  const barHeight = Math.max(depth, 7);
  const selectionPad = m2px(0.3, ppm);

  const strokeColor =
    tower.variant === "panel-frame" ? tower.frame.color : tower.color;

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
          cornerRadius={3}
          listening={false}
        />
      )}
      {tower.variant === "panel-frame" ? (
        <>
          <Rect
            x={-width / 2}
            y={-barHeight / 2}
            width={tower.panels.leftWidth}
            height={barHeight}
            fill={tower.panels.leftColor}
            opacity={0.94}
            cornerRadius={[radius, 0, 0, radius]}
            strokeEnabled={false}
          />
          <Rect
            x={-tower.openingWidth / 2}
            y={-barHeight / 2}
            width={tower.openingWidth}
            height={barHeight}
            fill={tower.panels.topColor}
            opacity={0.9}
            strokeEnabled={false}
          />
          <Rect
            x={width / 2 - tower.panels.rightWidth}
            y={-barHeight / 2}
            width={tower.panels.rightWidth}
            height={barHeight}
            fill={tower.panels.rightColor}
            opacity={0.94}
            cornerRadius={[0, radius, radius, 0]}
            strokeEnabled={false}
          />
        </>
      ) : (
        <Rect
          width={width}
          height={barHeight}
          offsetX={width / 2}
          offsetY={barHeight / 2}
          fill={tower.color}
          opacity={0.88}
          cornerRadius={radius}
          strokeEnabled={false}
        />
      )}
      {tower.variant === "panel-frame" ? (
        <Rect
          width={width}
          height={barHeight}
          offsetX={width / 2}
          offsetY={barHeight / 2}
          fillEnabled={false}
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.88}
          cornerRadius={radius}
        />
      ) : null}
      {levelCount > 1 ? (
        <Line
          points={[-width / 2, 0, width / 2, 0]}
          stroke={strokeColor}
          strokeWidth={1}
          opacity={0.62}
          dash={[3, 2]}
          listening={false}
        />
      ) : null}
    </>
  );
}
