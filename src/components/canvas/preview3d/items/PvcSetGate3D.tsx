"use client";

import { useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import {
  PVC_SET_MARKER_OPACITY,
  PVC_SET_METALNESS,
  PVC_SET_ROUGHNESS,
  getPvcSetGate3DParts,
  getPvcSetGateCylinderTransform,
  type PvcSetGate3DCylinder,
} from "@/lib/track/render3d-layout";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type { PvcSetGateVisualSpec } from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";

function PvcSetCylinderPart({
  part,
  geometry,
  material,
}: {
  part: PvcSetGate3DCylinder;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}) {
  const { rotation, scale } = getPvcSetGateCylinderTransform(part);
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={part.center}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Fixed PVC arch gate (RaceGOW): matte tubes between modelled elbow fittings,
 * each post standing on a cross foot. Timing markers fill the opening with a
 * translucent panel instead of recolouring the white tubes.
 */
export function PvcSetGate3D({
  selected = false,
  shape,
  outerRef,
  visual,
  rot,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
  visual: PvcSetGateVisualSpec;
  rot: [number, number, number];
}) {
  const marker = getShapeTimingMarker(shape);
  const markerColor = marker ? getTimingMarkerColor(marker) : null;
  const tubeColor = shape.color ?? visual.frame.color;
  const fittingColor = visual.fittings.color;
  const parts = useMemo(
    () =>
      getPvcSetGate3DParts(
        { width: shape.width, height: shape.height },
        visual
      ),
    [shape.width, shape.height, visual]
  );

  const geometries = useMemo(
    () => ({
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
      sphere: new THREE.SphereGeometry(1, 16, 12),
      plane: new THREE.PlaneGeometry(1, 1),
    }),
    []
  );
  useEffect(
    () => () => {
      geometries.cylinder.dispose();
      geometries.sphere.dispose();
      geometries.plane.dispose();
    },
    [geometries]
  );

  const materials = useMemo(() => {
    const emissive = selected ? "#60a5fa" : "#000000";
    const emissiveIntensity = selected ? 0.24 : 0;
    return {
      tube: new THREE.MeshStandardMaterial({
        color: tubeColor,
        roughness: PVC_SET_ROUGHNESS,
        metalness: PVC_SET_METALNESS,
        emissive,
        emissiveIntensity,
      }),
      fitting: new THREE.MeshStandardMaterial({
        color: fittingColor,
        roughness: PVC_SET_ROUGHNESS + 0.05,
        metalness: PVC_SET_METALNESS,
        emissive,
        emissiveIntensity,
      }),
      // Invisible opening so a click through the thin tubes still selects.
      hit: new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      panel: markerColor
        ? new THREE.MeshStandardMaterial({
            color: markerColor,
            emissive: markerColor,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: PVC_SET_MARKER_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false,
            roughness: 0.6,
            metalness: 0,
          })
        : null,
    };
  }, [fittingColor, markerColor, selected, tubeColor]);
  useEffect(
    () => () => {
      materials.tube.dispose();
      materials.fitting.dispose();
      materials.hit.dispose();
      materials.panel?.dispose();
    },
    [materials]
  );

  const { opening } = parts;

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      {parts.tubes.map((part) => (
        <PvcSetCylinderPart
          key={part.key}
          part={part}
          geometry={geometries.cylinder}
          material={materials.tube}
        />
      ))}
      {parts.sleeves.map((part) => (
        <PvcSetCylinderPart
          key={part.key}
          part={part}
          geometry={geometries.cylinder}
          material={materials.fitting}
        />
      ))}
      {parts.hubs.map((hub) => (
        <mesh
          key={hub.key}
          geometry={geometries.sphere}
          material={materials.fitting}
          position={hub.center}
          scale={[hub.radius, hub.radius * hub.flatten, hub.radius]}
          castShadow
          receiveShadow
        />
      ))}
      <mesh
        geometry={geometries.plane}
        material={materials.panel ?? materials.hit}
        position={opening.center}
        scale={[opening.width, opening.height, 1]}
        renderOrder={materials.panel ? 2 : 0}
      />
    </group>
  );
}
