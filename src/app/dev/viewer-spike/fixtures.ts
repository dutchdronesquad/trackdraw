import { createDefaultDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_HURDLE_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  TRACKDRAW_CONE_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_LABEL_ELEMENT_ID,
  TRACKDRAW_TOWER_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

function shapeWithId(id: string, draft: object): Shape {
  return { ...draft, id } as Shape;
}

/**
 * Covers: TrackDraw-owned (procedural) and MultiGP-owned (textured) catalog
 * obstacles, a route with elevation and a rotated obstacle, and a label -
 * the representative set the Phase 1 extraction spike (issue #859) needs to
 * prove 2D/3D parity and non-root asset resolution against.
 */
export function buildMultiOrgDesign(): TrackDesign {
  const design = createDefaultDesign();

  const gate = shapeWithId(
    "spike-gate-trackdraw",
    createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, {
      x: 8,
      y: 6,
      rotation: 45,
      includeCatalogMetadata: true,
    })
  );

  const multigpGate = shapeWithId(
    "spike-gate-multigp",
    createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 30,
      y: 10,
      rotation: 180,
      includeCatalogMetadata: true,
    })
  );

  const cone = shapeWithId(
    "spike-cone",
    createCatalogShapeDraft(TRACKDRAW_CONE_ELEMENT_ID, {
      x: 20,
      y: 25,
      includeCatalogMetadata: true,
    })
  );

  const hurdle = shapeWithId(
    "spike-hurdle-multigp",
    createCatalogShapeDraft(MULTIGP_HURDLE_ELEMENT_ID, {
      x: 45,
      y: 25,
      rotation: 90,
      includeCatalogMetadata: true,
    })
  );

  const labelDraft = createCatalogShapeDraft(TRACKDRAW_LABEL_ELEMENT_ID, {
    x: 10,
    y: 30,
    includeCatalogMetadata: true,
  });
  const label = shapeWithId("spike-label", {
    ...labelDraft,
    text: "Viewer extraction spike",
  });

  const route: PolylineShape = {
    id: "spike-route",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 8, y: 6, z: 0 },
      { x: 20, y: 10, z: 2 },
      { x: 30, y: 10, z: 4 },
      { x: 45, y: 20, z: 1.5 },
      { x: 45, y: 25, z: 0 },
    ],
  };

  const shapes = [gate, multigpGate, cone, hurdle, label, route];

  return {
    ...design,
    id: "spike-multi-org",
    title: "Viewer Spike – Multi-org",
    field: { width: 60, height: 40, origin: "tl", gridStep: 5, ppm: 16 },
    shapeOrder: shapes.map((shape) => shape.id),
    shapeById: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
  };
}

/** A visually distinct second design used to prove multi-instance isolation. */
export function buildSecondDesign(): TrackDesign {
  const design = createDefaultDesign();

  const tower = shapeWithId(
    "spike-b-tower",
    createCatalogShapeDraft(TRACKDRAW_TOWER_ELEMENT_ID, {
      x: 6,
      y: 6,
      rotation: 0,
      includeCatalogMetadata: true,
    })
  );

  const cone = shapeWithId(
    "spike-b-cone",
    createCatalogShapeDraft(TRACKDRAW_CONE_ELEMENT_ID, {
      x: 14,
      y: 4,
      includeCatalogMetadata: true,
    })
  );

  const route: PolylineShape = {
    id: "spike-b-route",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 6, y: 6, z: 0 },
      { x: 14, y: 4, z: 3 },
      { x: 18, y: 12, z: 0 },
    ],
  };

  const shapes = [tower, cone, route];

  return {
    ...design,
    id: "spike-second",
    title: "Viewer Spike – Instance B",
    field: { width: 24, height: 18, origin: "tl", gridStep: 2, ppm: 24 },
    shapeOrder: shapes.map((shape) => shape.id),
    shapeById: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
  };
}
