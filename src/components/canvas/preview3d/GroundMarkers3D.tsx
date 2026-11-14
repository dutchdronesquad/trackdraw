"use client";

import { useLayoutEffect, useRef } from "react";
import { InstancedMesh, Matrix4 } from "three";
import {
  GROUND_MARKER_RADIUS,
  type GroundMarkerPreview,
} from "@/lib/track/ground-markers";

const ignoreRaycast = () => {};

export function GroundMarkers3D({
  markers,
}: {
  markers: GroundMarkerPreview["markers"];
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const instance = mesh.current;
    if (!instance) return;
    const translation = new Matrix4();
    markers.forEach(({ x, y }, index) => {
      instance.setMatrixAt(index, translation.makeTranslation(x, 0.038, y));
    });
    instance.instanceMatrix.needsUpdate = true;
    instance.computeBoundingSphere();
  }, [markers]);

  if (markers.length === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, markers.length]}
      raycast={ignoreRaycast}
    >
      <cylinderGeometry args={[GROUND_MARKER_RADIUS, GROUND_MARKER_RADIUS, 0.045, 12]} />
      <meshBasicMaterial color="#ffbc48" />
    </instancedMesh>
  );
}
