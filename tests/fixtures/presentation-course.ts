import { createDefaultDesign, normalizeDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

const course: Shape[] = [
  { id: "start", kind: "startfinish", x: 23, y: 47, rotation: 0, width: 4 },
  {
    id: "entry",
    kind: "gate",
    x: 23,
    y: 33,
    rotation: 0,
    width: 3,
    height: 2.1,
    color: "#ff8733",
  },
  {
    id: "stack",
    kind: "ladder",
    x: 35,
    y: 23,
    rotation: 45,
    width: 3,
    height: 5,
    rungs: 2,
    color: "#ededec",
  },
  {
    id: "flag",
    kind: "flag",
    x: 58,
    y: 17,
    rotation: 20,
    radius: 0.3,
    poleHeight: 4,
    color: "#da2346",
  },
  {
    ...createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 58,
      y: 35,
      rotation: 180,
      includeCatalogMetadata: true,
    }),
    id: "return",
  },
  {
    id: "dive",
    kind: "divegate",
    x: 49,
    y: 50,
    rotation: 105,
    width: 3,
    elevation: 4,
    tilt: 40,
    color: "#f09728",
  },
  {
    id: "race-line",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    closed: true,
    strokeWidth: 0.18,
    color: "#2465f5",
    points: [
      { x: 23, y: 47, z: 1 },
      { x: 23, y: 33, z: 1 },
      { x: 26, y: 26, z: 1.8 },
      { x: 35, y: 23, z: 3.1 },
      { x: 49, y: 16, z: 2 },
      { x: 61, y: 15, z: 1.5 },
      { x: 64, y: 23, z: 1 },
      { x: 58, y: 35, z: 1 },
      { x: 57, y: 44, z: 3.8 },
      { x: 49, y: 50, z: 3.9 },
      { x: 29, y: 55, z: 1.4 },
      { x: 22, y: 53, z: 1 },
    ],
  },
];

/** Stable course and camera positions for presentation, route and framing comparisons. */
export const presentationViews = {
  overview: { position: [6, 43, 88], target: [40, 0, 33] },
  low: { position: [13, 6, 49], target: [42, 3, 22] },
} as const;

export function createPresentationCourse(large = false) {
  const base = createDefaultDesign("presentation-course");
  const shapes = large
    ? Array.from({ length: 15 }, (_, i) =>
        course.map((shape) => {
          const x = (i % 5) * 80;
          const y = Math.floor(i / 5) * 65;
          const id = `${shape.id}-${i}`;
          return shape.kind === "polyline"
            ? {
                ...shape,
                id,
                points: shape.points.map((p) => ({
                  ...p,
                  x: p.x + x,
                  y: p.y + y,
                })),
              }
            : { ...shape, id, x: shape.x + x, y: shape.y + y };
        })
      ).flat()
    : course;
  return normalizeDesign({
    ...base,
    id: large ? "presentation-course-large" : "presentation-course",
    title: "Presentation course",
    field: { ...base.field, width: large ? 400 : 80, height: large ? 195 : 65 },
    createdAt: "2026-11-14T00:00:00.000Z",
    updatedAt: "2026-11-14T00:00:00.000Z",
    shapeById: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
    shapeOrder: shapes.map((shape) => shape.id),
  });
}
