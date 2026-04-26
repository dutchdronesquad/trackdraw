"use client";

import { Canvas } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { Suspense, useCallback, useMemo } from "react";
import { useEditor } from "@/store/editor";
import { selectDesignShapes } from "@/store/selectors";
import { useTheme } from "@/hooks/useTheme";
import {
  MemoShape3D,
  ScreenshotHelper,
} from "@/components/canvas/trackPreview3DSharedSceneContent";

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

type Props = {
  /** Called once with the PNG data URL after the scene has rendered. */
  onCapture: (dataUrl: string) => void;
};

/**
 * Renders the current track design in a hidden offscreen canvas at a fixed
 * isometric angle and fires onCapture with the PNG data URL. Unmount to stop.
 */
export function GalleryPreviewRenderer({ onCapture }: Props) {
  const field = useEditor((s) => s.track.design.field);
  const shapes = useEditor(selectDesignShapes);
  const theme = useTheme();
  const t = THEME[theme];

  const cx = field.width / 2;
  const cz = field.height / 2;
  const longest = Math.max(field.width, field.height);

  const noop = useCallback(() => {}, []);

  const shapeNodes = useMemo(
    () =>
      shapes.map((shape) => (
        <MemoShape3D
          key={shape.id}
          isEditing={false}
          isPrimaryPolyline={false}
          isSelected={false}
          onSelect={noop}
          shape={shape}
        />
      )),
    [noop, shapes]
  );

  const handleReady = useCallback(
    (fn: () => string) => {
      // Two rAF passes: first to flush React state, second to flush WebGL draw.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            onCapture(fn());
          } catch {
            /* Silently ignore — the listing action will surface the error. */
          }
        });
      });
    },
    [onCapture]
  );

  return (
    <div
      style={{
        position: "fixed",
        left: -9999,
        top: -9999,
        width: 960,
        height: 540,
        pointerEvents: "none",
        visibility: "hidden",
      }}
      aria-hidden="true"
    >
      <Canvas
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{
          // Lower, closer diagonal angle from the opposite side for stronger card previews.
          position: [cx - longest * 0.12, longest * 0.5, cz + longest * 0.5],
          fov: 44,
          near: 0.1,
          far: longest * 8,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(cx, longest * 0.1, cz + longest * 0.1);
        }}
      >
        <color attach="background" args={[t.bg]} />
        <fog attach="fog" args={[t.fog, longest * 2, longest * 5]} />
        <ambientLight intensity={t.ambientIntensity} />
        <directionalLight
          position={[cx + longest * 0.5, longest, cz + longest * 0.3]}
          intensity={t.dirIntensity}
          castShadow
        />
        <Suspense fallback={null}>
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
          <ScreenshotHelper onReady={handleReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
