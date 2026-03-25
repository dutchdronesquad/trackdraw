"use client";

import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Grid,
  OrbitControls,
  RoundedBox,
  Line as DreiLine,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEditor } from "@/store/editor";
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  memo,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import {
  getPolylineCurve3Derived,
  getPolylinePreview3DPoints,
} from "@/lib/polyline-derived";

export interface TrackPreview3DHandle {
  screenshot: () => string;
  startFlyThrough: () => void;
  stopFlyThrough: () => void;
}

export interface TrackPreview3DProps {
  showGizmo?: boolean;
  onFlyModeChange?: (active: boolean) => void;
  readOnly?: boolean;
}

type QuaternionState = [number, number, number, number];
type WebKitGestureEvent = Event & { scale: number };

// Captures the WebGL renderer reference so we can call toDataURL from outside
function ScreenshotHelper({
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

function CameraAxisTracker({
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

function WheelBridge({
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
      const factor = Math.exp(capped * 0.012);
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

      const syntheticDeltaY = -Math.log(scaleRatio) / 0.012;
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
  }, [camera, controlsRef, enabled, gl, minDistance, maxDistance]);

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

    const next = currentDist + (target - currentDist) * 0.15;
    const settled = Math.abs(target - next) < 0.05;
    const applied = settled ? target : next;

    camera.position.copy(controls.target).addScaledVector(dir, applied);
    controls.update();

    if (settled) targetDistanceRef.current = null;
  });

  return null;
}
import { Move3D, MoveVertical, Play, Pause, Route, Wind } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useTheme } from "@/hooks/useTheme";
import type {
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  PolylinePoint,
  PolylineShape,
  Shape,
  StartFinishShape,
  LadderShape,
  DiveGateShape,
} from "@/lib/types";
import {
  selectDesignShapes,
  selectHasPath,
  selectSelectedPolyline,
  selectShapeRecordMap,
} from "@/store/selectors";

