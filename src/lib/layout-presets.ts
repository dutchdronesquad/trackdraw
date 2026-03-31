import type { ShapeDraft, ShapeKind } from "@/lib/types";

export type LayoutPresetShapeDraft = Omit<
  ShapeDraft,
  "x" | "y" | "rotation"
> & {
  x: number;
  y: number;
  rotation?: number;
};

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  shapes: LayoutPresetShapeDraft[];
}

const gate = (
  x: number,
  y: number,
  rotation = 0,
  color = "#3b82f6"
): LayoutPresetShapeDraft => ({
  kind: "gate",
  x,
  y,
  rotation,
  width: 2,
  height: 2,
  thick: 0.2,
  color,
});

const ladder = (
  x: number,
  y: number,
  rotation = 0,
  color = "#14b8a6"
): LayoutPresetShapeDraft => ({
  kind: "ladder",
  x,
  y,
  rotation,
  width: 2,
  height: 6,
  rungs: 3,
  color,
});

const startFinish = (
  x: number,
  y: number,
  rotation = 0,
  color = "#f59e0b"
): LayoutPresetShapeDraft => ({
  kind: "startfinish",
  x,
  y,
  rotation,
  width: 3,
  color,
});

const flag = (
  x: number,
  y: number,
  rotation = 0,
  color = "#a855f7"
): LayoutPresetShapeDraft => ({
  kind: "flag",
  x,
  y,
  rotation,
  radius: 0.25,
  poleHeight: 3.5,
  color,
});

export const layoutPresets: LayoutPreset[] = [
  {
    id: "start-finish-setup",
    name: "Start / Finish Setup",
    description:
      "Launch pads with two side flags and a first gate to start the run.",
    shapes: [startFinish(0, 0), gate(0, 5), flag(-2.8, 0, 180), flag(2.8, 0)],
  },
  {
    id: "straight-gate-run",
    name: "Straight Gate Run",
    description:
      "A compact four-gate straight for quick speed sections or early lap shaping.",
    shapes: [gate(0, 0), gate(0, 5), gate(0, 10), gate(0, 15)],
  },
  {
    id: "slalom-run",
    name: "Slalom Run",
    description:
      "Five alternating flags for a readable slalom section with clear lateral movement.",
    shapes: [
      flag(0, 0),
      flag(2.6, 4.5, 180),
      flag(-2.6, 9, 0),
      flag(2.6, 13.5, 180),
      flag(-2.6, 18, 0),
    ],
  },
  {
    id: "ladder-section",
    name: "Ladder Section",
    description:
      "Two ladders in sequence to add a tall technical section without extra setup work.",
    shapes: [ladder(0, 0), ladder(0, 8)],
  },
];

export const DEFAULT_LAYOUT_PRESET_ID = layoutPresets[0].id;

const presetMap = new Map(layoutPresets.map((preset) => [preset.id, preset]));

export function getLayoutPresetById(id: string | null | undefined) {
  if (!id) return null;
  return presetMap.get(id) ?? null;
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

export function placeLayoutPreset(
  preset: LayoutPreset,
  anchor: { x: number; y: number },
  rotation = 0
) {
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
