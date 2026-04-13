"use client";

import { memo, useMemo } from "react";
import { Arrow, Group, Line } from "react-konva";
import {
  getPolyline2DDerived,
  getPolylineRouteWarningSegmentVisuals,
  getPolylineSmoothPointsPx,
  getPolylineSmoothSegmentPointsPx,
  getRouteWarningSegmentColor,
} from "@/lib/track/polyline-derived";
import { zToColor } from "@/lib/track/alt";
import { m2px } from "@/lib/track/units";
import type { PolylineShape as TrackPolylineShape } from "@/lib/types";

interface SharePolylineShapeProps {
  designPpm: number;
  isPrimaryPolyline: boolean;
  path: TrackPolylineShape;
  zmax: number;
  zmin: number;
}

function SharePolylineShapeComponent({
  designPpm,
  isPrimaryPolyline,
  path,
  zmax,
  zmin,
}: SharePolylineShapeProps) {
  const strokePx = m2px(path.strokeWidth ?? 0.26, designPpm);
  const polylineMetrics = useMemo(() => getPolyline2DDerived(path), [path]);
  const warningSegments = useMemo(
    () => getPolylineRouteWarningSegmentVisuals(path),
    [path]
  );
  const warningKindBySegment = useMemo(
    () =>
      new Map(
        warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
      ),
    [warningSegments]
  );
  const smoothSegmentPx = useMemo(
    () => getPolylineSmoothSegmentPointsPx(path, designPpm),
    [designPpm, path]
  );
  const pointsPx = useMemo(() => {
    const basePoints =
      path.closed && path.points.length > 1
        ? [...path.points, path.points[0]]
        : path.points;

    return basePoints.flatMap((point) => [
      m2px(point.x, designPpm),
      m2px(point.y, designPpm),
    ]);
  }, [designPpm, path.closed, path.points]);
  const smoothPx = useMemo(
    () => getPolylineSmoothPointsPx(path, designPpm),
    [designPpm, path]
  );
  const color = path.color ?? "#3b82f6";
  const shouldRenderPerSegment =
    isPrimaryPolyline && warningSegments.length > 0;

  if (!pointsPx.length) return null;

  return (
    <Group listening={false}>
      {shouldRenderPerSegment ? (
        smoothSegmentPx.map((points, segmentIndex) => {
          if (!points || points.length < 4) return null;
          const warningKind = warningKindBySegment.get(segmentIndex);
          const baseStroke = path.color
            ? color
            : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax);
          const stroke = getRouteWarningSegmentColor(warningKind, baseStroke);

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
          points={smoothPx.length >= 4 ? smoothPx : pointsPx}
          stroke={
            path.color ? color : zToColor(path.points.at(0)?.z ?? 0, zmin, zmax)
          }
          strokeWidth={strokePx}
          lineCap="round"
          lineJoin="round"
          opacity={0.92}
        />
      )}
      {polylineMetrics.arrowMarkers.map((marker, index) => {
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
  );
}

export const PolylineShape = memo(SharePolylineShapeComponent);
