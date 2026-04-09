import { nanoid } from "nanoid";
import { getShapeGroupId } from "@/lib/track/shape-groups";
import type {
  PolylinePoint,
  PolylineShape,
  Shape,
  TrackDesign,
} from "@/lib/types";

function reversePolyline(path: PolylineShape): PolylineShape {
  return {
    ...path,
    points: [...path.points].reverse(),
  };
}

function endpointDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getPolylineAnchor(path: PolylineShape) {
  if (!path.points.length) {
    return { x: path.x, y: path.y };
  }

  const totals = path.points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: totals.x / path.points.length,
    y: totals.y / path.points.length,
  };
}

export function applyShapePatch(shape: Shape, patch: Partial<Shape>) {
  if (shape.kind === "polyline") {
    const polyline = shape;
    const nextPatch = { ...patch } as Partial<Shape>;
    const currentAnchor = getPolylineAnchor(polyline);
    const nextX =
      typeof nextPatch.x === "number" ? nextPatch.x : currentAnchor.x;
    const nextY =
      typeof nextPatch.y === "number" ? nextPatch.y : currentAnchor.y;

    if (typeof nextPatch.x === "number" || typeof nextPatch.y === "number") {
      const dx = nextX - currentAnchor.x;
      const dy = nextY - currentAnchor.y;
      polyline.points = polyline.points.map((point) => ({
        ...point,
        x: point.x + dx,
        y: point.y + dy,
      }));
      nextPatch.x = 0;
      nextPatch.y = 0;
    }

    Object.assign(polyline, nextPatch);
    return;
  }

  Object.assign(shape, patch);
}

export function setPolylinePoints(
  shape: Shape | undefined,
  points: PolylinePoint[]
) {
  if (!shape || shape.kind !== "polyline") return false;
  shape.points = points;
  return true;
}

export function updatePolylinePoint(
  shape: Shape | undefined,
  index: number,
  patch: Partial<PolylinePoint>
) {
  if (!shape || shape.kind !== "polyline") return false;
  if (index < 0 || index >= shape.points.length) return false;
  shape.points[index] = {
    ...shape.points[index],
    ...patch,
  };
  return true;
}

export function insertPolylinePoint(
  shape: Shape | undefined,
  index: number,
  point: PolylinePoint
) {
  if (!shape || shape.kind !== "polyline") return false;
  shape.points.splice(index, 0, point);
  return true;
}

export function removePolylinePoint(shape: Shape | undefined, index: number) {
  if (!shape || shape.kind !== "polyline") return false;
  if (shape.points.length <= 2) return false;
  if (index < 0 || index >= shape.points.length) return false;
  shape.points.splice(index, 1);
  return true;
}

export function appendPolylinePoint(
  shape: Shape | undefined,
  point: PolylinePoint
) {
  if (!shape || shape.kind !== "polyline") return false;
  shape.points.push(point);
  return true;
}

export function reversePolylinePoints(shape: Shape | undefined) {
  if (!shape || shape.kind !== "polyline") return false;
  shape.points.reverse();
  return true;
}

export function rotateShapes(
  shapeById: TrackDesign["shapeById"],
  ids: string[],
  delta: number
) {
  let changed = false;

  for (const id of ids) {
    const shape = shapeById[id];
    if (!shape) continue;
    if (shape.kind === "polyline" || shape.kind === "cone" || shape.locked) {
      continue;
    }
    shape.rotation = (((shape.rotation + delta) % 360) + 360) % 360;
    changed = true;
  }

  return changed;
}

export function nudgeShapes(
  shapeById: TrackDesign["shapeById"],
  ids: string[],
  dx: number,
  dy: number
) {
  let changed = false;

  for (const id of ids) {
    const shape = shapeById[id];
    if (!shape || shape.locked) continue;
    if (shape.kind === "polyline") {
      shape.points = shape.points.map((point) => ({
        ...point,
        x: point.x + dx,
        y: point.y + dy,
      }));
    } else {
      shape.x += dx;
      shape.y += dy;
    }
    changed = true;
  }

  return changed;
}

