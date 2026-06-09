"use client";

import { useTexture } from "@react-three/drei";
import {
  getEffectiveFlips,
  getEffectiveRotation,
  registerPanel,
  useOverrideVersion,
} from "@/components/canvas/preview3d/texture-debug";
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
import { useFrame } from "@react-three/fiber";
import {
  getPanelFrameLadderLayout,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import { getLadderVisualSpec } from "@/lib/track/elements/visual";
import type {
  GatePanelTextureVisualSpec,
  PanelFrameLadderVisualSpec,
} from "@/lib/track/elements/catalog";
import { getTrackElementCatalogIdentity } from "@/lib/track/elements/catalog";
import type { LadderShape } from "@/lib/types";
import { assignGroupRef, cloneTextureForPanel } from "./texture-cache";

function PanelFrameLadderSectionTexturePlanes({
  bannerH,
  bannerMidY,
  catalogId,
  frontZ,
  hasTopPanel,
  leftPanelWidth,
  openingH,
  openingMidY,
  rightPanelWidth,
  textures,
  topPanelW,
  w,
}: {
  bannerH: number;
  bannerMidY: number;
  catalogId?: string;
  frontZ: number;
  hasTopPanel: boolean;
  leftPanelWidth: number;
  openingH: number;
  openingMidY: number;
  rightPanelWidth: number;
  textures: GatePanelTextureVisualSpec;
  topPanelW: number;
  w: number;
}) {
  const leftPanelX = -w / 2 - leftPanelWidth / 2;
  const rightPanelX = w / 2 + rightPanelWidth / 2;
  const shouldRenderTopTexture = Boolean(
    hasTopPanel && textures.top && bannerH > 0
  );
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
      top: textures.top ? topTexture : null,
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
      <group
        position={[leftPanelX, openingMidY, frontZ]}
        rotation={[0, Math.PI, 0]}
      >
        <mesh>
          <planeGeometry args={[leftPanelWidth, openingH]} />
          <meshStandardMaterial
            map={panelTextures.left.texture}
            roughness={0.72}
            metalness={0.01}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      <group
        position={[rightPanelX, openingMidY, frontZ]}
        rotation={[0, Math.PI, 0]}
      >
        <mesh>
          <planeGeometry args={[rightPanelWidth, openingH]} />
          <meshStandardMaterial
            map={panelTextures.right.texture}
            roughness={0.72}
            metalness={0.01}
            side={THREE.FrontSide}
          />
        </mesh>
      </group>
      {shouldRenderTopTexture ? (
        <group position={[0, bannerMidY, frontZ]} rotation={[0, Math.PI, 0]}>
          <mesh>
            <planeGeometry args={[topPanelW, bannerH]} />
            <meshStandardMaterial
              map={panelTextures.top?.texture ?? null}
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

function PanelFrameLadder3D({
  catalogId,
  selected = false,
  shape,
  outerRef,
  elevationOverrideRef,
  visual,
}: {
  catalogId?: string;
  selected?: boolean;
  shape: LadderShape;
  outerRef?: Ref<THREE.Group>;
  elevationOverrideRef?: RefObject<number | null>;
  visual: PanelFrameLadderVisualSpec;
}) {
  const { frame, panels } = visual;
  const topPanel = panels.top;
  const {
    bannerH,
    baseY,
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    openingH,
    outerLeftX,
    outerRightX,
    outerW,
    panelDepth,
    rightPanelWidth,
    sections,
    tJunctionRadius,
    totalH,
    w,
  } = getPanelFrameLadderLayout(shape, visual);
  const hasTopFrame = sections.at(-1)?.hasTopPanel ?? true;
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];

  const groupRef = useRef<THREE.Group>(null);
  const lowerBarRef = useRef<THREE.Mesh>(null);
  const setGroupRefs = useCallback(
    (node: THREE.Group | null) => {
      groupRef.current = node;
      assignGroupRef(outerRef, node);
    },
    [outerRef]
  );

  useFrame(() => {
    if (!groupRef.current || !elevationOverrideRef) return;
    const liveElevation = elevationOverrideRef.current;
    if (liveElevation === null) return;
    groupRef.current.position.set(shape.x, Math.max(liveElevation, 0), shape.y);
    if (lowerBarRef.current) {
      lowerBarRef.current.visible = liveElevation > 0;
    }
  });

  const frameTubeMat = {
    color: "#e5e7eb",
    roughness: 0.82,
    metalness: 0.02,
    emissive: selected ? "#60a5fa" : "#000000",
    emissiveIntensity: selected ? 0.06 : 0,
  };
  const panelEmissiveIntensity = selected ? 0.24 : 0.02;

  return (
    <group
      ref={setGroupRefs}
      position={[shape.x, baseY, shape.y]}
      rotation={rot}
    >
      {/* Continuous posts — exactly totalH tall */}
      <mesh position={[outerLeftX, totalH / 2, frameZ]} castShadow>
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, totalH, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh position={[outerRightX, totalH / 2, frameZ]} castShadow>
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, totalH, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>

      {/* Bottom bar when elevated */}
      <mesh
        ref={lowerBarRef}
        position={[0, 0, frameZ]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        visible={baseY > 0}
      >
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, outerW, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>

      {hasTopFrame
        ? [outerLeftX, outerRightX].map((x, idx) => (
            <mesh
              key={`elbow-${idx}`}
              position={[x, totalH, frameZ]}
              castShadow
            >
              <sphereGeometry args={[frameTube * 0.66, 16, 12]} />
              <meshStandardMaterial
                color="#e5e7eb"
                roughness={0.84}
                metalness={0.01}
              />
            </mesh>
          ))
        : null}

      {/* Per section: bar at TOP → banner hangs below bar → opening below banner */}
      {sections.map((section, i) => {
        return (
          <group key={i}>
            {section.hasTopPanel ? (
              <mesh
                position={[0, section.barY, frameZ]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry
                  args={[frameTube / 2, frameTube / 2, outerW, 16]}
                />
                <meshStandardMaterial {...frameTubeMat} />
              </mesh>
            ) : null}
            {/* T-junction connectors on intermediate bars */}
            {section.hasTopPanel &&
              section.isIntermediate &&
              [outerLeftX, outerRightX].map((x, idx) => (
                <mesh key={idx} position={[x, section.barY, frameZ]}>
                  <cylinderGeometry
                    args={[
                      tJunctionRadius,
                      tJunctionRadius,
                      frameTube * 2.4,
                      12,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#e5e7eb"
                    roughness={0.82}
                    metalness={0.02}
                  />
                </mesh>
              ))}
            {section.hasTopPanel && topPanel && bannerH > 0 ? (
              <mesh
                position={[0, section.bannerMidY, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[outerW, bannerH, panelDepth]} />
                <meshStandardMaterial
                  color={topPanel.color}
                  roughness={0.64}
                  metalness={0.03}
                  emissive={selected ? "#60a5fa" : topPanel.color}
                  emissiveIntensity={selected ? 0.28 : 0.04}
                />
              </mesh>
            ) : null}
            <Suspense fallback={null}>
              <PanelFrameLadderSectionTexturePlanes
                bannerH={bannerH}
                bannerMidY={section.bannerMidY}
                catalogId={catalogId}
                frontZ={frontZ}
                hasTopPanel={section.hasTopPanel}
                leftPanelWidth={leftPanelWidth}
                openingH={openingH}
                openingMidY={section.openingMidY}
                rightPanelWidth={rightPanelWidth}
                textures={visual.textures}
                topPanelW={outerW}
                w={w}
              />
            </Suspense>
            {/* White left panel */}
            <mesh
              position={[-w / 2 - leftPanelWidth / 2, section.openingMidY, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[leftPanelWidth, openingH, panelDepth]} />
              <meshStandardMaterial
                color={panels.left.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : panels.left.color}
                emissiveIntensity={panelEmissiveIntensity}
              />
            </mesh>
            {/* White right panel */}
            <mesh
              position={[w / 2 + rightPanelWidth / 2, section.openingMidY, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[rightPanelWidth, openingH, panelDepth]} />
              <meshStandardMaterial
                color={panels.right.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : panels.right.color}
                emissiveIntensity={panelEmissiveIntensity}
              />
            </mesh>
            {/* Opening fill */}
            <mesh position={[0, section.openingMidY, -panelDepth / 2 - 0.004]}>
              <planeGeometry args={[w, openingH]} />
              <meshBasicMaterial
                color={frame.color}
                transparent
                opacity={selected ? 0.1 : 0.045}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Ladder3D({
  selected = false,
  shape,
  outerRef,
  elevationOverrideRef,
}: {
  selected?: boolean;
  shape: LadderShape;
  outerRef?: Ref<THREE.Group>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const ladderVisual = getLadderVisualSpec(shape);
  const color = shape.color ?? "#3b82f6";
  const w = shape.width ?? 1.5;
  const totalH = shape.height ?? 4.5;
  const rungs = Math.max(1, shape.rungs ?? 3);
  const baseY = Math.max(shape.elevation ?? 0, 0);
  const thick = 0.2;
  const gateH = totalH / rungs;
  const groupRef = useRef<THREE.Group>(null);
  const lowerBarRef = useRef<THREE.Mesh>(null);
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];
  const setGroupRefs = useCallback(
    (node: THREE.Group | null) => {
      groupRef.current = node;
      assignGroupRef(outerRef, node);
    },
    [outerRef]
  );

  useFrame(() => {
    if (!groupRef.current || !elevationOverrideRef) return;
    const liveElevation = elevationOverrideRef.current;
    if (liveElevation === null) return;
    groupRef.current.position.set(shape.x, Math.max(liveElevation, 0), shape.y);
    if (lowerBarRef.current) {
      lowerBarRef.current.visible = liveElevation > 0;
    }
  });

  if (ladderVisual?.variant === "panel-frame") {
    return (
      <PanelFrameLadder3D
        catalogId={catalogId}
        shape={shape}
        selected={selected}
        outerRef={outerRef}
        elevationOverrideRef={elevationOverrideRef}
        visual={ladderVisual}
      />
    );
  }

  return (
    <group
      ref={setGroupRefs}
      position={[shape.x, baseY, shape.y]}
      rotation={rot}
    >
      {Array.from({ length: rungs }).map((_, i) => (
        <group key={i} position={[0, i * gateH, 0]}>
          <mesh position={[-(w / 2), gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          <mesh position={[w / 2, gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          <mesh position={[0, gateH, 0]} castShadow>
            <boxGeometry args={[w + thick, thick, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          {i === 0 ? (
            <mesh
              ref={lowerBarRef}
              position={[0, 0, 0]}
              castShadow
              visible={baseY > 0}
            >
              <boxGeometry args={[w + thick, thick, thick]} />
              <meshStandardMaterial
                color={color}
                emissive={selected ? "#60a5fa" : color}
                emissiveIntensity={selected ? 0.5 : 0.08}
              />
            </mesh>
          ) : null}
          <mesh position={[0, gateH / 2, 0]}>
            <planeGeometry args={[w, gateH]} />
            <meshBasicMaterial
              color={selected ? "#93c5fd" : color}
              transparent
              opacity={selected ? 0.14 : 0.06}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
