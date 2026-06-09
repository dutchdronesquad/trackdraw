"use client";

import { Circle } from "react-konva";
import { getCone2DShape } from "@/lib/track/shape2d";
import type { ConeShape } from "@/lib/types";

export function renderCone(shape: ConeShape, selected: boolean, ppm: number) {
  const { color, radius, selectionRadius } = getCone2DShape(shape, ppm);
  return (
    <>
      {selected && (
        <Circle
          radius={selectionRadius}
          stroke="#3b82f6"
          strokeWidth={1.3}
          opacity={0.9}
          dash={[5, 4]}
          listening={false}
        />
      )}
      <Circle
        radius={radius}
        fill={color}
        opacity={1}
        stroke={color}
        strokeWidth={2}
      />
    </>
  );
}
