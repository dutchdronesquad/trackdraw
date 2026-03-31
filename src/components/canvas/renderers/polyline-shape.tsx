"use client";

import { useMemo, useState } from "react";
import { Arrow, Circle, Group, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Vector2d } from "konva/lib/types";
import {
  getPolyline2DDerived,
  getPolylineRouteWarningSegmentVisuals,
  getPolylineSmoothSegmentPointsPx,
  getPolylineSmoothPointsPx,
} from "@/lib/track/polyline-derived";
import { zToColor } from "@/lib/track/alt";
import { m2px, px2m } from "@/lib/track/units";
import type { PolylinePoint, PolylineShape } from "@/lib/types";
import { useEditor } from "@/store/editor";
import { selectPrimaryPolyline } from "@/store/selectors";

export interface PolylineShapeContentProps {
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

export function PolylineShapeContent({
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
  const primaryPolyline = useEditor(selectPrimaryPolyline);
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
  const warningSegments = useMemo(
    () => getPolylineRouteWarningSegmentVisuals(displayPath),
    [displayPath]
  );
  const warningKindBySegment = useMemo(
    () =>
      new Map(
        warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
      ),
    [warningSegments]
  );
  const smoothSegmentPx = useMemo(
    () => getPolylineSmoothSegmentPointsPx(displayPath, designPpm),
    [designPpm, displayPath]
  );
  const showWarningVisuals = primaryPolyline?.id === path.id || isSelected;
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
        {showWarningVisuals && warningSegments.length ? (
          smoothSegmentPx.map((points, segmentIndex) => {
            if (!points || points.length < 4) return null;
            const warningKind = warningKindBySegment.get(segmentIndex);
            const stroke = !warningKind
              ? path.color
                ? color
                : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax)
              : warningKind === "close-points"
                ? "#ef4444"
                : warningKind === "steep"
                  ? "#f97316"
                  : "#fbbf24";

            return (
              <Line
                key={`${path.id}-segment-${segmentIndex}`}
                points={points}
                stroke={stroke}
                strokeWidth={strokePx}
                lineCap="round"
                lineJoin="round"
                opacity={0.92}
              />
            );
          })
        ) : (
          <Line
            points={smoothPx.length >= 4 ? smoothPx : pointsPxMemo}
            stroke={
              path.color
                ? color
                : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax)
            }
            strokeWidth={strokePx}
            lineCap="round"
            lineJoin="round"
            opacity={0.92}
          />
        )}
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
