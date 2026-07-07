import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import { getShapeGroupId, getShapeGroupName } from "@/lib/track/shape-groups";
import type { Shape } from "@/lib/types";

export const inspectorActionBtnClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/45 bg-background/80 px-2.5 text-[11px] font-medium text-foreground/82 transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8";

export const inspectorActionBtnPrimaryClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8";

export const inspectorActionBtnDangerClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/6 px-2.5 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8";

function finiteOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getShapeAnchorPosition(shape: Shape) {
  if (shape.kind !== "polyline" || shape.points.length === 0) {
    return { x: finiteOrZero(shape.x), y: finiteOrZero(shape.y) };
  }

  const totals = shape.points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + finiteOrZero(point.x),
      y: accumulator.y + finiteOrZero(point.y),
    }),
    { x: 0, y: 0 }
  );

  return {
    x: totals.x / shape.points.length,
    y: totals.y / shape.points.length,
  };
}

export function getSingleInspectorViewModel(shape: Shape, t: Translate) {
  const groupId = getShapeGroupId(shape);
  const groupName = getShapeGroupName(shape) ?? "";
  const shapeKindLabel = getShapeKindLabel(shape.kind, t);

  return {
    actionBtnClass:
      "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/45 bg-background/80 px-2.5 text-[11px] font-medium text-foreground/82 transition-colors hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8",
    actionBtnPrimaryClass:
      "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-2.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-40 lg:h-8",
    anchorPosition: getShapeAnchorPosition(shape),
    defaultColor: shape.color ?? "#3b82f6",
    groupId,
    groupName,
    shapeDisplayName: shape.name?.trim() || shapeKindLabel,
    shapeKindLabel,
    showPathActions:
      shape.kind === "polyline" && !shape.closed && shape.points.length >= 3,
  };
}

export function getInsertedWaypointMidpoint(
  current: { x: number; y: number; z?: number },
  next: { x: number; y: number; z?: number }
) {
  return {
    x: +((finiteOrZero(current.x) + finiteOrZero(next.x)) / 2).toFixed(2),
    y: +((finiteOrZero(current.y) + finiteOrZero(next.y)) / 2).toFixed(2),
    z: +((finiteOrZero(current.z) + finiteOrZero(next.z)) / 2).toFixed(2),
  };
}

export function getNextAppendedWaypoint(
  point:
    | {
        x: number;
        y: number;
        z?: number;
      }
    | undefined
) {
  const lastPoint = point ?? { x: 0, y: 0, z: 0 };
  return {
    x: +(finiteOrZero(lastPoint.x) + 1).toFixed(2),
    y: +(finiteOrZero(lastPoint.y) + 1).toFixed(2),
    z: finiteOrZero(lastPoint.z),
  };
}
