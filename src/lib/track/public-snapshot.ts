import {
  createDefaultDesign,
  getDesignShapes,
  normalizeDesign,
} from "./design";
import {
  createTrackElementCatalogIdentity,
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
} from "./elements/catalog";
import { getShapeTimingMarker } from "./timing";
import type { Shape, TrackDesign } from "@/lib/types";

// Only rendering/geometry fields cross from a private project into a public design.
const shapeFields = new Set([
  "id",
  "kind",
  "name",
  "x",
  "y",
  "rotation",
  "frontOffsetDeg",
  "color",
  "width",
  "height",
  "thick",
  "levels",
  "elevation",
  "radius",
  "poleHeight",
  "text",
  "fontSize",
  "project",
  "rungs",
  "tilt",
  "variant",
  "points",
  "closed",
  "strokeWidth",
  "showArrows",
  "arrowSpacing",
  "smooth",
]);
export function publicTeamSnapshot(
  design: TrackDesign,
  snapshotId: string,
  timestamp = new Date().toISOString()
) {
  const now = timestamp;
  return normalizeDesign({
    id: snapshotId,
    version: 2,
    title: design.title,
    description: design.description,
    inventory: createDefaultDesign().inventory,
    field: {
      width: design.field.width,
      height: design.field.height,
      origin: design.field.origin,
      gridStep: design.field.gridStep,
      ppm: design.field.ppm,
    },
    mapReference: null,
    createdAt: now,
    updatedAt: now,
    shapes: getDesignShapes(design).map((shape) => {
      const publicShape = Object.fromEntries(
        Object.entries(shape).filter(([key]) => shapeFields.has(key))
      ) as unknown as Shape;
      if (publicShape.kind === "polyline")
        publicShape.points = publicShape.points.map(({ x, y, z }) => ({
          x,
          y,
          ...(z === undefined ? {} : { z }),
        }));
      const catalog = getTrackElementCatalogEntry(
        getTrackElementCatalogIdentity(shape.meta)?.elementId
      );
      const timing = getShapeTimingMarker(shape);
      if (catalog || timing)
        publicShape.meta = {
          ...(catalog
            ? { catalog: createTrackElementCatalogIdentity(catalog) }
            : {}),
          ...(timing ? { timing } : {}),
        };
      const appearance = shape.appearance;
      if (appearance?.source === "registry")
        publicShape.appearance = {
          source: "registry",
          collectionId: appearance.collectionId,
          textureId: appearance.textureId,
          templateId: appearance.templateId,
        };
      return publicShape;
    }),
  });
}
