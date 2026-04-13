"use client";

import { Circle, Group, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { FieldOverlayContent } from "@/components/canvas/renderers/field-layer";
import { RotationGuideOverlay } from "@/components/canvas/renderers/rotation-guide";
import { m2px } from "@/lib/track/units";
import type { CursorState, RectLike } from "@/lib/canvas/shared";

interface TrackCanvasEditorOverlaysProps {
  activeTool: string;
  cursor: CursorState | null;
  designPpm: number;
  draftCloseTarget: { x: number; y: number } | null;
  draftPointsPx: number[];
  draftPreviewSmoothPx: number[];
  dragSnapPreview: { x: number; y: number } | null;
  effectiveSelectionFrame: RectLike | null;
  hoverCell: { x: number; y: number } | null;
  isDark: boolean;
  magneticSnapRadiusPx: number;
  marqueeRect: RectLike | null;
  onRotateStart: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  rotationGuide: {
    angleDeg: number;
    center: { x: number; y: number };
    label: string;
    radius: number;
  } | null;
  showAngleLabel: boolean;
  showFrontLabel: boolean;
  showRotationGuide: boolean;
  snapRadiusMeters: number;
  snapTarget: { x: number; y: number; id: string } | null;
  stepPx: number;
}

export default function TrackCanvasEditorOverlays({
  activeTool,
  cursor,
  designPpm,
  draftCloseTarget,
  draftPointsPx,
  draftPreviewSmoothPx,
  dragSnapPreview,
  effectiveSelectionFrame,
  hoverCell,
  isDark,
  magneticSnapRadiusPx,
  marqueeRect,
  onRotateStart,
  rotationGuide,
  showAngleLabel,
  showFrontLabel,
  showRotationGuide,
  snapRadiusMeters,
  snapTarget,
  stepPx,
}: TrackCanvasEditorOverlaysProps) {
  return (
    <Layer>
      <Group listening={false}>
        <FieldOverlayContent
          effectiveSelectionFrame={effectiveSelectionFrame}
          hoverCell={hoverCell}
          isDark={isDark}
          marqueeRect={marqueeRect}
          stepPx={stepPx}
        />
      </Group>

      {showRotationGuide ? (
        <RotationGuideOverlay
          isDark={isDark}
          onRotateStart={onRotateStart}
          rotationGuide={rotationGuide}
          showAngleLabel={showAngleLabel}
          showFrontLabel={showFrontLabel}
        />
      ) : null}

      {dragSnapPreview ? (
        <Group listening={false}>
          <Circle
            x={dragSnapPreview.x}
            y={dragSnapPreview.y}
            radius={Math.max(11, magneticSnapRadiusPx + 1)}
            fill={isDark ? "#7dd3fc14" : "#0ea5e910"}
            strokeEnabled={false}
            opacity={0.24}
          />
          <Circle
            x={dragSnapPreview.x}
            y={dragSnapPreview.y}
            radius={Math.max(7, magneticSnapRadiusPx - 2)}
            fill={isDark ? "#e0f2fe10" : "#ffffffa8"}
            stroke={isDark ? "#7dd3fc66" : "#0ea5e955"}
            strokeWidth={0.8}
            opacity={0.42}
          />
          <Circle
            x={dragSnapPreview.x}
            y={dragSnapPreview.y}
            radius={1.75}
            fill={isDark ? "#e0f2fe" : "#0284c7"}
            opacity={0.62}
          />
        </Group>
      ) : null}

      {snapTarget && activeTool === "polyline"
        ? (() => {
            const sx = m2px(snapTarget.x, designPpm);
            const sy = m2px(snapTarget.y, designPpm);
            const r = Math.max(m2px(snapRadiusMeters * 0.55, designPpm), 14);
            return (
              <Group listening={false}>
                <Circle
                  x={sx}
                  y={sy}
                  radius={r}
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dash={[5, 4]}
                  opacity={0.85}
                />
                <Circle x={sx} y={sy} radius={4} fill="#22c55e" opacity={0.9} />
              </Group>
            );
          })()
        : null}

      {draftPreviewSmoothPx.length >= 4 ? (
        <>
          <Line
            points={draftPreviewSmoothPx}
            stroke="#60a5fa"
            strokeWidth={m2px(0.28, designPpm)}
            lineCap="round"
            lineJoin="round"
            opacity={0.2}
          />
          <Line
            points={draftPreviewSmoothPx}
            stroke={snapTarget ? "#22c55e" : "#3b82f6"}
            strokeWidth={m2px(0.18, designPpm)}
            lineCap="round"
            lineJoin="round"
            opacity={0.55}
          />
        </>
      ) : null}

      {draftPointsPx.length > 0 ? (
        <Line
          points={draftPointsPx}
          stroke="#93c5fd"
          strokeWidth={Math.max(1, m2px(0.08, designPpm))}
          dash={[4, 6]}
          lineCap="round"
          lineJoin="round"
          opacity={0.45}
        />
      ) : null}

      {draftPointsPx.length > 0 && cursor
        ? (() => {
            const endX = snapTarget
              ? m2px(snapTarget.x, designPpm)
              : cursor.snappedPx.x;
            const endY = snapTarget
              ? m2px(snapTarget.y, designPpm)
              : cursor.snappedPx.y;
            const previewX = draftCloseTarget
              ? m2px(draftCloseTarget.x, designPpm)
              : endX;
            const previewY = draftCloseTarget
              ? m2px(draftCloseTarget.y, designPpm)
              : endY;
            return (
              <Line
                points={[
                  draftPointsPx[draftPointsPx.length - 2],
                  draftPointsPx[draftPointsPx.length - 1],
                  previewX,
                  previewY,
                ]}
                stroke={
                  draftCloseTarget
                    ? "#f59e0b"
                    : snapTarget
                      ? "#22c55e"
                      : "#60a5fa"
                }
                strokeWidth={Math.max(1, m2px(0.12, designPpm))}
                dash={[4, 6]}
                opacity={0.5}
                lineCap="round"
              />
            );
          })()
        : null}

      {draftCloseTarget ? (
        <Group listening={false}>
          <Circle
            x={m2px(draftCloseTarget.x, designPpm)}
            y={m2px(draftCloseTarget.y, designPpm)}
            radius={Math.max(9, m2px(0.28, designPpm))}
            stroke="#f59e0b"
            strokeWidth={1.5}
            dash={[5, 4]}
            opacity={0.9}
          />
          <Circle
            x={m2px(draftCloseTarget.x, designPpm)}
            y={m2px(draftCloseTarget.y, designPpm)}
            radius={3.5}
            fill="#f59e0b"
            opacity={0.95}
          />
        </Group>
      ) : null}

      {cursor ? (
        <Group listening={false}>
          <Line
            points={[
              cursor.snappedPx.x,
              cursor.snappedPx.y - 10,
              cursor.snappedPx.x,
              cursor.snappedPx.y + 10,
            ]}
            stroke="#4a5568"
            strokeWidth={1}
            dash={[3, 3]}
          />
          <Line
            points={[
              cursor.snappedPx.x - 10,
              cursor.snappedPx.y,
              cursor.snappedPx.x + 10,
              cursor.snappedPx.y,
            ]}
            stroke="#4a5568"
            strokeWidth={1}
            dash={[3, 3]}
          />
        </Group>
      ) : null}
    </Layer>
  );
}
