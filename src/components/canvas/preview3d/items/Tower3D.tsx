"use client";

import { useTexture } from "@react-three/drei";
import { Suspense, useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import {
  getEffectiveFlips,
  getEffectiveRotation,
  registerPanel,
  useOverrideVersion,
} from "@/components/canvas/preview3d/texture-debug";
import {
  getPanelFrameGateLayout,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import {
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
  type GatePanelTextureVisualSpec,
  type PanelFrameGateVisualSpec,
  type PanelFrameTowerVisualSpec,
  type TowerVisualSpec,
} from "@/lib/track/elements/catalog";
import type { GateShape, TowerShape } from "@/lib/types";

function cloneTextureForPanel(
  texture: THREE.Texture,
  {
    flipX = false,
    flipY = false,
    rotation = 0,
  }: { flipX?: boolean; flipY?: boolean; rotation?: number }
) {
  const clone = texture.clone();
  clone.center.set(0.5, 0.5);
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.rotation = rotation;
  clone.repeat.set(flipX ? -1 : 1, flipY ? -1 : 1);
  clone.offset.set(0, 0);
  clone.needsUpdate = true;
  return clone;
}

function getTowerVisualSpecFor3D(shape: TowerShape): TowerVisualSpec | null {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  const visual = getTrackElementCatalogEntry(
    catalogIdentity?.elementId
  )?.visual;
  if (visual?.kind === "tower") return visual;
  return null;
}

function TowerPanelFrameTexturePlanes({
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
    return {
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
    };
    // overrideVersion is intentionally included to trigger re-clone on cycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogId]);

  return (
    <>
      <group position={[leftPanelX, h / 2, frontZ]} rotation={[0, Math.PI, 0]}>
        <mesh>
          <planeGeometry args={[leftPanelWidth, h]} />
          <meshStandardMaterial
            map={panelTextures.left.texture}
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
            map={panelTextures.right.texture}
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

export function getTowerLevelCount(shape: TowerShape) {
  return Math.max(1, Math.min(4, Math.round(shape.levels ?? 1)));
}

export function getTowerTopY(shape: TowerShape): number {
  const towerVisual = getTowerVisualSpecFor3D(shape);
  const levelCount = getTowerLevelCount(shape);
  const openingH = shape.height ?? 2;
  const levelPitch =
    towerVisual?.variant === "panel-frame"
      ? openingH + towerVisual.panels.top.heightMeters
      : openingH;
  return (shape.elevation ?? 0) + levelCount * levelPitch;
}

function PanelFrameTower3D({
  selected = false,
  shape,
  outerRef,
  visual,
}: {
  selected?: boolean;
  shape: TowerShape;
  outerRef?: Ref<THREE.Group>;
  visual: PanelFrameTowerVisualSpec;
}) {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const levelCount = getTowerLevelCount(shape);
  const elevation = Math.max(shape.elevation ?? 0, 0);
  const gateVisual = {
    ...visual,
    kind: "gate",
  } satisfies PanelFrameGateVisualSpec;
  const layout = getPanelFrameGateLayout(
    shape as unknown as GateShape,
    gateVisual
  );
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];
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
  const levelPitch = layout.outerTopY;

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      {elevation > 0
        ? [layout.outerLeftX, layout.outerRightX].map((x, index) => (
            <mesh
              key={`support-${index}`}
              position={[x, elevation / 2, layout.frameZ]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  layout.frameTube / 2,
                  layout.frameTube / 2,
                  elevation,
                  16,
                ]}
              />
              <meshStandardMaterial {...frameTubeMat} />
            </mesh>
          ))
        : null}
      {Array.from({ length: levelCount }, (_, index) => {
        const baseY = elevation + index * levelPitch;
        return (
          <group key={index} position={[0, baseY, 0]}>
            <mesh
              position={[
                layout.outerLeftX,
                layout.outerTopY / 2,
                layout.frameZ,
              ]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  layout.frameTube / 2,
                  layout.frameTube / 2,
                  layout.outerTopY,
                  16,
                ]}
              />
              <meshStandardMaterial {...frameTubeMat} />
            </mesh>
            <mesh
              position={[
                layout.outerRightX,
                layout.outerTopY / 2,
                layout.frameZ,
              ]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  layout.frameTube / 2,
                  layout.frameTube / 2,
                  layout.outerTopY,
                  16,
                ]}
              />
              <meshStandardMaterial {...frameTubeMat} />
            </mesh>
            <mesh
              position={[0, layout.outerTopY, layout.frameZ]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  layout.frameTube / 2,
                  layout.frameTube / 2,
                  layout.outerRightX - layout.outerLeftX,
                  16,
                ]}
              />
              <meshStandardMaterial {...frameTubeMat} />
            </mesh>
            {[layout.outerLeftX, layout.outerRightX].map((x, elbowIndex) => (
              <mesh
                key={`elbow-${elbowIndex}`}
                position={[x, layout.outerTopY, layout.frameZ]}
                castShadow
              >
                <sphereGeometry args={[layout.frameTube * 0.66, 16, 12]} />
                <meshStandardMaterial {...frameElbowMat} />
              </mesh>
            ))}
            <mesh
              position={[layout.leftPanelX, layout.h / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[layout.leftPanelWidth, layout.h, layout.panelDepth]}
              />
              <meshStandardMaterial
                color={visual.panels.left.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : visual.panels.left.color}
                emissiveIntensity={selected ? 0.24 : 0.02}
              />
            </mesh>
            <mesh
              position={[layout.rightPanelX, layout.h / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[layout.rightPanelWidth, layout.h, layout.panelDepth]}
              />
              <meshStandardMaterial
                color={visual.panels.right.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : visual.panels.right.color}
                emissiveIntensity={selected ? 0.24 : 0.02}
              />
            </mesh>
            <mesh position={[0, layout.topPanelY, 0]} castShadow receiveShadow>
              <boxGeometry
                args={[
                  layout.topPanelW,
                  layout.topPanelHeight,
                  layout.panelDepth,
                ]}
              />
              <meshStandardMaterial
                color={visual.panels.top.color}
                roughness={0.64}
                metalness={0.03}
                emissive={selected ? "#60a5fa" : visual.panels.top.color}
                emissiveIntensity={selected ? 0.28 : 0.04}
              />
            </mesh>
            <Suspense fallback={null}>
              <TowerPanelFrameTexturePlanes
                catalogId={catalogId}
                frontZ={layout.frontZ}
                h={layout.h}
                leftPanelWidth={layout.leftPanelWidth}
                leftPanelX={layout.leftPanelX}
                rightPanelWidth={layout.rightPanelWidth}
                rightPanelX={layout.rightPanelX}
                textures={visual.textures}
                topPanelHeight={layout.topPanelHeight}
                topPanelW={layout.topPanelW}
                topPanelY={layout.topPanelY}
              />
            </Suspense>
          </group>
        );
      })}
    </group>
  );
}

export function Tower3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: TowerShape;
  outerRef?: Ref<THREE.Group>;
}) {
  const visual = getTowerVisualSpecFor3D(shape);
  if (visual?.variant === "panel-frame") {
    return (
      <PanelFrameTower3D
        shape={shape}
        selected={selected}
        outerRef={outerRef}
        visual={visual}
      />
    );
  }

  const color = shape.color ?? "#38bdf8";
  const w = shape.width ?? 2;
  const h = shape.height ?? 2;
  const thick = shape.thick ?? 0.2;
  const levelCount = getTowerLevelCount(shape);
  const elevation = Math.max(shape.elevation ?? 0, 0);
  const totalH = elevation + levelCount * h;
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];
  const matProps = {
    color,
    emissive: selected ? "#60a5fa" : color,
    emissiveIntensity: selected ? 0.55 : 0.08,
  };

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh position={[-w / 2, totalH / 2, 0]} castShadow>
        <boxGeometry args={[thick, totalH, thick]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[w / 2, totalH / 2, 0]} castShadow>
        <boxGeometry args={[thick, totalH, thick]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {Array.from({ length: levelCount + 1 }, (_, index) => {
        const y = elevation + index * h;
        return (
          <mesh key={index} position={[0, y, 0]} castShadow>
            <boxGeometry args={[w + thick, thick, thick]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
      })}
    </group>
  );
}
