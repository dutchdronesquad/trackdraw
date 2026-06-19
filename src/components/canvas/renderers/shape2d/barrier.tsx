"use client";

import { Line, Rect } from "react-konva";
import { getBarrier2DShape } from "@/lib/track/shape2d";
import { m2px } from "@/lib/track/units";
import type { BarrierShape } from "@/lib/types";

function mixHexColor(hex: string, targetHex: string, amount: number): string {
  const parse = (value: string) => {
    const normalized = value.replace("#", "");
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((char) => char + char)
            .join("")
        : normalized;
    const parsed = Number.parseInt(full, 16);
    if (Number.isNaN(parsed)) return { r: 0, g: 0, b: 0 };
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  };

  const source = parse(hex);
  const target = parse(targetHex);
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(source.r, target.r)}${channel(
    source.g,
    target.g
  )}${channel(source.b, target.b)}`;
}

function renderBarrierInner(
  variant: BarrierShape["variant"],
  width: number,
  depth: number,
  markColor: string,
  edgeColor: string
) {
  const hw = width / 2;
  const hh = depth / 2;

  if (variant === "banner") {
    const arrowCount = Math.max(3, Math.floor(width / 13));
    const spacing = width / (arrowCount + 1);
    const arm = hh * 0.62;
    const tip = spacing * 0.28;
    return Array.from({ length: arrowCount }, (_, i) => {
      const ax = -hw + spacing * (i + 1);
      return (
        <Line
          key={i}
          points={[ax - tip, -arm, ax + tip, 0, ax - tip, arm]}
          stroke={markColor}
          strokeWidth={1.35}
          opacity={0.78}
          lineJoin="round"
          listening={false}
        />
      );
    });
  }

  if (variant === "hurdle") {
    const stripeCount = Math.max(2, Math.floor(width / 12));
    const spacing = width / stripeCount;
    return Array.from({ length: stripeCount - 1 }, (_, i) => {
      const sx = -hw + spacing * (i + 1);
      return (
        <Line
          key={i}
          points={[sx - hh, -hh, sx + hh, hh]}
          stroke={markColor}
          strokeWidth={1}
          opacity={0.72}
          lineCap="round"
          listening={false}
        />
      );
    });
  }

  if (variant === "fence") {
    const postCount = Math.max(2, Math.floor(width / 14));
    const spacing = width / postCount;
    const posts = Array.from({ length: postCount - 1 }, (_, i) => {
      const px = -hw + spacing * (i + 1);
      return (
        <Line
          key={i}
          points={[px, -hh, px, hh]}
          stroke={edgeColor}
          strokeWidth={1}
          opacity={0.5}
          listening={false}
        />
      );
    });
    return [
      <Line
        key="rail-top"
        points={[-hw, -hh * 0.42, hw, -hh * 0.42]}
        stroke={markColor}
        strokeWidth={1}
        opacity={0.55}
        listening={false}
      />,
      <Line
        key="rail-bottom"
        points={[-hw, hh * 0.42, hw, hh * 0.42]}
        stroke={edgeColor}
        strokeWidth={1}
        opacity={0.42}
        listening={false}
      />,
      ...posts,
    ];
  }

  if (variant === "net") {
    const colCount = Math.max(2, Math.floor(width / 14));
    const colSpacing = width / colCount;
    const cols = Array.from({ length: colCount - 1 }, (_, i) => {
      const px = -hw + colSpacing * (i + 1);
      return (
        <Line
          key={`c${i}`}
          points={[px, -hh, px, hh]}
          stroke={markColor}
          strokeWidth={0.6}
          opacity={0.48}
          listening={false}
        />
      );
    });
    const diagCount = Math.max(2, Math.floor(width / 20));
    const diagSpacing = width / diagCount;
    const diagonals = Array.from({ length: diagCount }, (_, i) => {
      const x = -hw + diagSpacing * i;
      return (
        <Line
          key={`d${i}`}
          points={[x, hh, Math.min(hw, x + diagSpacing), -hh]}
          stroke={edgeColor}
          strokeWidth={0.55}
          opacity={0.3}
          listening={false}
        />
      );
    });
    const mid = (
      <Line
        key="h"
        points={[-hw, 0, hw, 0]}
        stroke={markColor}
        strokeWidth={0.7}
        opacity={0.48}
        listening={false}
      />
    );
    return [...cols, ...diagonals, mid];
  }

  return null;
}

export function renderBarrier(
  shape: BarrierShape,
  selected: boolean,
  ppm: number
) {
  const { color, depth, radius, width } = getBarrier2DShape(shape, ppm);
  const selectionPad = m2px(0.3, ppm);
  const edgeColor = mixHexColor(color, "#0f172a", 0.28);
  const shadowColor = mixHexColor(color, "#0f172a", 0.45);
  const highlightColor = mixHexColor(color, "#ffffff", 0.52);
  const markColor = mixHexColor(color, "#ffffff", 0.72);
  const endCapWidth = Math.min(Math.max(depth * 0.55, 3), width * 0.08);
  const highlightHeight = Math.max(1, depth * 0.22);

  return (
    <>
      {selected && (
        <Rect
          width={width + selectionPad}
          height={depth + selectionPad}
          offsetX={(width + selectionPad) / 2}
          offsetY={(depth + selectionPad) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Rect
        x={-width / 2 + 1}
        y={-depth / 2 + 1.5}
        width={width}
        height={depth}
        fill={shadowColor}
        opacity={0.16}
        cornerRadius={radius}
        strokeEnabled={false}
        listening={false}
      />
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        fill={color}
        opacity={0.9}
        cornerRadius={radius}
        stroke={edgeColor}
        strokeWidth={1}
      />
      <Rect
        x={-width / 2 + 1}
        y={-depth / 2 + 1}
        width={Math.max(0, width - 2)}
        height={highlightHeight}
        fill={highlightColor}
        opacity={0.34}
        cornerRadius={[Math.max(0, radius - 1), Math.max(0, radius - 1), 0, 0]}
        strokeEnabled={false}
        listening={false}
      />
      <Rect
        x={-width / 2}
        y={-depth / 2}
        width={endCapWidth}
        height={depth}
        fill={edgeColor}
        opacity={0.32}
        cornerRadius={[radius, 0, 0, radius]}
        strokeEnabled={false}
        listening={false}
      />
      <Rect
        x={width / 2 - endCapWidth}
        y={-depth / 2}
        width={endCapWidth}
        height={depth}
        fill={edgeColor}
        opacity={0.32}
        cornerRadius={[0, radius, radius, 0]}
        strokeEnabled={false}
        listening={false}
      />
      {renderBarrierInner(shape.variant, width, depth, markColor, edgeColor)}
    </>
  );
}
