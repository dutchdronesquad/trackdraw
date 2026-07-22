import { nanoid } from "nanoid";
import {
  createCatalogShapeDraft,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LADDER_ELEMENT_ID,
  TRACKDRAW_START_FINISH_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { createDefaultDesign, nowIso } from "@/lib/track/design";
import type { ShapeDraft, TrackDesign } from "@/lib/types";

export interface StarterLayout {
  id: string;
  name: string;
  title: string;
  description: string;
  shapes: ShapeDraft[];
}

export type StarterLayoutTranslate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

type StarterLayoutTextField = "name" | "title" | "description";

const gate = (x: number, y: number, rotation = 0, color = "#3b82f6") => ({
  ...createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
    x,
    y,
    rotation,
    color,
  }),
});

const ladder = (x: number, y: number, rotation = 0, color = "#14b8a6") => ({
  ...createCatalogShapeDraft(TRACKDRAW_LADDER_ELEMENT_ID, {
    x,
    y,
    rotation,
    color,
  }),
});

const startFinish = (
  x: number,
  y: number,
  rotation = 0,
  color = "#f59e0b"
) => ({
  ...createCatalogShapeDraft(TRACKDRAW_START_FINISH_ELEMENT_ID, {
    x,
    y,
    rotation,
    color,
  }),
});

const flag = (x: number, y: number, rotation = 0, color = "#a855f7") => ({
  ...createCatalogShapeDraft(TRACKDRAW_FLAG_ELEMENT_ID, {
    x,
    y,
    rotation,
    color,
  }),
});

export const starterLayouts: StarterLayout[] = [
  {
    id: "open-practice",
    name: "Open practice",
    title: "Open Practice Layout",
    description: "Open flow with a start area and room to build your own lap.",
    shapes: [
      startFinish(0, 0),
      flag(-2.8, 0, 180),
      flag(2.8, 0),
      gate(0, 5),
      gate(-4, 11, -18),
      gate(4, 17, 18),
    ],
  },
  {
    id: "compact-race-start",
    name: "Compact race start",
    title: "Compact Race Start",
    description: "Tight opening with an immediate gate line and early turn.",
    shapes: [
      startFinish(0, 0),
      gate(0, 4.5),
      gate(0, 9),
      gate(4.5, 14, 20),
      gate(-4, 19, -24),
      flag(7, 14.5, 180),
      flag(-6.5, 19.5),
    ],
  },
  {
    id: "technical-ladder-line",
    name: "Technical ladder line",
    title: "Technical Ladder Line",
    description:
      "First gate, two ladders, and a follow-up gate for quick rhythm.",
    shapes: [
      startFinish(0, 0),
      gate(0, 5),
      ladder(0, 11),
      ladder(0, 19),
      gate(3.8, 25, 18),
      flag(-3.5, 15, 180),
      flag(3.5, 15),
    ],
  },
];

const starterLayoutMap = new Map(
  starterLayouts.map((layout) => [layout.id, layout])
);

function getStarterLayoutText(
  layout: StarterLayout,
  field: StarterLayoutTextField,
  t: StarterLayoutTranslate
) {
  return t(`starterLayouts.layouts.${layout.id}.${field}`);
}

export function getStarterLayoutById(id: string | null | undefined) {
  if (!id) return null;
  return starterLayoutMap.get(id) ?? null;
}

export function getStarterLayoutName(
  layout: StarterLayout,
  t: StarterLayoutTranslate
) {
  return getStarterLayoutText(layout, "name", t);
}

export function getStarterLayoutTitle(
  layout: StarterLayout,
  t: StarterLayoutTranslate
) {
  return getStarterLayoutText(layout, "title", t);
}

export function getStarterLayoutDescription(
  layout: StarterLayout,
  t: StarterLayoutTranslate
) {
  return getStarterLayoutText(layout, "description", t);
}

export function createStarterLayoutDesign(
  layoutId: string
): TrackDesign | null {
  const layout = getStarterLayoutById(layoutId);
  if (!layout) return null;

  const base = createDefaultDesign();
  const timestamp = nowIso();

  // Center shapes in the field
  const xs = layout.shapes.map((s) => s.x);
  const ys = layout.shapes.map((s) => s.y);
  const shapeCenterX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const shapeCenterY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const offsetX = base.field.width / 2 - shapeCenterX;
  const offsetY = base.field.height / 2 - shapeCenterY;

  const shapes = layout.shapes.map((shape) => ({
    ...shape,
    id: nanoid(),
    x: shape.x + offsetX,
    y: shape.y + offsetY,
  }));

  return {
    ...base,
    title: layout.title,
    shapeOrder: shapes.map((shape) => shape.id),
    shapeById: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
    updatedAt: timestamp,
  };
}
