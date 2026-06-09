import { nanoid } from "nanoid";
import { normalizeMapReference } from "@/lib/map-reference/geometry";
import { normalizeInventoryProfile } from "@/lib/planning/inventory";
import { DEFAULT_POLYLINE_STROKE_WIDTH } from "@/lib/track/constants";
import { normalizeShapeTimingMeta } from "@/lib/track/timing";
import type {
  DiveGateShape,
  PolylineShape,
  SerializedTrackDesign,
  Shape,
  TowerShape,
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
    return normalizeShapeTimingMeta({
      ...normalizePolylinePosition(shape),
      frontOffsetDeg: shape.frontOffsetDeg ?? 0,
      arrowSpacing: shape.arrowSpacing ?? 15,
      strokeWidth: shape.strokeWidth ?? DEFAULT_POLYLINE_STROKE_WIDTH,
      smooth: true,
    });
  }

  if (shape.kind === "ladder") {
    return normalizeShapeTimingMeta({
      ...shape,
      frontOffsetDeg: shape.frontOffsetDeg ?? 0,
      elevation: shape.elevation ?? 0,
    });
  }

  if (shape.kind === "divegate") {
    const { size: legacySize, ...rest } = shape as DiveGateShape & {
      size?: number;
    };
    return normalizeShapeTimingMeta({
      ...rest,
      width: shape.width ?? legacySize ?? 2.8,
      frontOffsetDeg: shape.frontOffsetDeg ?? 0,
    });
  }

  if (shape.kind === "tower") {
    const tower = shape as TowerShape;
    return normalizeShapeTimingMeta({
      ...tower,
      width: tower.width ?? 2,
      height: tower.height ?? 2,
      levels: Math.max(1, Math.min(4, Math.round(tower.levels ?? 1))),
      elevation: Math.max(0, tower.elevation ?? 0),
      frontOffsetDeg: tower.frontOffsetDeg ?? 0,
    });
  }

  return normalizeShapeTimingMeta({
    ...shape,
    frontOffsetDeg: shape.frontOffsetDeg ?? 0,
  });
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

export function serializeDesign(
  design: TrackDesign,
  options: { includeMapReference?: boolean } = {}
): SerializedTrackDesign {
  return {
    id: design.id,
    version: design.version,
    title: design.title,
    description: design.description,
    tags: design.tags,
    authorName: design.authorName,
    inventory: normalizeInventoryProfile(design.inventory),
    field: design.field,
    mapReference:
      options.includeMapReference === false
        ? null
        : normalizeMapReference(design.mapReference),
    shapes: getDesignShapes(design),
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
  };
}

export function serializeDesignForShare(
  design: TrackDesign
): SerializedTrackDesign {
  return serializeDesign(design, { includeMapReference: false });
}

function migrateV1ShapeRotations(
  shapeById: Record<string, Shape>
): Record<string, Shape> {
  const result: Record<string, Shape> = {};
  for (const [id, shape] of Object.entries(shapeById)) {
    if (
      shape.kind === "gate" ||
      shape.kind === "ladder" ||
      shape.kind === "tower"
    ) {
      result[id] = {
        ...shape,
        rotation: ((shape.rotation ?? 0) - 180 + 360) % 360,
      };
    } else {
      result[id] = shape;
    }
  }
  return result;
}

export function normalizeDesign(
  design: TrackDesign | SerializedTrackDesign
): TrackDesign {
  const inputVersion = (design as { version?: number }).version;
  const { shapeById, shapeOrder } = normalizeShapes(getRawDesignShapes(design));
  const migratedShapeById =
    inputVersion === 1 || inputVersion === undefined
      ? migrateV1ShapeRotations(shapeById)
      : shapeById;
  return {
    ...design,
    version: 2,
    inventory: normalizeInventoryProfile(
      (design as Partial<TrackDesign>).inventory
    ),
    mapReference: normalizeMapReference(
      (design as Partial<TrackDesign>).mapReference
    ),
    shapeById: migratedShapeById,
    shapeOrder,
  };
}

export function createDefaultDesign(): TrackDesign {
  const timestamp = nowIso();
  return {
    id: nanoid(),
    version: 2,
    title: "New Track",
    description: "",
    tags: [],
    authorName: "",
    inventory: normalizeInventoryProfile(),
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    mapReference: null,
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
