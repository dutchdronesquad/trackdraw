import { distance2D } from "@/lib/track/geometry";
import { getGeneratedRouteProfile } from "@/lib/track/items/registry";
import type {
  PolylinePoint,
  PolylineShape,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";

const MIN_SEGMENT_DISTANCE_METERS = 0.25;

export type GeneratedRouteWarningType =
  "unsupported-shape" | "too-few-obstacles" | "close-obstacles";

export type GeneratedRouteWarning = {
  type: GeneratedRouteWarningType;
  shapeId?: string;
  shapeIds?: string[];
};

export type GeneratedRouteReport = {
  totalShapeCount: number;
  supportedObstacleIds: string[];
  unsupportedShapeIds: string[];
  warnings: GeneratedRouteWarning[];
};

export type GeneratedRouteResult = {
  draft: ShapeDraft<PolylineShape> | null;
  report: GeneratedRouteReport;
};

export function isGeneratedRaceLine(shape: Shape | null | undefined): boolean {
  if (!shape || shape.kind !== "polyline") return false;
  if (shape.meta?.generatedRoute === true) return true;

  // Legacy generated routes did not have metadata. They were smooth,
  // arrowed, and intentionally left without a fixed color so elevation
  // coloring could show through.
  return shape.smooth === true && shape.showArrows === true && !shape.color;
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function getHeadingUnitVector(headingDeg: number) {
  const radians = degToRad(headingDeg);
  return {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
}

function pointAlongHeading(
  anchor: PolylinePoint,
  headingDeg: number,
  distance: number
): PolylinePoint {
  const unit = getHeadingUnitVector(headingDeg);
  return {
    x: anchor.x + unit.x * distance,
    y: anchor.y + unit.y * distance,
    z: anchor.z,
  };
}

function appendPoint(points: PolylinePoint[], point: PolylinePoint) {
  const previous = points.at(-1);
  if (previous && distance2D(previous, point) < MIN_SEGMENT_DISTANCE_METERS) {
    return;
  }

  points.push(point);
}

function getOrderedShapes(design: TrackDesign): Shape[] {
  return design.shapeOrder
    .map((shapeId) => design.shapeById[shapeId])
    .filter((shape): shape is Shape => Boolean(shape));
}

function getBearingDeg(from: PolylinePoint, to: PolylinePoint): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

type SupportedRouteItem = {
  shape: Shape;
  anchor: PolylinePoint;
  traversal: "through" | "marker";
  headingDeg?: number;
  approachDistance?: number;
};

export function generateRaceLineDraft(
  design: TrackDesign
): GeneratedRouteResult {
  const warnings: GeneratedRouteWarning[] = [];
  const unsupportedShapeIds: string[] = [];
  const points: PolylinePoint[] = [];
  const orderedShapes = getOrderedShapes(design);
  const supportedItems: SupportedRouteItem[] = [];

  for (const shape of orderedShapes) {
    if (shape.kind === "polyline") continue;

    const profile = getGeneratedRouteProfile(shape);
    if (
      !profile ||
      (profile.traversal !== "through" && profile.traversal !== "marker")
    ) {
      unsupportedShapeIds.push(shape.id);
      warnings.push({ type: "unsupported-shape", shapeId: shape.id });
      continue;
    }

    const anchor = profile.getAnchor?.(shape) ?? {
      x: shape.x,
      y: shape.y,
      z: 1,
    };

    supportedItems.push({
      shape,
      anchor,
      traversal: profile.traversal,
      headingDeg: profile.getHeadingDeg?.(shape),
      approachDistance: profile.getApproachDistance?.(shape),
    });
  }

  supportedItems.forEach((item, index) => {
    if (item.traversal === "marker") {
      // A marker (e.g. a flag) isn't flown through, so route around it
      // instead of straight over its exact position. Which side to pass on
      // depends entirely on where it was placed relative to the rest of the
      // track, which no fixed geometric rule can guess reliably, so prefer
      // the marker's own facing direction (set by rotating it on canvas,
      // fully under the user's control) and only fall back to a guess based
      // on the local direction of travel when the shape has no facing.
      const previousAnchor = supportedItems[index - 1]?.anchor;
      const nextAnchor = supportedItems[index + 1]?.anchor;
      const fallbackBearingDeg = previousAnchor
        ? getBearingDeg(previousAnchor, item.anchor)
        : nextAnchor
          ? getBearingDeg(item.anchor, nextAnchor)
          : item.shape.rotation;
      const offsetHeadingDeg = item.headingDeg ?? fallbackBearingDeg;
      const clearance = Math.max(1, item.approachDistance ?? 1);

      appendPoint(
        points,
        pointAlongHeading(item.anchor, offsetHeadingDeg, clearance)
      );
      return;
    }

    const headingDeg = item.headingDeg ?? item.shape.rotation;
    const approachDistance = Math.max(1, item.approachDistance ?? 2);

    if (index === 0) {
      appendPoint(
        points,
        pointAlongHeading(item.anchor, headingDeg, -approachDistance)
      );
    }
    appendPoint(points, item.anchor);
    if (index === supportedItems.length - 1 && supportedItems.length > 1) {
      appendPoint(
        points,
        pointAlongHeading(item.anchor, headingDeg, approachDistance)
      );
    }
  });

  const supportedObstacleIds = supportedItems.map((item) => item.shape.id);

  if (supportedObstacleIds.length < 2) {
    warnings.push({ type: "too-few-obstacles" });
  }

  for (let index = 1; index < supportedObstacleIds.length; index += 1) {
    const previous = design.shapeById[supportedObstacleIds[index - 1]];
    const current = design.shapeById[supportedObstacleIds[index]];
    if (previous && current && distance2D(previous, current) < 2) {
      warnings.push({
        type: "close-obstacles",
        shapeIds: [previous.id, current.id],
      });
    }
  }

  const report: GeneratedRouteReport = {
    totalShapeCount: orderedShapes.filter((shape) => shape.kind !== "polyline")
      .length,
    supportedObstacleIds,
    unsupportedShapeIds,
    warnings,
  };

  if (points.length < 2) {
    return { draft: null, report };
  }

  return {
    draft: {
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points,
      closed: false,
      smooth: true,
      showArrows: true,
      meta: { generatedRoute: true },
    },
    report,
  };
}
