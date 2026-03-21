"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
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
import {
  getPolyline2DDerived,
  getPolylineBounds,
  getPolylineSmoothPointsPx,
} from "@/lib/polyline-derived";
import { zToColor } from "@/lib/alt";
import { m2px, px2m } from "@/lib/units";
import {
  getCone2DShape,
  getDiveGate2DShape,
  getFlag2DShape,
  getGate2DShape,
  getLadder2DShape,
  getStartFinish2DShape,
} from "@/lib/shape2d";
import { type RectLike } from "@/components/canvas/shared";
import type {
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
  onRotateStart: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
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
        onMouseEnter={(event) => {
          const container = event.target.getStage()?.container();
          if (container) container.style.cursor = "grab";
        }}
        onMouseLeave={(event) => {
          const container = event.target.getStage()?.container();
          if (container) container.style.cursor = "";
        }}
        onMouseDown={(event) => {
          const container = event.target.getStage()?.container();
          if (container) container.style.cursor = "grabbing";
          onRotateStart(event);
        }}
        onTouchStart={onRotateStart}
      />
      <Circle
        x={handleOuterX}
        y={handleOuterY}
        radius={6}
        fill="#60a5fa"
        opacity={0.95}
        listening={false}
      />
      <Circle
        x={handleOuterX}
        y={handleOuterY}
        radius={4}
        fill="#ffffff"
        opacity={0.95}
        listening={false}
      />
      {showAngleLabel && (
        <Group listening={false}>
          <Rect
            x={handleOuterX + labelOffsetX - 22}
            y={handleOuterY + labelOffsetY - 10}
            width={44}
            height={20}
            cornerRadius={999}
            fill={isDark ? "#08111d" : "#eff6ff"}
            stroke="#60a5fa"
            strokeWidth={1}
            opacity={0.96}
          />
          <Text
            x={handleOuterX + labelOffsetX - 22}
            y={handleOuterY + labelOffsetY - 10}
            width={44}
            height={20}
            align="center"
            verticalAlign="middle"
            text={rotationGuide.label}
            fontSize={9}
            fontStyle="bold"
            fill="#60a5fa"
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
  dragSnapRef: React.RefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isHovered: boolean;
  isMobile: boolean;
  mobileMultiSelectEnabled?: boolean;
  isSelected: boolean;
  selectionCount: number;
  groupDragOffsetPx?: { x: number; y: number } | null;
  onMobileMultiSelectStart?: (shapeId: string) => void;
  onSelectOnly: (shapeId: string) => void;
  onToggleSelection: (shapeId: string) => void;
  onShapeContextMenu?: (shape: Shape) => void;
  setSelection: (ids: string[]) => void;
  setDragSnapPreview: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  setVertexSel: (value: { shapeId: string; idx: number } | null) => void;
  shape: Shape;
  shapeRef: (node: KonvaGroup | null) => void;
  resolveShapeDragPosition: (pos: Vector2d, snapEnabled: boolean) => Vector2d;
  waypointDragBound: (pos: Vector2d) => Vector2d;
  resolveWaypointDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean
  ) => Vector2d;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  zmax: number;
  zmin: number;
}

function TrackShapeNodeComponent({
  allowInteraction,
  designPpm,
  dragBound,
  dragSnapRef,
  effectiveVertexSel,
  hoveredWaypoint,
  isHovered,
  isMobile,
  mobileMultiSelectEnabled = false,
  isSelected,
  selectionCount,
  groupDragOffsetPx,
  onMobileMultiSelectStart,
  onSelectOnly,
  onToggleSelection,
  onShapeContextMenu,
  setSelection,
  setDragSnapPreview,
  setVertexSel,
  shape,
  shapeRef,
  resolveShapeDragPosition,
  waypointDragBound,
  resolveWaypointDragPosition,
  setPolylinePoints,
  updateShape,
  zmax,
  zmin,
}: TrackShapeNodeProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const dragTriggeredRef = useRef(false);
  const selected = isSelected;
  const highlighted = isSelected || isHovered;
  const touchBounds =
    isMobile && shape.kind !== "polyline"
      ? getShapeLocalBounds(shape, designPpm)
      : null;
  const touchTargetRect = touchBounds
    ? {
        x: touchBounds.x - Math.max(0, 42 - touchBounds.width) / 2,
        y: touchBounds.y - Math.max(0, 42 - touchBounds.height) / 2,
        width: Math.max(touchBounds.width, 42),
        height: Math.max(touchBounds.height, 42),
      }
    : null;

  const handleDragStart = (event: KonvaEventObject<DragEvent>) => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    dragTriggeredRef.current = false;
    dragSnapRef.current = !(
      event.evt.altKey ||
      event.evt.metaKey ||
      event.evt.shiftKey
    );
    setDragSnapPreview(null);
  };

  const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
    dragTriggeredRef.current = true;
    const current = event.currentTarget.position();
    const resolved = resolveShapeDragPosition(current, dragSnapRef.current);
    const isSnapping =
      Math.abs(current.x - resolved.x) > 0.5 ||
      Math.abs(current.y - resolved.y) > 0.5;
    setDragSnapPreview(isSnapping ? resolved : null);
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    const resolved = resolveShapeDragPosition(
      event.currentTarget.position(),
      dragSnapRef.current
    );
    setDragSnapPreview(null);
    if (shape.kind === "polyline") {
      const dx = px2m(resolved.x, designPpm);
      const dy = px2m(resolved.y, designPpm);
      event.currentTarget.position({ x: 0, y: 0 });
      setPolylinePoints(
        shape.id,
        shape.points.map((point) => ({
          ...point,
          x: point.x + dx,
          y: point.y + dy,
        }))
      );
      return;
    }

    event.currentTarget.position(resolved);
    updateShape(shape.id, {
      x: px2m(resolved.x, designPpm),
      y: px2m(resolved.y, designPpm),
    });
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => clearLongPress, []);

  return (
    <Group
      key={shape.id}
      ref={shapeRef}
      x={
        m2px(shape.kind === "polyline" ? 0 : shape.x, designPpm) +
        (groupDragOffsetPx?.x ?? 0)
      }
      y={
        m2px(shape.kind === "polyline" ? 0 : shape.y, designPpm) +
        (groupDragOffsetPx?.y ?? 0)
      }
      rotation={shape.rotation}
      draggable={
        allowInteraction &&
        !shape.locked &&
        !(selected && selectionCount > 1) &&
        (!isMobile ||
          !mobileMultiSelectEnabled ||
          (mobileMultiSelectEnabled && selected))
      }
      dragBoundFunc={dragBound}
      listening={allowInteraction}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseDown={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        if (isMobile && mobileMultiSelectEnabled) return;
        if (event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey) {
          onToggleSelection(shape.id);
        } else if (selected && selectionCount > 1) {
          // Preserve an existing multiselect when starting a drag from within it.
          return;
        } else {
          onSelectOnly(shape.id);
        }
      }}
      onTap={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        if (dragTriggeredRef.current) {
          dragTriggeredRef.current = false;
          return;
        }
        if (isMobile && mobileMultiSelectEnabled) {
          onToggleSelection(shape.id);
          return;
        }
        onSelectOnly(shape.id);
      }}
      onTouchStart={() => {
        if (
          !allowInteraction ||
          !isMobile ||
          mobileMultiSelectEnabled ||
          !onMobileMultiSelectStart
        ) {
          return;
        }
        clearLongPress();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          onMobileMultiSelectStart(shape.id);
          clearLongPress();
        }, 320);
      }}
      onTouchMove={() => {
        clearLongPress();
      }}
      onTouchEnd={() => {
        clearLongPress();
      }}
      onContextMenu={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        onShapeContextMenu?.(shape);
      }}
    >
      <Group opacity={shape.locked ? (highlighted ? 0.78 : 0.58) : 1}>
        {isHovered && !selected && renderHoverIndicator(shape, designPpm)}
        {touchTargetRect && (
          <Rect
            x={touchTargetRect.x}
            y={touchTargetRect.y}
            width={touchTargetRect.width}
            height={touchTargetRect.height}
            fill="#000000"
            opacity={0.001}
          />
        )}
        {shape.kind === "gate" && renderGate(shape, highlighted, designPpm)}
        {shape.kind === "flag" && renderFlag(shape, highlighted, designPpm)}
        {shape.kind === "cone" && renderCone(shape, highlighted, designPpm)}
        {shape.kind === "label" && renderLabel(shape, highlighted)}
        {shape.kind === "startfinish" &&
          renderStartFinish(shape, highlighted, designPpm)}
        {shape.kind === "ladder" && renderLadder(shape, highlighted, designPpm)}
        {shape.kind === "divegate" &&
          renderDiveGate(shape, highlighted, designPpm)}
        {shape.kind === "polyline" && (
          <PolylineShapeContent
            allowInteraction={allowInteraction}
            designPpm={designPpm}
            dragBound={waypointDragBound}
            dragSnapRef={dragSnapRef}
            effectiveVertexSel={effectiveVertexSel}
            hoveredWaypoint={hoveredWaypoint}
            isMobile={isMobile}
            isSelected={highlighted}
            path={shape}
            resolveWaypointDragPosition={resolveWaypointDragPosition}
            setSelection={setSelection}
            setDragSnapPreview={setDragSnapPreview}
            setVertexSel={setVertexSel}
            setPolylinePoints={setPolylinePoints}
            zmax={zmax}
            zmin={zmin}
          />
        )}
      </Group>
      {shape.locked && renderLockedIndicator(shape, highlighted, designPpm)}
    </Group>
  );
}

