import { nanoid } from "nanoid";
import { nowIso, parseDesign } from "@/lib/track/design";
import { trackItemAdapterByKind } from "@/lib/track/items/registry";
import type { TrackDesign } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// File boundaries must reject unsupported versions or broken item references rather
// than normalize them into an apparently valid project with lost track content.
export function parseProjectFile(value: unknown): TrackDesign | null {
  if (
    !isRecord(value) ||
    ![undefined, 1, 2].includes(value.version as number | undefined)
  )
    return null;
  if (
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.title !== "string"
  )
    return null;
  if (!isRecord(value.field)) return null;
  if (
    ![value.field.width, value.field.height].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n > 0
    )
  )
    return null;
  let shapes: unknown[];
  if (Array.isArray(value.shapeOrder) && isRecord(value.shapeById)) {
    const byId = value.shapeById;
    if (Object.keys(byId).length !== value.shapeOrder.length) return null;
    shapes = value.shapeOrder.map((id) =>
      typeof id === "string" ? byId[id] : null
    );
    if (
      shapes.some(
        (shape, index) =>
          !isRecord(shape) ||
          shape.id !== (value.shapeOrder as unknown[])[index]
      )
    )
      return null;
  } else if (Array.isArray(value.shapes)) shapes = value.shapes;
  else return null;
  const ids = new Set<string>();
  for (const shape of shapes) {
    if (
      !isRecord(shape) ||
      typeof shape.id !== "string" ||
      !shape.id ||
      ids.has(shape.id) ||
      typeof shape.kind !== "string" ||
      !Object.hasOwn(trackItemAdapterByKind, shape.kind)
    )
      return null;
    ids.add(shape.id);
  }
  try {
    return parseDesign(value);
  } catch {
    return null;
  }
}

// A desktop file import is a portable copy, not authority to overwrite a cloud
// project with the same ID. Shape IDs and all track content remain unchanged.
export function createImportedProjectCopy(design: TrackDesign): TrackDesign {
  const timestamp = nowIso();
  return {
    ...design,
    id: nanoid(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