export function duplicateShapes(design: TrackDesign, ids: string[]) {
  const idSet = new Set(ids);
  const duplicatedGroupIds = new Map<string, string>();
  const toDuplicate = design.shapeOrder
    .filter((id) => idSet.has(id))
    .map((id) => design.shapeById[id])
    .filter((shape): shape is Shape => Boolean(shape));

  return toDuplicate.map((shape) => {
    const groupId = getShapeGroupId(shape);
    const nextGroupId = groupId
      ? (duplicatedGroupIds.get(groupId) ?? nanoid())
      : null;

    if (groupId && nextGroupId) {
      duplicatedGroupIds.set(groupId, nextGroupId);
    }

    if (shape.kind === "polyline") {
      return {
        ...shape,
        id: nanoid(),
        x: 0,
        y: 0,
        points: shape.points.map((point) => ({
          ...point,
          x: point.x + 1,
          y: point.y + 1,
        })),
        meta: nextGroupId
          ? { ...shape.meta, groupId: nextGroupId }
          : shape.meta,
        name: shape.name ? `${shape.name} copy` : undefined,
      } satisfies Shape;
    }

    return {
      ...shape,
      id: nanoid(),
      x: shape.x + 1,
      y: shape.y + 1,
      meta: nextGroupId ? { ...shape.meta, groupId: nextGroupId } : shape.meta,
      name: shape.name ? `${shape.name} copy` : undefined,
    } satisfies Shape;
  });
}

export function joinPolylineShapes(
  paths: PolylineShape[]
): PolylineShape | null {
  const openPaths = paths
    .filter((path) => !path.closed && path.points.length >= 2)
    .map((path) => ({
      ...path,
      x: 0,
      y: 0,
      points: path.points.map((point) => ({
        ...point,
        x: point.x + path.x,
        y: point.y + path.y,
      })),
    }));

  if (openPaths.length < 2) return null;

  const remaining = [...openPaths];
  let merged = remaining.shift()!;

  while (remaining.length) {
    const mergedStart = merged.points[0];
    const mergedEnd = merged.points.at(-1)!;
    let bestIndex = 0;
    let bestCandidate = remaining[0];
    let bestOrientation: "append" | "prepend" = "append";
    let bestReverse = false;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const candidateStart = candidate.points[0];
      const candidateEnd = candidate.points.at(-1)!;
      const options = [
        {
          distance: endpointDistance(mergedEnd, candidateStart),
          orientation: "append" as const,
          reverse: false,
        },
        {
          distance: endpointDistance(mergedEnd, candidateEnd),
          orientation: "append" as const,
          reverse: true,
        },
        {
          distance: endpointDistance(mergedStart, candidateEnd),
          orientation: "prepend" as const,
          reverse: false,
        },
        {
          distance: endpointDistance(mergedStart, candidateStart),
          orientation: "prepend" as const,
          reverse: true,
        },
      ];

      for (const option of options) {
        if (option.distance < bestDistance) {
          bestDistance = option.distance;
          bestIndex = index;
          bestCandidate = candidate;
          bestOrientation = option.orientation;
          bestReverse = option.reverse;
        }
      }
    });

    const nextPath = bestReverse
      ? reversePolyline(bestCandidate)
      : bestCandidate;
    const nextPoints =
      bestOrientation === "append"
        ? [...merged.points, ...nextPath.points]
        : [...nextPath.points, ...merged.points];

    const dedupedPoints = nextPoints.filter(
      (point, index, all) =>
        index === 0 ||
        endpointDistance(point, all[index - 1]) > 0.001 ||
        Math.abs((point.z ?? 0) - (all[index - 1].z ?? 0)) > 0.001
    );

    merged = {
      ...merged,
      points: dedupedPoints,
      x: 0,
      y: 0,
      showArrows: merged.showArrows || nextPath.showArrows,
      arrowSpacing: Math.min(
        merged.arrowSpacing ?? 15,
        nextPath.arrowSpacing ?? 15
      ),
      strokeWidth: Math.max(
        merged.strokeWidth ?? 0.26,
        nextPath.strokeWidth ?? 0.26
      ),
      closed: false,
      locked: false,
    };

    remaining.splice(bestIndex, 1);
  }

  return merged;
}

export function closePolyline(shape: Shape | undefined) {
  if (
    !shape ||
    shape.kind !== "polyline" ||
    shape.closed ||
    shape.points.length < 3
  ) {
    return false;
  }

  shape.closed = true;
  return true;
}
