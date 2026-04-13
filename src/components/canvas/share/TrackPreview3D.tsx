"use client";

import dynamic from "next/dynamic";
import { Grid, OrbitControls } from "@react-three/drei";
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
import { useEditor } from "@/store/editor";
import { selectDesignShapes, selectHasPath } from "@/store/selectors";
import {
  CameraAxisTracker,
  MemoShape3D,
  ScreenshotHelper,
  WheelBridge,
  type QuaternionState,
} from "@/components/canvas/trackPreview3DSharedSceneContent";
import {
  AxisGizmoOverlay,
  FieldWatermark,
  FlyThroughControlsOverlay,
  TrackPreview3DHintOverlays,
} from "@/components/canvas/trackPreview3DOverlays";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/editor/TrackPreview3D";

const DroneCamera = dynamic(
  () =>
    import("@/components/canvas/trackPreview3DFlythrough").then((mod) => ({
      default: mod.DroneCamera,
    })),
  { ssr: false }
);

const THEME = {
  dark: {
    bg: "#0b1018",
    fog: "#0b1018" as `#${string}`,
    ambientIntensity: 0.7,
    dirIntensity: 1.4,
    groundColor: "#0f1824",
    gridCell: "#1e293b",
    gridSection: "#3d5068",
  },
  light: {
    bg: "#e8edf3",
    fog: "#e8edf3" as `#${string}`,
    ambientIntensity: 1.2,
    dirIntensity: 1.8,
    groundColor: "#d0d8e4",
    gridCell: "#b0bcc8",
    gridSection: "#7a96b0",
  },
};

const TrackPreview3D = forwardRef<TrackPreview3DHandle, TrackPreview3DProps>(
  function TrackPreview3D(
    { showGizmo = true, onFlyModeChange }: TrackPreview3DProps,
    ref
  ) {
    usePerfMetric("render:share/TrackPreview3D");

    const field = useEditor((state) => state.track.design.field);
    const shapes = useEditor(selectDesignShapes);
    const hasPath = useEditor(selectHasPath);
    const theme = useTheme();
    const isMobile = useIsMobile();
    const t = THEME[theme];
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
          <MemoShape3D
            key={shape.id}
            isEditing={false}
            isPrimaryPolyline={false}
            isSelected={false}
            onSelect={handleShapeSelect}
            shape={shape}
          />
        )),
      [handleShapeSelect, shapes]
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
          <color attach="background" args={[t.bg]} />
          <fog attach="fog" args={[t.fog, 80, 260]} />
          <ambientLight intensity={t.ambientIntensity} />
          <directionalLight
            position={[cx + 12, 28, cz + 8]}
            intensity={t.dirIntensity}
            castShadow
            shadow-mapSize-width={1536}
            shadow-mapSize-height={1536}
          />
          <pointLight
            position={[cx - 10, 8, cz - 5]}
            intensity={0.3}
            color="#2dd4bf"
          />
          <pointLight
            position={[cx + 15, 6, cz + 12]}
            intensity={0.25}
            color="#60a5fa"
          />

          <mesh
            position={[cx, -0.01, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[field.width, field.height]} />
            <meshStandardMaterial
              color={t.groundColor}
              roughness={0.98}
              metalness={0}
            />
          </mesh>

          <Grid
            position={[cx, 0, cz]}
            args={[field.width, field.height]}
            cellSize={field.gridStep}
            cellColor={t.gridCell}
            sectionSize={field.gridStep * 5}
            sectionColor={t.gridSection}
            fadeDistance={Math.max(90, longest * 2)}
            fadeStrength={1.15}
            infiniteGrid={false}
          />

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
              maxPolarAngle={Math.PI / 2}
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
              maxPolarAngle={Math.PI / 2}
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