function sameOffset(
  a: { x: number; y: number } | null | undefined,
  b: { x: number; y: number } | null | undefined
) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

export const TrackShapeNode = memo(TrackShapeNodeComponent, (prev, next) => {
  const prevVertexActive =
    prev.effectiveVertexSel?.shapeId === prev.shape.id
      ? prev.effectiveVertexSel.idx
      : null;
  const nextVertexActive =
    next.effectiveVertexSel?.shapeId === next.shape.id
      ? next.effectiveVertexSel.idx
      : null;
  const prevHoveredWaypoint =
    prev.hoveredWaypoint?.shapeId === prev.shape.id
      ? prev.hoveredWaypoint.idx
      : null;
  const nextHoveredWaypoint =
    next.hoveredWaypoint?.shapeId === next.shape.id
      ? next.hoveredWaypoint.idx
      : null;

  return (
    prev.allowInteraction === next.allowInteraction &&
    prev.designPpm === next.designPpm &&
    prev.isMobile === next.isMobile &&
    prev.isHovered === next.isHovered &&
    prev.mobileMultiSelectEnabled === next.mobileMultiSelectEnabled &&
    prev.isSelected === next.isSelected &&
    prev.selectionCount === next.selectionCount &&
    prev.shape === next.shape &&
    prev.zmin === next.zmin &&
    prev.zmax === next.zmax &&
    prevVertexActive === nextVertexActive &&
    prevHoveredWaypoint === nextHoveredWaypoint &&
    sameOffset(prev.groupDragOffsetPx, next.groupDragOffsetPx)
  );
});

