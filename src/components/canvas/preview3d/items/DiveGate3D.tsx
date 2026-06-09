"use client";

import { useTexture } from "@react-three/drei";
import {
  getEffectiveFlips,
  getEffectiveRotation,
  registerPanel,
  useOverrideVersion,
} from "@/components/canvas/preview3d/texture-debug";
import {
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
  getMultiGpDiveGateArchLayout,
  getMultiGpLaunchGateLayout,
  resolveArchDiveGateBannerTextureMapping,
  resolveLaunchGateBannerTextureMapping,
  resolveDiveGateElevation,
} from "@/lib/track/render3d-layout";
import { getDiveGateVisualSpec } from "@/lib/track/elements/visual";
import type {
  ArchDiveGateVisualSpec,
  LaunchGateVisualSpec,
} from "@/lib/track/elements/catalog";
import { getTrackElementCatalogIdentity } from "@/lib/track/elements/catalog";
import type { DiveGateShape } from "@/lib/types";
import { assignGroupRef, cloneTextureForPanel } from "./texture-cache";

function PipeBetween({
  color,
  emissive,
  emissiveIntensity,
  end,
  radius,
  start,
}: {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  end: [number, number, number];
  radius: number;
  start: [number, number, number];
}) {
  const { length, midpoint, quaternion } = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const pipeLength = direction.length();
    return {
      length: pipeLength,
      midpoint: from.add(to).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
      ),
    };
  }, [end, start]);

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.48}
        metalness={0.05}
      />
    </mesh>
  );
}

