"use client";

import { memo } from "react";
import { Group } from "react-konva";
import { m2px } from "@/lib/track/units";
import { getShapeCanvasRenderRotationOffset } from "@/lib/track/items/registry";
import type { Shape } from "@/lib/types";
import {
  renderLockedIndicator,
  renderShape2D,
} from "@/components/canvas/renderers/shape2d";
import { PolylineShape } from "./PolylineShape";

interface ShareShapeNodeProps {
  designPpm: number;
  isPrimaryPolyline: boolean;
  shape: Shape;
  zmax: number;
  zmin: number;
}

function ShareShapeNodeComponent({
  designPpm,
  isPrimaryPolyline,
  shape,
  zmax,
  zmin,
}: ShareShapeNodeProps) {
  return (
    <Group
      x={m2px(shape.kind === "polyline" ? 0 : shape.x, designPpm)}
      y={m2px(shape.kind === "polyline" ? 0 : shape.y, designPpm)}
      rotation={shape.rotation + getShapeCanvasRenderRotationOffset(shape)}
      listening={false}
    >
      <Group opacity={shape.locked ? 0.58 : 1} listening={false}>
        {renderShape2D(shape, false, designPpm)}
        {shape.kind === "polyline" && (
          <PolylineShape
            designPpm={designPpm}
            isPrimaryPolyline={isPrimaryPolyline}
            path={shape}
            zmax={zmax}
            zmin={zmin}
          />
        )}
      </Group>
      {shape.locked && renderLockedIndicator(shape, false, designPpm)}
    </Group>
  );
}

export const ShapeNode = memo(ShareShapeNodeComponent);