// Creates a canvas texture with text drawn on it
function useTextTexture(
  text: string,
  color: string,
  fontSize: number
): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const scale = 4;
    const measW = Math.max(256, text.length * fontSize * scale * 0.62 + 40);
    const measH = fontSize * scale * 2;
    const canvas = document.createElement("canvas");
    canvas.width = measW;
    canvas.height = measH;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, measW, measH);
    ctx.fillStyle = color;
    ctx.font = `600 ${fontSize * scale}px ui-monospace,monospace,Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, measW / 2, measH / 2);
    return new THREE.CanvasTexture(canvas);
  }, [text, color, fontSize]);

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}

// ── Gate ────────────────────────────────────────────────────
function Gate3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: GateShape;
}) {
  const color = shape.color ?? "#3b82f6";
  const thick = shape.thick ?? 0.2;
  const h = shape.height ?? 2;
  const w = shape.width ?? 3;
  const rot: [number, number, number] = [
    0,
    (-shape.rotation * Math.PI) / 180,
    0,
  ];

  return (
    <group position={[shape.x, 0, shape.y]} rotation={rot}>
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

// ── Flag ────────────────────────────────────────────────────
function Flag3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: FlagShape;
}) {
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

  return (
    <group position={[shape.x, 0, shape.y]} rotation={[0, yawRad, 0]}>
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
          args={[
            bannerShape,
            {
              depth: 0.018,
              bevelEnabled: false,
            },
          ]}
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

// ── Cone ────────────────────────────────────────────────────
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

// ── Label ────────────────────────────────────────────────────
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
    if (!shape.project && groupRef.current)
      groupRef.current.quaternion.copy(camera.quaternion);
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

// ── Start Pads ────────────────────────────────────────────────
// 4 launch pads with a cleaner podium-like base and numbered pads
function StartFinish3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: StartFinishShape;
}) {
  const color = shape.color ?? "#f59e0b";
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
              position={[0, podH + 0.012, 0]}
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

// ── Ladder ────────────────────────────────────────────────────
// Exactly like Gate3D, but `rungs` frames stacked vertically.
// shape.height = total ladder height; each opening = height / rungs.
function Ladder3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: LadderShape;
}) {
  const color = shape.color ?? "#3b82f6";
  const w = shape.width ?? 1.5;
  const totalH = shape.height ?? 4.5;
  const rungs = Math.max(1, shape.rungs ?? 3);
  const thick = 0.2; // same as Gate3D
  const gateH = totalH / rungs; // height of each individual opening
  const rot: [number, number, number] = [
    0,
    (-shape.rotation * Math.PI) / 180,
    0,
  ];

  return (
    <group position={[shape.x, 0, shape.y]} rotation={rot}>
      {Array.from({ length: rungs }).map((_, i) => (
        <group key={i} position={[0, i * gateH, 0]}>
          {/* Left post */}
          <mesh position={[-(w / 2), gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          {/* Right post */}
          <mesh position={[w / 2, gateH / 2, 0]} castShadow>
            <boxGeometry args={[thick, gateH, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          {/* Top bar (doubles as bottom bar of the gate above) */}
          <mesh position={[0, gateH, 0]} castShadow>
            <boxGeometry args={[w + thick, thick, thick]} />
            <meshStandardMaterial
              color={color}
              emissive={selected ? "#60a5fa" : color}
              emissiveIntensity={selected ? 0.5 : 0.08}
            />
          </mesh>
          {/* Transparent fill — same style as Gate3D fill plane */}
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

// ── DiveGate ──────────────────────────────────────────────────
// Square frame: tilt=0 → vertical wall, tilt=90 → flat/horizontal
function DiveGate3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: DiveGateShape;
}) {
  const color = shape.color ?? "#f97316";
  const sz = shape.size ?? 2.8;
  const thick = shape.thick ?? 0.2;
  const tilt = shape.tilt ?? 0;
  const tiltRad = (tilt * Math.PI) / 180;
  const yawRad = (-shape.rotation * Math.PI) / 180;

  const centerY = shape.elevation ?? 3.0;

  // Frame corner world positions: y = centerY ± (sz/2)·sin(tilt), z = ∓(sz/2)·cos(tilt)
  const bottomY = centerY - (sz / 2) * Math.sin(tiltRad);
  const topY = centerY + (sz / 2) * Math.sin(tiltRad);
  const bottomZ = (sz / 2) * Math.cos(tiltRad);
  const topZ = -(sz / 2) * Math.cos(tiltRad);
  const postW = thick;

  return (
    <group position={[shape.x, 0, shape.y]} rotation={[0, yawRad, 0]}>
      {/* Frame centered at ~3m height, tilted around X axis */}
      <group
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
      {/* Vertical posts from all 4 frame corners to ground */}
      {[
        [-sz / 2, bottomY, bottomZ],
        [sz / 2, bottomY, bottomZ],
        [-sz / 2, topY, topZ],
        [sz / 2, topY, topZ],
      ].map(([px, py, pz], i) =>
        py > 0.05 ? (
          <mesh key={i} position={[px, py / 2, pz]} castShadow>
            <boxGeometry args={[postW, py, postW]} />
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

// ── RaceLine ─────────────────────────────────────────────────
function RaceLine3D({
  editing = false,
  selected = false,
  shape,
}: {
  editing?: boolean;
  selected?: boolean;
  shape: PolylineShape;
}) {
  const previewPoints = useMemo(
    () => getPolylinePreview3DPoints(shape, 0.5),
    [shape]
  );
  const geometry = useMemo(() => {
    if (editing) return null;
    const curveData = getPolylineCurve3Derived(shape, {
      heightOffset: 0.5,
      samplesPerSegment: 18,
      density: 12,
    });
    if (!curveData) return null;
    const tubeRadius = Math.max(0.02, (shape.strokeWidth ?? 0.26) / 2);
    return new THREE.TubeGeometry(
      curveData.curve,
      curveData.segmentCount,
      tubeRadius,
      10,
      shape.closed ?? false
    );
  }, [editing, shape]);

  if (editing) {
    return (
      <DreiLine
        points={previewPoints}
        color={selected ? "#93c5fd" : (shape.color ?? "#3b82f6")}
        lineWidth={Math.max(2, (shape.strokeWidth ?? 0.26) * 8)}
      />
    );
  }

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={selected ? "#93c5fd" : (shape.color ?? "#3b82f6")}
        emissive={selected ? "#60a5fa" : "#000000"}
        emissiveIntensity={selected ? 0.8 : 0}
        roughness={0.4}
      />
    </mesh>
  );
}

function PolylineElevationHandles3D({
  isMobile,
  path,
  activeIndex,
  onDragStart,
}: {
  isMobile: boolean;
  path: PolylineShape;
  activeIndex: number | null;
  onDragStart: (event: ThreeEvent<PointerEvent>, index: number) => void;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <group>
      {path.points.map((point, index) => {
        const pointHeight = Math.max(point.z ?? 0, 0);
        const guideHeight = Math.max(0.4, pointHeight + 0.5);
        const isActive = activeIndex === index;
        const isHovered = hoveredIndex === index;
        const handleY = pointHeight + 0.52;
        const gripRadius = isMobile
          ? isActive
            ? 0.2
            : 0.18
          : isActive
            ? 0.16
            : 0.14;
        const gripHeight = isMobile
          ? isActive
            ? 0.2
            : 0.18
          : isActive
            ? 0.16
            : 0.13;
        const touchTargetRadius = isMobile ? 0.34 : gripRadius;
        const touchTargetHeight = isMobile ? 0.58 : gripHeight;
        return (
          <group key={`${path.id}-elev-${index}`}>
            <mesh position={[point.x, guideHeight / 2, point.y]}>
              <cylinderGeometry args={[0.02, 0.02, guideHeight, 12]} />
              <meshBasicMaterial
                color={isActive ? "#f59e0b" : isHovered ? "#bfdbfe" : "#93c5fd"}
                transparent
                opacity={isActive ? 0.95 : isHovered ? 0.75 : 0.35}
              />
            </mesh>
            <mesh
              position={[point.x, pointHeight + 0.03, point.y]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.12, 0.155, 32]} />
              <meshBasicMaterial
                color={isActive ? "#fbbf24" : "#60a5fa"}
                transparent
                opacity={isActive ? 0.9 : isHovered ? 0.5 : 0.24}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh
              position={[point.x, handleY, point.y]}
              onPointerDown={(event) => onDragStart(event, index)}
              onPointerOver={() => setHoveredIndex(index)}
              onPointerOut={() =>
                setHoveredIndex((current) =>
                  current === index ? null : current
                )
              }
            >
              <cylinderGeometry
                args={[
                  touchTargetRadius,
                  touchTargetRadius,
                  touchTargetHeight,
                  24,
                ]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <mesh position={[point.x, handleY, point.y]}>
              <cylinderGeometry
                args={[gripRadius, gripRadius, gripHeight, 24]}
              />
              <meshStandardMaterial
                color={isActive ? "#f59e0b" : isHovered ? "#93c5fd" : "#e2e8f0"}
                emissive={isActive ? "#fbbf24" : "#60a5fa"}
                emissiveIntensity={isActive ? 0.85 : isHovered ? 0.38 : 0.18}
                roughness={0.2}
                metalness={0.08}
              />
            </mesh>
            <mesh position={[point.x, handleY + gripHeight * 0.22, point.y]}>
              <cylinderGeometry
                args={[
                  gripRadius * 0.72,
                  gripRadius * 0.92,
                  Math.max(gripHeight * 0.38, 0.05),
                  24,
                ]}
              />
              <meshStandardMaterial
                color={isActive ? "#fde68a" : isHovered ? "#dbeafe" : "#f8fafc"}
                emissive={isActive ? "#fbbf24" : "#93c5fd"}
                emissiveIntensity={isActive ? 0.55 : isHovered ? 0.24 : 0.1}
                roughness={0.16}
                metalness={0.06}
              />
            </mesh>
            {(isActive || isHovered) && (
              <mesh position={[point.x, handleY + 0.12, point.y]}>
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshBasicMaterial
                  color={isActive ? "#fbbf24" : "#60a5fa"}
                  transparent
                  opacity={0.95}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

const MemoShape3D = memo(
  Shape3D,
  (prev, next) =>
    prev.shape === next.shape &&
    prev.isEditing === next.isEditing &&
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect
);

// ── Shape dispatcher ─────────────────────────────────────────
function SelectionMarker3D({ shape }: { shape: Shape }) {
  const pulse = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  const heightByKind: Partial<Record<Shape["kind"], number>> = {
    gate: Math.max((shape as GateShape).height ?? 2, 1.4) + 0.45,
    flag: Math.max((shape as FlagShape).poleHeight ?? 3.5, 1.8) + 0.35,
    cone: Math.max(((shape as ConeShape).radius ?? 0.2) * 2.5, 0.5) + 0.35,
    label: (shape as LabelShape).project ? 0.8 : 3.1,
    polyline: 0.95,
    startfinish: 0.55,
    ladder: Math.max((shape as LadderShape).height ?? 4.5, 1.8) + 0.35,
    divegate: Math.max((shape as DiveGateShape).elevation ?? 3, 1.8) + 0.55,
  };
  const markerY = heightByKind[shape.kind] ?? 1.2;

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
  isEditing,
  isSelected,
  onSelect,
  shape,
}: {
  isEditing: boolean;
  isSelected: boolean;
  onSelect: (event: ThreeEvent<MouseEvent>, shapeId: string) => void;
  shape: Shape;
}) {
  switch (shape.kind) {
    case "gate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Gate3D shape={shape as GateShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "flag":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Flag3D shape={shape as FlagShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "cone":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Cone3D shape={shape as ConeShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "label":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Label3D shape={shape as LabelShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "polyline":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <RaceLine3D
            editing={isEditing}
            shape={shape as PolylineShape}
            selected={isSelected}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "startfinish":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <StartFinish3D
            shape={shape as StartFinishShape}
            selected={isSelected}
          />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "ladder":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Ladder3D shape={shape as LadderShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    case "divegate":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <DiveGate3D shape={shape as DiveGateShape} selected={isSelected} />
          {isSelected && <SelectionMarker3D shape={shape} />}
        </group>
      );
    default:
      return null;
  }
}

// ── Drone fly-through camera (must live inside <Canvas>) ──────
function DroneCamera({
  shapes,
  playing,
  speed,
  bankingEnabled,
}: {
  shapes: Shape[];
  playing: boolean;
  speed: number;
  bankingEnabled: boolean;
}) {
  const { camera } = useThree();
  const tRef = useRef(0);
  const bankRef = useRef(0);
  const cameraRef = useRef(camera);
  const bankingEnabledRef = useRef(bankingEnabled);
  const worldUpRef = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    bankingEnabledRef.current = bankingEnabled;
  }, [bankingEnabled]);

  const flightPath = useMemo(() => {
    const pl = shapes.find(
      (s) => s.kind === "polyline" && (s as PolylineShape).points.length >= 2
    ) as PolylineShape | undefined;
    if (!pl) return null;

    const curve = getPolylineCurve3Derived(pl, {
      heightOffset: 0.8,
      samplesPerSegment: 18,
      density: 12,
    })?.curve;

    if (!curve) return null;

    return {
      closed: Boolean(pl.closed),
      curve,
    };
  }, [shapes]);

  const applyCameraPose = useCallback(
    (t: number) => {
      if (!flightPath) return;

      const samplePoint = (offset: number) => {
        const nextT = t + offset;

        if (flightPath.closed) {
          const wrapped = ((nextT % 1) + 1) % 1;
          return flightPath.curve.getPoint(wrapped);
        }

        return flightPath.curve.getPoint(
          THREE.MathUtils.clamp(nextT, 0, 0.9999)
        );
      };

      const pos = samplePoint(0);
      const lookTarget = samplePoint(0.02);
      const behind = samplePoint(-0.015);
      const ahead = samplePoint(0.015);
      const incoming = ahead.clone().sub(behind).setY(0);
      const outgoing = lookTarget.clone().sub(pos).setY(0);

      let bankTarget = 0;
      if (incoming.lengthSq() > 1e-6 && outgoing.lengthSq() > 1e-6) {
        incoming.normalize();
        outgoing.normalize();
        const signedTurn = incoming.clone().cross(outgoing).y;
        bankTarget = THREE.MathUtils.clamp(signedTurn * 1.1, -0.34, 0.34);
      }

      const resolvedBankTarget = bankingEnabledRef.current ? bankTarget : 0;
      bankRef.current = THREE.MathUtils.lerp(
        bankRef.current,
        resolvedBankTarget,
        0.14
      );

      camera.position.copy(pos);
      camera.up.copy(worldUpRef.current);
      camera.lookAt(lookTarget);
      camera.rotateZ(bankRef.current);
    },
    [camera, flightPath]
  );

  // Snap camera to start of path when activated
  useEffect(() => {
    if (!flightPath) return;
    tRef.current = 0;
    bankRef.current = 0;
    const start = flightPath.curve.getPoint(0);
    const ahead = flightPath.curve.getPoint(flightPath.closed ? 0.02 : 0.02);
    cameraRef.current.position.copy(start);
    cameraRef.current.up.copy(worldUpRef.current);
    cameraRef.current.lookAt(ahead);
  }, [flightPath]);

  useFrame((_, delta) => {
    if (!playing || !flightPath) return;
    tRef.current = (tRef.current + delta * speed * 0.035) % 1;
    applyCameraPose(tRef.current);
  });

  return null;
}

// ── Theme palettes ────────────────────────────────────────────
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

// ── Canvas hint pill ─────────────────────────────────────────
function CanvasHintPill({
  icon,
  position = "top-3",
  onClick,
  children,
}: {
  icon?: React.ReactNode;
  position?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={`absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-sky-200/16 bg-slate-950/72 px-3.5 py-1.5 text-[11px] font-medium text-sky-50/88 shadow-[0_12px_32px_rgba(15,23,42,0.28)] backdrop-blur-md select-none ${
        onClick
          ? "cursor-pointer transition-colors hover:bg-slate-900/80 hover:text-sky-50"
          : "pointer-events-none"
      } ${position}`}
    >
      {icon && (
        <span className="flex size-5 items-center justify-center rounded-full bg-sky-300/12 text-sky-200/85">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

// ── Field watermark ──────────────────────────────────────────
function FieldWatermark({
  fw,
  fh,
  isDark,
}: {
  fw: number;
  fh: number;
  isDark: boolean;
}) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [aspect, setAspect] = useState(799 / 200);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      const scale = 3;
      const sourceW = img.naturalWidth || 799;
      const sourceH = img.naturalHeight || 200;
      const w = sourceW * scale;
      const h = sourceH * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 0.05;
      ctx.drawImage(img, 0, 0, w, h);
      const tex = new THREE.CanvasTexture(canvas);
      setTexture((previous) => {
        previous?.dispose();
        return tex;
      });
      setAspect(sourceW / sourceH);
    };
    img.src = `/assets/brand/trackdraw-logo-mono-${isDark ? "darkbg" : "lightbg"}.svg`;

    return () => {
      active = false;
    };
  }, [isDark]);

  useEffect(() => () => texture?.dispose(), [texture]);

  const planeW = Math.min(fw * 0.55, fh * 0.55 * aspect);
  const planeH = planeW / aspect;

  if (!texture) return null;
  return (
    <mesh position={[fw / 2, 0.015, fh / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

// ── Main ─────────────────────────────────────────────────────
const TrackPreview3D = forwardRef<TrackPreview3DHandle, TrackPreview3DProps>(
  function TrackPreview3D(
    {
      showGizmo = true,
      onFlyModeChange,
      readOnly = false,
    }: TrackPreview3DProps,
    ref
  ) {
    usePerfMetric("render:TrackPreview3D");
    const field = useEditor((state) => state.design.field);
    const selection = useEditor((state) => state.selection);
    const setSelection = useEditor((state) => state.setSelection);
    const pauseHistory = useEditor((state) => state.pauseHistory);
    const resumeHistory = useEditor((state) => state.resumeHistory);
    const beginInteraction = useEditor((state) => state.beginInteraction);
    const endInteraction = useEditor((state) => state.endInteraction);
    const setPolylinePoints = useEditor((state) => state.setPolylinePoints);
    const shapes = useEditor(selectDesignShapes);
    const hasPath = useEditor(selectHasPath);
    const shapeById = useEditor(selectShapeRecordMap);
    const selectedPolyline = useEditor(selectSelectedPolyline);
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
    const [elevationDrag, setElevationDrag] = useState<{
      shapeId: string;
      idx: number;
      startClientY: number;
      startZ: number;
    } | null>(null);
    const [elevationPreviewPoints, setElevationPreviewPoints] = useState<
      PolylinePoint[] | null
    >(null);
    const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
    const screenshotFnRef = useRef<(() => string) | null>(null);
    const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
    const elevationDragRef = useRef(elevationDrag);
    const dragAnimationFrameRef = useRef<number | null>(null);
    const pendingClientYRef = useRef<number | null>(null);
    const selectionRef = useRef(selection);
    const selectedIdSet = useMemo(() => new Set(selection), [selection]);
    const showMiddleMousePanningCursor =
      isMiddleMousePanning && !isMobile && !flyMode && !elevationDrag;

    useEffect(() => {
      selectionRef.current = selection;
    }, [selection]);

    useEffect(() => {
      elevationDragRef.current = elevationDrag;
    }, [elevationDrag]);

    useEffect(() => {
      onFlyModeChange?.(flyMode);
    }, [flyMode, onFlyModeChange]);

    useEffect(() => {
      const stopMiddleMousePanning = () => {
        setIsMiddleMousePanning(false);
      };

      window.addEventListener("mouseup", stopMiddleMousePanning);
      window.addEventListener("blur", stopMiddleMousePanning);

      return () => {
        window.removeEventListener("mouseup", stopMiddleMousePanning);
        window.removeEventListener("blur", stopMiddleMousePanning);
      };
    }, []);

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
    const handleShapeSelect = useCallback(
      (event: ThreeEvent<MouseEvent>, shapeId: string) => {
        event.stopPropagation();
        if (event.delta > 3) {
          return;
        }

        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          const current = new Set(selectionRef.current);
          if (current.has(shapeId)) current.delete(shapeId);
          else current.add(shapeId);
          setSelection(Array.from(current));
          return;
        }

        setSelection([shapeId]);
      },
      [setSelection]
    );

    const previewPolyline = useMemo(() => {
      if (!selectedPolyline || !elevationPreviewPoints) return selectedPolyline;
      return {
        ...selectedPolyline,
        points: elevationPreviewPoints,
      };
    }, [elevationPreviewPoints, selectedPolyline]);

    const handleElevationDragStart = useCallback(
      (event: ThreeEvent<PointerEvent>, index: number) => {
        event.stopPropagation();
        const point = selectedPolyline?.points[index];
        if (!selectedPolyline || !point) return;
        beginInteraction();
        pauseHistory();
        setSelection([selectedPolyline.id]);
        setElevationPreviewPoints(selectedPolyline.points);
        setElevationDrag({
          shapeId: selectedPolyline.id,
          idx: index,
          startClientY: event.nativeEvent.clientY,
          startZ: point.z ?? 0,
        });
      },
      [beginInteraction, pauseHistory, selectedPolyline, setSelection]
    );

    const applyElevationDrag = useCallback(
      (clientY: number) => {
        const drag = elevationDragRef.current;
        if (!drag) return;
        const shape = shapeById[drag.shapeId];
        if (!shape || shape.kind !== "polyline") return;
        const deltaMeters = (drag.startClientY - clientY) * 0.035;
        const nextZ = Math.max(0, +(drag.startZ + deltaMeters).toFixed(2));
        const currentPoint =
          elevationPreviewPoints?.[drag.idx] ?? shape.points[drag.idx];
        if (!currentPoint || Math.abs((currentPoint.z ?? 0) - nextZ) < 0.01)
          return;
        const basePoints = elevationPreviewPoints ?? shape.points;
        const nextPoints: PolylinePoint[] = basePoints.map((point, index) =>
          index === drag.idx ? { ...point, z: nextZ } : point
        );
        setElevationPreviewPoints(nextPoints);
      },
      [elevationPreviewPoints, shapeById]
    );

    useEffect(() => {
      if (!elevationDrag) return;

      const handleMouseMove = (event: MouseEvent) => {
        pendingClientYRef.current = event.clientY;
        if (dragAnimationFrameRef.current !== null) return;
        dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
          dragAnimationFrameRef.current = null;
          if (pendingClientYRef.current !== null) {
            applyElevationDrag(pendingClientYRef.current);
          }
        });
      };

      const handleTouchMove = (event: TouchEvent) => {
        if (!event.touches.length) return;
        event.preventDefault();
        pendingClientYRef.current = event.touches[0].clientY;
        if (dragAnimationFrameRef.current !== null) return;
        dragAnimationFrameRef.current = window.requestAnimationFrame(() => {
          dragAnimationFrameRef.current = null;
          if (pendingClientYRef.current !== null) {
            applyElevationDrag(pendingClientYRef.current);
          }
        });
      };

      const stopDrag = () => {
        const drag = elevationDragRef.current;
        if (drag && elevationPreviewPoints) {
          setPolylinePoints(drag.shapeId, elevationPreviewPoints);
        }
        resumeHistory();
        endInteraction();
        setElevationPreviewPoints(null);
        setElevationDrag(null);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", stopDrag);
      window.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", stopDrag);
      window.addEventListener("touchcancel", stopDrag);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", stopDrag);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", stopDrag);
        window.removeEventListener("touchcancel", stopDrag);
        if (dragAnimationFrameRef.current !== null) {
          window.cancelAnimationFrame(dragAnimationFrameRef.current);
          dragAnimationFrameRef.current = null;
        }
        resumeHistory();
        endInteraction();
      };
    }, [
      applyElevationDrag,
      elevationDrag,
      elevationPreviewPoints,
      endInteraction,
      resumeHistory,
      setPolylinePoints,
    ]);

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
        onMouseDownCapture={(event) => {
          if (event.button === 1) {
            event.preventDefault();
            if (!isMobile && !flyMode && !elevationDrag) {
              setIsMiddleMousePanning(true);
            }
          }
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

          {/* Ground */}
          <mesh
            position={[cx, -0.01, cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={(event) => {
              event.stopPropagation();
              if (event.delta > 3) {
                return;
              }
              setSelection([]);
            }}
          >
            <planeGeometry args={[field.width, field.height]} />
            <meshStandardMaterial
              color={t.groundColor}
              roughness={0.98}
              metalness={0}
            />
          </mesh>

          {/* Grid */}
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
          {/* Shapes */}
          {shapes.map((shape) => (
            <MemoShape3D
              key={shape.id}
              isEditing={elevationDrag?.shapeId === shape.id}
              isSelected={selectedIdSet.has(shape.id)}
              onSelect={handleShapeSelect}
              shape={
                elevationDrag?.shapeId === shape.id && previewPolyline
                  ? previewPolyline
                  : shape
              }
            />
          ))}
          {previewPolyline && !flyMode && (
            <PolylineElevationHandles3D
              isMobile={isMobile}
              path={previewPolyline}
              activeIndex={elevationDrag?.idx ?? null}
              onDragStart={handleElevationDragStart}
            />
          )}

          <FieldWatermark
            fw={field.width}
            fh={field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
          <WheelBridge
            controlsRef={orbitControlsRef}
            enabled={!flyMode && !isMobile && !elevationDrag}
            minDistance={8}
            maxDistance={Math.max(120, longest * 3)}
          />
          {showGizmo && <CameraAxisTracker onChange={setAxisQuaternion} />}
          {flyMode ? (
            <DroneCamera
              shapes={shapes}
              playing={playing}
              speed={speed}
              bankingEnabled={bankingEnabled}
            />
          ) : isMobile ? (
            <OrbitControls
              ref={orbitControlsRef}
              makeDefault
              enabled={!elevationDrag}
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
              enabled={!elevationDrag}
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
        {showGizmo && (
          <div className="pointer-events-none absolute top-3 right-3 select-none">
            <div className="rounded-full border border-white/10 bg-black/45 p-2 shadow-md backdrop-blur-xs">
              <svg
                width="68"
                height="68"
                viewBox="0 0 68 68"
                aria-hidden="true"
              >
                <circle
                  cx="34"
                  cy="34"
                  r="28"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <circle cx="34" cy="34" r="2.5" fill="rgba(255,255,255,0.65)" />

                {(
                  [
                    ["x", "#ef4444", "#fca5a5", "X"],
                    ["y", "#22c55e", "#86efac", "Y"],
                    ["z", "#3b82f6", "#93c5fd", "Z"],
                  ] as const
                )
                  .map(([axis, stroke, label, text]) => {
                    const q = new THREE.Quaternion(...axisQuaternion);
                    const base =
                      axis === "x"
                        ? new THREE.Vector3(1, 0, 0)
                        : axis === "y"
                          ? new THREE.Vector3(0, 1, 0)
                          : new THREE.Vector3(0, 0, 1);
                    const v = base.applyQuaternion(q);
                    return {
                      axis,
                      stroke,
                      label,
                      text,
                      x: v.x,
                      y: -v.y,
                      depth: v.z,
                    };
                  })
                  .sort((a, b) => a.depth - b.depth)
                  .map(({ axis, stroke, label, text, x, y, depth }) => {
                    const len = 22;
                    const head = 6;
                    const ex = 34 + x * len;
                    const ey = 34 + y * len;
                    const nx = Math.hypot(x, y) || 1;
                    const px = (-y / nx) * 3.5;
                    const py = (x / nx) * 3.5;
                    const bx = ex - (x / nx) * head;
                    const by = ey - (y / nx) * head;
                    const opacity = 0.45 + ((depth + 1) / 2) * 0.55;

                    return (
                      <g key={axis} opacity={opacity}>
                        <line
                          x1="34"
                          y1="34"
                          x2={ex}
                          y2={ey}
                          stroke={stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <polygon
                          points={`${ex},${ey} ${bx + px},${by + py} ${bx - px},${by - py}`}
                          fill={stroke}
                        />
                        <text
                          x={ex + (x / nx) * 7}
                          y={ey + (y / nx) * 7 + 3}
                          fill={label}
                          fontSize="10"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>
        )}

        {/* Fly-through controls overlay */}
        {flyMode && (
          <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-black/65 px-2.5 py-1.5 text-sm shadow-lg backdrop-blur select-none">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="flex size-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">Speed</span>
              <input
                type="range"
                min={0.2}
                max={5}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
                className="w-20 cursor-pointer accent-white"
              />
              <span className="w-6 font-mono text-[10px] text-white/60">
                {speed.toFixed(1)}×
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBankingEnabled((value) => !value)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors ${
                bankingEnabled
                  ? "bg-white/10 text-white/85 hover:bg-white/14"
                  : "text-white/45 hover:bg-white/8 hover:text-white/75"
              }`}
              title="Toggle roll"
              aria-pressed={bankingEnabled}
            >
              <span>Roll</span>
              <span
                className={`rounded px-1 py-0.5 font-mono text-[9px] ${
                  bankingEnabled
                    ? "bg-white/10 text-white/75"
                    : "bg-white/6 text-white/40"
                }`}
              >
                {bankingEnabled ? "On" : "Off"}
              </span>
            </button>
            <div className="mx-0.5 h-4 w-px bg-white/10" />
            <button
              onClick={() => {
                setFlyMode(false);
                setPlaying(false);
              }}
              className="px-1 text-[11px] text-white/40 transition-colors hover:text-white/80"
            >
              Exit
            </button>
          </div>
        )}

        {hasPath && !flyMode && !isMobile && (
          <CanvasHintPill
            icon={<Wind className="size-3" />}
            position="bottom-3 z-30"
            onClick={() => {
              setFlyMode(true);
              setPlaying(true);
            }}
          >
            Fly-Through
          </CanvasHintPill>
        )}

        {selectedPolyline && !flyMode && (
          <CanvasHintPill icon={<MoveVertical className="size-3" />}>
            {isMobile
              ? "Drag a waypoint grip up or down to adjust elevation"
              : "Drag waypoint handles up or down to adjust elevation"}
          </CanvasHintPill>
        )}

        {!flyMode && !isMobile && !selectedPolyline && (
          <CanvasHintPill icon={<Move3D className="size-3" />}>
            Orbit to inspect spacing and elevation. Scroll to zoom, middle-drag
            to pan.
          </CanvasHintPill>
        )}

        {/* No path hint — only shown in the editor, not in read-only shared views */}
        {!hasPath && !readOnly && (
          <CanvasHintPill
            icon={<Route className="size-3" />}
            position="bottom-4"
          >
            Draw the route in 2D to enable fly-through
          </CanvasHintPill>
        )}
      </div>
    );
  }
);

export default TrackPreview3D;
