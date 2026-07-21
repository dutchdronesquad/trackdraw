"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Scene3DTheme } from "@/components/canvas/preview3d/theme";
import {
  getPolylineRouteWarningSegmentVisuals,
  getRouteWarningSegmentColor,
} from "@/lib/track/polyline-derived";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import {
  DEFAULT_POLYLINE_STROKE_WIDTH,
  POLYLINE_3D_HEIGHT_OFFSET,
} from "@/lib/track/constants";
import type { PolylineShape } from "@/lib/types";

export function getPolylineTubeRadius(shape: PolylineShape) {
  return Math.max(
    0.02,
    (shape.strokeWidth ?? DEFAULT_POLYLINE_STROKE_WIDTH) / 2
  );
}

const TUBE_RADIAL_SEGMENTS = 10;

// Compute the arc-length fraction [0, 1] for each waypoint along the 3D path.
// This lets the single tube geometry keep per-segment warning colors without
// splitting the line into separate meshes.
function computeWaypointArcFractions(
  shape: PolylineShape,
  heightOffset: number
): number[] {
  const { points } = shape;
  if (points.length <= 1) return [0];

  const distances: number[] = [0];
  const segmentCount = shape.closed ? points.length : points.length - 1;
  for (let i = 0; i < segmentCount; i += 1) {
    const previous = points[i];
    const current = points[(i + 1) % points.length];
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const dz =
      Math.max(current.z ?? 0, 0) +
      heightOffset -
      (Math.max(previous.z ?? 0, 0) + heightOffset);
    distances.push(distances[i] + Math.hypot(dx, dy, dz));
  }

  const total = distances.at(-1) ?? 0;
  if (total <= 0) {
    return Array.from(
      { length: segmentCount + 1 },
      (_, index) => index / Math.max(segmentCount, 1)
    );
  }

  return distances.map((distance) => distance / total);
}

export function RaceLine3D({
  isPrimary = false,
  selected = false,
  shape,
  theme,
}: {
  isPrimary?: boolean;
  selected?: boolean;
  shape: PolylineShape;
  theme: Scene3DTheme;
}) {
  const warningSegments = useMemo(
    () => getPolylineRouteWarningSegmentVisuals(shape),
    [shape]
  );
  const warningKindBySegment = useMemo(
    () =>
      new Map(
        warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
      ),
    [warningSegments]
  );
  const showWarningVisuals = selected || isPrimary;
  const tubeRadius = getPolylineTubeRadius(shape);
  const baseColor = selected
    ? theme.routeSelectedColor
    : (shape.color ?? "#3b82f6");
  const hasWarnings = showWarningVisuals && warningSegments.length > 0;
  const curveData = useMemo(
    () =>
      getPolylineCurve3Derived(shape, {
        heightOffset: POLYLINE_3D_HEIGHT_OFFSET,
        samplesPerSegment: 18,
        density: 12,
      }),
    [shape]
  );
  const geometry = useMemo(() => {
    if (!curveData) return null;
    const tubeGeo = new THREE.TubeGeometry(
      curveData.curve,
      curveData.segmentCount,
      tubeRadius,
      TUBE_RADIAL_SEGMENTS,
      shape.closed ?? false
    );

    if (!hasWarnings) return tubeGeo;

    const waypointFractions = computeWaypointArcFractions(
      shape,
      POLYLINE_3D_HEIGHT_OFFSET
    );
    const verticesPerRing = TUBE_RADIAL_SEGMENTS + 1;
    const numRings = curveData.segmentCount + 1;
    const pathSegmentCount = shape.closed
      ? shape.points.length
      : shape.points.length - 1;
    const segmentColors = Array.from({ length: pathSegmentCount }).map(
      (_, segmentIndex) => {
        const warningKind = warningKindBySegment.get(segmentIndex);
        return new THREE.Color(
          getRouteWarningSegmentColor(warningKind, baseColor)
        );
      }
    );
    const colorArray = new Float32Array(numRings * verticesPerRing * 3);

    for (let ring = 0; ring < numRings; ring += 1) {
      const rawT = ring / curveData.segmentCount;
      const t = shape.closed ? rawT % 1 : rawT;
      let segmentIndex = 0;
      for (let i = 1; i < waypointFractions.length - 1; i += 1) {
        if (t >= waypointFractions[i]) segmentIndex = i;
      }

      const color =
        segmentColors[Math.min(segmentIndex, segmentColors.length - 1)] ??
        new THREE.Color(baseColor);
      const ringStart = ring * verticesPerRing * 3;
      for (let vertex = 0; vertex < verticesPerRing; vertex += 1) {
        const offset = ringStart + vertex * 3;
        colorArray[offset] = color.r;
        colorArray[offset + 1] = color.g;
        colorArray[offset + 2] = color.b;
      }
    }

    tubeGeo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    return tubeGeo;
  }, [
    shape,
    tubeRadius,
    hasWarnings,
    warningKindBySegment,
    baseColor,
    curveData,
  ]);
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;
  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={hasWarnings ? "#ffffff" : baseColor}
          vertexColors={hasWarnings}
          emissive={selected ? theme.routeSelectedEmissive : "#000000"}
          emissiveIntensity={
            selected ? theme.routeSelectedEmissiveIntensity : 0
          }
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
