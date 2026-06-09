"use client";

import { Circle, Line, Rect, Shape as KonvaShape } from "react-konva";
import {
  getDiveGateArchPanelPath,
  getDiveGate2DShape,
} from "@/lib/track/shape2d";
import { m2px } from "@/lib/track/units";
import type { DiveGateShape } from "@/lib/types";

export function renderDiveGate(
  shape: DiveGateShape,
  selected: boolean,
  ppm: number
) {
  const diveGate = getDiveGate2DShape(shape, ppm);
  if (diveGate.variant === "arch" || diveGate.variant === "launch") {
    const {
      bounds,
      color,
      couplerPoints,
      couplerRadius,
      frameColor,
      frameTube,
      openingDepth,
      openingW,
      outerDepth,
      outerW,
      pipeSegments,
    } = diveGate;
    const panelOpacity = selected ? 0.95 : 0.88;
    const panelPath = getDiveGateArchPanelPath(diveGate);

    return (
      <>
        {selected && (
          <Rect
            x={bounds.x - m2px(0.15, ppm)}
            y={bounds.y - m2px(0.15, ppm)}
            width={bounds.width + m2px(0.3, ppm)}
            height={bounds.height + m2px(0.3, ppm)}
            stroke="#60a5fa"
            strokeWidth={1}
            opacity={0.85}
            cornerRadius={4}
            listening={false}
          />
        )}
        <KonvaShape
          fill={color}
          opacity={panelOpacity}
          sceneFunc={(context, shapeNode) => {
            const { opening, outer } = panelPath;

            context.beginPath();
            context.moveTo(outer.x + outer.radius, outer.y);
            context.lineTo(outer.x + outer.width - outer.radius, outer.y);
            context.quadraticCurveTo(
              outer.x + outer.width,
              outer.y,
              outer.x + outer.width,
              outer.y + outer.radius
            );
            context.lineTo(
              outer.x + outer.width,
              outer.y + outer.height - outer.radius
            );
            context.quadraticCurveTo(
              outer.x + outer.width,
              outer.y + outer.height,
              outer.x + outer.width - outer.radius,
              outer.y + outer.height
            );
            context.lineTo(outer.x + outer.radius, outer.y + outer.height);
            context.quadraticCurveTo(
              outer.x,
              outer.y + outer.height,
              outer.x,
              outer.y + outer.height - outer.radius
            );
            context.lineTo(outer.x, outer.y + outer.radius);
            context.quadraticCurveTo(
              outer.x,
              outer.y,
              outer.x + outer.radius,
              outer.y
            );
            context.closePath();

            context.moveTo(opening.x, opening.y);
            context.lineTo(opening.x, opening.y + opening.height);
            context.lineTo(
              opening.x + opening.width,
              opening.y + opening.height
            );
            context.lineTo(opening.x + opening.width, opening.y);
            context.closePath();

            context.fillShape(shapeNode);
          }}
        />
        <Rect
          width={outerW}
          height={outerDepth}
          offsetX={outerW / 2}
          offsetY={outerDepth / 2}
          stroke={frameColor}
          strokeWidth={Math.max(1, frameTube * 0.55)}
          fillEnabled={false}
          cornerRadius={3}
        />
        <Rect
          width={openingW}
          height={openingDepth}
          offsetX={openingW / 2}
          offsetY={openingDepth / 2}
          stroke={frameColor}
          strokeWidth={Math.max(1, frameTube * 0.35)}
          fillEnabled={false}
          cornerRadius={2}
        />
        {pipeSegments.map((segment, index) => (
          <Line
            key={`pipe-${index}`}
            points={[
              segment.start.x,
              segment.start.y,
              segment.end.x,
              segment.end.y,
            ]}
            stroke={frameColor}
            strokeWidth={Math.max(1, frameTube * 0.58)}
            lineCap="round"
            lineJoin="round"
            opacity={0.55}
          />
        ))}
        {couplerPoints.map((point, index) => (
          <Circle
            key={`coupler-${index}`}
            x={point.x}
            y={point.y}
            radius={couplerRadius}
            fill="#d6d9de"
            stroke={frameColor}
            strokeWidth={Math.max(1, frameTube * 0.22)}
          />
        ))}
      </>
    );
  }

  const { color, inset, postRadius, size, visibleDepth } = diveGate;
  return (
    <>
      {selected && (
        <Rect
          width={size + m2px(0.3, ppm)}
          height={visibleDepth + m2px(0.3, ppm)}
          offsetX={(size + m2px(0.3, ppm)) / 2}
          offsetY={(visibleDepth + m2px(0.3, ppm)) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={4}
          listening={false}
        />
      )}
      <Rect
        width={size}
        height={visibleDepth}
        offsetX={size / 2}
        offsetY={visibleDepth / 2}
        fill={color}
        opacity={0.03}
        strokeEnabled={false}
        cornerRadius={4}
      />
      <Rect
        width={size}
        height={visibleDepth}
        offsetX={size / 2}
        offsetY={visibleDepth / 2}
        stroke={selected ? "#fb923c" : color}
        strokeWidth={2}
        opacity={0.95}
        cornerRadius={4}
      />
      <Circle
        x={-size / 2 + inset}
        y={-visibleDepth / 2 + inset}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={size / 2 - inset}
        y={-visibleDepth / 2 + inset}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={-size / 2 + inset}
        y={visibleDepth / 2 - inset}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={size / 2 - inset}
        y={visibleDepth / 2 - inset}
        radius={postRadius}
        fill={color}
      />
    </>
  );
}
