"use client";

import { Grid, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Scene3DTheme } from "@/components/canvas/preview3d/theme";
import { getTrackElementCatalogTexturePaths } from "@/lib/track/elements/catalog";
import type { Shape } from "@/lib/types";

// Eagerly preload all catalog textures when this module is first imported
// (triggered ~800ms after page load via dynamic import prefetch).
if (typeof window !== "undefined") {
  for (const path of getTrackElementCatalogTexturePaths()) {
    useTexture.preload(path);
  }
}

type WebKitGestureEvent = Event & { scale: number };
export type QuaternionState = [number, number, number, number];

// Leave a small angle above the horizon so the camera cannot skim underneath
// the field when the orbit target is at ground level.
export const ORBIT_MAX_POLAR_ANGLE = Math.PI / 2 - THREE.MathUtils.degToRad(4);

export function CameraCapture({
  onCamera,
}: {
  onCamera: (cam: THREE.Camera) => void;
}) {
  const { camera } = useThree();
  useEffect(() => {
    onCamera(camera);
  }, [camera, onCamera]);
  return null;
}

export function ScreenshotHelper({
  onReady,
}: {
  onReady: (fn: () => string) => void;
}) {
  const { gl } = useThree();
  useEffect(() => {
    onReady(() => gl.domElement.toDataURL("image/png"));
  }, [gl, onReady]);
  return null;
}

export function useCatalogTextureWarmup(_shapes?: readonly Shape[]) {
  // Module-level preload (above) already covers all catalog textures eagerly.
  // This hook is kept for call-site compatibility.
}

