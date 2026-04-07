"use client";

import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

export function RotationGuideOverlay({
  isDark,
  onRotateStart,
  showFrontLabel = false,
  showAngleLabel = false,
  rotationGuide,
}: {
  isDark: boolean;
  onRotateStart: (event: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  showFrontLabel?: boolean;
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
  const frontLabelOffsetX = Math.cos(angleRad) * 30;
  const frontLabelOffsetY = Math.sin(angleRad) * 30;

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
      {showFrontLabel && (
        <Group listening={false}>
          <Rect
            x={handleOuterX + frontLabelOffsetX - 20}
            y={handleOuterY + frontLabelOffsetY - 9}
            width={40}
            height={18}
            cornerRadius={999}
            fill={isDark ? "#08111d" : "#eff6ff"}
            stroke="#60a5fa"
            strokeWidth={1}
            opacity={0.96}
          />
          <Text
            x={handleOuterX + frontLabelOffsetX - 20}
            y={handleOuterY + frontLabelOffsetY - 9}
            width={40}
            height={18}
            align="center"
            verticalAlign="middle"
            text="Front"
            fontSize={9}
            fontStyle="bold"
            fill="#60a5fa"
          />
        </Group>
      )}
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
