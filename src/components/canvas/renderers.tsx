"use client";

import {
  Arrow,
  Circle,
  Group,
  Line,
  Rect,
  Shape as KonvaShape,
  Text,
} from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import { smoothPolyline } from "@/lib/geometry";
import { zToColor } from "@/lib/alt";
import { m2px, px2m } from "@/lib/units";
import { clamp, type RectLike } from "@/components/canvas/shared";
import type {
  CheckpointShape,
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  PolylinePoint,
  PolylineShape,
  Shape,
  StartFinishShape,
} from "@/lib/types";

interface FieldLayerContentProps {
  designField: {
    width: number;
    height: number;
    ppm: number;
  };
  effectiveSelectionFrame: RectLike | null;
  grid: React.JSX.Element[];
  heightPx: number;
  hoverCell: { x: number; y: number } | null;
  isDark: boolean;
  marqueeRect: RectLike | null;
  stepPx: number;
  widthPx: number;
}

export function FieldLayerContent({
  designField,
  effectiveSelectionFrame,
  grid,
  heightPx,
  hoverCell,
  isDark,
  marqueeRect,
  stepPx,
  widthPx,
}: FieldLayerContentProps) {
  return (
    <>
      {grid}
      <Rect
        x={0}
        y={0}
        width={widthPx}
        height={heightPx}
        fill={isDark ? "#0c1520" : "#ffffff"}
        opacity={isDark ? 0.4 : 0.28}
      />
      <Line
        points={[widthPx / 2, 0, widthPx / 2, heightPx]}
        stroke={isDark ? "#1c3048" : "#b8cce0"}
        strokeWidth={0.75}
        dash={[6, 8]}
        opacity={0.7}
        listening={false}
      />
      <Line
        points={[0, heightPx / 2, widthPx, heightPx / 2]}
        stroke={isDark ? "#1c3048" : "#b8cce0"}
        strokeWidth={0.75}
        dash={[6, 8]}
        opacity={0.7}
        listening={false}
      />
      <Rect
        x={-1.5}
        y={-1.5}
        width={widthPx + 3}
        height={heightPx + 3}
        stroke={isDark ? "#1a2d44" : "#8fa8c0"}
        strokeWidth={4}
        opacity={0.35}
        listening={false}
      />
      <Rect
        x={0}
        y={0}
        width={widthPx}
        height={heightPx}
        stroke={isDark ? "#2a4060" : "#6888a8"}
        strokeWidth={1}
        listening={false}
      />
      {(
        [
          [0, 0, 1, 1],
          [widthPx, 0, -1, 1],
          [0, heightPx, 1, -1],
          [widthPx, heightPx, -1, -1],
        ] as [number, number, number, number][]
      ).map(([cx, cy, sx, sy]) => (
        <Group key={`bracket-${cx}-${cy}`} listening={false}>
          <Line
            points={[cx, cy, cx + sx * 14, cy]}
            stroke={isDark ? "#3a5878" : "#5878a0"}
            strokeWidth={2}
            lineCap="square"
          />
          <Line
            points={[cx, cy, cx, cy + sy * 14]}
            stroke={isDark ? "#3a5878" : "#5878a0"}
            strokeWidth={2}
            lineCap="square"
          />
        </Group>
      ))}
      <Line
        points={[-7, 0, 7, 0]}
        stroke={isDark ? "#3a5878" : "#5878a0"}
        strokeWidth={1.5}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[0, -7, 0, 7]}
        stroke={isDark ? "#3a5878" : "#5878a0"}
        strokeWidth={1.5}
        lineCap="round"
        listening={false}
      />
      <Text
        x={6}
        y={6}
        text="0,0"
        fontSize={9}
        fill={isDark ? "#3a5878" : "#6888a8"}
        listening={false}
      />
      <Text
        x={widthPx - 6}
        y={heightPx - 14}
        text={`${designField.width}×${designField.height}m`}
        fontSize={9}
        fill={isDark ? "#3a5878" : "#6888a8"}
        align="right"
        listening={false}
      />
      {hoverCell && (
        <Rect
          x={hoverCell.x}
          y={hoverCell.y}
          width={stepPx}
          height={stepPx}
          fill={isDark ? "#2563eb16" : "#2563eb0e"}
          stroke={isDark ? "#3b82f628" : "#2563eb22"}
          strokeWidth={1}
        />
      )}
      {effectiveSelectionFrame && (
        <Rect
          x={effectiveSelectionFrame.x}
          y={effectiveSelectionFrame.y}
          width={effectiveSelectionFrame.width}
          height={effectiveSelectionFrame.height}
          stroke="#3b82f6"
          strokeWidth={1}
          dash={[5, 4]}
          listening={false}
        />
      )}
      {marqueeRect && (
        <Rect
          x={marqueeRect.x}
          y={marqueeRect.y}
          width={marqueeRect.width}
          height={marqueeRect.height}
          stroke="#3b82f6"
          strokeWidth={1}
          dash={[5, 4]}
          fill="#3b82f610"
          listening={false}
        />
      )}
    </>
  );
}

