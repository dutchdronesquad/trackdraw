"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Ref,
  type RefObject,
} from "react";
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
import { assignGroupRef } from "./texture-cache";

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
  bottomPanelHeight,
  bottomPanelW,
  bottomPanelY,
  catalogId,
  frontZ,
  h,
  leftPanelWidth,
  leftPanelX,
  rightPanelWidth,
  rightPanelX,
  renderBottomPanel,
  textures,
  topPanelHeight,
  topPanelW,
  topPanelY,
}: {
  bottomPanelHeight: number;
  bottomPanelW: number;
  bottomPanelY: number;
  catalogId?: string;
  frontZ: number;
  h: number;
  leftPanelWidth: number;
  leftPanelX: number;
  rightPanelWidth: number;
  rightPanelX: number;
  renderBottomPanel: boolean;
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
    const bottomFlips = mapping.bottom
      ? getEffectiveFlips(
          catalogId,
          "bottom",
          mapping.bottom.flipX,
          mapping.bottom.flipY
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
      bottom:
        mapping.bottom && bottomFlips
          ? {
              texture: cloneTextureForPanel(mapping.bottom.texture, {
                rotation: getEffectiveRotation(
                  catalogId,
                  "bottom",
                  mapping.bottom.rotation
                ),
                ...bottomFlips,
              }),
              rotation: mapping.bottom.rotation,
              source: mapping.bottom.source,
              flipX: mapping.bottom.flipX,
              flipY: mapping.bottom.flipY,
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
    if (panelTextures.bottom)
      registerPanel(
        catalogId,
        "bottom",
        panelTextures.bottom.source,
        panelTextures.bottom.flipX,
        panelTextures.bottom.flipY,
        panelTextures.bottom.rotation
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {renderBottomPanel ? (
        <group position={[0, bottomPanelY, frontZ]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <planeGeometry args={[bottomPanelW, bottomPanelHeight]} />
            <meshStandardMaterial
              map={panelTextures.bottom?.texture ?? null}
              roughness={0.68}
              metalness={0.02}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>
      ) : null}
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
  const bottomPanelHeight =
    towerVisual?.variant === "panel-frame" && levelCount === 1
      ? towerVisual.panels.top.heightMeters
      : 0;
  return (shape.elevation ?? 0) + bottomPanelHeight + levelCount * levelPitch;
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
  const hasBottomPanel = levelCount === 1;
  const bottomPanelY = -layout.topPanelHeight / 2;

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
        const baseY =
          elevation +
          (hasBottomPanel ? layout.topPanelHeight : 0) +
          index * levelPitch;
        const renderBottomPanel = hasBottomPanel && index === 0;
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
            {renderBottomPanel ? (
              <mesh position={[0, bottomPanelY, 0]} castShadow receiveShadow>
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
            ) : null}
            <Suspense fallback={null}>
              <TowerPanelFrameTexturePlanes
                bottomPanelHeight={layout.topPanelHeight}
                bottomPanelW={layout.topPanelW}
                bottomPanelY={bottomPanelY}
                catalogId={catalogId}
                frontZ={layout.frontZ}
                h={layout.h}
                leftPanelWidth={layout.leftPanelWidth}
                leftPanelX={layout.leftPanelX}
                rightPanelWidth={layout.rightPanelWidth}
                rightPanelX={layout.rightPanelX}
                renderBottomPanel={renderBottomPanel}
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
  elevationOverrideRef,
}: {
  selected?: boolean;
  shape: TowerShape;
  outerRef?: Ref<THREE.Group>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const visual = getTowerVisualSpecFor3D(shape);
  const color = shape.color ?? "#38bdf8";
  const w = shape.width ?? 2;
  const h = shape.height ?? 2;
  const thick = shape.thick ?? 0.2;
  const levelCount = getTowerLevelCount(shape);
  const elevation = Math.max(shape.elevation ?? 0, 0);
  const totalH = elevation + levelCount * h;
  const leftPostRef = useRef<THREE.Mesh>(null);
  const rightPostRef = useRef<THREE.Mesh>(null);
  const levelBarRefs = useRef<Array<THREE.Mesh | null>>([]);
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
  const setGroupRefs = useCallback(
    (node: THREE.Group | null) => {
      assignGroupRef(outerRef, node);
    },
    [outerRef]
  );

  useFrame(() => {
    const liveElevation = elevationOverrideRef?.current;
    if (liveElevation == null) return;

    const nextElevation = Math.max(liveElevation, 0);
    const nextTotalH = nextElevation + levelCount * h;
    const postScaleY = totalH > 0 ? nextTotalH / totalH : 1;

    for (const postRef of [leftPostRef, rightPostRef]) {
      const post = postRef.current;
      if (!post) continue;
      post.position.y = nextTotalH / 2;
      post.scale.y = postScaleY;
    }

    for (let index = 0; index <= levelCount; index += 1) {
      const bar = levelBarRefs.current[index];
      if (bar) {
        bar.position.y = nextElevation + index * h;
      }
    }
  });

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

  return (
    <group ref={setGroupRefs} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh ref={leftPostRef} position={[-w / 2, totalH / 2, 0]} castShadow>
        <boxGeometry args={[thick, totalH, thick]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh ref={rightPostRef} position={[w / 2, totalH / 2, 0]} castShadow>
        <boxGeometry args={[thick, totalH, thick]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {Array.from({ length: levelCount + 1 }, (_, index) => {
        const y = elevation + index * h;
        return (
          <mesh
            key={index}
            ref={(node) => {
              levelBarRefs.current[index] = node;
            }}
            position={[0, y, 0]}
            castShadow
          >
            <boxGeometry args={[w + thick, thick, thick]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
      })}
    </group>
  );
}
