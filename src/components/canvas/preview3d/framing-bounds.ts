import * as THREE from "three";
import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import { POLYLINE_3D_HEIGHT_OFFSET } from "@/lib/track/constants";
import { getDiveGateVisualSpec } from "@/lib/track/elements/visual";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import type { Shape } from "@/lib/types";
import { getPolylineTubeRadius } from "./items/RaceLine3D";
import { getShapeTopY } from "./items/TrackItem3D";

const itemBounds = new WeakMap<Shape, THREE.Box3>();

export function getItemFramingBounds(shape: Shape): THREE.Box3 {
  const cached = itemBounds.get(shape);
  if (cached) return cached;
  const bounds = new THREE.Box3();
  itemBounds.set(shape, bounds);

  if (shape.kind === "polyline") {
    const path = getPolylineCurve3Derived(shape, {
      heightOffset: POLYLINE_3D_HEIGHT_OFFSET,
    });
    if (path) {
      // Sample the same tube ring centers as TubeGeometry.
      bounds
        .setFromPoints(path.curve.getSpacedPoints(path.segmentCount))
        .expandByScalar(getPolylineTubeRadius(shape));
    }
    return bounds;
  }

  if (shape.kind === "label") {
    // Billboard labels can face any direction during the transition.
    const size = Math.max(0.3, (shape.fontSize ?? 18) * 0.055);
    const radius =
      Math.hypot(Math.max(0.8, shape.text.length * size * 0.62), size * 1.4) /
      2;
    bounds
      .expandByPoint(
        new THREE.Vector3(shape.x, shape.project ? 0.05 : 2.5, shape.y)
      )
      .expandByScalar(radius);
    if (shape.project) {
      bounds.min.y = 0;
      bounds.max.y = 0.05;
    }
    return bounds;
  }

  const footprint = getShapeLocalBounds(shape, 1);
  if (!footprint) return bounds;
  const angle = THREE.MathUtils.degToRad(shape.rotation);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let minY = shape.kind === "ladder" ? Math.max(0, shape.elevation ?? 0) : 0;
  let maxY = getShapeTopY(shape) + 0.35; // Space for the selection marker.
  let padding = 0.15;
  if (shape.kind === "divegate" && !getDiveGateVisualSpec(shape)) {
    const tilt = THREE.MathUtils.degToRad(shape.tilt ?? 0);
    const center = shape.elevation ?? 3;
    const halfHeight =
      (Math.abs(Math.sin(tilt)) * (shape.width ?? 2.8)) / 2 +
      (shape.thick ?? 0.2) / Math.SQRT2;
    minY = Math.min(0, center - halfHeight);
    maxY = Math.max(maxY, center + halfHeight);
    padding = Math.max(padding, shape.thick ?? 0.2);
  }

  for (const x of [footprint.x, footprint.x + footprint.width]) {
    for (const z of [footprint.y, footprint.y + footprint.height]) {
      const worldX = shape.x + x * cos - z * sin;
      const worldZ = shape.y + x * sin + z * cos;
      bounds.expandByPoint(
        new THREE.Vector3(worldX - padding, minY, worldZ - padding)
      );
      bounds.expandByPoint(
        new THREE.Vector3(worldX + padding, maxY, worldZ + padding)
      );
    }
  }
  return bounds;
}

export function getCourseFramingBounds(
  shapes: readonly Shape[],
  field: { width: number; height: number }
) {
  const bounds = new THREE.Box3();
  for (const shape of shapes) {
    if (shape.kind !== "label") bounds.union(getItemFramingBounds(shape));
  }
  if (bounds.isEmpty()) {
    bounds.min.set(0, 0, 0);
    bounds.max.set(field.width, 0, field.height);
  }

  // Include course annotations whose anchors lie in the course footprint.
  // Standalone scenery, the field mesh and outlying notes stay out of the fit.
  const footprint = bounds.clone().expandByScalar(2);
  for (const shape of shapes) {
    if (
      shape.kind === "label" &&
      shape.x >= footprint.min.x &&
      shape.x <= footprint.max.x &&
      shape.y >= footprint.min.z &&
      shape.y <= footprint.max.z
    ) {
      bounds.union(getItemFramingBounds(shape));
    }
  }
  return bounds;
}
