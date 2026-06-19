import type { PolylineShape, Shape, ShapeDraft, ShapeKind } from "@/lib/types";

type PlaceablePresetShape = Exclude<Shape, PolylineShape>;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type LayoutPresetShapeDraft = DistributiveOmit<
  ShapeDraft<PlaceablePresetShape>,
  "rotation"
> & {
  rotation?: number;
};

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  shapes: LayoutPresetShapeDraft[];
}

export function findPresetById(
  id: string | null | undefined,
  userPresets: LayoutPreset[]
): LayoutPreset | null {
  if (!id) return null;
  return userPresets.find((p) => p.id === id) ?? null;
}

export function getLayoutPresetShapeCount(preset: LayoutPreset) {
  return preset.shapes.length;
}

export function getLayoutPresetKindCounts(preset: LayoutPreset) {
  const counts = new Map<ShapeKind, number>();

  for (const shape of preset.shapes) {
    counts.set(shape.kind, (counts.get(shape.kind) ?? 0) + 1);
  }

  return counts;
}

export function getLayoutPresetBounds(preset: LayoutPreset) {
  if (preset.shapes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1 };
  }

  const points = preset.shapes.map((shape) => ({ x: shape.x, y: shape.y }));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function shapesToPreset(
  shapes: Shape[],
  name: string,
  id: string
): LayoutPreset {
  const placeable = shapes.filter(
    (shape): shape is PlaceablePresetShape => shape.kind !== "polyline"
  );
  const count = placeable.length;
  const cx = count > 0 ? placeable.reduce((s, p) => s + p.x, 0) / count : 0;
  const cy = count > 0 ? placeable.reduce((s, p) => s + p.y, 0) / count : 0;

  const presetShapes: LayoutPresetShapeDraft[] = placeable.map((shape) => {
    const {
      id: _id,
      locked: _locked,
      meta: _meta,
      ...rest
    } = shape as unknown as {
      id: string;
      locked: boolean | undefined;
      meta: Record<string, unknown> | undefined;
    } & LayoutPresetShapeDraft;
    return { ...rest, x: shape.x - cx, y: shape.y - cy };
  });

  return { id, name, description: "", shapes: presetShapes };
}

export function placeLayoutPreset(
  preset: LayoutPreset,
  anchor: { x: number; y: number },
  rotation = 0
): ShapeDraft[] {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return preset.shapes.map((shape) => {
    const rotatedX = shape.x * cos - shape.y * sin;
    const rotatedY = shape.x * sin + shape.y * cos;

    return {
      ...shape,
      x: anchor.x + rotatedX,
      y: anchor.y + rotatedY,
      rotation: (shape.rotation ?? 0) + rotation,
      meta: {
        ...shape.meta,
        presetId: preset.id,
      },
    } satisfies ShapeDraft;
  });
}
