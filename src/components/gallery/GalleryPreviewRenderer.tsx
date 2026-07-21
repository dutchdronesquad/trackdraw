"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo } from "react";
import { useEditor } from "@/store/editor";
import { selectDesignShapes, selectPrimaryPolyline } from "@/store/selectors";
import { useTheme } from "@/hooks/useTheme";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import {
  MemoShape3D,
  ScreenshotHelper,
  TrackSurface3D,
} from "@/components/canvas/preview3d/shared-scene";

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
  const primaryPolylineId = useEditor(
    (state) => selectPrimaryPolyline(state)?.id ?? null
  );
  const theme = useTheme();
  const t = SCENE_3D_THEME[theme];

  const cx = field.width / 2;
  const cz = field.height / 2;
  const longest = Math.max(field.width, field.height);

  const noop = useCallback(() => {}, []);

  const shapeNodes = useMemo(
    () =>
      shapes.map((shape) => (
        <MemoShape3D
          key={shape.id}
          isPrimaryPolyline={primaryPolylineId === shape.id}
          isSelected={false}
          onSelect={noop}
          shape={shape}
          theme={t}
        />
      )),
    [noop, primaryPolylineId, shapes, t]
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
        shadows="percentage"
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
        <Suspense fallback={null}>
          <TrackSurface3D field={field} theme={t} />
          {shapeNodes}
          <ScreenshotHelper onReady={handleReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}
