import { nanoid } from "nanoid";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const nowIso = () => new Date().toISOString();

function normalizePolylinePosition(shape: PolylineShape): PolylineShape {
  const offsetX = shape.x ?? 0;
  const offsetY = shape.y ?? 0;

  return {
    ...shape,
    x: 0,
    y: 0,
    points: shape.points.map((point) => ({
      ...point,
      x: point.x + offsetX,
      y: point.y + offsetY,
    })),
  };
}

export function normalizeShape(shape: Shape): Shape {
  if (shape.kind === "polyline") {
    return {
      ...normalizePolylinePosition(shape),
      arrowSpacing: shape.arrowSpacing ?? 15,
      strokeWidth: shape.strokeWidth ?? 0.26,
      smooth: true,
    };
  }

  return shape;
}

export function normalizeDesign(design: TrackDesign): TrackDesign {
  return {
    ...design,
    version: 1,
    shapes: design.shapes.map(normalizeShape),
  };
}

export function createDefaultDesign(): TrackDesign {
  const timestamp = nowIso();
  return {
    id: nanoid(),
    version: 1,
    title: "New Track",
    description: "",
    tags: [],
    authorName: "",
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function parseDesign(value: unknown): TrackDesign | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.shapes)) return null;
  if (!isRecord(value.field)) return null;

  return normalizeDesign(value as unknown as TrackDesign);
}
