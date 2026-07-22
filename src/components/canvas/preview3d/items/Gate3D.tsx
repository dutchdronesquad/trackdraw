"use client";

import { useTexture } from "@react-three/drei";
import {
  getEffectiveFlips,
  getEffectiveRotation,
  registerPanel,
  useOverrideVersion,
  withTextureOverrideVersion,
} from "@/components/canvas/preview3d/texture-debug";
import { Suspense, useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import {
  getPanelFrameGateLayout,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import { getGateVisualSpec } from "@/lib/track/elements/visual";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type {
  GatePanelTextureVisualSpec,
  PanelFrameGateVisualSpec,
} from "@/lib/track/elements/catalog";
import { getTrackElementCatalogIdentity } from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";
import { cloneTextureForPanel } from "./texture-cache";

function PanelFrameGateTexturePlanes({
  catalogId,
  frontZ,
  h,
  leftPanelWidth,
  leftPanelX,
  rightPanelWidth,
  rightPanelX,
  textures,
  topPanelHeight,
  topPanelW,
  topPanelY,
}: {
  catalogId?: string;
  frontZ: number;
  h: number;
  leftPanelWidth: number;
  leftPanelX: number;
  rightPanelWidth: number;
  rightPanelX: number;
  textures: GatePanelTextureVisualSpec;
  topPanelHeight: number;
  topPanelW: number;
  topPanelY: number;
}) {
  const [leftTexture, rightTexture, topTexture] = useTexture([
    textures.left,
    textures.right,
    textures.top ?? textures.left,
  ]) as THREE.Texture[];

  for (const texture of [leftTexture, rightTexture, topTexture]) {
    if (texture.colorSpace !== THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }
  const overrideVersion = useOverrideVersion();
  const panelTextures = useMemo(() => {
    const mapping = resolvePanelFrameTextureMapping(textures, {
      left: leftTexture,
      right: rightTexture,
      top: topTexture,
    });
    const leftFlips = getEffectiveFlips(
      catalogId,
      "left",
      mapping.left.flipX,
      mapping.left.flipY
    );
    const rightFlips = getEffectiveFlips(
      catalogId,
      "right",
      mapping.right.flipX,
      mapping.right.flipY
    );
    const topFlips = mapping.top
      ? getEffectiveFlips(
          catalogId,
          "top",
          mapping.top.flipX,
          mapping.top.flipY
        )
      : null;
    return withTextureOverrideVersion(
      {
        left: {
          texture: cloneTextureForPanel(mapping.left.texture, {
            rotation: getEffectiveRotation(
              catalogId,
              "left",
              mapping.left.rotation
            ),
            ...leftFlips,
          }),
          rotation: mapping.left.rotation,
          source: mapping.left.source,
          flipX: mapping.left.flipX,
          flipY: mapping.left.flipY,
        },
        right: {
          texture: cloneTextureForPanel(mapping.right.texture, {
            rotation: getEffectiveRotation(
              catalogId,
              "right",
              mapping.right.rotation
            ),
            ...rightFlips,
          }),
          rotation: mapping.right.rotation,
          source: mapping.right.source,
          flipX: mapping.right.flipX,
          flipY: mapping.right.flipY,
        },
        top:
          mapping.top && topFlips
            ? {
                texture: cloneTextureForPanel(mapping.top.texture, {
                  rotation: getEffectiveRotation(
                    catalogId,
                    "top",
                    mapping.top.rotation
                  ),
                  ...topFlips,
                }),
                rotation: mapping.top.rotation,
                source: mapping.top.source,
                flipX: mapping.top.flipX,
                flipY: mapping.top.flipY,
              }
            : null,
      },
      overrideVersion
    );
  }, [
    leftTexture,
    rightTexture,
    textures,
    topTexture,
    overrideVersion,
    catalogId,
  ]);

  useEffect(() => {
    if (!catalogId) return;
    registerPanel(
      catalogId,
      "left",
      panelTextures.left.source,
      panelTextures.left.flipX,
      panelTextures.left.flipY,
      panelTextures.left.rotation
    );
    registerPanel(
      catalogId,
      "right",
      panelTextures.right.source,
      panelTextures.right.flipX,
      panelTextures.right.flipY,
      panelTextures.right.rotation
    );
    if (panelTextures.top)
      registerPanel(
        catalogId,
        "top",
        panelTextures.top.source,
        panelTextures.top.flipX,
        panelTextures.top.flipY,
        panelTextures.top.rotation
      );
    // oxlint-disable-next-line react/exhaustive-deps
  }, [catalogId]);

  return (
    <>
      <group position={[leftPanelX, h / 2, frontZ]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[leftPanelWidth, h]} />
          <meshStandardMaterial
            map={panelTextures.right.texture}
            roughness={0.72}
            metalness={0.01}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      <group position={[rightPanelX, h / 2, frontZ]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[rightPanelWidth, h]} />
          <meshStandardMaterial
            map={panelTextures.left.texture}
            roughness={0.72}
            metalness={0.01}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      <group position={[0, topPanelY, frontZ]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[topPanelW, topPanelHeight]} />
          <meshStandardMaterial
            map={panelTextures.top?.texture ?? null}
            roughness={0.68}
            metalness={0.02}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
    </>
  );
}

function PanelFrameGate3D({
  selected = false,
  shape,
  outerRef,
  visual,
  rot,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
  visual: PanelFrameGateVisualSpec;
  rot: [number, number, number];
}) {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const { frame, panels } = visual;
  const h = shape.height ?? 2;
  const {
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    leftPanelX,
    outerLeftX,
    outerRightX,
    outerTopY,
    panelDepth,
    rightPanelWidth,
    rightPanelX,
    topPanelHeight,
    topPanelW,
    topPanelY,
    w,
  } = getPanelFrameGateLayout(shape, visual);
  const frameTubeMat = {
    color: "#e5e7eb",
    roughness: 0.82,
    metalness: 0.02,
    emissive: selected ? "#60a5fa" : "#000000",
    emissiveIntensity: selected ? 0.06 : 0,
  };
  const frameElbowMat = {
    color: "#e5e7eb",
    roughness: 0.84,
    metalness: 0.01,
  };

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh
        position={[outerLeftX, outerTopY / 2, frameZ]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerTopY, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh position={[outerRightX, outerTopY / 2, frameZ]} castShadow>
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerTopY, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh
        position={[0, outerTopY, frameZ]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerRightX - outerLeftX, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      {[
        [outerLeftX, outerTopY],
        [outerRightX, outerTopY],
      ].map(([x, y], index) => (
        <mesh key={`pvc-elbow-${index}`} position={[x, y, frameZ]} castShadow>
          <sphereGeometry args={[frameTube * 0.66, 16, 12]} />
          <meshStandardMaterial {...frameElbowMat} />
        </mesh>
      ))}

      <mesh position={[leftPanelX, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leftPanelWidth, h, panelDepth]} />
        <meshStandardMaterial
          color={panels.left.color}
          roughness={0.7}
          metalness={0.01}
          emissive={selected ? "#60a5fa" : panels.left.color}
          emissiveIntensity={selected ? 0.24 : 0.02}
        />
      </mesh>
      <mesh position={[rightPanelX, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[rightPanelWidth, h, panelDepth]} />
        <meshStandardMaterial
          color={panels.right.color}
          roughness={0.7}
          metalness={0.01}
          emissive={selected ? "#60a5fa" : panels.right.color}
          emissiveIntensity={selected ? 0.24 : 0.02}
        />
      </mesh>
      <mesh position={[0, topPanelY, 0]} castShadow receiveShadow>
        <boxGeometry args={[topPanelW, topPanelHeight, panelDepth]} />
        <meshStandardMaterial
          color={panels.top.color}
          roughness={0.64}
          metalness={0.03}
          emissive={selected ? "#60a5fa" : panels.top.color}
          emissiveIntensity={selected ? 0.28 : 0.04}
        />
      </mesh>

      <Suspense fallback={null}>
        <PanelFrameGateTexturePlanes
          catalogId={catalogId}
          frontZ={frontZ}
          h={h}
          leftPanelWidth={leftPanelWidth}
          leftPanelX={leftPanelX}
          rightPanelWidth={rightPanelWidth}
          rightPanelX={rightPanelX}
          textures={visual.textures}
          topPanelHeight={topPanelHeight}
          topPanelW={topPanelW}
          topPanelY={topPanelY}
        />
      </Suspense>

      <mesh position={[0, h / 2, -panelDepth / 2 - 0.004]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={frame.color}
          transparent
          opacity={selected ? 0.1 : 0.045}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function Gate3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
}) {
  const marker = getShapeTimingMarker(shape);
  const color = marker
    ? getTimingMarkerColor(marker)
    : (shape.color ?? "#3b82f6");
  const visual = getGateVisualSpec(shape);
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];

  if (visual.variant === "panel-frame") {
    return (
      <PanelFrameGate3D
        shape={shape}
        selected={selected}
        outerRef={outerRef}
        visual={visual}
        rot={rot}
      />
    );
  }

  const thick = shape.thick ?? 0.2;
  const h = shape.height ?? 2;
  const w = shape.width ?? 3;

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh position={[-(w / 2), h / 2, 0]} castShadow>
        <boxGeometry args={[thick, h, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[thick, h, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w + thick, thick, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
    </group>
  );
}