export function RotationGuideOverlay({
  isDark,
  onRotateStart,
  showAngleLabel = false,
  rotationGuide,
}: {
  isDark: boolean;
  onRotateStart: (event: KonvaEventObject<MouseEvent>) => void;
  showAngleLabel?: boolean;
  rotationGuide: {
    angleDeg: number;
    center: { x: number; y: number };
    label: string;
    radius: number;
  } | null;
}) {
  if (!rotationGuide) return null;

  const angleRad = (rotationGuide.angleDeg * Math.PI) / 180;
  const handleX =
    rotationGuide.center.x + Math.cos(angleRad) * rotationGuide.radius;
  const handleY =
    rotationGuide.center.y + Math.sin(angleRad) * rotationGuide.radius;
  const handleOuterX =
    rotationGuide.center.x + Math.cos(angleRad) * (rotationGuide.radius + 14);
  const handleOuterY =
    rotationGuide.center.y + Math.sin(angleRad) * (rotationGuide.radius + 14);
  const labelOffsetX = Math.cos(angleRad) * 32;
  const labelOffsetY = Math.sin(angleRad) * 32;

  return (
    <>
      <Circle
        x={rotationGuide.center.x}
        y={rotationGuide.center.y}
        radius={rotationGuide.radius}
        stroke="#60a5fa"
        strokeWidth={4}
        opacity={0.95}
        listening={false}
      />
      <Line
        points={[handleX, handleY, handleOuterX, handleOuterY]}
        stroke="#60a5fa"
        strokeWidth={2}
        opacity={0.85}
        listening={false}
      />
      <Circle
        x={handleOuterX}
        y={handleOuterY}
        radius={11}
        fill="#60a5fa"
        opacity={0.001}
        onMouseDown={onRotateStart}
      />
      <Circle
        x={handleOuterX}
        y={handleOuterY}
        radius={6}
        fill="#60a5fa"
        stroke={isDark ? "#08111b" : "#ffffff"}
        strokeWidth={2}
        opacity={0.98}
        onMouseDown={onRotateStart}
      />
      {showAngleLabel && (
        <Group x={handleOuterX + labelOffsetX} y={handleOuterY + labelOffsetY}>
          <Rect
            x={-24}
            y={-13}
            width={48}
            height={26}
            cornerRadius={13}
            fill="#020617"
            stroke="#60a5fa"
            strokeWidth={1.5}
            shadowColor="#000000"
            shadowBlur={10}
            shadowOpacity={0.18}
            shadowOffsetY={2}
            opacity={0.98}
            listening={false}
          />
          <Text
            text={rotationGuide.label}
            x={-24}
            y={-13}
            width={48}
            height={26}
            verticalAlign="middle"
            fontSize={12}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontStyle="bold"
            fill="#eff6ff"
            align="center"
            listening={false}
          />
        </Group>
      )}
    </>
  );
}

interface TrackShapeNodeProps {
  allowInteraction: boolean;
  designPpm: number;
  dragBound: (pos: Vector2d) => Vector2d;
  dragSnapRef: React.MutableRefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  heightPx: number;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isSelected: boolean;
  selection: string[];
  setSelection: (ids: string[]) => void;
  setVertexSel: (value: { shapeId: string; idx: number } | null) => void;
  shape: Shape;
  shapeRef: (node: KonvaGroup | null) => void;
  stepPx: number;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  widthPx: number;
  zmax: number;
  zmin: number;
}

