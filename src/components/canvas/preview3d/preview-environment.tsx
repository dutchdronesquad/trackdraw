"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { GradientSky, TrackSurface3D } from "./shared-scene";
import { OutdoorScene } from "./outdoor-scene";
import type { Scene3DTheme } from "./theme";
import type { OutdoorQuality } from "@/lib/track/outdoor-presentation";

export function PreviewEnvironment({
  field,
  theme: t,
  outdoorQuality,
  onGroundClick,
}: {
  field: { width: number; height: number; gridStep: number };
  theme: Scene3DTheme;
  outdoorQuality: OutdoorQuality | null;
  onGroundClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const { width, height } = field;
  const cx = width / 2;
  const cz = height / 2;
  const longest = Math.max(width, height);
  const designScene = (
    <>
      <color attach="background" args={[t.skyHorizon]} />
      <fog attach="fog" args={[t.fog, 80, 260]} />
      <GradientSky topColor={t.skyTop} horizonColor={t.skyHorizon} />
      <hemisphereLight
        color={t.hemisphereSky}
        groundColor={t.hemisphereGround}
        intensity={t.hemisphereIntensity}
      />
      <ambientLight intensity={t.ambientIntensity} />
      <directionalLight
        position={[cx + 12, 28, cz + 8]}
        color={t.dirColor}
        intensity={t.dirIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0005}
        shadow-camera-left={-longest * 0.7}
        shadow-camera-right={longest * 0.7}
        shadow-camera-top={longest * 0.7}
        shadow-camera-bottom={-longest * 0.7}
        shadow-camera-near={1}
        shadow-camera-far={longest * 2 + 60}
      />
      <pointLight
        position={[cx - 10, 8, cz - 5]}
        intensity={0.18}
        color="#2dd4bf"
      />
      <pointLight
        position={[cx + 15, 6, cz + 12]}
        intensity={0.15}
        color="#60a5fa"
      />

      <TrackSurface3D field={field} theme={t} onGroundClick={onGroundClick} />
    </>
  );
  return outdoorQuality ? (
    <OutdoorScene
      width={width}
      height={height}
      quality={outdoorQuality}
      onGroundClick={onGroundClick}
      fallback={designScene}
    />
  ) : (
    designScene
  );
}
