"use client";

import { FlagMotion } from "@/components/canvas/preview3d/flag-motion";

import dynamic from "next/dynamic";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
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
import { useIsMobileLayout, useIsTouchDevice } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import { PRESENTATION_FOV, type CameraFrame } from "@/lib/track/camera-framing";
import {
  OrbitCamera,
  type FrameTrack,
} from "@/components/canvas/preview3d/OrbitCamera";
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
  ScreenshotHelper,
  TrackSurface3D,
  type QuaternionState,
  useCatalogTextureWarmup,
} from "@/components/canvas/preview3d/shared-scene";
import {
  AxisGizmoOverlay,
  CameraFramingOverlay,
  FieldWatermark,
  FlyThroughControlsOverlay,
  TrackPreview3DHintOverlays,
} from "@/components/canvas/preview3d/overlays";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/editor/TrackPreview3D";

const PREVIEW_CAMERA = { fov: PRESENTATION_FOV, near: 0.1, far: 500 };

const DroneCamera = dynamic(
  () =>
    import("@/components/canvas/preview3d/flythrough").then((mod) => ({
      default: mod.DroneCamera,
    })),
  { ssr: false }
);

const TrackPreview3D = forwardRef<TrackPreview3DHandle, TrackPreview3DProps>(
  function TrackPreview3D(
    { active = true, showGizmo = true, onFlyModeChange }: TrackPreview3DProps,
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
    const isMobile = useIsTouchDevice();
    const mobileLayout = useIsMobileLayout();
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
    const frameTrackRef = useRef<FrameTrack | null>(null);
    const savedOrbitFrame = useRef<CameraFrame | null>(null);

    useEffect(() => {
      onFlyModeChange?.(flyMode);
    }, [flyMode, onFlyModeChange]);

    useImperativeHandle(ref, () => ({
      screenshot: () => screenshotFnRef.current?.() ?? "",
      fitCourse: () => frameTrackRef.current?.(),
      getCameraView: () =>
        orbitControlsRef.current?.object instanceof THREE.PerspectiveCamera
          ? orbitControlsRef.current.object.clone()
          : null,
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

    const [pickedItemId, setPickedItemId] = useState<string>();
    const focusItemId = shapes.some((shape) => shape.id === pickedItemId)
      ? pickedItemId
      : undefined;
    const handleShapeSelect = useCallback(
      (event: ThreeEvent<MouseEvent>, shapeId: string) => {
        event.stopPropagation();
        if (event.delta <= 3) setPickedItemId(shapeId);
      },
      []
    );
    const clearPickedItem = useCallback((event: ThreeEvent<MouseEvent>) => {
      if (event.delta <= 3) setPickedItemId(undefined);
    }, []);

    const shapeNodes = useMemo(
      () =>
        shapes.map((shape) => (
          <Suspense key={shape.id} fallback={null}>
            <MemoShape3D
              isPrimaryPolyline={primaryPolylineId === shape.id}
              isSelected={focusItemId === shape.id}
              onSelect={handleShapeSelect}
              shape={shape}
              theme={t}
            />
          </Suspense>
        )),
      [focusItemId, handleShapeSelect, primaryPolylineId, shapes, t]
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
          onPointerMissed={() => setPickedItemId(undefined)}
          shadows="percentage"
          camera={PREVIEW_CAMERA}
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

          <TrackSurface3D
            field={field}
            theme={t}
            onGroundClick={clearPickedItem}
          />

          <FlagMotion playing={active && (!flyMode || playing)}>
            {shapeNodes}
          </FlagMotion>

          <FieldWatermark
            fw={field.width}
            fh={field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
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
          ) : (
            <OrbitCamera
              active={active}
              enabled={true}
              field={field}
              frameRef={frameTrackRef}
              isTouchDevice={isMobile}
              mobileLayout={mobileLayout}
              orbitControlsRef={orbitControlsRef}
              savedFrame={savedOrbitFrame}
              shapes={shapes}
              showGizmo={showGizmo}
            />
          )}
        </Canvas>

        {!flyMode && (
          <CameraFramingOverlay
            disabled={false}
            focusItemId={focusItemId}
            onFrame={(itemId) => frameTrackRef.current?.(itemId)}
            showGizmo={showGizmo}
          />
        )}
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
