"use client";

import type { ReactNode } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import { useTheme } from "@/hooks/useTheme";
import type { Shape } from "@/lib/types";
import { getShapeLocalBounds } from "../shape-bounds";
export { renderBarrier } from "./barrier";
export { renderCone } from "./cone";
export { renderDiveGate } from "./divegate";
export { renderFlag } from "./flag";
export { renderGate } from "./gate";
export { renderLabel } from "./label";
export { renderLadder } from "./ladder";
export { renderStartFinish } from "./startfinish";
export { renderTower } from "./tower";
import { renderBarrier } from "./barrier";
import { renderCone } from "./cone";
import { renderDiveGate } from "./divegate";
import { renderFlag } from "./flag";
import { renderGate } from "./gate";
import { renderLabel } from "./label";
import { renderLadder } from "./ladder";
import { renderStartFinish } from "./startfinish";
import { renderTower } from "./tower";

type Renderable2DShape = Exclude<Shape, { kind: "polyline" }>;
type Shape2DRendererMap = {
  [K in Renderable2DShape["kind"]]: (
    shape: Extract<Renderable2DShape, { kind: K }>,
    selected: boolean,
    ppm: number
  ) => ReactNode;
};

export function renderLockedIndicator(
  shape: Shape,
  selected: boolean,
  ppm: number
) {
  const bounds = getShapeLocalBounds(shape, ppm);
  if (!bounds) return null;

  const pad = 6;
  const x = bounds.x - pad;
  const y = bounds.y - pad;
  const width = bounds.width + pad * 2;
  const height = bounds.height + pad * 2;
  const corner = 8;
  const stroke = selected ? "#fbbf24" : "#f59e0b";
  const opacity = selected ? 0.95 : 0.65;

  return (
    <Group listening={false}>
      <Line
        points={[x, y + corner, x, y, x + corner, y]}
        stroke={stroke}
        strokeWidth={1.5}
        opacity={opacity}
        lineCap="round"
        lineJoin="round"
      />
      <Line
        points={[x + width - corner, y, x + width, y, x + width, y + corner]}
        stroke={stroke}
        strokeWidth={1.5}
        opacity={opacity}
        lineCap="round"
        lineJoin="round"
      />
      <Line
        points={[x, y + height - corner, x, y + height, x + corner, y + height]}
        stroke={stroke}
        strokeWidth={1.5}
        opacity={opacity}
        lineCap="round"
        lineJoin="round"
      />
      <Line
        points={[
          x + width - corner,
          y + height,
          x + width,
          y + height,
          x + width,
          y + height - corner,
        ]}
        stroke={stroke}
        strokeWidth={1.5}
        opacity={opacity}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
}

export function LockedPathSelectBadge({
  shape,
  ppm,
}: {
  shape: Shape;
  ppm: number;
}) {
  const isDark = useTheme() === "dark";

  if (shape.kind !== "polyline") return null;
  const bounds = getShapeLocalBounds(shape, ppm);
  if (!bounds) return null;

  const pad = 6;
  const width = 46;
  const height = 16;
  const x = bounds.x - pad;
  const y = bounds.y - pad - height - 5;

  return (
    <Group x={x} y={y}>
      <Rect
        width={width}
        height={height}
        fill={isDark ? "#451a03" : "#fffbeb"}
        stroke="#f59e0b"
        strokeWidth={1}
        cornerRadius={999}
        opacity={0.94}
      />
      <Text
        width={width}
        height={height}
        text="Locked"
        fill={isDark ? "#fde68a" : "#92400e"}
        fontSize={9}
        fontStyle="600"
        align="center"
        verticalAlign="middle"
      />
    </Group>
  );
}

export function renderHoverIndicator(shape: Shape, ppm: number) {
  const bounds = getShapeLocalBounds(shape, ppm);
  if (!bounds) return null;

  const pad = 8;
  return (
    <Rect
      x={bounds.x - pad}
      y={bounds.y - pad}
      width={bounds.width + pad * 2}
      height={bounds.height + pad * 2}
      stroke="#60a5fa"
      strokeWidth={1.25}
      dash={[5, 4]}
      opacity={0.88}
      cornerRadius={6}
      listening={false}
    />
  );
}

export const shape2DRenderers: Shape2DRendererMap = {
  barrier: renderBarrier,
  cone: renderCone,
  divegate: renderDiveGate,
  flag: renderFlag,
  gate: renderGate,
  label: (shape, selected) => renderLabel(shape, selected),
  ladder: renderLadder,
  startfinish: renderStartFinish,
  tower: renderTower,
};

export function renderShape2D(
  shape: Shape,
  selected: boolean,
  ppm: number
): ReactNode {
  if (shape.kind === "polyline") return null;
  const renderer = shape2DRenderers[shape.kind] as (
    shape: Renderable2DShape,
    selected: boolean,
    ppm: number
  ) => ReactNode;
  return renderer(shape, selected, ppm);
}
