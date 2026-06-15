"use client";

import { useTexture } from "@react-three/drei";
import { Suspense, useMemo, type Ref } from "react";
import * as THREE from "three";
import { getCornerFlagLayout } from "@/lib/track/render3d-layout";
import { getFlagVisualSpec } from "@/lib/track/elements/visual";
import type { CornerMarkerFlagVisualSpec } from "@/lib/track/elements/catalog";
import type { FlagShape } from "@/lib/types";

function TexturedCornerFlagPanel3D({
  backTexturePath,
  bannerCenterY,
  bannerHeight,
  bannerTextureWidth,
  bannerTextureX,
  frontTexturePath,
  panelDepth,
  selected,
}: {
  backTexturePath: string;
  bannerCenterY: number;
  bannerHeight: number;
  bannerTextureWidth: number;
  bannerTextureX: number;
  frontTexturePath: string;
  panelDepth: number;
  selected: boolean;
}) {
  const [frontTexture, backTexture] = useTexture([
    frontTexturePath,
    backTexturePath,
  ]) as THREE.Texture[];

  for (const texture of [frontTexture, backTexture]) {
    if (texture.colorSpace !== THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }

  return (
    <group>
      <mesh
        receiveShadow
        castShadow
        position={[bannerTextureX, bannerCenterY, panelDepth * 0.65]}
      >
        <planeGeometry args={[bannerTextureWidth, bannerHeight]} />
        <meshStandardMaterial
          map={frontTexture}
          transparent
          roughness={0.78}
          metalness={0}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.08 : 0}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        receiveShadow
        castShadow
        position={[bannerTextureX, bannerCenterY, -panelDepth * 0.35]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[bannerTextureWidth, bannerHeight]} />
        <meshStandardMaterial
          map={backTexture}
          transparent
          roughness={0.78}
          metalness={0}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.08 : 0}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

function CornerMarkerFlag3D({
  selected = false,
  shape,
  visual,
  outerRef,
}: {
  selected?: boolean;
  shape: FlagShape;
  visual: CornerMarkerFlagVisualSpec;
  outerRef?: Ref<THREE.Group>;
}) {
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const {
    bannerCenterY,
    bannerHeight,
    bannerTextureWidth,
    bannerTextureX,
    panelDepth,
    poleCapRadius,
    polePoints,
    poleRadius,
    poleTipX,
    poleTipY,
  } = getCornerFlagLayout(shape, true);

  const poleCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        polePoints.map(([x, y]) => new THREE.Vector3(x, y, 0)),
        false,
        "centripetal",
        0.5
      ),
    [polePoints]
  );

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      <mesh
        position={[0, 0.02, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.04, 0.13, 24]} />
        <meshBasicMaterial
          color="#888"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Suspense fallback={null}>
        <TexturedCornerFlagPanel3D
          backTexturePath={visual.textures.back}
          bannerCenterY={bannerCenterY}
          bannerHeight={bannerHeight}
          bannerTextureWidth={bannerTextureWidth}
          bannerTextureX={bannerTextureX}
          frontTexturePath={visual.textures.front}
          panelDepth={panelDepth}
          selected={selected}
        />
      </Suspense>
      {/* Pole follows the textured feather flag's leading edge. */}
      <mesh castShadow>
        <tubeGeometry args={[poleCurve, 40, poleRadius, 12, false]} />
        <meshStandardMaterial
          color={visual.poleColor}
          roughness={0.65}
          metalness={0.05}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
      <mesh position={[poleTipX, poleTipY, 0]} castShadow receiveShadow>
        <sphereGeometry args={[poleCapRadius, 18, 12]} />
        <meshStandardMaterial
          color={visual.poleColor}
          roughness={0.65}
          metalness={0.05}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
    </group>
  );
}

export function Flag3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: FlagShape;
  outerRef?: Ref<THREE.Group>;
}) {
  const flagVisual = getFlagVisualSpec(shape);
  const color = shape.color ?? "#a855f7";
  const ph = shape.poleHeight ?? 3.5;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const mastCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, ph * 0.42, 0),
        new THREE.Vector3(0.01, ph * 0.74, 0),
        new THREE.Vector3(0.045, ph * 0.9, 0),
        new THREE.Vector3(0.11, ph * 0.985, 0),
        new THREE.Vector3(0.2, ph * 0.985, 0),
      ]),
    [ph]
  );
  const bannerTop = ph * 0.96;
  const bannerBottom = ph * 0.18;
  const bannerWidth = Math.max(ph * 0.18, 0.62);
  const bannerShape = useMemo(() => {
    const banner = new THREE.Shape();
    banner.moveTo(0.03, bannerBottom);
    banner.bezierCurveTo(0.02, ph * 0.34, 0.01, ph * 0.72, 0.08, bannerTop);
    banner.bezierCurveTo(
      bannerWidth * 0.24,
      ph * 1.01,
      bannerWidth * 0.72,
      ph * 0.96,
      bannerWidth * 0.94,
      ph * 0.78
    );
    banner.bezierCurveTo(
      bannerWidth * 1.02,
      ph * 0.6,
      bannerWidth * 0.82,
      ph * 0.34,
      bannerWidth * 0.22,
      bannerBottom + ph * 0.02
    );
    banner.bezierCurveTo(
      bannerWidth * 0.1,
      bannerBottom - ph * 0.005,
      0.05,
      bannerBottom - ph * 0.002,
      0.03,
      bannerBottom
    );
    return banner;
  }, [bannerBottom, bannerTop, bannerWidth, ph]);

  if (flagVisual?.variant === "corner-marker") {
    return (
      <CornerMarkerFlag3D
        shape={shape}
        selected={selected}
        visual={flagVisual}
        outerRef={outerRef}
      />
    );
  }

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      <mesh
        position={[0, 0.025, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.06, 0.14, 24]} />
        <meshBasicMaterial
          color={selected ? "#93c5fd" : color}
          transparent
          opacity={selected ? 0.3 : 0.14}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[mastCurve, 40, 0.024, 10, false]} />
        <meshStandardMaterial
          color="#d7dde8"
          metalness={0.3}
          roughness={0.42}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
      <mesh position={[0.01, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[bannerShape, { depth: 0.018, bevelEnabled: false }]}
        />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.24 : 0.08}
          side={THREE.DoubleSide}
          roughness={0.68}
        />
      </mesh>
    </group>
  );
}
