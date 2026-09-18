// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.
//
// Extracted from src/components/canvas/viewer/TrackPreview3D.tsx: takes a
// `design` prop instead of reading the global editor Zustand store, a
// `theme` prop instead of useTheme()'s DOM-classList read, and an
// `assetsBaseUrl` prop for non-root-prefix texture resolution. Flythrough
// is cut from Phase 1 scope (see viewer-3d/overlays.tsx) - only orbit/pan/
// zoom controls are ported, matching the issue's acceptance criteria.

"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Suspense,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useIsTouchDevice } from "../hooks/use-mobile";
import { createAssetResolver } from "../assets/asset-url";
import {
  getViewerDesignShapes,
  getViewerPrimaryPolylineId,
} from "../design-derived";
import { SCENE_3D_THEME } from "../theme";
import type { TrackDesign } from "../types";
import {
  CameraAxisTracker,
  GradientSky,
  MemoShape3D,
  OrbitGroundConstraint,
  ORBIT_MAX_POLAR_ANGLE,
  ScreenshotHelper,
  TrackSurface3D,
  WheelBridge,
  type QuaternionState,
  useDesignTextureWarmup,
} from "./shared-scene";
import { AxisGizmoOverlay, FieldWatermark } from "./overlays";

export interface TrackViewer3DHandle {
  screenshot: () => string;
}

export interface TrackViewer3DProps {
  design: TrackDesign;
  theme?: "light" | "dark";
  showGizmo?: boolean;
  assetsBaseUrl?: string;
}

const TrackViewer3D = forwardRef<TrackViewer3DHandle, TrackViewer3DProps>(
  function TrackViewer3D(
    { design, theme = "light", showGizmo = true, assetsBaseUrl = "" },
    ref
  ) {
    const assetResolver = useMemo(
      () => createAssetResolver(assetsBaseUrl),
      [assetsBaseUrl]
    );
    const field = design.field;
    const shapes = useMemo(() => getViewerDesignShapes(design), [design]);
    const primaryPolylineId = useMemo(
      () => getViewerPrimaryPolylineId(shapes),
      [shapes]
    );
    useDesignTextureWarmup(shapes, assetResolver);
    const isMobile = useIsTouchDevice();
    const t = SCENE_3D_THEME[theme];
    const cx = field.width / 2;
    const cz = field.height / 2;
    const longest = Math.max(field.width, field.height);

    const [axisQuaternion, setAxisQuaternion] = useState<QuaternionState>([
      0, 0, 0, 1,
    ]);
    const screenshotFnRef = useRef<(() => string) | null>(null);
    const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);

    useImperativeHandle(ref, () => ({
      screenshot: () => screenshotFnRef.current?.() ?? "",
    }));

    const handleScreenshotReady = useCallback((fn: () => string) => {
      screenshotFnRef.current = fn;
    }, []);

    const handleShapeSelect = useCallback(() => {}, []);

    const shapeNodes = useMemo(
      () =>
        shapes.map((shape) => (
          <Suspense key={shape.id} fallback={null}>
            <MemoShape3D
              assetResolver={assetResolver}
              isPrimaryPolyline={primaryPolylineId === shape.id}
              isSelected={false}
              onSelect={handleShapeSelect}
              shape={shape}
              theme={t}
            />
          </Suspense>
        )),
      [assetResolver, handleShapeSelect, primaryPolylineId, shapes, t]
    );

    return (
      <div
        className="relative h-full w-full"
        style={{
          background: t.bg,
          overscrollBehaviorX: "none",
          overscrollBehaviorY: "none",
          touchAction: "none",
        }}
      >
        <Canvas
          shadows="percentage"
          camera={{
            position: [cx - 14, 18, cz + 20],
            fov: 46,
            near: 0.1,
            far: 500,
          }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
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

          <TrackSurface3D field={field} theme={t} />

          {shapeNodes}

          <FieldWatermark
            assetResolver={assetResolver}
            fw={field.width}
            fh={field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
          <WheelBridge
            controlsRef={orbitControlsRef}
            enabled={!isMobile}
            minDistance={8}
            maxDistance={Math.max(120, longest * 3)}
          />
          <OrbitGroundConstraint controlsRef={orbitControlsRef} />
          {showGizmo ? (
            <CameraAxisTracker onChange={setAxisQuaternion} />
          ) : null}
          {isMobile ? (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              screenSpacePanning
              target={[cx, 0, cz]}
              maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
              minDistance={8}
              maxDistance={Math.max(120, longest * 3)}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
              }}
              touches={{
                ONE: THREE.TOUCH.ROTATE,
                TWO: THREE.TOUCH.DOLLY_PAN,
              }}
            />
          ) : (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              enableZoom={false}
              screenSpacePanning
              target={[cx, 0, cz]}
              maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
              minDistance={8}
              maxDistance={Math.max(120, longest * 3)}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.PAN,
              }}
            />
          )}
        </Canvas>

        <AxisGizmoOverlay
          axisQuaternion={axisQuaternion}
          showGizmo={showGizmo}
        />
      </div>
    );
  }
);

export default TrackViewer3D;