export function TrackShapeNode({
  allowInteraction,
  designPpm,
  dragBound,
  dragSnapRef,
  effectiveVertexSel,
  heightPx,
  hoveredWaypoint,
  isSelected,
  selection,
  setSelection,
  setVertexSel,
  shape,
  shapeRef,
  stepPx,
  updateShape,
  widthPx,
  zmax,
  zmin,
}: TrackShapeNodeProps) {
  const selected = selection.includes(shape.id);

  const handleDragStart = (event: KonvaEventObject<DragEvent>) => {
    if (event.target !== event.currentTarget) return;
    dragSnapRef.current = !(
      event.evt.altKey ||
      event.evt.metaKey ||
      event.evt.shiftKey
    );
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    if (event.target !== event.currentTarget) return;
    const { x, y } = event.target.position();
    const pxX = dragSnapRef.current
      ? Math.round(x / stepPx) * stepPx
      : clamp(x, 0, widthPx);
    const pxY = dragSnapRef.current
      ? Math.round(y / stepPx) * stepPx
      : clamp(y, 0, heightPx);
    event.target.position({ x: pxX, y: pxY });
    updateShape(shape.id, { x: px2m(pxX, designPpm), y: px2m(pxY, designPpm) });
  };

  return (
    <Group
      key={shape.id}
      ref={shapeRef}
      x={m2px(shape.x, designPpm)}
      y={m2px(shape.y, designPpm)}
      rotation={shape.rotation}
      draggable={allowInteraction && !shape.locked}
      dragBoundFunc={dragBound}
      listening={allowInteraction}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        if (event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey) {
          const current = new Set(selection);
          if (current.has(shape.id)) current.delete(shape.id);
          else current.add(shape.id);
          setSelection(Array.from(current));
        } else {
          setSelection([shape.id]);
        }
      }}
      onTap={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        setSelection([shape.id]);
      }}
    >
      {shape.kind === "gate" && renderGate(shape, selected, designPpm)}
      {shape.kind === "flag" && renderFlag(shape, selected, designPpm)}
      {shape.kind === "cone" && renderCone(shape, selected, designPpm)}
      {shape.kind === "label" && renderLabel(shape, selected)}
      {shape.kind === "startfinish" &&
        renderStartFinish(shape, selected, designPpm)}
      {shape.kind === "checkpoint" &&
        renderCheckpoint(shape, selected, designPpm)}
      {shape.kind === "ladder" && renderLadder(shape, selected, designPpm)}
      {shape.kind === "divegate" && renderDiveGate(shape, selected, designPpm)}
      {shape.kind === "polyline" && (
        <PolylineShapeContent
          allowInteraction={allowInteraction}
          designPpm={designPpm}
          dragBound={dragBound}
          dragSnapRef={dragSnapRef}
          effectiveVertexSel={effectiveVertexSel}
          heightPx={heightPx}
          hoveredWaypoint={hoveredWaypoint}
          isSelected={isSelected}
          path={shape}
          setSelection={setSelection}
          setVertexSel={setVertexSel}
          stepPx={stepPx}
          updateShape={updateShape}
          widthPx={widthPx}
          zmax={zmax}
          zmin={zmin}
        />
      )}
    </Group>
  );
}

function renderGate(shape: GateShape, selected: boolean, ppm: number) {
  const width = m2px(shape.width, ppm);
  const depth = m2px(shape.thick ?? 0.2, ppm);
  const color = shape.color ?? "#3b82f6";
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
        cornerRadius={Math.min(12, depth / 2)}
      />
    </>
  );
}

function renderFlag(shape: FlagShape, selected: boolean, ppm: number) {
  const radius = m2px(shape.radius, ppm);
  const poleVisible = Math.min(
    m2px(shape.poleHeight ?? 3.5, ppm),
    m2px(1, ppm)
  );
  const color = shape.color ?? "#a855f7";
  const flagWidth = poleVisible * 0.42;
  const flagHeight = poleVisible * 0.3;
  return (
    <>
      {selected && (
        <Circle
          radius={radius + m2px(0.18, ppm)}
          stroke="#3b82f6"
          strokeWidth={1.4}
          dash={[6, 4]}
          listening={false}
        />
      )}
      <Line
        points={[0, 0, 0, -poleVisible]}
        stroke={color}
        strokeWidth={2}
        lineCap="round"
      />
      <KonvaShape
        sceneFunc={(ctx, shapeNode) => {
          ctx.beginPath();
          ctx.moveTo(0, -poleVisible);
          ctx.bezierCurveTo(
            flagWidth,
            -poleVisible,
            flagWidth * 1.1,
            -poleVisible + flagHeight * 0.5,
            flagWidth * 0.8,
            -poleVisible + flagHeight
          );
          ctx.bezierCurveTo(
            flagWidth * 0.5,
            -poleVisible + flagHeight * 1.4,
            0.06,
            -poleVisible + flagHeight * 1.5,
            0,
            -poleVisible + flagHeight * 1.5
          );
          ctx.closePath();
          ctx.fillStrokeShape(shapeNode);
        }}
        fill={color}
        opacity={0.8}
      />
      <Circle radius={Math.max(3, m2px(0.06, ppm))} fill={color} />
    </>
  );
}

