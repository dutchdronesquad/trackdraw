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
import { useEditor } from "@/store/editor";
import { selectPrimaryPolyline } from "@/store/selectors";

export interface PolylineShapeContentProps {
  allowInteraction: boolean;
  designPpm: number;
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
  const waypointDragSessionRef = useRef<{
    cleanup: (() => void) | null;
    hasMoved: boolean;
    idx: number;
    initialPointPx: Vector2d;
    lastResolved: Vector2d;
    latestClient: { x: number; y: number } | null;
    offset: Vector2d;
    sourcePoints: PolylinePoint[];
    stage: KonvaStage;
    touchIdentifier: number | null;
  } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
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
    const resolved = resolveWaypointDragPosition(
      rawPosition,
      dragSnapRef.current
    );
    session.lastResolved = resolved;
    session.hasMoved =
      session.hasMoved ||
      Math.abs(resolved.x - session.initialPointPx.x) > 0.5 ||
      Math.abs(resolved.y - session.initialPointPx.y) > 0.5;

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
              snapEnabled: !(
                event.evt.altKey ||
                event.evt.metaKey ||
                event.evt.shiftKey
              ),
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
                listening={!isMobile}
              />
            </Group>
          );
        })}
    </>
  );
}
