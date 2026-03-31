import type { Shape, TrackDesign } from "@/lib/types";

export function getShapeGroupId(shape: Shape): string | null {
  const groupId = shape.meta?.groupId;
  return typeof groupId === "string" && groupId.length > 0 ? groupId : null;
}

export function getShapeGroupName(shape: Shape): string | null {
  const groupName = shape.meta?.groupName;
  return typeof groupName === "string" ? groupName : null;
}

export function getGroupMemberIds(
  design: TrackDesign,
  groupId: string
): string[] {
  return design.shapeOrder.filter((id) => {
    const shape = design.shapeById[id];
    return Boolean(shape && getShapeGroupId(shape) === groupId);
  });
}

export function expandGroupedSelection(
  design: TrackDesign,
  ids: string[]
): string[] {
  if (ids.length === 0) return [];

  const selected = new Set(ids);

  for (const id of ids) {
    const shape = design.shapeById[id];
    if (!shape) continue;

    const groupId = getShapeGroupId(shape);
    if (!groupId) continue;

    for (const memberId of getGroupMemberIds(design, groupId)) {
      selected.add(memberId);
    }
  }

  return design.shapeOrder.filter((id) => selected.has(id));
}

export function selectionHasGroupedShapes(
  shapes: Array<Shape | undefined>
): boolean {
  return shapes.some((shape) => Boolean(shape && getShapeGroupId(shape)));
}