function hexToRgba(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

export function createTrackSurfaceTexture({
  baseColor,
  checkerColor,
  gridStep,
  width,
  height,
}: {
  baseColor: string;
  checkerColor: string;
  gridStep: number;
  width: number;
  height: number;
}) {
  const base = hexToRgba(baseColor);
  const checker = hexToRgba(checkerColor);
  const size = 64;
  const cellSize = size / 2;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = x < cellSize === y < cellSize ? base : checker;
      data.set(color, (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const checkerTileSize = gridStep * 10;
  texture.repeat.set(width / checkerTileSize, height / checkerTileSize);
  texture.needsUpdate = true;
  return texture;
}

function createRectangularRingShape({
  innerHeight,
  innerWidth,
  outerHeight,
  outerWidth,
}: {
  innerHeight: number;
  innerWidth: number;
  outerHeight: number;
  outerWidth: number;
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-outerWidth / 2, -outerHeight / 2);
  shape.lineTo(outerWidth / 2, -outerHeight / 2);
  shape.lineTo(outerWidth / 2, outerHeight / 2);
  shape.lineTo(-outerWidth / 2, outerHeight / 2);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-innerWidth / 2, -innerHeight / 2);
  hole.lineTo(-innerWidth / 2, innerHeight / 2);
  hole.lineTo(innerWidth / 2, innerHeight / 2);
  hole.lineTo(innerWidth / 2, -innerHeight / 2);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

export function TrackSurface3D({
  field,
  onGroundClick,
  theme,
}: {
  field: { width: number; height: number; gridStep: number };
  onGroundClick?: (event: ThreeEvent<MouseEvent>) => void;
  theme: Scene3DTheme;
}) {
  const { width, height, gridStep } = field;
  const cx = width / 2;
  const cz = height / 2;
  const longest = Math.max(width, height);
  const terrainSize = Math.max(longest * 3, longest + 80);
  const borderWidth = 0.45;
  const borderHeight = 0.08;
  const borderOuterWidth = width + borderWidth * 2;
  const borderOuterHeight = height + borderWidth * 2;
  const texture = useMemo(
    () =>
      createTrackSurfaceTexture({
        baseColor: theme.groundColor,
        checkerColor: theme.groundChecker,
        gridStep,
        width,
        height,
      }),
    [gridStep, height, theme.groundChecker, theme.groundColor, width]
  );
  const terrainGeometry = useMemo(
    () =>
      new THREE.ShapeGeometry(
        createRectangularRingShape({
          innerHeight: borderOuterHeight,
          innerWidth: borderOuterWidth,
          outerHeight: terrainSize,
          outerWidth: terrainSize,
        })
      ),
    [borderOuterHeight, borderOuterWidth, terrainSize]
  );
  const borderGeometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(
        createRectangularRingShape({
          innerHeight: height,
          innerWidth: width,
          outerHeight: borderOuterHeight,
          outerWidth: borderOuterWidth,
        }),
        {
          bevelEnabled: false,
          depth: borderHeight,
          steps: 1,
        }
      ),
    [borderOuterHeight, borderOuterWidth, height, width]
  );

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => terrainGeometry.dispose(), [terrainGeometry]);
  useEffect(() => () => borderGeometry.dispose(), [borderGeometry]);

  return (
    <group>
      <mesh
        geometry={terrainGeometry}
        position={[cx, -0.075, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onGroundClick}
      >
        <meshBasicMaterial color={theme.terrainColor} />
      </mesh>

      <mesh
        geometry={borderGeometry}
        position={[cx, -borderHeight - 0.01, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={onGroundClick}
      >
        <meshStandardMaterial
          color={theme.groundBorder}
          roughness={0.98}
          metalness={0}
        />
      </mesh>

      <mesh
        position={[cx, -0.009, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={onGroundClick}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial map={texture} roughness={0.98} metalness={0} />
      </mesh>

      <Grid
        position={[cx, 0.006, cz]}
        args={[width, height]}
        cellSize={gridStep}
        cellColor={theme.gridCell}
        cellThickness={theme.gridCellThickness}
        sectionSize={gridStep * 5}
        sectionColor={theme.gridSection}
        sectionThickness={theme.gridSectionThickness}
        fadeDistance={Math.max(90, longest * 2)}
        fadeStrength={1.15}
        infiniteGrid={false}
      />
    </group>
  );
}

export function CameraAxisTracker({
  onChange,
}: {
  onChange: (state: QuaternionState) => void;
}) {
  const { camera } = useThree();
  const lastKeyRef = useRef("");

  useFrame(() => {
    const inverse = camera.quaternion.clone().invert();
    const next: QuaternionState = [inverse.x, inverse.y, inverse.z, inverse.w];
    const key = next.map((value) => value.toFixed(4)).join("|");

    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      onChange(next);
    }
  });

  return null;
}

export function clampOrbitTargetAboveGround(
  camera: THREE.Camera,
  controls: Pick<OrbitControlsImpl, "target" | "update">,
  minTargetHeight = 0
) {
  const lift = minTargetHeight - controls.target.y;
  if (lift <= 0) return false;

  controls.target.y = minTargetHeight;
  camera.position.y += lift;
  return true;
}

export function OrbitGroundConstraint({
  controlsRef,
}: {
  controlsRef: { current: OrbitControlsImpl | null };
}) {
  const { camera } = useThree();

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !controls.enabled) return;
    if (clampOrbitTargetAboveGround(camera, controls)) controls.update();
  });

  return null;
}

function panPerspectiveCamera(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  element: HTMLElement,
  deltaX: number,
  deltaY: number
) {
  const offset = camera.position.clone().sub(target);
  const targetDistance =
    offset.length() * Math.tan((camera.fov / 2) * (Math.PI / 180));
  const panOffset = new THREE.Vector3()
    .add(
      new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 0)
        .multiplyScalar((-2 * deltaX * targetDistance) / element.clientHeight)
    )
    .add(
      new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 1)
        .multiplyScalar((2 * deltaY * targetDistance) / element.clientHeight)
    );

  camera.position.add(panOffset);
  target.add(panOffset);
}

