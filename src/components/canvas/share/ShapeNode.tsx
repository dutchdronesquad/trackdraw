"use client";

import { memo } from "react";
import { Group } from "react-konva";
import { m2px } from "@/lib/track/units";
import type { Shape } from "@/lib/types";
import {
  renderCone,
  renderDiveGate,
  renderFlag,
  renderGate,
  renderLabel,
  renderLadder,
  renderLockedIndicator,
  renderStartFinish,
} from "@/components/canvas/renderers/shape-renderers";
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
      rotation={shape.rotation}
      listening={false}
    >
      <Group opacity={shape.locked ? 0.58 : 1} listening={false}>
        {shape.kind === "gate" && renderGate(shape, false, designPpm)}
        {shape.kind === "flag" && renderFlag(shape, false, designPpm)}
        {shape.kind === "cone" && renderCone(shape, false, designPpm)}
        {shape.kind === "label" && renderLabel(shape, false)}
        {shape.kind === "startfinish" &&
          renderStartFinish(shape, false, designPpm)}
        {shape.kind === "ladder" && renderLadder(shape, false, designPpm)}
        {shape.kind === "divegate" && renderDiveGate(shape, false, designPpm)}
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
