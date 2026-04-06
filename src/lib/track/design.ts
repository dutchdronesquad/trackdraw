import { nanoid } from "nanoid";
import { normalizeInventoryProfile } from "@/lib/planning/inventory";
import type {
  PolylineShape,
  SerializedTrackDesign,
  Shape,
  TrackDesign,
} from "@/lib/types";

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

  if (shape.kind === "ladder") {
    return {
      ...shape,
      elevation: shape.elevation ?? 0,
    };
  }

  return shape;
}

function normalizeShapes(shapes: Shape[]) {
  const normalizedShapes = shapes.map(normalizeShape);
  return {
    shapeById: Object.fromEntries(
      normalizedShapes.map((shape) => [shape.id, shape] as const)
    ),
    shapeOrder: normalizedShapes.map((shape) => shape.id),
  };
}

function hasNormalizedShapeStorage(
  design: TrackDesign | SerializedTrackDesign
): design is TrackDesign {
  return (
    Array.isArray((design as Partial<TrackDesign>).shapeOrder) &&
    isRecord((design as Partial<TrackDesign>).shapeById)
  );
}

function getRawDesignShapes(
  design: TrackDesign | SerializedTrackDesign
): Shape[] {
  if (hasNormalizedShapeStorage(design)) {
    return design.shapeOrder
      .map((id) => design.shapeById[id])
      .filter((shape): shape is Shape => Boolean(shape));
  }

  if (Array.isArray((design as Partial<SerializedTrackDesign>).shapes)) {
    return (design as SerializedTrackDesign).shapes.filter(
      (shape): shape is Shape => Boolean(shape)
    );
  }

  return [];
}

export function getDesignShapes(design: TrackDesign): Shape[] {
  return getRawDesignShapes(design);
}

export function getDesignShapeById(design: TrackDesign, id: string) {
  if (isRecord((design as Partial<TrackDesign>).shapeById)) {
    return (design as Partial<TrackDesign>).shapeById?.[id] ?? null;
  }

  if (
    Array.isArray((design as unknown as Partial<SerializedTrackDesign>).shapes)
  ) {
    return (
      (design as unknown as SerializedTrackDesign).shapes.find(
        (shape) => shape?.id === id
      ) ?? null
    );
  }

  return null;
}

export function serializeDesign(design: TrackDesign): SerializedTrackDesign {
  return {
    id: design.id,
    version: design.version,
    title: design.title,
    description: design.description,
    tags: design.tags,
    authorName: design.authorName,
    inventory: normalizeInventoryProfile(design.inventory),
    field: design.field,
    shapes: getDesignShapes(design),
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

export function normalizeDesign(
  design: TrackDesign | SerializedTrackDesign
): TrackDesign {
  const { shapeById, shapeOrder } = normalizeShapes(getRawDesignShapes(design));
  return {
    ...design,
    version: 1,
    inventory: normalizeInventoryProfile(
      (design as Partial<TrackDesign>).inventory
    ),
    shapeById,
    shapeOrder,
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
    inventory: normalizeInventoryProfile(),
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapeOrder: [],
    shapeById: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function parseDesign(value: unknown): TrackDesign | null {
  if (!isRecord(value)) return null;
  if (!isRecord(value.field)) return null;
  if (!Array.isArray(value.shapes) && !Array.isArray(value.shapeOrder)) {
    return null;
  }

  return normalizeDesign(
    value as unknown as TrackDesign | SerializedTrackDesign
  );
}