export function WheelBridge({
  controlsRef,
  enabled,
  minDistance,
  maxDistance,
}: {
  controlsRef: { current: OrbitControlsImpl | null };
  enabled: boolean;
  minDistance: number;
  maxDistance: number;
}) {
  const { camera, gl } = useThree();
  const lastHorizontalScrollTimeRef = useRef(0);
  const targetDistanceRef = useRef<number | null>(null);
  const gestureScaleRef = useRef(1);

  useEffect(() => {
    if (!enabled) return;

    const element = gl.domElement;

    const queueZoomDistance = (rawDeltaY: number) => {
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const currentDist = camera.position.distanceTo(controls.target);
      const base = targetDistanceRef.current ?? currentDist;
      const capped = Math.sign(rawDeltaY) * Math.min(Math.abs(rawDeltaY), 30);
      const factor = Math.exp(capped * 0.007);
      targetDistanceRef.current = Math.max(
        minDistance,
        Math.min(maxDistance, base * factor)
      );
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.metaKey) return;

      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      const isPinchZoom = event.ctrlKey && event.deltaMode === 0;
      const hasHorizontalScroll = Math.abs(event.deltaX) > 0.01;
      const now = Date.now();
      if (hasHorizontalScroll) {
        lastHorizontalScrollTimeRef.current = now;
      }
      const recentHorizontalScroll =
        now - lastHorizontalScrollTimeRef.current < 400;
      const isTrackpadGesture =
        !isPinchZoom &&
        event.deltaMode === 0 &&
        (hasHorizontalScroll || recentHorizontalScroll);

      event.preventDefault();
      event.stopPropagation();

      if (isTrackpadGesture) {
        if (!(camera instanceof THREE.PerspectiveCamera)) return;
        panPerspectiveCamera(
          camera,
          controls.target,
          element,
          -event.deltaX,
          -event.deltaY
        );
        controls.update();
      } else {
        queueZoomDistance(event.deltaY);
      }
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScaleRef.current = (event as WebKitGestureEvent).scale || 1;
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as WebKitGestureEvent;
      const controls = controlsRef.current;
      if (!controls || !controls.enabled) return;

      event.preventDefault();
      event.stopPropagation();

      const nextScale = gestureEvent.scale || 1;
      const scaleRatio = nextScale / (gestureScaleRef.current || 1);
      gestureScaleRef.current = nextScale;

      if (!Number.isFinite(scaleRatio) || Math.abs(scaleRatio - 1) < 0.001) {
        return;
      }

      const syntheticDeltaY = -Math.log(scaleRatio) / 0.007;
      queueZoomDistance(syntheticDeltaY);
    };

    element.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    element.addEventListener(
      "gesturestart",
      handleGestureStart as EventListener,
      {
        passive: false,
        capture: true,
      }
    );
    element.addEventListener(
      "gesturechange",
      handleGestureChange as EventListener,
      {
        passive: false,
        capture: true,
      }
    );

    return () => {
      element.removeEventListener("wheel", handleWheel, true);
      element.removeEventListener(
        "gesturestart",
        handleGestureStart as EventListener,
        true
      );
      element.removeEventListener(
        "gesturechange",
        handleGestureChange as EventListener,
        true
      );
    };
  }, [camera, controlsRef, enabled, gl, maxDistance, minDistance]);

  useEffect(() => {
    if (!enabled) {
      targetDistanceRef.current = null;
    }
  }, [enabled]);

  useFrame(() => {
    const target = targetDistanceRef.current;
    if (target === null) return;

    const controls = controlsRef.current;
    if (!controls || !controls.enabled) return;

    const offset = camera.position.clone().sub(controls.target);
    const currentDist = offset.length();
    const dir = offset.normalize();

    const next = currentDist + (target - currentDist) * 0.1;
    const settled = Math.abs(target - next) < 0.05;
    const applied = settled ? target : next;

    camera.position.copy(controls.target).addScaledVector(dir, applied);
    controls.update();

    if (settled) targetDistanceRef.current = null;
  });

  return null;
}

const SKY_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vWorldPos;
  void main() {
    float h = normalize(vWorldPos).y;
    float t = pow(max(0.0, h), 0.6);
    gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
  }
`;

export function GradientSky({
  topColor,
  horizonColor,
}: {
  topColor: string;
  horizonColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(topColor) },
      horizonColor: { value: new THREE.Color(horizonColor) },
    }),
    [topColor, horizonColor]
  );

  useFrame(() => {
    if (meshRef.current) meshRef.current.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[400, 32, 16]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

export { MemoShape3D } from "./items/TrackItem3D";
