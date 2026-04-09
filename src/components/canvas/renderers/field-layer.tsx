"use client";

import { memo } from "react";
import { Group, Line, Rect, Text } from "react-konva";
import type { RectLike } from "@/lib/canvas/shared";

// ── Stable content (grid + field chrome) ────────────────────────────────────
// Only re-renders when design, theme, or field dimensions change.

export interface StableFieldContentProps {
  designField: {
    width: number;
    height: number;
    ppm: number;
  };
  grid: React.JSX.Element[];
  heightPx: number;
  isDark: boolean;
  stepPx: number;
  widthPx: number;
}

export const StableFieldContent = memo(function StableFieldContent({
  designField,
  grid,
  heightPx,
  isDark,
  widthPx,
}: StableFieldContentProps) {
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
    </>
  );
});

// ── Reactive overlay content (cursor-reactive overlays) ──────────────────────
// Changes on mouse move (hoverCell), marquee drag, and selection moves.
// Kept in a separate Konva layer so the stable grid is never redrawn.

export interface FieldOverlayContentProps {
  effectiveSelectionFrame: RectLike | null;
  hoverCell: { x: number; y: number } | null;
  isDark: boolean;
  marqueeRect: RectLike | null;
  stepPx: number;
}

export function FieldOverlayContent({
  effectiveSelectionFrame,
  hoverCell,
  isDark,
  marqueeRect,
  stepPx,
}: FieldOverlayContentProps) {
  return (
    <>
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

// ── Legacy combined export (kept for backwards compatibility) ─────────────────

export interface FieldLayerContentProps {
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
      <StableFieldContent
        designField={designField}
        grid={grid}
        heightPx={heightPx}
        isDark={isDark}
        stepPx={stepPx}
        widthPx={widthPx}
      />
      <FieldOverlayContent
        effectiveSelectionFrame={effectiveSelectionFrame}
        hoverCell={hoverCell}
        isDark={isDark}
        marqueeRect={marqueeRect}
        stepPx={stepPx}
      />
    </>
  );
}