function renderLockedIndicator(shape: Shape, selected: boolean, ppm: number) {
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

function renderHoverIndicator(shape: Shape, ppm: number) {
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

export function getShapeLocalBounds(shape: Shape, ppm: number) {
  switch (shape.kind) {
    case "gate": {
      const { width, depth } = getGate2DShape(shape, ppm);
      return {
        x: -width / 2,
        y: -depth / 2,
        width,
        height: depth,
      };
    }
    case "flag": {
      return getFlag2DShape(shape, ppm).bounds;
    }
    case "cone": {
      return getCone2DShape(shape, ppm).bounds;
    }
    case "label": {
      const fontSize = shape.fontSize ?? 18;
      const labelWidth = Math.max(shape.text.length * fontSize * 0.45, 48);
      return {
        x: -labelWidth / 2,
        y: -fontSize,
        width: labelWidth,
        height: fontSize + 8,
      };
    }
    case "startfinish": {
      const { totalWidth, padDepth } = getStartFinish2DShape(shape, ppm);
      return {
        x: -totalWidth / 2,
        y: -padDepth / 2,
        width: totalWidth,
        height: padDepth,
      };
    }
    case "ladder": {
      const { width, depth } = getLadder2DShape(shape, ppm);
      return {
        x: -width / 2,
        y: -depth / 2,
        width,
        height: depth,
      };
    }
    case "divegate": {
      const { size, visibleDepth } = getDiveGate2DShape(shape, ppm);
      return {
        x: -size / 2,
        y: -visibleDepth / 2,
        width: size,
        height: visibleDepth,
      };
    }
    case "polyline": {
      return getPolylineBounds(shape, ppm);
    }
  }
}

function renderGate(shape: GateShape, selected: boolean, ppm: number) {
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

function renderFlag(shape: FlagShape, selected: boolean, ppm: number) {
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

function renderCone(shape: ConeShape, selected: boolean, ppm: number) {
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

function renderLadder(shape: LadderShape, selected: boolean, ppm: number) {
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

function renderDiveGate(shape: DiveGateShape, selected: boolean, ppm: number) {
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

interface PolylineShapeContentProps {
  allowInteraction: boolean;
  designPpm: number;
  dragBound: (pos: Vector2d) => Vector2d;
  dragSnapRef: React.RefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isMobile: boolean;
  isSelected: boolean;
  path: PolylineShape;
  resolveWaypointDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean
  ) => Vector2d;
  setSelection: (ids: string[]) => void;
  setDragSnapPreview: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  setVertexSel: (value: { shapeId: string; idx: number } | null) => void;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  zmax: number;
  zmin: number;
}

function PolylineShapeContent({
  allowInteraction,
  designPpm,
  dragBound,
  dragSnapRef,
  effectiveVertexSel,
  hoveredWaypoint,
  isMobile,
  isSelected,
  path,
  resolveWaypointDragPosition,
  setSelection,
  setDragSnapPreview,
  setVertexSel,
  setPolylinePoints,
  zmax,
  zmin,
}: PolylineShapeContentProps) {
  const [previewPoints, setPreviewPoints] = useState<PolylinePoint[] | null>(
    null
  );
  const displayPath = useMemo(
    () =>
      previewPoints
        ? {
            ...path,
            points: previewPoints,
          }
        : path,
    [path, previewPoints]
  );
  const strokePx = m2px(displayPath.strokeWidth ?? 0.26, designPpm);
  const selectionStrokePx = isMobile
    ? Math.max(22, strokePx + 18)
    : Math.max(14, strokePx + 10);
  const polylineMetrics = useMemo(
    () => getPolyline2DDerived(displayPath),
    [displayPath]
  );
  const pointsPxMemo = useMemo(() => {
    const basePoints =
      displayPath.closed && displayPath.points.length > 1
        ? [...displayPath.points, displayPath.points[0]]
        : displayPath.points;

    return basePoints.flatMap((point) => [
      m2px(point.x, designPpm),
      m2px(point.y, designPpm),
    ]);
  }, [designPpm, displayPath.closed, displayPath.points]);
  const smoothPx = useMemo(
    () => getPolylineSmoothPointsPx(displayPath, designPpm),
    [designPpm, displayPath]
  );
  const arrowMarkers = polylineMetrics.arrowMarkers;
  const color = displayPath.color ?? "#3b82f6";
  const waypointRadius = Math.max(4, m2px(0.08, designPpm));
  const waypointTouchRadius = isMobile
    ? Math.max(14, waypointRadius * 2.75)
    : waypointRadius;

  const handlePathSelect = (
    event: KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    event.cancelBubble = true;
    setSelection([path.id]);
    setVertexSel(null);
  };

  if (!pointsPxMemo.length) return null;

  return (
    <>
      {allowInteraction && (
        <Line
          points={smoothPx.length >= 4 ? smoothPx : pointsPxMemo}
          stroke="#000000"
          strokeWidth={selectionStrokePx}
          opacity={0.001}
          lineCap="round"
          lineJoin="round"
          onMouseDown={handlePathSelect}
          onTap={handlePathSelect}
        />
      )}
      {isSelected && (
        <Line
          points={smoothPx.length >= 4 ? smoothPx : pointsPxMemo}
          stroke="#3b82f6"
          strokeWidth={strokePx + 4}
          lineCap="round"
          lineJoin="round"
          opacity={0.3}
          listening={false}
        />
      )}
      <Group listening={false}>
        <Line
          points={smoothPx.length >= 4 ? smoothPx : pointsPxMemo}
          stroke={
            path.color ? color : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax)
          }
          strokeWidth={strokePx}
          lineCap="round"
          lineJoin="round"
          opacity={0.92}
        />
        {arrowMarkers.map((marker, index) => {
          const arrowLength = Math.max(12, strokePx * 7);
          const tailLength = arrowLength * 0.55;
          const x = m2px(marker.x, designPpm);
          const y = m2px(marker.y, designPpm);
          const dx = Math.cos(marker.angle);
          const dy = Math.sin(marker.angle);

          return (
            <Arrow
              key={`${path.id}-flow-${index}`}
              points={[
                x - dx * tailLength * 0.5,
                y - dy * tailLength * 0.5,
                x + dx * tailLength,
                y + dy * tailLength,
              ]}
              stroke={color}
              fill={color}
              strokeWidth={Math.max(1.2, strokePx * 0.9)}
              pointerLength={Math.max(8, strokePx * 2.8)}
              pointerWidth={Math.max(7, strokePx * 2.2)}
              opacity={0.82}
              lineCap="round"
              lineJoin="round"
              pointerAtEnding
            />
          );
        })}
      </Group>
      {allowInteraction &&
        !path.locked &&
        path.points.map((point, index) => {
          const x = m2px(point.x, designPpm);
          const y = m2px(point.y, designPpm);
          const active =
            effectiveVertexSel &&
            effectiveVertexSel.shapeId === path.id &&
            effectiveVertexSel.idx === index;
          const hovered =
            hoveredWaypoint?.shapeId === path.id &&
            hoveredWaypoint.idx === index;

          const handleDragStart = (event: KonvaEventObject<DragEvent>) => {
            event.cancelBubble = true;
            dragSnapRef.current = !(
              event.evt.altKey ||
              event.evt.metaKey ||
              event.evt.shiftKey
            );
            setDragSnapPreview(null);
          };

          const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
            event.cancelBubble = true;
            const current = event.target.position();
            const resolved = resolveWaypointDragPosition(
              current,
              dragSnapRef.current
            );
            const isSnapping =
              Math.abs(current.x - resolved.x) > 0.5 ||
              Math.abs(current.y - resolved.y) > 0.5;
            setDragSnapPreview(isSnapping ? resolved : null);
            setPreviewPoints(
              path.points.map((candidate, candidateIndex) =>
                candidateIndex === index
                  ? {
                      ...candidate,
                      x: px2m(resolved.x, designPpm),
                      y: px2m(resolved.y, designPpm),
                    }
                  : candidate
              )
            );
          };

          const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
            event.cancelBubble = true;
            const resolved = resolveWaypointDragPosition(
              event.target.position(),
              dragSnapRef.current
            );
            setDragSnapPreview(null);
            event.target.position(resolved);
            const points: PolylinePoint[] = path.points.map(
              (candidate, candidateIndex) =>
                candidateIndex === index
                  ? {
                      ...candidate,
                      x: px2m(resolved.x, designPpm),
                      y: px2m(resolved.y, designPpm),
                    }
                  : candidate
            );
            setPreviewPoints(null);
            setPolylinePoints(path.id, points);
          };

          const handlePointerDown = (
            event: KonvaEventObject<MouseEvent | TouchEvent>
          ) => {
            event.cancelBubble = true;
            setSelection([path.id]);
            setVertexSel({ shapeId: path.id, idx: index });
          };

          return (
            <Group
              key={`${path.id}-vh-${index}`}
              x={isMobile ? x : 0}
              y={isMobile ? y : 0}
              draggable={isMobile}
              dragBoundFunc={isMobile ? dragBound : undefined}
              onDragStart={isMobile ? handleDragStart : undefined}
              onDragMove={isMobile ? handleDragMove : undefined}
              onDragEnd={isMobile ? handleDragEnd : undefined}
              onMouseDown={handlePointerDown}
              onTap={handlePointerDown}
            >
              {isMobile && (
                <Circle
                  x={0}
                  y={0}
                  radius={waypointTouchRadius}
                  fill="#000000"
                  opacity={0.001}
                />
              )}
              <Circle
                x={isMobile ? 0 : x}
                y={isMobile ? 0 : y}
                radius={hovered ? waypointRadius * 1.6 : waypointRadius}
                fill={active ? "#3b82f6" : hovered ? "#f59e0b" : "#1e293b"}
                stroke={active ? "#ffffff" : hovered ? "#ffffff" : "#3b82f6"}
                strokeWidth={hovered ? 2.5 : 2}
                draggable={!isMobile}
                dragBoundFunc={!isMobile ? dragBound : undefined}
                onDragStart={!isMobile ? handleDragStart : undefined}
                onDragMove={!isMobile ? handleDragMove : undefined}
                onDragEnd={!isMobile ? handleDragEnd : undefined}
                listening={!isMobile}
                onDragCancel={() => setPreviewPoints(null)}
              />
            </Group>
          );
        })}
    </>
  );
}
