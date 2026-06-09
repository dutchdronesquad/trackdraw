"use client";

import { useCallback, useEffect, useRef } from "react";
import { Group, Rect } from "react-konva";
import type { Vector2d } from "konva/lib/types";
import type { Group as KonvaGroup } from "konva/lib/Group";
import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import { getMobileTouchTargetMinScreenPx } from "@/lib/track/items/registry";
import { m2px, px2m } from "@/lib/track/units";
import type { PolylineShape, Shape } from "@/lib/types";

export function MobileShapeHitTarget({
  contentDragActiveRef,
  designPpm,
  dragBound,
  dragSnapRef,
  groupDragOffsetPx,
  isSelected,
  mobileMultiSelectEnabled,
  onMobileMultiSelectStart,
  onSelectOnly,
  onToggleSelection,
  resolveShapeDragPosition,
  selectionCount,
  setDragSnapPreview,
  shape,
  shapeRefs,
  snapEnabled,
  updateShape,
  viewportScale,
}: {
  contentDragActiveRef: React.RefObject<boolean>;
  designPpm: number;
  dragBound: (pos: Vector2d) => Vector2d;
  dragSnapRef: React.RefObject<boolean>;
  groupDragOffsetPx?: { x: number; y: number } | null;
  isSelected: boolean;
  mobileMultiSelectEnabled: boolean;
  onMobileMultiSelectStart?: (shapeId: string) => void;
  onSelectOnly: (shapeId: string) => void;
  onToggleSelection: (shapeId: string) => void;
  resolveShapeDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean,
    draggedShapeId: string
  ) => Vector2d;
  selectionCount: number;
  setDragSnapPreview: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  shape: Exclude<Shape, PolylineShape>;
  shapeRefs: React.RefObject<Record<string, KonvaGroup | null>>;
  snapEnabled: boolean;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  viewportScale: number;
}) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const dragTriggeredRef = useRef(false);
  const bounds = getShapeLocalBounds(shape, designPpm)!;
  const touchTargetMinScreenPx = getMobileTouchTargetMinScreenPx(shape);
  const minCanvasPx = touchTargetMinScreenPx / Math.max(viewportScale, 0.1);
  const hitRect = {
    x: bounds.x - Math.max(0, minCanvasPx - bounds.width) / 2,
    y: bounds.y - Math.max(0, minCanvasPx - bounds.height) / 2,
    width: Math.max(bounds.width, minCanvasPx),
    height: Math.max(bounds.height, minCanvasPx),
  };
  const canDrag =
    !shape.locked &&
    !(isSelected && selectionCount > 1) &&
    (!mobileMultiSelectEnabled || isSelected);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearLongPress();
      contentDragActiveRef.current = false;
      setDragSnapPreview(null);
    },
    [clearLongPress, contentDragActiveRef, setDragSnapPreview]
  );

  const handleSelect = useCallback(() => {
    if (mobileMultiSelectEnabled) {
      onToggleSelection(shape.id);
      return;
    }
    if (isSelected && selectionCount === 1) return;
    onSelectOnly(shape.id);
  }, [
    isSelected,
    mobileMultiSelectEnabled,
    onSelectOnly,
    onToggleSelection,
    selectionCount,
    shape.id,
  ]);

  return (
    <Group
      x={m2px(shape.x, designPpm) + (groupDragOffsetPx?.x ?? 0)}
      y={m2px(shape.y, designPpm) + (groupDragOffsetPx?.y ?? 0)}
      rotation={shape.rotation}
      draggable={canDrag}
      dragBoundFunc={dragBound}
      onDragStart={(event) => {
        event.cancelBubble = true;
        contentDragActiveRef.current = true;
        if (!mobileMultiSelectEnabled && !isSelected) {
          onSelectOnly(shape.id);
        }
        clearLongPress();
        dragTriggeredRef.current = false;
        dragSnapRef.current =
          snapEnabled &&
          !(event.evt.altKey || event.evt.metaKey || event.evt.shiftKey);
        setDragSnapPreview(null);
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        dragTriggeredRef.current = true;
        const current = event.currentTarget.position();
        const resolved = resolveShapeDragPosition(
          current,
          dragSnapRef.current,
          shape.id
        );
        event.currentTarget.position(resolved);
        // Mirror the resolved position onto the visual shape node so it
        // follows the drag instead of staying at the original position.
        const shapeNode = shapeRefs.current[shape.id];
        if (shapeNode) {
          shapeNode.position(resolved);
          shapeNode.getLayer()?.batchDraw();
        }
        const isSnapping =
          Math.abs(current.x - resolved.x) > 0.5 ||
          Math.abs(current.y - resolved.y) > 0.5;
        setDragSnapPreview(isSnapping ? resolved : null);
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        contentDragActiveRef.current = false;
        const resolved = resolveShapeDragPosition(
          event.currentTarget.position(),
          dragSnapRef.current,
          shape.id
        );
        event.currentTarget.position(resolved);
        setDragSnapPreview(null);
        updateShape(shape.id, {
          x: px2m(resolved.x, designPpm),
          y: px2m(resolved.y, designPpm),
        });
      }}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        if (mobileMultiSelectEnabled) return;
        handleSelect();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        if (longPressTriggeredRef.current) {
          longPressTriggeredRef.current = false;
          return;
        }
        if (dragTriggeredRef.current) {
          dragTriggeredRef.current = false;
          return;
        }
        handleSelect();
      }}
      onTouchStart={() => {
        if (
          mobileMultiSelectEnabled ||
          !onMobileMultiSelectStart ||
          shape.locked
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
      onTouchMove={clearLongPress}
      onTouchEnd={clearLongPress}
    >
      <Rect
        x={hitRect.x}
        y={hitRect.y}
        width={hitRect.width}
        height={hitRect.height}
        fill="#000000"
        opacity={0.001}
      />
    </Group>
  );
}
