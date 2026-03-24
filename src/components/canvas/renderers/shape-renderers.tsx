"use client";

import {
  Circle,
  Group,
  Line,
  Rect,
  Shape as KonvaShape,
  Text,
} from "react-konva";
import { m2px } from "@/lib/units";
import {
  getCone2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "@/lib/shape2d";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  Shape,
  StartFinishShape,
} from "@/lib/types";
import { getShapeLocalBounds } from "./shape-bounds";

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

export function renderGate(shape: GateShape, selected: boolean, ppm: number) {
  const { color, depth, radius, width } = getGate2DShape(shape, ppm);
  return (
    <>
      {selected && (
        <Rect
          width={width + m2px(0.3, ppm)}
          height={depth + m2px(0.3, ppm)}
          offsetX={(width + m2px(0.3, ppm)) / 2}
          offsetY={(depth + m2px(0.3, ppm)) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        fill={color}
        opacity={0.15}
        strokeEnabled={false}
      />
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        stroke={color}
        strokeWidth={2}
        cornerRadius={radius}
      />
    </>
  );
}

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

export function renderCone(shape: ConeShape, selected: boolean, ppm: number) {
  const { color, radius, selectionRadius } = getCone2DShape(shape, ppm);
  return (
    <>
      {selected && (
        <Circle
          radius={selectionRadius}
          stroke="#3b82f6"
          strokeWidth={1.3}
          opacity={0.9}
          dash={[5, 4]}
          listening={false}
        />
      )}
      <Circle
        radius={radius}
        fill={color}
        opacity={1}
        stroke={color}
        strokeWidth={2}
      />
    </>
  );
}

export function renderLabel(shape: LabelShape, selected: boolean) {
  const fontSize = shape.fontSize ?? 18;
  const color = shape.color ?? "#e2e8f0";
  const labelWidth = Math.max(shape.text.length * fontSize * 0.45, 48);
  return (
    <Group offsetY={-fontSize / 2}>
      {selected && (
        <Rect
          width={labelWidth + 12}
          height={fontSize + 12}
          y={-6}
          offsetX={(labelWidth + 12) / 2}
          stroke="#3b82f6"
          strokeWidth={1.2}
          dash={[6, 4]}
          listening={false}
        />
      )}
      <Text
        text={shape.text}
        fontSize={fontSize}
        fill={color}
        align="center"
        width={labelWidth}
        offsetX={labelWidth / 2}
      />
    </Group>
  );
}

export function renderStartFinish(
  shape: StartFinishShape,
  selected: boolean,
  ppm: number
) {
  const { color, padDepth, padWidth, pads, totalWidth } = getStartFinish2DShape(
    shape,
    ppm
  );
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
              strokeWidth={1.5}
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

export function renderLadder(
  shape: LadderShape,
  selected: boolean,
  ppm: number
) {
  const { color, depth, radius, width } = getLadder2DShape(shape, ppm);
  return (
    <>
      {selected && (
        <Rect
          width={width + m2px(0.3, ppm)}
          height={depth + m2px(0.3, ppm)}
          offsetX={(width + m2px(0.3, ppm)) / 2}
          offsetY={(depth + m2px(0.3, ppm)) / 2}
          stroke="#60a5fa"
          strokeWidth={1}
          opacity={0.85}
          cornerRadius={2}
          listening={false}
        />
      )}
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        fill={color}
        opacity={0.16}
        strokeEnabled={false}
      />
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        stroke={color}
        strokeWidth={2}
        cornerRadius={radius}
      />
    </>
  );
}

export function renderDiveGate(
  shape: DiveGateShape,
  selected: boolean,
  ppm: number
) {
  const { color, inset, postRadius, size, visibleDepth } = getDiveGate2DShape(
    shape,
    ppm
  );
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
