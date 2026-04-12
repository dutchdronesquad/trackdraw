"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Group, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Stage as KonvaStage } from "konva/lib/Stage";
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

export interface PolylineShapeContentProps {
  allowInteraction: boolean;
  designPpm: number;
  dragSnapRef: React.RefObject<boolean>;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  isPrimaryPolyline: boolean;
  isMobile: boolean;
  isSelected: boolean;
  onPathContextMenu?: (segmentIndex: number) => void;
  path: PolylineShape;
  snapEnabled: boolean;
  selectedSegmentIndex: number | null;
  selectedSegmentPoint: { x: number; y: number } | null;
  resolveWaypointDragPosition: (
    pos: Vector2d,
    snapEnabled: boolean
  ) => Vector2d;
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
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  zmax: number;
  zmin: number;
}

export function PolylineShapeContent({
  allowInteraction,
  designPpm,
  dragSnapRef,
  effectiveVertexSel,
  hoveredWaypoint,
  isPrimaryPolyline,
  isMobile,
  isSelected,
  onPathContextMenu,
  path,
  snapEnabled,
  selectedSegmentIndex,
  selectedSegmentPoint,
  resolveWaypointDragPosition,
  setSelection,
  setDragSnapPreview,
  setSegmentSelection,
  setVertexSel,
  setPolylinePoints,
  zmax,
  zmin,
}: PolylineShapeContentProps) {
  const [previewPoints, setPreviewPoints] = useState<PolylinePoint[] | null>(
    null
  );
  const waypointDragSessionRef = useRef<{
    cleanup: (() => void) | null;
    hasMoved: boolean;
    idx: number;
    initialClient: { x: number; y: number };
    initialPointPx: Vector2d;
    lastResolved: Vector2d;
    latestClient: { x: number; y: number } | null;
    offset: Vector2d;
    sourcePoints: PolylinePoint[];
    stage: KonvaStage;
    touchIdentifier: number | null;
  } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
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
  const showWarningVisuals = isPrimaryPolyline || isSelected;
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
  const shouldRenderPerSegment =
    (showWarningVisuals && warningSegments.length > 0) ||
    (isSelected && selectedSegmentIndex !== null);
  const arrowMarkers = polylineMetrics.arrowMarkers;
  const color = displayPath.color ?? "#3b82f6";
  const waypointRadius = Math.max(4, m2px(0.08, designPpm));
  const waypointDesktopHitRadius = Math.max(10, waypointRadius * 2.35);
  const waypointTouchRadius = isMobile
    ? Math.max(22, waypointRadius * 3.6)
    : waypointRadius;
  const buildPreviewPoints = useCallback(
    (points: PolylinePoint[], index: number, resolved: Vector2d) =>
      points.map((candidate, candidateIndex) =>
        candidateIndex === index
          ? {
              ...candidate,
              x: px2m(resolved.x, designPpm),
              y: px2m(resolved.y, designPpm),
            }
          : candidate
      ),
    [designPpm]
  );

  const resolveClosestPointOnPolyline = useCallback(
    (points: number[], pointer: Vector2d) => {
      let bestPoint = { x: pointer.x, y: pointer.y };
      let bestDistanceSq = Number.POSITIVE_INFINITY;

      for (let index = 0; index <= points.length - 4; index += 2) {
        const startX = points[index];
        const startY = points[index + 1];
        const endX = points[index + 2];
        const endY = points[index + 3];
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSq = dx * dx + dy * dy;
        const t =
          lengthSq > 0
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((pointer.x - startX) * dx + (pointer.y - startY) * dy) /
                    lengthSq
                )
              )
            : 0;
        const projectedX = startX + dx * t;
        const projectedY = startY + dy * t;
        const distanceSq =
          (pointer.x - projectedX) ** 2 + (pointer.y - projectedY) ** 2;

        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          bestPoint = { x: projectedX, y: projectedY };
        }
      }

      return bestPoint;
    },
    []
  );

  const clientToStagePoint = useCallback(
    (stage: KonvaStage, client: { x: number; y: number }) => {
      const stageBox = stage.container().getBoundingClientRect();
      const scaleX = stage.scaleX() || 1;
      const scaleY = stage.scaleY() || 1;
      return {
        x: (client.x - stageBox.left - stage.x()) / scaleX,
        y: (client.y - stageBox.top - stage.y()) / scaleY,
      };
    },
    []
  );

  const applyWaypointDragFrame = useCallback(() => {
    const session = waypointDragSessionRef.current;
    if (!session || !session.latestClient) return;

    const pointer = clientToStagePoint(session.stage, session.latestClient);
    const rawPosition = {
      x: pointer.x + session.offset.x,
      y: pointer.y + session.offset.y,
    };
    const hasPhysicallyMoved =
      Math.abs(session.latestClient.x - session.initialClient.x) > 3 ||
      Math.abs(session.latestClient.y - session.initialClient.y) > 3;
    const resolved = resolveWaypointDragPosition(
      rawPosition,
      hasPhysicallyMoved && dragSnapRef.current
    );
    session.lastResolved = resolved;
    session.hasMoved = session.hasMoved || hasPhysicallyMoved;

    const isSnapping =
      Math.abs(rawPosition.x - resolved.x) > 0.5 ||
      Math.abs(rawPosition.y - resolved.y) > 0.5;
    setDragSnapPreview(isSnapping ? resolved : null);
    setPreviewPoints(
      buildPreviewPoints(session.sourcePoints, session.idx, resolved)
    );
  }, [
    buildPreviewPoints,
    clientToStagePoint,
    dragSnapRef,
    resolveWaypointDragPosition,
    setDragSnapPreview,
  ]);

  const stopWaypointDrag = useCallback(
    (commit: boolean) => {
      const session = waypointDragSessionRef.current;
      waypointDragSessionRef.current = null;
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      session?.cleanup?.();
      setDragSnapPreview(null);

      if (!session) {
        setPreviewPoints(null);
        return;
      }

      if (commit && session.hasMoved) {
        setPolylinePoints(
          path.id,
          buildPreviewPoints(
            session.sourcePoints,
            session.idx,
            session.lastResolved
          )
        );
      }
      setPreviewPoints(null);
    },
    [buildPreviewPoints, path.id, setDragSnapPreview, setPolylinePoints]
  );

  const startWaypointDrag = useCallback(
    ({
      client,
      index,
      pointPx,
      snapEnabled,
      stage,
      touchIdentifier,
    }: {
      client: { x: number; y: number };
      index: number;
      pointPx: Vector2d;
      snapEnabled: boolean;
      stage: KonvaStage;
      touchIdentifier: number | null;
    }) => {
      stopWaypointDrag(false);
      dragSnapRef.current = snapEnabled;
      const pointer = clientToStagePoint(stage, client);
      waypointDragSessionRef.current = {
        cleanup: null,
        hasMoved: false,
        idx: index,
        initialClient: client,
        initialPointPx: pointPx,
        lastResolved: pointPx,
        latestClient: client,
        offset: {
          x: pointPx.x - pointer.x,
          y: pointPx.y - pointer.y,
        },
        sourcePoints: path.points.map((point) => ({ ...point })),
        stage,
        touchIdentifier,
      };
      setDragSnapPreview(null);

      const updateLatestClient = (nextClient: { x: number; y: number }) => {
        const session = waypointDragSessionRef.current;
        if (!session) return;
        session.latestClient = nextClient;
      };

      const tick = () => {
        applyWaypointDragFrame();
        if (waypointDragSessionRef.current) {
          dragFrameRef.current = window.requestAnimationFrame(tick);
        } else {
          dragFrameRef.current = null;
        }
      };
      dragFrameRef.current = window.requestAnimationFrame(tick);

      const handleMouseMove = (event: MouseEvent) => {
        updateLatestClient({ x: event.clientX, y: event.clientY });
      };

      const handleMouseUp = () => {
        stopWaypointDrag(true);
      };

      const handleTouchMove = (event: TouchEvent) => {
        const session = waypointDragSessionRef.current;
        if (!session) return;
        if (event.touches.length !== 1) {
          stopWaypointDrag(true);
          return;
        }
        const touch = Array.from(event.touches).find(
          (candidate) => candidate.identifier === session.touchIdentifier
        );
        if (!touch) return;
        if (event.cancelable) event.preventDefault();
        updateLatestClient({ x: touch.clientX, y: touch.clientY });
      };

      const handleTouchEnd = (event: TouchEvent) => {
        const session = waypointDragSessionRef.current;
        if (!session) return;
        const didEnd = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === session.touchIdentifier
        );
        if (didEnd) {
          stopWaypointDrag(true);
        }
      };

      const handleTouchCancel = (event: TouchEvent) => {
        const session = waypointDragSessionRef.current;
        if (!session) return;
        const didCancel = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === session.touchIdentifier
        );
        if (didCancel) {
          stopWaypointDrag(false);
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp, { once: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchCancel);

      const session = waypointDragSessionRef.current;
      if (session) {
        session.cleanup = () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
          window.removeEventListener("touchmove", handleTouchMove);
          window.removeEventListener("touchend", handleTouchEnd);
          window.removeEventListener("touchcancel", handleTouchCancel);
        };
      }
    },
    [
      applyWaypointDragFrame,
      clientToStagePoint,
      dragSnapRef,
      path.points,
      setDragSnapPreview,
      stopWaypointDrag,
    ]
  );

  useEffect(
    () => () => {
      stopWaypointDrag(false);
    },
    [stopWaypointDrag]
  );

  const handlePathSelect = (
    event: KonvaEventObject<MouseEvent | TouchEvent>
  ) => {
    event.cancelBubble = true;
    setSelection([path.id]);
    setSegmentSelection(null);
    setVertexSel(null);
  };

  const selectNearestSegment = useCallback(
    (pointer: Vector2d) => {
      if (path.points.length < 2) return null;

      let bestSegmentIndex = 0;
      let bestPointPx = { x: pointer.x, y: pointer.y };
      let bestDistanceSq = Number.POSITIVE_INFINITY;
      const lastIndex = displayPath.points.length - 1;
      const segmentCount = path.closed ? displayPath.points.length : lastIndex;

      for (let index = 0; index < segmentCount; index += 1) {
        const nextIndex = index === lastIndex ? 0 : index + 1;
        const start = displayPath.points[index];
        const end = displayPath.points[nextIndex];
        if (!start || !end) continue;

        const closestPoint =
          smoothSegmentPx[index]?.length >= 4
            ? resolveClosestPointOnPolyline(smoothSegmentPx[index], pointer)
            : resolveClosestPointOnPolyline(
                [
                  m2px(start.x, designPpm),
                  m2px(start.y, designPpm),
                  m2px(end.x, designPpm),
                  m2px(end.y, designPpm),
                ],
                pointer
              );
        const distanceSq =
          (pointer.x - closestPoint.x) ** 2 + (pointer.y - closestPoint.y) ** 2;

        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          bestSegmentIndex = index;
          bestPointPx = closestPoint;
        }
      }

      return { segmentIndex: bestSegmentIndex, pointPx: bestPointPx };
    },
    [
      designPpm,
      displayPath.points,
      path.closed,
      path.points.length,
      resolveClosestPointOnPolyline,
      smoothSegmentPx,
    ]
  );

  const handleSegmentSelection = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = event.target.getStage();
      const pointer = stage?.getRelativePointerPosition();
      if (!pointer) return;
      const selection = selectNearestSegment(pointer);
      if (!selection) return;

      event.cancelBubble = true;
      setSelection([path.id]);
      setSegmentSelection({
        shapeId: path.id,
        segmentIndex: selection.segmentIndex,
        point: {
          x: px2m(selection.pointPx.x, designPpm),
          y: px2m(selection.pointPx.y, designPpm),
        },
      });
      setVertexSel(null);
    },
    [
      designPpm,
      path.id,
      selectNearestSegment,
      setSegmentSelection,
      setSelection,
      setVertexSel,
    ]
  );

  const handleMobileSegmentTouchEnd = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      if (!isMobile || !isSelected) return;
      handleSegmentSelection(event);
    },
    [handleSegmentSelection, isMobile, isSelected]
  );

  const handlePathContextMenu = useCallback(
    (event: KonvaEventObject<PointerEvent>) => {
      event.evt.preventDefault();
      const stage = event.target.getStage();
      const pointer = stage?.getRelativePointerPosition();
      if (!pointer) return;
      const selection = selectNearestSegment(pointer);
      if (!selection) return;

      event.cancelBubble = true;
      setSelection([path.id]);
      setSegmentSelection({
        shapeId: path.id,
        segmentIndex: selection.segmentIndex,
        point: {
          x: px2m(selection.pointPx.x, designPpm),
          y: px2m(selection.pointPx.y, designPpm),
        },
      });
      setVertexSel(null);
      onPathContextMenu?.(selection.segmentIndex);
    },
    [
      designPpm,
      onPathContextMenu,
      path.id,
      selectNearestSegment,
      setSegmentSelection,
      setSelection,
      setVertexSel,
    ]
  );

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
          onMouseUp={handleSegmentSelection}
          onTouchEnd={handleMobileSegmentTouchEnd}
          onTap={handleSegmentSelection}
          onContextMenu={handlePathContextMenu}
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
        {shouldRenderPerSegment ? (
          smoothSegmentPx.map((points, segmentIndex) => {
            if (!points || points.length < 4) return null;
            const warningKind = warningKindBySegment.get(segmentIndex);
            const baseStroke = path.color
              ? color
              : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax);
            const stroke = warningKind
              ? warningKind === "close-points"
                ? "#ef4444"
                : warningKind === "steep"
                  ? "#f97316"
                  : "#fbbf24"
              : baseStroke;

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
        isMobile &&
        !path.locked &&
        selectedSegmentIndex !== null &&
        selectedSegmentPoint &&
        (() => {
          const mx = m2px(selectedSegmentPoint.x, designPpm);
          const my = m2px(selectedSegmentPoint.y, designPpm);
          return (
            <Group listening={false}>
              <Circle
                x={mx}
                y={my}
                radius={Math.max(9, waypointRadius * 2.2)}
                fill="#3b82f6"
                opacity={0.18}
              />
              <Circle
                x={mx}
                y={my}
                radius={Math.max(5.5, waypointRadius * 1.2)}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={1.5}
                opacity={0.96}
              />
            </Group>
          );
        })()}
      {allowInteraction &&
        !path.locked &&
        displayPath.points.map((point, index) => {
          const x = m2px(point.x, designPpm);
          const y = m2px(point.y, designPpm);
          const active =
            effectiveVertexSel &&
            effectiveVertexSel.shapeId === path.id &&
            effectiveVertexSel.idx === index;
          const hovered =
            hoveredWaypoint?.shapeId === path.id &&
            hoveredWaypoint.idx === index;

          const handlePointerDown = (
            event: KonvaEventObject<MouseEvent | TouchEvent>
          ) => {
            event.cancelBubble = true;
            setSelection([path.id]);
            setSegmentSelection(null);
            setVertexSel({ shapeId: path.id, idx: index });
            const stage = event.target.getStage();
            if (!stage) return;
            const client =
              event.evt instanceof TouchEvent
                ? {
                    x: event.evt.touches[0]?.clientX ?? 0,
                    y: event.evt.touches[0]?.clientY ?? 0,
                  }
                : {
                    x: event.evt.clientX,
                    y: event.evt.clientY,
                  };
            startWaypointDrag({
              client,
              index,
              pointPx: { x, y },
              snapEnabled:
                snapEnabled &&
                !(event.evt.altKey || event.evt.metaKey || event.evt.shiftKey),
              stage,
              touchIdentifier:
                event.evt instanceof TouchEvent
                  ? (event.evt.touches[0]?.identifier ?? null)
                  : null,
            });
          };

          return (
            <Group
              key={`${path.id}-vh-${index}`}
              x={isMobile ? x : 0}
              y={isMobile ? y : 0}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
            >
              {(isMobile || allowInteraction) && (
                <Circle
                  x={isMobile ? 0 : x}
                  y={isMobile ? 0 : y}
                  radius={
                    isMobile ? waypointTouchRadius : waypointDesktopHitRadius
                  }
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
                listening={!isMobile}
              />
            </Group>
          );
        })}
    </>
  );
}
