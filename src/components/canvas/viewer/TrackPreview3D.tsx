"use client";

import dynamic from "next/dynamic";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import { useEditor } from "@/store/editor";
import {
  selectDesignShapes,
  selectHasPath,
  selectPrimaryPolyline,
} from "@/store/selectors";
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
  useCatalogTextureWarmup,
} from "@/components/canvas/preview3d/shared-scene";
import {
  AxisGizmoOverlay,
  FieldWatermark,
  FlyThroughControlsOverlay,
  TrackPreview3DHintOverlays,
} from "@/components/canvas/preview3d/overlays";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/editor/TrackPreview3D";

const DroneCamera = dynamic(
  () =>
    import("@/components/canvas/preview3d/flythrough").then((mod) => ({
      default: mod.DroneCamera,
    })),
  { ssr: false }
);

const TrackPreview3D = forwardRef<TrackPreview3DHandle, TrackPreview3DProps>(
  function TrackPreview3D(
    { showGizmo = true, onFlyModeChange }: TrackPreview3DProps,
    ref
  ) {
    usePerfMetric("render:viewer/TrackPreview3D");

    const field = useEditor((state) => state.track.design.field);
    const shapes = useEditor(selectDesignShapes);
    const primaryPolylineId = useEditor(
      (state) => selectPrimaryPolyline(state)?.id ?? null
    );
    useCatalogTextureWarmup(shapes);
    const hasPath = useEditor(selectHasPath);
    const theme = useTheme();
    const isMobile = useIsMobile();
    const t = SCENE_3D_THEME[theme];
    const cx = field.width / 2;
    const cz = field.height / 2;
    const longest = Math.max(field.width, field.height);

    const [flyMode, setFlyMode] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [bankingEnabled, setBankingEnabled] = useState(true);
    const [axisQuaternion, setAxisQuaternion] = useState<QuaternionState>([
      0, 0, 0, 1,
    ]);
    const screenshotFnRef = useRef<(() => string) | null>(null);
    const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);

    useEffect(() => {
      onFlyModeChange?.(flyMode);
    }, [flyMode, onFlyModeChange]);

    useImperativeHandle(ref, () => ({
      screenshot: () => screenshotFnRef.current?.() ?? "",
      startFlyThrough: () => {
        if (!hasPath) return;
        setFlyMode(true);
        setPlaying(true);
      },
      stopFlyThrough: () => {
        setFlyMode(false);
        setPlaying(false);
      },
    }));

    const handleScreenshotReady = useCallback((fn: () => string) => {
      screenshotFnRef.current = fn;
    }, []);

    const startFlyThrough = useCallback(() => {
      if (!hasPath) return;
      setFlyMode(true);
      setPlaying(true);
    }, [hasPath]);

    const handleShapeSelect = useCallback(() => {}, []);
    const showMiddleMousePanningCursor = false;

    const shapeNodes = useMemo(
      () =>
        shapes.map((shape) => (
          <Suspense key={shape.id} fallback={null}>
            <MemoShape3D
              isPrimaryPolyline={primaryPolylineId === shape.id}
              isSelected={false}
              onSelect={handleShapeSelect}
              shape={shape}
              theme={t}
            />
          </Suspense>
        )),
      [handleShapeSelect, primaryPolylineId, shapes, t]
    );

    return (
      <div
        className="relative h-full w-full"
        style={{
          background: t.bg,
          overscrollBehaviorX: "none",
          overscrollBehaviorY: "none",
          touchAction: "none",
          cursor: showMiddleMousePanningCursor ? "grabbing" : undefined,
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
            fw={field.width}
            fh={field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
          <WheelBridge
            controlsRef={orbitControlsRef}
            enabled={!flyMode && !isMobile}
            minDistance={8}
            maxDistance={Math.max(120, longest * 3)}
          />
          <OrbitGroundConstraint controlsRef={orbitControlsRef} />
          {showGizmo ? (
            <CameraAxisTracker onChange={setAxisQuaternion} />
          ) : null}
          {flyMode ? (
            <Suspense fallback={null}>
              <DroneCamera
                shapes={shapes}
                playing={playing}
                speed={speed}
                bankingEnabled={bankingEnabled}
              />
            </Suspense>
          ) : isMobile ? (
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

        <FlyThroughControlsOverlay
          bankingEnabled={bankingEnabled}
          flyMode={flyMode}
          playing={playing}
          setBankingEnabled={setBankingEnabled}
          setFlyMode={setFlyMode}
          setPlaying={setPlaying}
          setSpeed={setSpeed}
          speed={speed}
        />

        <TrackPreview3DHintOverlays
          flyMode={flyMode}
          hasPath={hasPath}
          hasSelectedDiveGate={false}
          hasSelectedRotatable={false}
          isMobile={isMobile}
          readOnly
          selectedPolyline={null}
          onStartFlyThrough={startFlyThrough}
        />
      </div>
    );
  }
);

export default TrackPreview3D;
