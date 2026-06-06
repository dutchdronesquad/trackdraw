"use client";

import { RoundedBox, useTexture } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Ref,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  getPolylineRouteWarningSegmentVisuals,
  getRouteWarningSegmentColor,
  getPolylineSmoothSegmentPoints3D,
} from "@/lib/track/polyline-derived";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import {
  getCornerFlagLayout,
  getLadderRenderedHeight,
  getPanelFrameGateLayout,
  getPanelFrameLadderLayout,
  resolvePanelTextureMapping,
} from "@/lib/track/render3d-layout";
import {
  getFlagVisualSpec,
  getGateVisualSpec,
  getLadderVisualSpec,
} from "@/lib/track/elements/visual";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import {
  DEFAULT_POLYLINE_STROKE_WIDTH,
  POLYLINE_3D_HEIGHT_OFFSET,
} from "@/lib/track/constants";
import type {
  CornerMarkerFlagVisualSpec,
  GatePanelTextureVisualSpec,
  PanelFrameGateVisualSpec,
  PanelFrameLadderVisualSpec,
} from "@/lib/track/elements/catalog";
import { getTrackElementCatalogTexturePaths } from "@/lib/track/elements/catalog";
import type {
  ConeShape,
  DiveGateShape,
  FlagShape,
  GateShape,
  LabelShape,
  LadderShape,
  PolylineShape,
  Shape,
  StartFinishShape,
} from "@/lib/types";

type WebKitGestureEvent = Event & { scale: number };
export type QuaternionState = [number, number, number, number];

function assignGroupRef(
  ref: Ref<THREE.Group> | undefined,
  node: THREE.Group | null
) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  ref.current = node;
}

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

const CATALOG_TEXTURE_PATHS = getTrackElementCatalogTexturePaths();