function ArchDiveGate3D({
  selected,
  shape,
  outerRef,
  visual,
  elevationOverrideRef,
}: {
  selected: boolean;
  shape: DiveGateShape;
  outerRef?: Ref<THREE.Group>;
  visual: ArchDiveGateVisualSpec;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const tube = visual.frame.diameterMeters;
  const pipeRadius = tube / 2;
  const frameColor = visual.frame.color;
  const [sideTexture, topTexture] = useTexture([
    visual.banner.sideTexture,
    visual.banner.topTexture,
  ]) as THREE.Texture[];

  for (const texture of [sideTexture, topTexture]) {
    if (texture.colorSpace !== THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }

  const overrideVersion = useOverrideVersion();
  const panelTextures = useMemo(() => {
    const mapping = resolveArchDiveGateBannerTextureMapping(visual.banner, {
      side: sideTexture,
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
    const topFlips = getEffectiveFlips(
      catalogId,
      "top",
      mapping.top.flipX,
      mapping.top.flipY
    );
    const bottomFlips = getEffectiveFlips(
      catalogId,
      "bottom",
      mapping.bottom.flipX,
      mapping.bottom.flipY
    );
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
      top: {
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
      },
      bottom: {
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
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideTexture, topTexture, visual.banner, overrideVersion, catalogId]);

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
    registerPanel(
      catalogId,
      "top",
      panelTextures.top.source,
      panelTextures.top.flipX,
      panelTextures.top.flipY,
      panelTextures.top.rotation
    );
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

  const layout = getMultiGpDiveGateArchLayout(shape);

  const archGroupRef = useRef<THREE.Group>(null);
  const setArchRefs = useCallback(
    (node: THREE.Group | null) => assignGroupRef(outerRef, node),
    [outerRef]
  );
  const legMeshesRef = useRef<Array<THREE.Mesh | null>>(
    Array(layout.legPoints.length).fill(null)
  );

  useFrame(() => {
    if (!archGroupRef.current) return;
    const storedElev = resolveDiveGateElevation(shape.elevation, "arch");
    const delta =
      elevationOverrideRef?.current != null
        ? elevationOverrideRef.current - storedElev
        : 0;
    archGroupRef.current.position.y = delta;
    for (let i = 0; i < legMeshesRef.current.length; i++) {
      const mesh = legMeshesRef.current[i];
      if (!mesh) continue;
      const liveTopY = Math.max(0, layout.legPoints[i].topY + delta);
      mesh.visible = liveTopY > 0.02;
      if (mesh.visible) {
        mesh.position.y = liveTopY / 2;
        mesh.scale.y = liveTopY;
      }
    }
  });

  const sel = selected;
  const emissive = sel ? "#60a5fa" : frameColor;
  const emissiveIntensity = sel ? 0.55 : 0.08;

  return (
    <group
      ref={setArchRefs}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      {layout.legPoints.map(({ x, z, topY: legTopY }, i) =>
        legTopY > 0.02 ? (
          <mesh
            key={`leg-${i}`}
            ref={(n) => {
              legMeshesRef.current[i] = n;
            }}
            position={[x, legTopY / 2, z]}
            scale={[1, legTopY, 1]}
            castShadow
          >
            <cylinderGeometry args={[pipeRadius, pipeRadius, 1, 16]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              roughness={0.48}
              metalness={0.05}
            />
          </mesh>
        ) : null
      )}
      <group ref={archGroupRef}>
        {layout.pipeSegments.map(({ end, start }, index) => (
          <PipeBetween
            key={`pipe-${index}`}
            start={start}
            end={end}
            radius={pipeRadius}
            color={frameColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        ))}
        {layout.couplerPoints.map(({ height, postH, x, z }, index) => {
          if (height >= postH) return null;

          return (
            <mesh key={`coupler-${index}`} position={[x, height, z]} castShadow>
              <cylinderGeometry
                args={[tube * 0.75, tube * 0.75, tube * 1.8, 16]}
              />
              <meshStandardMaterial
                color="#d6d9de"
                emissive={sel ? "#60a5fa" : "#d6d9de"}
                emissiveIntensity={sel ? 0.35 : 0.04}
                roughness={0.54}
                metalness={0.08}
              />
            </mesh>
          );
        })}

        <group
          position={[0, layout.centerY, 0]}
          rotation={[layout.tiltRad, 0, 0]}
        >
          <mesh
            position={[-layout.halfOpening - layout.sidePanelW / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[layout.sidePanelW, layout.openingH]} />
            <meshStandardMaterial
              color="#ffffff"
              map={panelTextures.left.texture}
              roughness={0.72}
              metalness={0.01}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[layout.halfOpening + layout.sidePanelW / 2, 0, 0]}
            rotation={[0, 0, Math.PI]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[layout.sidePanelW, layout.openingH]} />
            <meshStandardMaterial
              color="#ffffff"
              map={panelTextures.right.texture}
              roughness={0.72}
              metalness={0.01}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[0, layout.openingH / 2 + layout.bannerH / 2, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[layout.outerW, layout.bannerH]} />
            <meshStandardMaterial
              color="#ffffff"
              map={panelTextures.top.texture}
              roughness={0.68}
              metalness={0.02}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            position={[0, -layout.openingH / 2 - layout.bannerH / 2, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[layout.outerW, layout.bannerH]} />
            <meshStandardMaterial
              color="#ffffff"
              map={panelTextures.bottom.texture}
              roughness={0.68}
              metalness={0.02}
              side={THREE.DoubleSide}
            />
          </mesh>

          <mesh position={[0, layout.halfOuterH, 0]} castShadow>
            <boxGeometry args={[layout.outerW, tube, tube]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[0, -layout.halfOuterH, 0]} castShadow>
            <boxGeometry args={[layout.outerW, tube, tube]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[-layout.halfOuterW, 0, 0]} castShadow>
            <boxGeometry args={[tube, layout.outerH, tube]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
          <mesh position={[layout.halfOuterW, 0, 0]} castShadow>
            <boxGeometry args={[tube, layout.outerH, tube]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function LaunchGate3D({
  selected,
  shape,
  outerRef,
  visual,
  elevationOverrideRef,
}: {
  selected: boolean;
  shape: DiveGateShape;
  outerRef?: Ref<THREE.Group>;
  visual: LaunchGateVisualSpec;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const tube = visual.frame.diameterMeters;
  const pipeRadius = tube / 2;
  const frameColor = visual.frame.color;
  const [sideTexture, topTexture] = useTexture([
    visual.banner.sideTexture,
    visual.banner.topTexture,
  ]) as THREE.Texture[];

  for (const texture of [sideTexture, topTexture]) {
    if (texture.colorSpace !== THREE.SRGBColorSpace) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }
  const overrideVersion = useOverrideVersion();
  const panelTextures = useMemo(
    () => {
      const mapping = resolveLaunchGateBannerTextureMapping(visual.banner, {
        side: sideTexture,
        top: topTexture,
      });
      const frontFlips = getEffectiveFlips(
        catalogId,
        "front",
        mapping.front.flipX,
        mapping.front.flipY
      );
      const rearFlips = getEffectiveFlips(
        catalogId,
        "rear",
        mapping.rear.flipX,
        mapping.rear.flipY
      );
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
      return {
        front: {
          texture: cloneTextureForPanel(mapping.front.texture, {
            rotation: getEffectiveRotation(
              catalogId,
              "front",
              mapping.front.rotation
            ),
            ...frontFlips,
          }),
          rotation: mapping.front.rotation,
          source: mapping.front.source,
          flipX: mapping.front.flipX,
          flipY: mapping.front.flipY,
        },
        rear: {
          texture: cloneTextureForPanel(mapping.rear.texture, {
            rotation: getEffectiveRotation(
              catalogId,
              "rear",
              mapping.rear.rotation
            ),
            ...rearFlips,
          }),
          rotation: mapping.rear.rotation,
          source: mapping.rear.source,
          flipX: mapping.rear.flipX,
          flipY: mapping.rear.flipY,
        },
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
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideTexture, topTexture, visual.banner, overrideVersion, catalogId]
  );
  const layout = getMultiGpLaunchGateLayout(shape);

  const launchGroupRef = useRef<THREE.Group>(null);
  const setLaunchRefs = useCallback(
    (node: THREE.Group | null) => assignGroupRef(outerRef, node),
    [outerRef]
  );
  const legMeshesRef = useRef<Array<THREE.Mesh | null>>(
    Array(layout.legPoints.length).fill(null)
  );

  useFrame(() => {
    if (!launchGroupRef.current) return;
    const storedElev = resolveDiveGateElevation(shape.elevation, "launch");
    const delta =
      elevationOverrideRef?.current != null
        ? elevationOverrideRef.current - storedElev
        : 0;
    launchGroupRef.current.position.y = delta;
    for (let i = 0; i < legMeshesRef.current.length; i++) {
      const mesh = legMeshesRef.current[i];
      if (!mesh) continue;
      const liveTopY = Math.max(0, layout.legPoints[i].topY + delta);
      mesh.visible = liveTopY > 0.02;
      if (mesh.visible) {
        mesh.position.y = liveTopY / 2;
        mesh.scale.y = liveTopY;
      }
    }
  });

  const sel = selected;
  const emissive = sel ? "#60a5fa" : frameColor;
  const emissiveIntensity = sel ? 0.55 : 0.08;
  const banners = [
    {
      x: 0,
      z: -layout.halfOpeningD - layout.endPanelD / 2,
      width: layout.outerW,
      depth: layout.endPanelD,
      rotZ: 0,
      panel: panelTextures.front,
      panelName: "front",
    },
    {
      x: 0,
      z: layout.halfOpeningD + layout.endPanelD / 2,
      width: layout.outerW,
      depth: layout.endPanelD,
      rotZ: Math.PI,
      panel: panelTextures.rear,
      panelName: "rear",
    },
    {
      x: -layout.halfOpeningW - layout.sidePanelW / 2,
      z: 0,
      width: layout.sidePanelW,
      depth: layout.openingD,
      rotZ: 0,
      panel: panelTextures.left,
      panelName: "left",
    },
    {
      x: layout.halfOpeningW + layout.sidePanelW / 2,
      z: 0,
      width: layout.sidePanelW,
      depth: layout.openingD,
      rotZ: 0,
      panel: panelTextures.right,
      panelName: "right",
    },
  ];

  useEffect(() => {
    if (!catalogId) return;
    registerPanel(
      catalogId,
      "front",
      panelTextures.front.source,
      panelTextures.front.flipX,
      panelTextures.front.flipY,
      panelTextures.front.rotation
    );
    registerPanel(
      catalogId,
      "rear",
      panelTextures.rear.source,
      panelTextures.rear.flipX,
      panelTextures.rear.flipY,
      panelTextures.rear.rotation
    );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogId]);

  return (
    <group
      ref={setLaunchRefs}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      {layout.legPoints.map(({ x, z, topY: legTopY }, i) =>
        legTopY > 0.02 ? (
          <mesh
            key={`leg-${i}`}
            ref={(n) => {
              legMeshesRef.current[i] = n;
            }}
            position={[x, legTopY / 2, z]}
            scale={[1, legTopY, 1]}
            castShadow
          >
            <cylinderGeometry args={[pipeRadius, pipeRadius, 1, 16]} />
            <meshStandardMaterial
              color={frameColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              roughness={0.48}
              metalness={0.05}
            />
          </mesh>
        ) : null
      )}
      <group ref={launchGroupRef}>
        {layout.pipeSegments.map(({ end, start }, index) => (
          <PipeBetween
            key={`pipe-${index}`}
            start={start}
            end={end}
            radius={pipeRadius}
            color={frameColor}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        ))}
        {layout.couplerPoints.map(({ height, postH, x, z }, index) => {
          if (height >= postH) return null;

          return (
            <mesh key={`coupler-${index}`} position={[x, height, z]} castShadow>
              <cylinderGeometry
                args={[tube * 0.75, tube * 0.75, tube * 1.8, 16]}
              />
              <meshStandardMaterial
                color="#d6d9de"
                emissive={sel ? "#60a5fa" : "#d6d9de"}
                emissiveIntensity={sel ? 0.35 : 0.04}
                roughness={0.54}
                metalness={0.08}
              />
            </mesh>
          );
        })}

        <group position={[0, layout.topY - tube * 0.12, 0]}>
          {banners.map(({ depth, panel, rotZ, width, x, z }, index) => {
            return (
              <group
                key={`banner-${index}`}
                position={[x, 0, z]}
                rotation={[Math.PI / 2, 0, rotZ]}
              >
                <mesh castShadow receiveShadow>
                  <planeGeometry args={[width, depth]} />
                  <meshStandardMaterial
                    color="#ffffff"
                    map={panel.texture}
                    roughness={0.68}
                    metalness={0.02}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

export function DiveGate3D({
  selected = false,
  shape,
  outerRef,
  tiltDragRef,
  elevationOverrideRef,
}: {
  selected?: boolean;
  shape: DiveGateShape;
  outerRef?: Ref<THREE.Group>;
  tiltDragRef?: RefObject<number | null>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const visual = getDiveGateVisualSpec(shape);
  const isArch = visual?.variant === "arch";
  const isLaunch = visual?.variant === "launch";

  const color = shape.color ?? "#f97316";
  const sz = shape.width ?? 2.8;
  const thick = shape.thick ?? 0.2;
  const tilt = shape.tilt ?? 0;
  const tiltRad = (tilt * Math.PI) / 180;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const centerY = shape.elevation ?? 3.0;

  const bottomY = centerY - (sz / 2) * Math.sin(tiltRad);
  const topY = centerY + (sz / 2) * Math.sin(tiltRad);
  const bottomZ = (sz / 2) * Math.cos(tiltRad);
  const topZ = -(sz / 2) * Math.cos(tiltRad);
  const postW = thick;

  const frameGroupRef = useRef<THREE.Group>(null);
  const postMeshesRef = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    if (isArch || isLaunch) return;
    const liveTilt = tiltDragRef?.current ?? null;
    const liveElev = elevationOverrideRef?.current ?? null;
    if (liveTilt === null && liveElev === null) return;

    const activeCenterY = liveElev ?? centerY;
    const activeTiltRad =
      liveTilt !== null ? (liveTilt * Math.PI) / 180 : tiltRad;

    if (frameGroupRef.current) {
      frameGroupRef.current.position.y = activeCenterY;
      frameGroupRef.current.rotation.x = -Math.PI / 2 + activeTiltRad;
    }

    const bY = activeCenterY - (sz / 2) * Math.sin(activeTiltRad);
    const tY = activeCenterY + (sz / 2) * Math.sin(activeTiltRad);
    const bZ = (sz / 2) * Math.cos(activeTiltRad);
    const tZ = -(sz / 2) * Math.cos(activeTiltRad);
    const corners = [
      { x: -sz / 2, py: bY, pz: bZ },
      { x: sz / 2, py: bY, pz: bZ },
      { x: -sz / 2, py: tY, pz: tZ },
      { x: sz / 2, py: tY, pz: tZ },
    ];
    for (let i = 0; i < 4; i += 1) {
      const mesh = postMeshesRef.current[i];
      if (!mesh) continue;
      const { x, py, pz } = corners[i];
      if (py > 0.05) {
        mesh.visible = true;
        mesh.position.set(x, py / 2, pz);
        mesh.scale.y = py;
      } else {
        mesh.visible = false;
      }
    }
  });

  if (isArch) {
    return (
      <ArchDiveGate3D
        selected={selected}
        shape={shape}
        outerRef={outerRef}
        visual={visual as ArchDiveGateVisualSpec}
        elevationOverrideRef={elevationOverrideRef}
      />
    );
  }

  if (isLaunch) {
    return (
      <LaunchGate3D
        selected={selected}
        shape={shape}
        outerRef={outerRef}
        visual={visual as LaunchGateVisualSpec}
        elevationOverrideRef={elevationOverrideRef}
      />
    );
  }

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      <group
        ref={frameGroupRef}
        position={[0, centerY, 0]}
        rotation={[-Math.PI / 2 + tiltRad, 0, 0]}
      >
        <mesh position={[0, sz / 2, 0]} castShadow>
          <boxGeometry args={[sz, thick, thick]} />
          <meshStandardMaterial
            color={color}
            emissive={selected ? "#60a5fa" : color}
            emissiveIntensity={selected ? 0.55 : 0.08}
          />
        </mesh>
        <mesh position={[0, -sz / 2, 0]} castShadow>
          <boxGeometry args={[sz, thick, thick]} />
          <meshStandardMaterial
            color={color}
            emissive={selected ? "#60a5fa" : color}
            emissiveIntensity={selected ? 0.55 : 0.08}
          />
        </mesh>
        <mesh position={[-sz / 2, 0, 0]} castShadow>
          <boxGeometry args={[thick, sz, thick]} />
          <meshStandardMaterial
            color={color}
            emissive={selected ? "#60a5fa" : color}
            emissiveIntensity={selected ? 0.55 : 0.08}
          />
        </mesh>
        <mesh position={[sz / 2, 0, 0]} castShadow>
          <boxGeometry args={[thick, sz, thick]} />
          <meshStandardMaterial
            color={color}
            emissive={selected ? "#60a5fa" : color}
            emissiveIntensity={selected ? 0.55 : 0.08}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[sz - thick * 2, sz - thick * 2]} />
          <meshBasicMaterial
            color={selected ? "#93c5fd" : color}
            transparent
            opacity={selected ? 0.15 : 0.07}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {[
        { x: -sz / 2, py: bottomY, pz: bottomZ },
        { x: sz / 2, py: bottomY, pz: bottomZ },
        { x: -sz / 2, py: topY, pz: topZ },
        { x: sz / 2, py: topY, pz: topZ },
      ].map(({ x, py, pz }, i) =>
        py > 0.05 ? (
          <mesh
            key={i}
            ref={(node) => {
              postMeshesRef.current[i] = node;
            }}
            position={[x, py / 2, pz]}
            scale={[1, py, 1]}
            castShadow
          >
            <boxGeometry args={[postW, 1, postW]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.55 : 0.08}
            />
          </mesh>
        ) : null
      )}
    </group>
  );
}