function renderCone(shape: ConeShape, selected: boolean, ppm: number) {
  const radius = m2px(shape.radius, ppm);
  const color = shape.color ?? "#f97316";
  return (
    <>
      {selected && (
        <Circle
          radius={radius + m2px(0.12, ppm)}
          stroke="#3b82f6"
          strokeWidth={1.3}
          dash={[5, 4]}
          listening={false}
        />
      )}
      <Circle
        radius={radius}
        fill={color}
        opacity={0.2}
        stroke={color}
        strokeWidth={2}
      />
    </>
  );
}

function renderLabel(shape: LabelShape, selected: boolean) {
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

function renderStartFinish(
  shape: StartFinishShape,
  selected: boolean,
  ppm: number
) {
  const totalWidth = m2px(shape.width ?? 3, ppm);
  const color = shape.color ?? "#f59e0b";
  const spacing = totalWidth / 4;
  const padWidth = spacing * 0.78;
  const padDepth = padWidth * 1.2;
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
      {Array.from({ length: 4 }).map((_, index) => {
        const x = -totalWidth / 2 + spacing * index + spacing / 2;
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

function renderCheckpoint(
  shape: CheckpointShape,
  selected: boolean,
  ppm: number
) {
  const width = m2px(shape.width ?? 2.5, ppm);
  const depth = m2px(0.15, ppm);
  const color = shape.color ?? "#22c55e";
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
        opacity={0.18}
        stroke={color}
        strokeWidth={1.8}
        dash={[8, 5]}
        cornerRadius={2}
      />
      <Line
        points={[-width / 2, 0, width / 2, 0]}
        stroke={color}
        strokeWidth={2}
        dash={[6, 4]}
        opacity={0.8}
        listening={false}
      />
    </>
  );
}

function renderLadder(shape: LadderShape, selected: boolean, ppm: number) {
  const width = m2px(shape.width ?? 1.5, ppm);
  const depth = m2px(0.08, ppm);
  const color = shape.color ?? "#f97316";
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
        opacity={0.25}
        strokeEnabled={false}
      />
      <Rect
        width={width}
        height={depth}
        offsetX={width / 2}
        offsetY={depth / 2}
        stroke={color}
        strokeWidth={2}
        cornerRadius={Math.min(12, depth / 2)}
      />
    </>
  );
}

function renderDiveGate(shape: DiveGateShape, selected: boolean, ppm: number) {
  const size = m2px(shape.size ?? 2.8, ppm);
  const thick = m2px(shape.thick ?? 0.2, ppm);
  const tilt = shape.tilt ?? 0;
  const visibleDepth = Math.max(
    thick * 2 + 4,
    size * Math.cos((tilt * Math.PI) / 180)
  );
  const color = shape.color ?? "#f97316";
  const postRadius = Math.max(3, thick * 0.5);
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
          cornerRadius={2}
          listening={false}
        />
      )}
      <Rect
        width={size}
        height={visibleDepth}
        offsetX={size / 2}
        offsetY={visibleDepth / 2}
        stroke={color}
        strokeWidth={2.5}
        fill={color}
        opacity={0.1}
        cornerRadius={4}
      />
      <Rect
        width={size - thick * 2}
        height={Math.max(4, visibleDepth - thick * 2)}
        offsetX={(size - thick * 2) / 2}
        offsetY={Math.max(4, visibleDepth - thick * 2) / 2}
        stroke={color}
        strokeWidth={1}
        opacity={0.5}
        cornerRadius={2}
      />
      <Circle
        x={-size / 2}
        y={-visibleDepth / 2}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={size / 2}
        y={-visibleDepth / 2}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={-size / 2}
        y={visibleDepth / 2}
        radius={postRadius}
        fill={color}
      />
      <Circle
        x={size / 2}
        y={visibleDepth / 2}
        radius={postRadius}
        fill={color}
      />
    </>
  );
}

interface PolylineShapeContentProps {
  allowInteraction: boolean;
  designPpm: number;
  dragBound: (pos: Vector2d) => Vector2d;
  dragSnapRef: React.MutableRefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  heightPx: number;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isSelected: boolean;
  path: PolylineShape;
  setSelection: (ids: string[]) => void;
  setVertexSel: (value: { shapeId: string; idx: number } | null) => void;
  stepPx: number;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  widthPx: number;
  zmax: number;
  zmin: number;
}

