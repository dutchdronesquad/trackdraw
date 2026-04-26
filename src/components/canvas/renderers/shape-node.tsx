"use client";

import { memo, useEffect, useRef } from "react";
import { Group, Rect } from "react-konva";
import type { Group as KonvaGroup } from "konva/lib/Group";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import { m2px, px2m } from "@/lib/track/units";
import type { PolylinePoint, Shape } from "@/lib/types";
import {
  renderLockedIndicator,
  renderHoverIndicator,
  renderGate,
  renderFlag,
  renderCone,
  renderLabel,
  renderStartFinish,
  renderLadder,
  renderDiveGate,
} from "./shape-renderers";
import { PolylineShapeContent } from "./polyline-shape";
import { getShapeLocalBounds } from "./shape-bounds";

export interface TrackShapeNodeProps {
  allowInteraction: boolean;
  contentDragActiveRef: React.RefObject<boolean>;
  designPpm: number;
  dragBound: (pos: Vector2d) => Vector2d;
  dragSnapRef: React.RefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isPrimaryPolyline: boolean;
  selectedSegmentIndex: number | null;
  selectedSegmentPoint: { x: number; y: number } | null;
  isHovered: boolean;
  isMobile: boolean;
  mobileMultiSelectEnabled?: boolean;
  isSelected: boolean;
  selectionCount: number;
  groupDragOffsetPx?: { x: number; y: number } | null;
  onMobileMultiSelectStart?: (shapeId: string) => void;
  onSelectOnly: (shapeId: string) => void;
  onToggleSelection: (shapeId: string) => void;
  onShapeContextMenu?: (
    shape: Shape,
    options?: { segmentIndex?: number | null }
  ) => void;
  setSelection: (ids: string[]) => void;
  setDragSnapPreview: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  setSegmentSelection: (
    value: {
      shapeId: string;
      segmentIndex: number;
      point: { x: number; y: number };
    } | null
  ) => void;
  setVertexSel: (value: { shapeId: string; idx: number } | null) => void;
  shape: Shape;
  shapeRef: (node: KonvaGroup | null) => void;
  snapEnabled: boolean;
  resolveShapeDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean,
    draggedShapeId: string
  ) => Vector2d;
  resolveWaypointDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean,
    sourcePathId?: string
  ) => Vector2d;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  zmax: number;
  zmin: number;
}

function sameOffset(
  a: { x: number; y: number } | null | undefined,
  b: { x: number; y: number } | null | undefined
) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function TrackShapeNodeComponent({
  allowInteraction,
  contentDragActiveRef,
  designPpm,
  dragBound,
  dragSnapRef,
  effectiveVertexSel,
  hoveredWaypoint,
  isPrimaryPolyline,
  selectedSegmentIndex,
  selectedSegmentPoint,
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
  setSegmentSelection,
  setVertexSel,
  shape,
  shapeRef,
  snapEnabled,
  resolveShapeDragPosition,
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
    contentDragActiveRef.current = true;
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    dragTriggeredRef.current = false;
    dragSnapRef.current =
      snapEnabled &&
      !(event.evt.altKey || event.evt.metaKey || event.evt.shiftKey);
    setDragSnapPreview(null);
  };

  const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
    dragTriggeredRef.current = true;
    const current = event.currentTarget.position();
    const resolved = resolveShapeDragPosition(
      current,
      dragSnapRef.current,
      shape.id
    );
    const isSnapping =
      Math.abs(current.x - resolved.x) > 0.5 ||
      Math.abs(current.y - resolved.y) > 0.5;
    setDragSnapPreview(isSnapping ? resolved : null);
  };

  const handleDragEnd = (event: KonvaEventObject<DragEvent>) => {
    contentDragActiveRef.current = false;
    const resolved = resolveShapeDragPosition(
      event.currentTarget.position(),
      dragSnapRef.current,
      shape.id
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

  const handleDragCancel = () => {
    contentDragActiveRef.current = false;
    setDragSnapPreview(null);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(
    () => () => {
      clearLongPress();
      contentDragActiveRef.current = false;
      setDragSnapPreview(null);
    },
    [contentDragActiveRef, setDragSnapPreview]
  );

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
        !(isMobile && shape.kind === "polyline") &&
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
      onDragCancel={handleDragCancel}
      onMouseDown={(event) => {
        if (!allowInteraction) return;
        event.cancelBubble = true;
        if (isMobile && mobileMultiSelectEnabled) return;
        if (event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey) {
          onToggleSelection(shape.id);
        } else if (selected && selectionCount > 1) {
          // Preserve an existing multiselect when starting a drag from within it.
          return;
        } else if (selected && selectionCount === 1) {
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
        if (selected && selectionCount === 1) {
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
            dragSnapRef={dragSnapRef}
            effectiveVertexSel={effectiveVertexSel}
            hoveredWaypoint={hoveredWaypoint}
            isPrimaryPolyline={isPrimaryPolyline}
            isMobile={isMobile}
            isSelected={highlighted}
            onPathContextMenu={(segmentIndex) =>
              onShapeContextMenu?.(shape, { segmentIndex })
            }
            path={shape}
            snapEnabled={snapEnabled}
            selectedSegmentIndex={selectedSegmentIndex}
            selectedSegmentPoint={selectedSegmentPoint}
            resolveWaypointDragPosition={resolveWaypointDragPosition}
            setSelection={setSelection}
            setDragSnapPreview={setDragSnapPreview}
            setSegmentSelection={setSegmentSelection}
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
    prev.isPrimaryPolyline === next.isPrimaryPolyline &&
    prev.snapEnabled === next.snapEnabled &&
    prev.selectionCount === next.selectionCount &&
    prev.shape === next.shape &&
    prev.zmin === next.zmin &&
    prev.zmax === next.zmax &&
    prevVertexActive === nextVertexActive &&
    prevHoveredWaypoint === nextHoveredWaypoint &&
    sameOffset(prev.groupDragOffsetPx, next.groupDragOffsetPx)
  );
});
