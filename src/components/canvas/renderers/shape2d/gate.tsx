"use client";

import { Rect } from "react-konva";
import { getGate2DShape } from "@/lib/track/shape2d";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import { m2px } from "@/lib/track/units";
import type { GateShape } from "@/lib/types";

export function renderGate(shape: GateShape, selected: boolean, ppm: number) {
  const marker = getShapeTimingMarker(shape);
  const base = getGate2DShape(shape, ppm);
  const color = marker ? getTimingMarkerColor(marker) : base.color;
  const { radius, width } = base;
  const barHeight = Math.max(base.depth, 7);
  const selectionPad = m2px(0.3, ppm);

  if (base.variant === "panel-frame") {
    const centerWidth = base.openingWidth;
    const leftX = -width / 2;
    const centerX = -centerWidth / 2;
    const rightX = width / 2 - base.panels.rightWidth;
    const strokeColor = marker ? color : base.frame.color;

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
          x={leftX}
          y={-barHeight / 2}
          width={base.panels.leftWidth}
          height={barHeight}
          fill={base.panels.leftColor}
          opacity={0.94}
          cornerRadius={[radius, 0, 0, radius]}
          strokeEnabled={false}
        />
        <Rect
          x={centerX}
          y={-barHeight / 2}
          width={centerWidth}
          height={barHeight}
          fill={base.panels.topColor}
          opacity={0.9}
          strokeEnabled={false}
        />
        <Rect
          x={rightX}
          y={-barHeight / 2}
          width={base.panels.rightWidth}
          height={barHeight}
          fill={base.panels.rightColor}
          opacity={0.94}
          cornerRadius={[0, radius, radius, 0]}
          strokeEnabled={false}
        />
        <Rect
          width={width}
          height={barHeight}
          offsetX={width / 2}
          offsetY={barHeight / 2}
          fillEnabled={false}
          stroke={strokeColor}
          strokeWidth={marker ? 2 : 1}
          opacity={0.88}
          cornerRadius={radius}
        />
      </>
    );
  }

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
