"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  getPolylineRouteWarningSegmentVisuals,
  getRouteWarningSegmentColor,
  getPolylineSmoothSegmentPoints3D,
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

export function RaceLine3D({
  isPrimary = false,
  selected = false,
  shape,
}: {
  isPrimary?: boolean;
  selected?: boolean;
  shape: PolylineShape;
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
  const smoothSegmentPoints = useMemo(
    () =>
      getPolylineSmoothSegmentPoints3D(shape, POLYLINE_3D_HEIGHT_OFFSET, 18),
    [shape]
  );
  const showWarningVisuals = selected || isPrimary;
  const tubeRadius = getPolylineTubeRadius(shape);
  const segmentedGeometries = useMemo(() => {
    if (!showWarningVisuals || !warningSegments.length) return null;

    return smoothSegmentPoints.map((points) => {
      if (!points || points.length < 2) return null;

      const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vectors, false, "centripetal");
      return new THREE.TubeGeometry(
        curve,
        Math.max(6, vectors.length * 2),
        tubeRadius,
        10,
        false
      );
    });
  }, [
    showWarningVisuals,
    smoothSegmentPoints,
    tubeRadius,
    warningSegments.length,
  ]);
  const geometry = useMemo(() => {
    const curveData = getPolylineCurve3Derived(shape, {
      heightOffset: POLYLINE_3D_HEIGHT_OFFSET,
      samplesPerSegment: 18,
      density: 12,
    });
    if (!curveData) return null;
    return new THREE.TubeGeometry(
      curveData.curve,
      curveData.segmentCount,
      tubeRadius,
      10,
      shape.closed ?? false
    );
  }, [shape, tubeRadius]);

  useEffect(() => {
    return () => {
      segmentedGeometries?.forEach((geometry) => geometry?.dispose());
    };
  }, [segmentedGeometries]);

  if (!geometry) return null;
  return (
    <group>
      {showWarningVisuals && warningSegments.length && segmentedGeometries ? (
        segmentedGeometries.map((segmentGeometry, segmentIndex) => {
          if (!segmentGeometry) return null;
          const warningKind = warningKindBySegment.get(segmentIndex);
          const color = getRouteWarningSegmentColor(
            warningKind,
            selected ? "#93c5fd" : (shape.color ?? "#3b82f6")
          );

          return (
            <mesh
              key={`${shape.id}-segment-${segmentIndex}`}
              geometry={segmentGeometry}
            >
              <meshStandardMaterial
                color={color}
                emissive={selected ? "#60a5fa" : color}
                emissiveIntensity={selected ? 0.35 : 0.08}
                roughness={0.4}
              />
            </mesh>
          );
        })
      ) : (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={selected ? "#93c5fd" : (shape.color ?? "#3b82f6")}
            emissive={selected ? "#60a5fa" : "#000000"}
            emissiveIntensity={selected ? 0.8 : 0}
            roughness={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