function PolylineShapeContent({
  allowInteraction,
  designPpm,
  dragBound,
  dragSnapRef,
  effectiveVertexSel,
  heightPx,
  hoveredWaypoint,
  isSelected,
  path,
  setSelection,
  setVertexSel,
  stepPx,
  updateShape,
  widthPx,
  zmax,
  zmin,
}: PolylineShapeContentProps) {
  const pointsPx = path.points.flatMap((point) => [
    m2px(point.x, designPpm),
    m2px(point.y, designPpm),
  ]);
  const strokePx = m2px(path.strokeWidth ?? 0.18, designPpm);
  const smoothPoints =
    (path.smooth ?? true) ? smoothPolyline(path.points) : path.points;
  const smoothPx = smoothPoints.flatMap((point) => [
    m2px(point.x, designPpm),
    m2px(point.y, designPpm),
  ]);
  const color = path.color ?? "#3b82f6";

  if (!pointsPx.length) return null;

  return (
    <>
      {isSelected && (
        <Line
          points={pointsPx}
          stroke="#3b82f6"
          strokeWidth={strokePx + 4}
          lineCap="round"
          opacity={0.3}
          listening={false}
        />
      )}
      <Group listening={false}>
        {path.points.map((point, index) => {
          const pct =
            path.points.length > 1 ? index / (path.points.length - 1) : 0;
          const zColor = zToColor(point.z ?? 0, zmin, zmax);
          const segment = smoothPx.slice(index * 2, index * 2 + 4);
          if (segment.length < 4) return null;
          const segmentColor = path.color ? color : zColor;
          return (
            <Line
              key={`${path.id}-seg-${index}`}
              points={segment}
              stroke={segmentColor}
              strokeWidth={strokePx}
              lineCap="round"
              lineJoin="round"
              opacity={Math.max(0.4, 1 - pct * 0.15)}
            />
          );
        })}
        {path.showArrows && path.points.length >= 2 && (
          <Arrow
            points={smoothPx}
            stroke={color}
            fill={color}
            strokeWidth={strokePx}
            pointerLength={Math.max(10, strokePx * 3)}
            pointerWidth={Math.max(8, strokePx * 2)}
            lineCap="round"
            lineJoin="round"
            pointerAtEnding
            pointerAtBeginning
          />
        )}
      </Group>
      {allowInteraction &&
        path.points.map((point, index) => {
          const x = m2px(point.x, designPpm);
          const y = m2px(point.y, designPpm);
          const radius = Math.max(4, m2px(0.08, designPpm));
          const active =
            effectiveVertexSel &&
            effectiveVertexSel.shapeId === path.id &&
            effectiveVertexSel.idx === index;
          const hovered =
            hoveredWaypoint?.shapeId === path.id &&
            hoveredWaypoint.idx === index;

          return (
            <Circle
              key={`${path.id}-vh-${index}`}
              x={x}
              y={y}
              radius={hovered ? radius * 1.6 : radius}
              fill={active ? "#3b82f6" : hovered ? "#f59e0b" : "#1e293b"}
              stroke={active ? "#ffffff" : hovered ? "#ffffff" : "#3b82f6"}
              strokeWidth={hovered ? 2.5 : 2}
              draggable
              dragBoundFunc={dragBound}
              onDragStart={(event) => {
                event.cancelBubble = true;
                dragSnapRef.current = !(
                  event.evt.altKey ||
                  event.evt.metaKey ||
                  event.evt.shiftKey
                );
              }}
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const pxX = dragSnapRef.current
                  ? Math.round(event.target.x() / stepPx) * stepPx
                  : clamp(event.target.x(), 0, widthPx);
                const pxY = dragSnapRef.current
                  ? Math.round(event.target.y() / stepPx) * stepPx
                  : clamp(event.target.y(), 0, heightPx);
                event.target.position({ x: pxX, y: pxY });
                const points: PolylinePoint[] = path.points.map(
                  (candidate, candidateIndex) =>
                    candidateIndex === index
                      ? {
                          ...candidate,
                          x: px2m(pxX, designPpm),
                          y: px2m(pxY, designPpm),
                        }
                      : candidate
                );
                updateShape(path.id, { points });
              }}
              onMouseDown={(event) => {
                event.cancelBubble = true;
                setSelection([path.id]);
                setVertexSel({ shapeId: path.id, idx: index });
              }}
            />
          );
        })}
    </>
  );
}
