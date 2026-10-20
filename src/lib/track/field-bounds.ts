import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import type { Shape } from "@/lib/types";

export function shapeFitsField(
  shape: Shape,
  field: { width: number; height: number }
) {
  const within = (x: number, y: number) =>
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= -1e-8 &&
    y >= -1e-8 &&
    x <= field.width + 1e-8 &&
    y <= field.height + 1e-8;
  let fits = true;
  if (shape.kind === "polyline") {
    const bounds = getShapeLocalBounds(shape, 1);
    fits = Boolean(
      bounds &&
      within(bounds.x, bounds.y) &&
      within(bounds.x + bounds.width, bounds.y + bounds.height)
    );
  } else if (shape.kind === "label") fits = within(shape.x, shape.y);
  else {
    const bounds = getShapeLocalBounds(shape, 1);
    const angle = (shape.rotation * Math.PI) / 180;
    fits = Boolean(
      bounds &&
      [bounds.x, bounds.x + bounds.width].every((x) =>
        [bounds.y, bounds.y + bounds.height].every((y) =>
          within(
            shape.x + x * Math.cos(angle) - y * Math.sin(angle),
            shape.y + x * Math.sin(angle) + y * Math.cos(angle)
          )
        )
      )
    );
  }
  return fits;
}
