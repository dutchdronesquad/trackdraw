"use client";

import { Component, Suspense, useRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { loadAppearance } from "@trackdraw/schema/appearance/registry";
import { getShapeArtworkReference } from "@/lib/track/appearance";
import {
  getGateVisualSpec,
  getTrackElementVisualSpec,
} from "@/lib/track/elements/visual";
import {
  TrackSurface3D,
  MemoShape3D,
} from "@/components/canvas/preview3d/shared-scene";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import type { Shape, TrackDesign } from "@/lib/types";
import { fitPresentationCamera, PRESENTATION_FOV } from "./presentation-camera";

function requiredTexturePaths(shapes: Shape[]) {
  const paths = new Set<string>();
  function visit(value: unknown) {
    if (typeof value === "string" && /^(https?:\/\/|\/)/.test(value))
      paths.add(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  }
  for (const shape of shapes) {
    // The resolved gate spec includes portable artwork and timing-marker textures.
    visit(
      shape.kind === "gate"
        ? getGateVisualSpec(shape)
        : getTrackElementVisualSpec(shape)
    );
  }
  return [...paths];
}

class ExportBoundary extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function PresentationScene({
  design,
  theme,
  currentCamera,
  transparent,
  onReady,
  onError,
}: {
  design: TrackDesign;
  theme: "light" | "dark";
  currentCamera?: THREE.PerspectiveCamera;
  transparent: boolean;
  onReady: (url: string) => void;
  onError: (error: unknown) => void;
}) {
  // Suspend the entire export until textures are decoded, including textures
  // normally hidden behind nested null fallbacks in the interactive renderer.
  useTexture(
    requiredTexturePaths(design.shapeOrder.map((id) => design.shapeById[id]))
  );
  const group = useRef<THREE.Group>(null);
  const frames = useRef(0);
  const started = useRef(false);
  const { gl, scene, camera } = useThree();
  const t = SCENE_3D_THEME[theme];
  const primary = design.shapeOrder
    .map((id) => design.shapeById[id])
    .find((shape) => shape.kind === "polyline");
  useFrame(() => {
    if (started.current || !group.current || ++frames.current < 3) return;
    started.current = true;
    const capture = async () => {
      if (!(camera instanceof THREE.PerspectiveCamera))
        throw new Error("Perspective camera unavailable");
      if (currentCamera) camera.copy(currentCamera);
      else
        fitPresentationCamera(
          camera,
          new THREE.Box3().setFromObject(group.current!, true)
        );
      camera.updateMatrixWorld();
      gl.setClearColor(transparent ? 0x000000 : t.bg, transparent ? 0 : 1);
      await gl.compileAsync(scene, camera);
      gl.render(scene, camera);
      onReady(gl.domElement.toDataURL("image/png"));
    };
    void capture().catch(onError);
  });
  return (
    <>
      <hemisphereLight
        color={t.hemisphereSky}
        groundColor={t.hemisphereGround}
        intensity={t.hemisphereIntensity}
      />
      <ambientLight intensity={t.ambientIntensity} />
      <directionalLight
        position={[
          design.field.width / 2 + 12,
          28,
          design.field.height / 2 + 8,
        ]}
        color={t.dirColor}
        intensity={t.dirIntensity}
      />
      <group ref={group}>
        <TrackSurface3D field={design.field} theme={t} bounded />
        {design.shapeOrder
          .map((id) => design.shapeById[id])
          .map((shape) => (
            <MemoShape3D
              key={shape.id}
              shape={shape}
              theme={t}
              isPrimaryPolyline={shape.id === primary?.id}
              isSelected={false}
              onSelect={() => {}}
            />
          ))}
      </group>
    </>
  );
}

/** Render in a separate context so export cannot mutate the editor or its camera. */
export async function renderTrack3dPng(
  design: TrackDesign,
  theme: "light" | "dark",
  currentCamera?: THREE.PerspectiveCamera,
  transparent = true
): Promise<string> {
  let artworkTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.all(
        design.shapeOrder
          .map((id) => design.shapeById[id])
          .map(async (shape) => {
            const reference = getShapeArtworkReference(shape);
            if (reference) await loadAppearance(reference);
          })
      ),
      new Promise<never>((_, reject) => {
        artworkTimer = setTimeout(
          () => reject(new Error("Artwork loading timed out")),
          30000
        );
      }),
    ]);
  } finally {
    clearTimeout(artworkTimer);
  }
  const host = document.createElement("div");
  const aspect = currentCamera?.aspect ?? 4 / 3;
  const longestEdge = 3200;
  const width = aspect >= 1 ? longestEdge : Math.round(longestEdge * aspect);
  const height = aspect >= 1 ? Math.round(longestEdge / aspect) : longestEdge;
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: "none",
  });
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  const root = createRoot(host);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("3D export timed out")), 30000);
      root.render(
        <ExportBoundary onError={reject}>
          <Canvas
            dpr={1}
            camera={{ fov: PRESENTATION_FOV }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          >
            <Suspense fallback={null}>
              <PresentationScene
                design={design}
                theme={theme}
                currentCamera={currentCamera}
                transparent={transparent}
                onReady={resolve}
                onError={reject}
              />
            </Suspense>
          </Canvas>
        </ExportBoundary>
      );
    });
  } finally {
    clearTimeout(timer);
    root.unmount();
    host.remove();
  }
}