export function useCatalogTextureWarmup() {
  useEffect(() => {
    // Populate the Three.js texture cache in parallel immediately on mount.
    // In the editor the browser HTTP cache is already warm (seeded by
    // EditorWorkspace). In the share view this is the first fetch, but loading
    // all textures in parallel is still faster than the old sequential approach.
    for (const path of CATALOG_TEXTURE_PATHS) {
      useTexture.preload(path);
    }
  }, []);
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

interface TextTextureOptions {
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: number;
  letterSpacing?: number;
}

interface TextTextureCacheEntry {
  refs: number;
  texture: THREE.CanvasTexture;
}

const textTextureCache = new Map<string, TextTextureCacheEntry>();

function getTextTextureCacheKey(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
) {
  return [
    text,
    color,
    fontSize,
    options.fontFamily,
    options.fontStyle,
    options.fontWeight,
    options.letterSpacing,
  ].join("\u0001");
}

function createTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
): THREE.CanvasTexture {
  const scale = 4;
  const measW = Math.max(256, text.length * fontSize * scale * 0.62 + 40);
  const measH = fontSize * scale * 2;
  const canvas = document.createElement("canvas");
  canvas.width = measW;
  canvas.height = measH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, measW, measH);
  ctx.fillStyle = color;
  ctx.font = `${options.fontStyle} ${options.fontWeight} ${
    fontSize * scale
  }px ${options.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (options.letterSpacing) {
    const spacing = options.letterSpacing * scale;
    const chars = [...text];
    const totalWidth =
      chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
      spacing * Math.max(chars.length - 1, 0);
    let x = measW / 2 - totalWidth / 2;
    for (const char of chars) {
      const charWidth = ctx.measureText(char).width;
      ctx.fillText(char, x + charWidth / 2, measH / 2);
      x += charWidth + spacing;
    }
  } else {
    ctx.fillText(text, measW / 2, measH / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getSharedTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
) {
  const key = getTextTextureCacheKey(text, color, fontSize, options);
  const existing = textTextureCache.get(key);
  if (existing) {
    existing.refs += 1;
    return { key, texture: existing.texture };
  }

  const texture = createTextTexture(text, color, fontSize, options);
  textTextureCache.set(key, { refs: 1, texture });
  return { key, texture };
}

function releaseSharedTextTexture(
  key: string,
  fallbackTexture: THREE.CanvasTexture
) {
  const entry = textTextureCache.get(key);
  if (!entry) {
    // Cache was cleared (e.g. HMR module replacement) — dispose directly.
    fallbackTexture.dispose();
    return;
  }

  entry.refs -= 1;
  if (entry.refs > 0) return;

  textTextureCache.delete(key);
  entry.texture.dispose();
}

function useTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options?: TextTextureOptions
): THREE.CanvasTexture {
  const fontFamily = options?.fontFamily ?? "ui-monospace,monospace,Arial";
  const fontStyle = options?.fontStyle ?? "normal";
  const fontWeight = options?.fontWeight ?? 600;
  const letterSpacing = options?.letterSpacing ?? 0;
  const shared = useMemo(
    () =>
      getSharedTextTexture(text, color, fontSize, {
        fontFamily,
        fontStyle,
        fontWeight,
        letterSpacing,
      }),
    [color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, text]
  );

  useEffect(() => {
    const { key, texture } = shared;
    return () => releaseSharedTextTexture(key, texture);
  }, [shared]);

  return shared.texture;
}

function PanelFrameGateTexturePlanes({
  frontZ,
  h,
  leftPanelWidth,
  leftPanelX,
  rightPanelWidth,
  rightPanelX,
  textures,
  topPanelHeight,
  topPanelW,
  topPanelY,
}: {
  frontZ: number;
  h: number;
  leftPanelWidth: number;
  leftPanelX: number;
  rightPanelWidth: number;
  rightPanelX: number;
  textures: GatePanelTextureVisualSpec;
  topPanelHeight: number;
  topPanelW: number;
  topPanelY: number;
}) {
  const [leftTexture, rightTexture, topTexture] = useTexture([
    textures.left,
    textures.right,
    textures.top ?? textures.left,
  ]) as THREE.Texture[];
  const { leftPanel, rightPanel, leftRotationZ } = resolvePanelTextureMapping(
    textures,
    [leftTexture, rightTexture]
  );

  useEffect(() => {
    for (const texture of [leftTexture, rightTexture, topTexture]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }, [leftTexture, rightTexture, topTexture]);

  return (
    <>
      <mesh
        position={[leftPanelX, h / 2, frontZ]}
        rotation={[0, Math.PI, leftRotationZ]}
      >
        <planeGeometry args={[leftPanelWidth, h]} />
        <meshStandardMaterial
          map={leftPanel}
          roughness={0.72}
          metalness={0.01}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh position={[rightPanelX, h / 2, frontZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[rightPanelWidth, h]} />
        <meshStandardMaterial
          map={rightPanel}
          roughness={0.72}
          metalness={0.01}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh position={[0, topPanelY, frontZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[topPanelW, topPanelHeight]} />
        <meshStandardMaterial
          map={topTexture}
          roughness={0.68}
          metalness={0.02}
          side={THREE.FrontSide}
        />
      </mesh>
    </>
  );
}

function PanelFrameLadderSectionTexturePlanes({
  bannerH,
  bannerMidY,
  frontZ,
  hasTopPanel,
  leftPanelWidth,
  openingH,
  openingMidY,
  rightPanelWidth,
  textures,
  topPanelW,
  w,
}: {
  bannerH: number;
  bannerMidY: number;
  frontZ: number;
  hasTopPanel: boolean;
  leftPanelWidth: number;
  openingH: number;
  openingMidY: number;
  rightPanelWidth: number;
  textures: GatePanelTextureVisualSpec;
  topPanelW: number;
  w: number;
}) {
  const leftPanelX = -w / 2 - leftPanelWidth / 2;
  const rightPanelX = w / 2 + rightPanelWidth / 2;
  const shouldRenderTopTexture = Boolean(
    hasTopPanel && textures.top && bannerH > 0
  );
  const [leftTexture, rightTexture, topTexture] = useTexture([
    textures.left,
    textures.right,
    textures.top ?? textures.left,
  ]) as THREE.Texture[];
  const { leftPanel, rightPanel, leftRotationZ } = resolvePanelTextureMapping(
    textures,
    [leftTexture, rightTexture]
  );

  useEffect(() => {
    for (const texture of [leftTexture, rightTexture, topTexture]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }, [leftTexture, rightTexture, topTexture]);

  return (
    <>
      <mesh
        position={[leftPanelX, openingMidY, frontZ]}
        rotation={[0, Math.PI, leftRotationZ]}
      >
        <planeGeometry args={[leftPanelWidth, openingH]} />
        <meshStandardMaterial
          map={leftPanel}
          roughness={0.72}
          metalness={0.01}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        position={[rightPanelX, openingMidY, frontZ]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[rightPanelWidth, openingH]} />
        <meshStandardMaterial
          map={rightPanel}
          roughness={0.72}
          metalness={0.01}
          side={THREE.FrontSide}
        />
      </mesh>
      {shouldRenderTopTexture ? (
        <mesh position={[0, bannerMidY, frontZ]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[topPanelW, bannerH]} />
          <meshStandardMaterial
            map={topTexture}
            roughness={0.68}
            metalness={0.02}
            side={THREE.FrontSide}
          />
        </mesh>
      ) : null}
    </>
  );
}

function PanelFrameGate3D({
  selected = false,
  shape,
  outerRef,
  visual,
  rot,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
  visual: PanelFrameGateVisualSpec;
  rot: [number, number, number];
}) {
  const { frame, panels } = visual;
  const h = shape.height ?? 2;
  const {
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    leftPanelX,
    outerLeftX,
    outerRightX,
    outerTopY,
    panelDepth,
    rightPanelWidth,
    rightPanelX,
    topPanelHeight,
    topPanelW,
    topPanelY,
    w,
  } = getPanelFrameGateLayout(shape, visual);
  const frameTubeMat = {
    color: "#e5e7eb",
    roughness: 0.82,
    metalness: 0.02,
    emissive: selected ? "#60a5fa" : "#000000",
    emissiveIntensity: selected ? 0.06 : 0,
  };
  const frameElbowMat = {
    color: "#e5e7eb",
    roughness: 0.84,
    metalness: 0.01,
  };

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh
        position={[outerLeftX, outerTopY / 2, frameZ]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerTopY, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh position={[outerRightX, outerTopY / 2, frameZ]} castShadow>
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerTopY, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh
        position={[0, outerTopY, frameZ]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry
          args={[frameTube / 2, frameTube / 2, outerRightX - outerLeftX, 16]}
        />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      {[
        [outerLeftX, outerTopY],
        [outerRightX, outerTopY],
      ].map(([x, y], index) => (
        <mesh key={`pvc-elbow-${index}`} position={[x, y, frameZ]} castShadow>
          <sphereGeometry args={[frameTube * 0.66, 16, 12]} />
          <meshStandardMaterial {...frameElbowMat} />
        </mesh>
      ))}

      <mesh position={[leftPanelX, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leftPanelWidth, h, panelDepth]} />
        <meshStandardMaterial
          color={panels.left.color}
          roughness={0.7}
          metalness={0.01}
          emissive={selected ? "#60a5fa" : panels.left.color}
          emissiveIntensity={selected ? 0.24 : 0.02}
        />
      </mesh>
      <mesh position={[rightPanelX, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[rightPanelWidth, h, panelDepth]} />
        <meshStandardMaterial
          color={panels.right.color}
          roughness={0.7}
          metalness={0.01}
          emissive={selected ? "#60a5fa" : panels.right.color}
          emissiveIntensity={selected ? 0.24 : 0.02}
        />
      </mesh>
      <mesh position={[0, topPanelY, 0]} castShadow receiveShadow>
        <boxGeometry args={[topPanelW, topPanelHeight, panelDepth]} />
        <meshStandardMaterial
          color={panels.top.color}
          roughness={0.64}
          metalness={0.03}
          emissive={selected ? "#60a5fa" : panels.top.color}
          emissiveIntensity={selected ? 0.28 : 0.04}
        />
      </mesh>

      <PanelFrameGateTexturePlanes
        frontZ={frontZ}
        h={h}
        leftPanelWidth={leftPanelWidth}
        leftPanelX={leftPanelX}
        rightPanelWidth={rightPanelWidth}
        rightPanelX={rightPanelX}
        textures={visual.textures}
        topPanelHeight={topPanelHeight}
        topPanelW={topPanelW}
        topPanelY={topPanelY}
      />

      <mesh position={[0, h / 2, -panelDepth / 2 - 0.004]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={frame.color}
          transparent
          opacity={selected ? 0.1 : 0.045}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Gate3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
}) {
  const marker = getShapeTimingMarker(shape);
  const color = marker
    ? getTimingMarkerColor(marker)
    : (shape.color ?? "#3b82f6");
  const visual = getGateVisualSpec(shape);
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];

  if (visual.variant === "panel-frame") {
    return (
      <PanelFrameGate3D
        shape={shape}
        selected={selected}
        outerRef={outerRef}
        visual={visual}
        rot={rot}
      />
    );
  }

  const thick = shape.thick ?? 0.2;
  const h = shape.height ?? 2;
  const w = shape.width ?? 3;

  return (
    <group ref={outerRef} position={[shape.x, 0, shape.y]} rotation={rot}>
      <mesh position={[-(w / 2), h / 2, 0]} castShadow>
        <boxGeometry args={[thick, h, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[thick, h, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w + thick, thick, thick]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.55 : 0.08}
        />
      </mesh>
    </group>
  );
}

function TexturedCornerFlagPanel3D({
  backTexturePath,
  bannerCenterY,
  bannerHeight,
  bannerTextureWidth,
  bannerTextureX,
  frontTexturePath,
  panelDepth,
  selected,
}: {
  backTexturePath: string;
  bannerCenterY: number;
  bannerHeight: number;
  bannerTextureWidth: number;
  bannerTextureX: number;
  frontTexturePath: string;
  panelDepth: number;
  selected: boolean;
}) {
  const [frontTexture, backTexture] = useTexture([
    frontTexturePath,
    backTexturePath,
  ]) as THREE.Texture[];

  const frontMap = useMemo(() => {
    const texture = frontTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [frontTexture]);

  const backMap = useMemo(() => {
    const texture = backTexture.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }, [backTexture]);

  useEffect(() => {
    return () => {
      frontMap.dispose();
      backMap.dispose();
    };
  }, [frontMap, backMap]);

  return (
    <group>
      <mesh
        receiveShadow
        castShadow
        position={[bannerTextureX, bannerCenterY, panelDepth * 0.65]}
      >
        <planeGeometry args={[bannerTextureWidth, bannerHeight]} />
        <meshStandardMaterial
          map={frontMap}
          transparent
          roughness={0.78}
          metalness={0}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.08 : 0}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        receiveShadow
        castShadow
        position={[bannerTextureX, bannerCenterY, -panelDepth * 0.35]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[bannerTextureWidth, bannerHeight]} />
        <meshStandardMaterial
          map={backMap}
          transparent
          roughness={0.78}
          metalness={0}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.08 : 0}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
}

function CornerMarkerFlag3D({
  selected = false,
  shape,
  visual,
  outerRef,
}: {
  selected?: boolean;
  shape: FlagShape;
  visual: CornerMarkerFlagVisualSpec;
  outerRef?: Ref<THREE.Group>;
}) {
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const {
    bannerCenterY,
    bannerHeight,
    bannerTextureWidth,
    bannerTextureX,
    panelDepth,
    poleCapRadius,
    polePoints,
    poleRadius,
    poleTipX,
    poleTipY,
  } = getCornerFlagLayout(shape, true);

  const poleCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        polePoints.map(([x, y]) => new THREE.Vector3(x, y, 0)),
        false,
        "centripetal",
        0.5
      ),
    [polePoints]
  );

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      <mesh
        position={[0, 0.02, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.04, 0.13, 24]} />
        <meshBasicMaterial
          color="#888"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>
      <TexturedCornerFlagPanel3D
        backTexturePath={visual.textures.back}
        bannerCenterY={bannerCenterY}
        bannerHeight={bannerHeight}
        bannerTextureWidth={bannerTextureWidth}
        bannerTextureX={bannerTextureX}
        frontTexturePath={visual.textures.front}
        panelDepth={panelDepth}
        selected={selected}
      />
      {/* Pole follows the textured feather flag's leading edge. */}
      <mesh castShadow>
        <tubeGeometry args={[poleCurve, 40, poleRadius, 12, false]} />
        <meshStandardMaterial
          color={visual.poleColor}
          roughness={0.38}
          metalness={0.42}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
      <mesh position={[poleTipX, poleTipY, 0]} castShadow receiveShadow>
        <sphereGeometry args={[poleCapRadius, 18, 12]} />
        <meshStandardMaterial
          color={visual.poleColor}
          roughness={0.38}
          metalness={0.42}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
    </group>
  );
}

function Flag3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: FlagShape;
  outerRef?: Ref<THREE.Group>;
}) {
  const flagVisual = getFlagVisualSpec(shape);
  const color = shape.color ?? "#a855f7";
  const ph = shape.poleHeight ?? 3.5;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const mastCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, ph * 0.42, 0),
        new THREE.Vector3(0.01, ph * 0.74, 0),
        new THREE.Vector3(0.045, ph * 0.9, 0),
        new THREE.Vector3(0.11, ph * 0.985, 0),
        new THREE.Vector3(0.2, ph * 0.985, 0),
      ]),
    [ph]
  );
  const bannerTop = ph * 0.96;
  const bannerBottom = ph * 0.18;
  const bannerWidth = Math.max(ph * 0.18, 0.62);
  const bannerShape = useMemo(() => {
    const banner = new THREE.Shape();
    banner.moveTo(0.03, bannerBottom);
    banner.bezierCurveTo(0.02, ph * 0.34, 0.01, ph * 0.72, 0.08, bannerTop);
    banner.bezierCurveTo(
      bannerWidth * 0.24,
      ph * 1.01,
      bannerWidth * 0.72,
      ph * 0.96,
      bannerWidth * 0.94,
      ph * 0.78
    );
    banner.bezierCurveTo(
      bannerWidth * 1.02,
      ph * 0.6,
      bannerWidth * 0.82,
      ph * 0.34,
      bannerWidth * 0.22,
      bannerBottom + ph * 0.02
    );
    banner.bezierCurveTo(
      bannerWidth * 0.1,
      bannerBottom - ph * 0.005,
      0.05,
      bannerBottom - ph * 0.002,
      0.03,
      bannerBottom
    );
    return banner;
  }, [bannerBottom, bannerTop, bannerWidth, ph]);

  if (flagVisual?.variant === "corner-marker") {
    return (
      <CornerMarkerFlag3D
        shape={shape}
        selected={selected}
        visual={flagVisual}
        outerRef={outerRef}
      />
    );
  }

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, yawRad, 0]}
    >
      <mesh
        position={[0, 0.025, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.06, 0.14, 24]} />
        <meshBasicMaterial
          color={selected ? "#93c5fd" : color}
          transparent
          opacity={selected ? 0.3 : 0.14}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[mastCurve, 40, 0.024, 10, false]} />
        <meshStandardMaterial
          color="#d7dde8"
          metalness={0.3}
          roughness={0.42}
          emissive={selected ? "#60a5fa" : "#000000"}
          emissiveIntensity={selected ? 0.14 : 0}
        />
      </mesh>
      <mesh position={[0.01, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry
          args={[bannerShape, { depth: 0.018, bevelEnabled: false }]}
        />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.24 : 0.08}
          side={THREE.DoubleSide}
          roughness={0.68}
        />
      </mesh>
    </group>
  );
}

function Cone3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: ConeShape;
}) {
  const color = shape.color ?? "#f97316";
  const r = shape.radius ?? 0.2;
  const h = Math.max(r * 1.15, 0.11);
  const baseRadius = Math.max(r * 1.18, 0.12);
  const topRadius = Math.max(baseRadius * 0.6, 0.075);

  return (
    <group position={[shape.x, 0, shape.y]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[topRadius, baseRadius, h, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.45 : 0.06}
        />
      </mesh>
      <mesh position={[0, h + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[topRadius * 0.28, topRadius * 0.86, 24]} />
        <meshBasicMaterial
          color={selected ? "#fdba74" : "#fed7aa"}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Label3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: LabelShape;
}) {
  const color = shape.color ?? "#ffffff";
  const size = Math.max(0.3, (shape.fontSize ?? 18) * 0.055);
  const texture = useTextTexture(shape.text, color, shape.fontSize ?? 18);
  const groupRef = useRef<THREE.Group>(null);
  const planeW = Math.max(0.8, shape.text.length * size * 0.62);
  const planeH = size * 1.4;

  useFrame(({ camera }) => {
    if (!shape.project && groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }
  });

  if (shape.project) {
    return (
      <mesh
        position={[shape.x, 0.05, shape.y]}
        rotation={[-Math.PI / 2, 0, (-shape.rotation * Math.PI) / 180]}
      >
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          opacity={selected ? 1 : 0.9}
        />
      </mesh>
    );
  }

  return (
    <group ref={groupRef} position={[shape.x, 2.5, shape.y]}>
      <mesh>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          opacity={selected ? 1 : 0.92}
        />
      </mesh>
    </group>
  );
}

function StartFinish3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: StartFinishShape;
}) {
  const marker = getShapeTimingMarker(shape);
  const color = marker
    ? getTimingMarkerColor(marker)
    : (shape.color ?? "#f59e0b");
  const totalW = shape.width ?? 3.0;
  const spacing = totalW / 4;
  const podW = spacing * 0.72;
  const podD = podW * 1.5;
  const podH = 0.08;
  const topInset = 0.08;
  const stripeW = 0.1;
  const gap = spacing - podW;
  const rot: [number, number, number] = [
    0,
    (-shape.rotation * Math.PI) / 180,
    0,
  ];

  return (
    <group position={[shape.x, 0, shape.y]} rotation={rot}>
      {Array.from({ length: 4 }).map((_, i) => {
        const px = -totalW / 2 + spacing * i + spacing / 2;
        const emissive = 0.08 + i * 0.025;
        return (
          <group key={i} position={[px, 0, 0]}>
            <RoundedBox
              args={[podW, podH, podD]}
              radius={0.06}
              smoothness={4}
              position={[0, podH / 2, 0]}
              receiveShadow
              castShadow
            >
              <meshStandardMaterial
                color="#111a26"
                roughness={0.88}
                metalness={0.08}
              />
            </RoundedBox>

            <RoundedBox
              args={[podW - topInset, 0.018, podD - topInset]}
              radius={0.04}
              smoothness={4}
              position={[0, podH + 0.007, 0]}
              receiveShadow
            >
              <meshStandardMaterial
                color={color}
                emissive={selected ? "#60a5fa" : color}
                emissiveIntensity={selected ? emissive + 0.32 : emissive}
                roughness={0.34}
                metalness={0.18}
              />
            </RoundedBox>

            <mesh
              position={[0, podH + 0.022, -(podD / 2) + 0.16]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[podW - topInset * 1.2, stripeW]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.16} />
            </mesh>

            <mesh
              position={[0, podH + 0.026, -(podD / 2) + 0.16]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <boxGeometry args={[0.08, 0.01, 0.08]} />
              <meshBasicMaterial color="#f8fafc" transparent opacity={0.85} />
            </mesh>

            <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[podW + 0.08, podD + 0.08]} />
              <meshBasicMaterial color={color} transparent opacity={0.05} />
            </mesh>
          </group>
        );
      })}

      {[-1, 1].map((dir) => (
        <mesh
          key={`bridge-${dir}`}
          position={[dir * spacing, 0.01, 0]}
          receiveShadow
        >
          <boxGeometry args={[gap + 0.02, 0.015, 0.1]} />
          <meshStandardMaterial
            color="#1c2634"
            roughness={0.9}
            metalness={0.04}
          />
        </mesh>
      ))}
    </group>
  );
}

function PanelFrameLadder3D({
  selected = false,
  shape,
  outerRef,
  elevationOverrideRef,
  visual,
}: {
  selected?: boolean;
  shape: LadderShape;
  outerRef?: Ref<THREE.Group>;
  elevationOverrideRef?: RefObject<number | null>;
  visual: PanelFrameLadderVisualSpec;
}) {
  const { frame, panels } = visual;
  const topPanel = panels.top;
  const {
    bannerH,
    baseY,
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    openingH,
    outerLeftX,
    outerRightX,
    outerW,
    panelDepth,
    rightPanelWidth,
    sections,
    tJunctionRadius,
    totalH,
    w,
  } = getPanelFrameLadderLayout(shape, visual);
  const hasTopFrame = sections.at(-1)?.hasTopPanel ?? true;
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];

  const groupRef = useRef<THREE.Group>(null);
  const lowerBarRef = useRef<THREE.Mesh>(null);
  const setGroupRefs = useCallback(
    (node: THREE.Group | null) => {
      groupRef.current = node;
      assignGroupRef(outerRef, node);
    },
    [outerRef]
  );

  useFrame(() => {
    if (!groupRef.current || !elevationOverrideRef) return;
    const liveElevation = elevationOverrideRef.current;
    if (liveElevation === null) return;
    groupRef.current.position.set(shape.x, Math.max(liveElevation, 0), shape.y);
    if (lowerBarRef.current) {
      lowerBarRef.current.visible = liveElevation > 0;
    }
  });

  const frameTubeMat = {
    color: "#e5e7eb",
    roughness: 0.82,
    metalness: 0.02,
    emissive: selected ? "#60a5fa" : "#000000",
    emissiveIntensity: selected ? 0.06 : 0,
  };
  const panelEmissiveIntensity = selected ? 0.24 : 0.02;

  return (
    <group
      ref={setGroupRefs}
      position={[shape.x, baseY, shape.y]}
      rotation={rot}
    >
      {/* Continuous posts — exactly totalH tall */}
      <mesh position={[outerLeftX, totalH / 2, frameZ]} castShadow>
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, totalH, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>
      <mesh position={[outerRightX, totalH / 2, frameZ]} castShadow>
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, totalH, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>

      {/* Bottom bar when elevated */}
      <mesh
        ref={lowerBarRef}
        position={[0, 0, frameZ]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        visible={baseY > 0}
      >
        <cylinderGeometry args={[frameTube / 2, frameTube / 2, outerW, 16]} />
        <meshStandardMaterial {...frameTubeMat} />
      </mesh>

      {hasTopFrame
        ? [outerLeftX, outerRightX].map((x, idx) => (
            <mesh
              key={`elbow-${idx}`}
              position={[x, totalH, frameZ]}
              castShadow
            >
              <sphereGeometry args={[frameTube * 0.66, 16, 12]} />
              <meshStandardMaterial
                color="#e5e7eb"
                roughness={0.84}
                metalness={0.01}
              />
            </mesh>
          ))
        : null}

      {/* Per section: bar at TOP → banner hangs below bar → opening below banner */}
      {sections.map((section, i) => {
        return (
          <group key={i}>
            {section.hasTopPanel ? (
              <mesh
                position={[0, section.barY, frameZ]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry
                  args={[frameTube / 2, frameTube / 2, outerW, 16]}
                />
                <meshStandardMaterial {...frameTubeMat} />
              </mesh>
            ) : null}
            {/* T-junction connectors on intermediate bars */}
            {section.hasTopPanel &&
              section.isIntermediate &&
              [outerLeftX, outerRightX].map((x, idx) => (
                <mesh key={idx} position={[x, section.barY, frameZ]}>
                  <cylinderGeometry
                    args={[
                      tJunctionRadius,
                      tJunctionRadius,
                      frameTube * 2.4,
                      12,
                    ]}
                  />
                  <meshStandardMaterial
                    color="#e5e7eb"
                    roughness={0.82}
                    metalness={0.02}
                  />
                </mesh>
              ))}
            {section.hasTopPanel && topPanel && bannerH > 0 ? (
              <mesh
                position={[0, section.bannerMidY, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[outerW, bannerH, panelDepth]} />
                <meshStandardMaterial
                  color={topPanel.color}
                  roughness={0.64}
                  metalness={0.03}
                  emissive={selected ? "#60a5fa" : topPanel.color}
                  emissiveIntensity={selected ? 0.28 : 0.04}
                />
              </mesh>
            ) : null}
            <PanelFrameLadderSectionTexturePlanes
              bannerH={bannerH}
              bannerMidY={section.bannerMidY}
              frontZ={frontZ}
              hasTopPanel={section.hasTopPanel}
              leftPanelWidth={leftPanelWidth}
              openingH={openingH}
              openingMidY={section.openingMidY}
              rightPanelWidth={rightPanelWidth}
              textures={visual.textures}
              topPanelW={outerW}
              w={w}
            />
            {/* White left panel */}
            <mesh
              position={[-w / 2 - leftPanelWidth / 2, section.openingMidY, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[leftPanelWidth, openingH, panelDepth]} />
              <meshStandardMaterial
                color={panels.left.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : panels.left.color}
                emissiveIntensity={panelEmissiveIntensity}
              />
            </mesh>
            {/* White right panel */}
            <mesh
              position={[w / 2 + rightPanelWidth / 2, section.openingMidY, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[rightPanelWidth, openingH, panelDepth]} />
              <meshStandardMaterial
                color={panels.right.color}
                roughness={0.7}
                metalness={0.01}
                emissive={selected ? "#60a5fa" : panels.right.color}
                emissiveIntensity={panelEmissiveIntensity}
              />
            </mesh>
            {/* Opening fill */}
            <mesh position={[0, section.openingMidY, -panelDepth / 2 - 0.004]}>
              <planeGeometry args={[w, openingH]} />
              <meshBasicMaterial
                color={frame.color}
                transparent
                opacity={selected ? 0.1 : 0.045}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Ladder3D({
  selected = false,
  shape,
  outerRef,
  elevationOverrideRef,
}: {
  selected?: boolean;
  shape: LadderShape;
  outerRef?: Ref<THREE.Group>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  const ladderVisual = getLadderVisualSpec(shape);
  const color = shape.color ?? "#3b82f6";
  const w = shape.width ?? 1.5;
  const totalH = shape.height ?? 4.5;
  const rungs = Math.max(1, shape.rungs ?? 3);
  const baseY = Math.max(shape.elevation ?? 0, 0);
  const thick = 0.2;
  const gateH = totalH / rungs;
  const groupRef = useRef<THREE.Group>(null);
  const lowerBarRef = useRef<THREE.Mesh>(null);
  const rot: [number, number, number] = [
    0,
    (-(shape.rotation + 180) * Math.PI) / 180,
    0,
  ];
  const setGroupRefs = useCallback(
    (node: THREE.Group | null) => {
      groupRef.current = node;
      assignGroupRef(outerRef, node);
    },
    [outerRef]
  );

  useFrame(() => {
    if (!groupRef.current || !elevationOverrideRef) return;
    const liveElevation = elevationOverrideRef.current;
    if (liveElevation === null) return;
    groupRef.current.position.set(shape.x, Math.max(liveElevation, 0), shape.y);
    if (lowerBarRef.current) {
      lowerBarRef.current.visible = liveElevation > 0;
    }
  });

  if (ladderVisual?.variant === "panel-frame") {
    return (
      <PanelFrameLadder3D
        shape={shape}
        selected={selected}
        outerRef={outerRef}
        elevationOverrideRef={elevationOverrideRef}
        visual={ladderVisual}
      />
    );
  }

  return (
    <group
      ref={setGroupRefs}
      position={[shape.x, baseY, shape.y]}
      rotation={rot}
    >
      {Array.from({ length: rungs }).map((_, i) => (
        <group key={i} position={[0, i * gateH, 0]}>
          <mesh position={[-(w / 2), gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          <mesh position={[w / 2, gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          <mesh position={[0, gateH, 0]} castShadow>
            <boxGeometry args={[w + thick, thick, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          {i === 0 ? (
            <mesh
              ref={lowerBarRef}
              position={[0, 0, 0]}
              castShadow
              visible={baseY > 0}
            >
              <boxGeometry args={[w + thick, thick, thick]} />
              <meshStandardMaterial
                color={color}
                emissive={selected ? "#60a5fa" : color}
                emissiveIntensity={selected ? 0.5 : 0.08}
              />
            </mesh>
          ) : null}
          <mesh position={[0, gateH / 2, 0]}>
            <planeGeometry args={[w, gateH]} />
            <meshBasicMaterial
              color={selected ? "#93c5fd" : color}
              transparent
              opacity={selected ? 0.14 : 0.06}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DiveGate3D({
  selected = false,
  shape,
  outerRef,
  tiltDragRef,
}: {
  selected?: boolean;
  shape: DiveGateShape;
  outerRef?: Ref<THREE.Group>;
  tiltDragRef?: RefObject<number | null>;
}) {
  const color = shape.color ?? "#f97316";
  const sz = shape.size ?? 2.8;
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
    if (!tiltDragRef || tiltDragRef.current === null) return;
    const liveTiltRad = (tiltDragRef.current * Math.PI) / 180;

    if (frameGroupRef.current) {
      frameGroupRef.current.rotation.x = -Math.PI / 2 + liveTiltRad;
    }

    const bY = centerY - (sz / 2) * Math.sin(liveTiltRad);
    const tY = centerY + (sz / 2) * Math.sin(liveTiltRad);
    const bZ = (sz / 2) * Math.cos(liveTiltRad);
    const tZ = -(sz / 2) * Math.cos(liveTiltRad);
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

function getPolylineTubeRadius(shape: PolylineShape) {
  return Math.max(
    0.02,
    (shape.strokeWidth ?? DEFAULT_POLYLINE_STROKE_WIDTH) / 2
  );
}

function RaceLine3D({
  isPrimary = false,
  selected = false,
  shape,
}: {
  isPrimary?: boolean;
  selected?: boolean;
  shape: PolylineShape;
}) {
  const warningSegments = useMemo(
    () => getPolylineRouteWarningSegmentVisuals(shape),
    [shape]
  );
  const warningKindBySegment = useMemo(
    () =>
      new Map(
        warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
      ),
    [warningSegments]
  );
  const smoothSegmentPoints = useMemo(
    () =>
      getPolylineSmoothSegmentPoints3D(shape, POLYLINE_3D_HEIGHT_OFFSET, 18),
    [shape]
  );
  const showWarningVisuals = selected || isPrimary;
  const tubeRadius = getPolylineTubeRadius(shape);
  const segmentedGeometries = useMemo(() => {
    if (!showWarningVisuals || !warningSegments.length) return null;

    return smoothSegmentPoints.map((points) => {
      if (!points || points.length < 2) return null;

      const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(vectors, false, "centripetal");
      return new THREE.TubeGeometry(
        curve,
        Math.max(6, vectors.length * 2),
        tubeRadius,
        10,
        false
      );
    });
  }, [
    showWarningVisuals,
    smoothSegmentPoints,
    tubeRadius,
    warningSegments.length,
  ]);
  const geometry = useMemo(() => {
    const curveData = getPolylineCurve3Derived(shape, {
      heightOffset: POLYLINE_3D_HEIGHT_OFFSET,
      samplesPerSegment: 18,
      density: 12,
    });
    if (!curveData) return null;
    return new THREE.TubeGeometry(
      curveData.curve,
      curveData.segmentCount,
      tubeRadius,
      10,
      shape.closed ?? false
    );
  }, [shape, tubeRadius]);

  useEffect(() => {
    return () => {
      segmentedGeometries?.forEach((geometry) => geometry?.dispose());
    };
  }, [segmentedGeometries]);

  if (!geometry) return null;
  return (
    <group>
      {showWarningVisuals && warningSegments.length && segmentedGeometries ? (
        segmentedGeometries.map((segmentGeometry, segmentIndex) => {
          if (!segmentGeometry) return null;
          const warningKind = warningKindBySegment.get(segmentIndex);
          const color = getRouteWarningSegmentColor(
            warningKind,
            selected ? "#93c5fd" : (shape.color ?? "#3b82f6")
          );

          return (
            <mesh
              key={`${shape.id}-segment-${segmentIndex}`}
              geometry={segmentGeometry}
            >
              <meshStandardMaterial
                color={color}
                emissive={selected ? "#60a5fa" : color}
                emissiveIntensity={selected ? 0.35 : 0.08}
                roughness={0.4}
              />
            </mesh>
          );
        })
      ) : (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={selected ? "#93c5fd" : (shape.color ?? "#3b82f6")}
            emissive={selected ? "#60a5fa" : "#000000"}
            emissiveIntensity={selected ? 0.8 : 0}
            roughness={0.4}
          />
        </mesh>
      )}
    </group>
  );
}

const SELECTION_MARKER_MARGIN = 0.35;

function getPolylineTopY(shape: PolylineShape): number {
  const maxPointZ = shape.points.reduce(
    (maxZ, point) => Math.max(maxZ, point.z ?? 0),
    0
  );
  return (
    Math.max(maxPointZ, 0) +
    POLYLINE_3D_HEIGHT_OFFSET +
    getPolylineTubeRadius(shape)
  );
}

function getDiveGateTopY(shape: DiveGateShape): number {
  const tiltRad = ((shape.tilt ?? 0) * Math.PI) / 180;
  return (shape.elevation ?? 3) + ((shape.size ?? 2.8) / 2) * Math.sin(tiltRad);
}

function getShapeTopY(shape: Shape): number {
  switch (shape.kind) {
    case "gate": {
      const gateShape = shape as GateShape;
      const gateVisual = getGateVisualSpec(gateShape);
      const openingH = gateShape.height ?? 2;
      if (gateVisual.variant === "panel-frame") {
        return openingH + gateVisual.panels.top.heightMeters;
      }
      return openingH;
    }
    case "flag":
      return Math.max((shape as FlagShape).poleHeight ?? 3.5, 0.5);
    case "cone": {
      const r = (shape as ConeShape).radius ?? 0.2;
      return Math.max(r * 1.15, 0.1);
    }
    case "label":
      return (shape as LabelShape).project ? 0.1 : 2.8;
    case "polyline":
      return getPolylineTopY(shape as PolylineShape);
    case "startfinish":
      return 0.1;
    case "ladder": {
      const s = shape as LadderShape;
      const ladderVisual = getLadderVisualSpec(s);
      return Math.max(
        getLadderRenderedHeight(
          s,
          ladderVisual?.variant === "panel-frame" ? ladderVisual : null
        ) + (s.elevation ?? 0),
        0.5
      );
    }
    case "divegate": {
      const s = shape as DiveGateShape;
      return Math.max(getDiveGateTopY(s), 0.5);
    }
    default:
      return 1.0;
  }
}

function SelectionMarker3D({ shape }: { shape: Shape }) {
  const pulse = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  const markerY = getShapeTopY(shape) + SELECTION_MARKER_MARGIN;

  useFrame((_, delta) => {
    pulse.current += delta * 3.4;
    if (!meshRef.current) return;
    const scale = 1 + Math.sin(pulse.current) * 0.08;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} position={[shape.x, markerY, shape.y]} renderOrder={10}>
      <sphereGeometry args={[0.12, 18, 18]} />
      <meshBasicMaterial
        color="#60a5fa"
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </mesh>
  );
}

function Shape3D({
  isPrimaryPolyline,
  isSelected,
  onSelect,
  shape,
  outerRef,
  tiltDragRef,
  elevationOverrideRef,
}: {
  isPrimaryPolyline: boolean;
  isSelected: boolean;
  onSelect: (event: ThreeEvent<MouseEvent>, shapeId: string) => void;
  shape: Shape;
  outerRef?: Ref<THREE.Group>;
  tiltDragRef?: RefObject<number | null>;
  elevationOverrideRef?: RefObject<number | null>;
}) {
  switch (shape.kind) {
    case "gate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Gate3D shape={shape} selected={isSelected} outerRef={outerRef} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "flag":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Flag3D shape={shape} selected={isSelected} outerRef={outerRef} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "cone":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Cone3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "label":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Label3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "polyline":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <RaceLine3D
            isPrimary={isPrimaryPolyline}
            shape={shape}
            selected={isSelected}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "startfinish":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <StartFinish3D shape={shape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "ladder":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Ladder3D
            shape={shape}
            selected={isSelected}
            outerRef={outerRef}
            elevationOverrideRef={elevationOverrideRef}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "divegate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <DiveGate3D
            shape={shape}
            selected={isSelected}
            outerRef={outerRef}
            tiltDragRef={tiltDragRef}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    default:
      return null;
  }
}

export const MemoShape3D = memo(
  Shape3D,
  (prev, next) =>
    prev.shape === next.shape &&
    prev.isPrimaryPolyline === next.isPrimaryPolyline &&
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect &&
    prev.outerRef === next.outerRef &&
    prev.tiltDragRef === next.tiltDragRef &&
    prev.elevationOverrideRef === next.elevationOverrideRef
);
