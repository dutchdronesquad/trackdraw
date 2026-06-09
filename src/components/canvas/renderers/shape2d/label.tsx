"use client";

import { Group, Rect, Text } from "react-konva";
import type { LabelShape } from "@/lib/types";

export function renderLabel(shape: LabelShape, selected: boolean) {
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
