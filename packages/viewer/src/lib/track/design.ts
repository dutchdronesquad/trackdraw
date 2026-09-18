// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

// Vendored subset of src/lib/track/design.ts (issue #870) - only the pure
// shape-reading helpers the viewer package actually needs. The app's own
// serialize/normalize/create/parse design functions are intentionally NOT
// vendored: they pull in @/lib/map-reference/* and @/lib/planning/inventory
// for editor/persistence concerns the read-only viewer never touches. Keep
// in sync manually with the upstream file - do not add editor-only exports
// back here without re-checking what they'd pull in.

import type { SerializedTrackDesign, Shape, TrackDesign } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
