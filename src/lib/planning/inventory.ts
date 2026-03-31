import { shapeKindLabels } from "@/lib/editor-tools";
import type {
  InventoryProfile,
  InventoryShapeKind,
  Shape,
  TrackDesign,
} from "@/lib/types";

export const inventoryKinds: InventoryShapeKind[] = [
  "gate",
  "ladder",
  "divegate",
  "startfinish",
  "flag",
  "cone",
];

export function createEmptyInventoryProfile(): InventoryProfile {
  return {
    gate: 0,
    ladder: 0,
    divegate: 0,
    startfinish: 0,
    flag: 0,
    cone: 0,
  };
}

export function normalizeInventoryProfile(
  profile?: Partial<InventoryProfile> | null
): InventoryProfile {
  const base = createEmptyInventoryProfile();
  if (!profile) return base;

  for (const kind of inventoryKinds) {
    const raw = profile[kind];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    base[kind] = Math.max(0, Math.floor(raw));
  }

  return base;
}

export function getRequiredInventoryCounts(
  designOrShapes: TrackDesign | Shape[]
): InventoryProfile {
  const shapes = Array.isArray(designOrShapes)
    ? designOrShapes
    : designOrShapes.shapeOrder
        .map((id) => designOrShapes.shapeById[id])
        .filter((shape): shape is Shape => Boolean(shape));
  const counts = createEmptyInventoryProfile();

  for (const shape of shapes) {
    if (!inventoryKinds.includes(shape.kind as InventoryShapeKind)) continue;
    counts[shape.kind as InventoryShapeKind] += 1;
  }

  return counts;
}

export function getInventoryComparison(design: TrackDesign) {
  const available = normalizeInventoryProfile(design.inventory);
  const required = getRequiredInventoryCounts(design);

  return inventoryKinds.map((kind) => {
    const needed = required[kind];
    const stock = available[kind];
    const missing = Math.max(0, needed - stock);

    return {
      kind,
      label: shapeKindLabels[kind],
      required: needed,
      available: stock,
      missing,
      buildable: missing === 0,
    };
  });
}
