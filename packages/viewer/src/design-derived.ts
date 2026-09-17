// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import { getDesignShapes } from "@/lib/track/design";
import { getDesignPolylineZRange } from "@/lib/track/polyline-derived";
import type { Shape, TrackDesign } from "./types";

/**
 * Store-free equivalents of src/store/selectors.ts's selectDesignShapes /
 * selectPrimaryPolyline / selectDesignPolylineZRange / selectHasPath. The
 * viewer has no selection state, so "primary polyline" is always the first
 * polyline shape - matching selectPrimaryPolyline's own no-selection
 * fallback.
 */
export function getViewerDesignShapes(design: TrackDesign): Shape[] {
  return getDesignShapes(design);
}

export function getViewerPrimaryPolylineId(
  shapes: readonly Shape[]
): string | null {
  const primary = shapes.find((shape) => shape.kind === "polyline");
  return primary?.id ?? null;
}

export function getViewerPolylineZRange(design: TrackDesign): [number, number] {
  return getDesignPolylineZRange(design);
}

export function getViewerHasPath(shapes: readonly Shape[]): boolean {
  return shapes.some(
    (shape) => shape.kind === "polyline" && shape.points.length >= 2
  );
}
