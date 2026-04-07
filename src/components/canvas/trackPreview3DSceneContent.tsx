"use client";

import { RoundedBox, Line as DreiLine } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  getPolylineRouteWarningSegmentVisuals,
  getPolylineSmoothSegmentPoints3D,
} from "@/lib/track/polyline-derived";
import {
  getPolylineCurve3Derived,
  getPolylinePreview3DPoints,
} from "@/lib/track/polyline-derived-3d";
import { getPreviewRotationGuideDegrees } from "@/lib/track/orientation";
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

    const next = currentDist + (target - currentDist) * 0.15;
    const settled = Math.abs(target - next) < 0.05;
    const applied = settled ? target : next;

    camera.position.copy(controls.target).addScaledVector(dir, applied);
    controls.update();

    if (settled) targetDistanceRef.current = null;
  });

  return null;
}

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

function Gate3D({
  selected = false,
  shape,
  outerRef,
}: {
  selected?: boolean;
  shape: GateShape;
  outerRef?: Ref<THREE.Group>;
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
    (-shape.rotation * Math.PI) / 180,
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

export function LadderElevationHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  elevationOverrideRef,
}: {
  shape: LadderShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  elevationOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const guideGroupRef = useRef<THREE.Group>(null);
  const guideHeight = Math.max(shape.height ?? 4.5, 1) + 0.65;
  const handleY = Math.max(shape.height ?? 4.5, 1) + 0.42;
  const gripRadius = isMobile
    ? isDragging
      ? 0.22
      : 0.2
    : isDragging
      ? 0.18
      : 0.16;
  const gripHeight = isMobile
    ? isDragging
      ? 0.26
      : 0.22
    : isDragging
      ? 0.2
      : 0.17;
  const touchTargetRadius = isMobile ? 0.34 : gripRadius;
  const touchTargetHeight = isMobile ? 0.58 : gripHeight;
  const guideColor = isDragging ? "#f59e0b" : hovered ? "#bfdbfe" : "#93c5fd";

  useFrame(() => {
    if (!guideGroupRef.current) return;
    guideGroupRef.current.position.set(
      shape.x,
      Math.max(elevationOverrideRef.current ?? shape.elevation ?? 0, 0),
      shape.y
    );
  });

  return (
    <group
      ref={guideGroupRef}
      position={[shape.x, Math.max(shape.elevation ?? 0, 0), shape.y]}
    >
      <mesh position={[0, guideHeight / 2, 0]}>
        <cylinderGeometry args={[0.022, 0.022, guideHeight, 12]} />
        <meshBasicMaterial color={guideColor} transparent opacity={0.5} />
      </mesh>
      <mesh
        position={[0, handleY, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry
          args={[touchTargetRadius, touchTargetRadius, touchTargetHeight, 24]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, handleY, 0]}>
        <cylinderGeometry args={[gripRadius, gripRadius, gripHeight, 24]} />
        <meshStandardMaterial
          color={isDragging ? "#f59e0b" : hovered ? "#38bdf8" : "#1e293b"}
          emissive={isDragging ? "#fbbf24" : hovered ? "#7dd3fc" : "#60a5fa"}
          emissiveIntensity={isDragging ? 1 : hovered ? 0.62 : 0.28}
          roughness={0.16}
          metalness={0.14}
        />
      </mesh>
      <mesh position={[0, handleY + gripHeight * 0.26, 0]}>
        <coneGeometry
          args={[gripRadius * 0.78, Math.max(gripHeight * 0.6, 0.08), 24]}
        />
        <meshStandardMaterial
          color={isDragging ? "#fff3c4" : hovered ? "#f8fbff" : "#cbd5e1"}
          emissive={isDragging ? "#fbbf24" : hovered ? "#bae6fd" : "#93c5fd"}
          emissiveIntensity={isDragging ? 0.7 : hovered ? 0.38 : 0.16}
          roughness={0.12}
          metalness={0.08}
        />
      </mesh>
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

function RaceLine3D({
  editing = false,
  isPrimary = false,
  selected = false,
  shape,
}: {
  editing?: boolean;
  isPrimary?: boolean;
  selected?: boolean;
  shape: PolylineShape;
}) {
  const previewPoints = useMemo(
    () => getPolylinePreview3DPoints(shape, 0.5),
    [shape]
  );
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
    () => getPolylineSmoothSegmentPoints3D(shape, 0.5, 18),
    [shape]
  );
  const showWarningVisuals = selected || isPrimary;
  const tubeRadius = Math.max(0.02, (shape.strokeWidth ?? 0.26) / 2);
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
    if (editing) return null;
    const curveData = getPolylineCurve3Derived(shape, {
      heightOffset: 0.5,
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
  }, [editing, shape, tubeRadius]);

  useEffect(() => {
    return () => {
      segmentedGeometries?.forEach((geometry) => geometry?.dispose());
    };
  }, [segmentedGeometries]);

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
    <group>
      {showWarningVisuals && warningSegments.length && segmentedGeometries ? (
        segmentedGeometries.map((segmentGeometry, segmentIndex) => {
          if (!segmentGeometry) return null;
          const warningKind = warningKindBySegment.get(segmentIndex);
          const color = !warningKind
            ? selected
              ? "#93c5fd"
              : (shape.color ?? "#3b82f6")
            : warningKind === "close-points"
              ? "#ef4444"
              : warningKind === "steep"
                ? "#f97316"
                : "#fbbf24";

          return (
            <mesh
              key={`${shape.id}-segment-${segmentIndex}`}
              geometry={segmentGeometry}
              castShadow
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
        <mesh geometry={geometry} castShadow>
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

export function PolylineElevationHandles3D({
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
        const guideColor = isActive
          ? "#f59e0b"
          : isHovered
            ? "#bfdbfe"
            : "#93c5fd";
        const gripRadius = isMobile
          ? isActive
            ? 0.23
            : 0.2
          : isActive
            ? 0.19
            : 0.16;
        const gripHeight = isMobile
          ? isActive
            ? 0.24
            : 0.2
          : isActive
            ? 0.18
            : 0.15;
        const touchTargetRadius = isMobile ? 0.38 : gripRadius + 0.06;
        const touchTargetHeight = isMobile ? 0.58 : gripHeight;
        return (
          <group key={`${path.id}-elev-${index}`}>
            <mesh position={[point.x, guideHeight / 2, point.y]}>
              <cylinderGeometry args={[0.028, 0.028, guideHeight, 16]} />
              <meshBasicMaterial
                color={guideColor}
                transparent
                opacity={isActive ? 0.95 : isHovered ? 0.82 : 0.48}
              />
            </mesh>
            <mesh
              position={[point.x, pointHeight + 0.03, point.y]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.13, 0.19, 40]} />
              <meshBasicMaterial
                color={isActive ? "#fbbf24" : "#60a5fa"}
                transparent
                opacity={isActive ? 0.92 : isHovered ? 0.62 : 0.34}
                side={THREE.DoubleSide}
              />
            </mesh>
            {(isActive || isHovered) && (
              <mesh
                position={[point.x, pointHeight + 0.031, point.y]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[0.24, 36]} />
                <meshBasicMaterial
                  color={isActive ? "#fbbf24" : "#93c5fd"}
                  transparent
                  opacity={isActive ? 0.14 : 0.09}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
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
                color={isActive ? "#f59e0b" : isHovered ? "#38bdf8" : "#1e293b"}
                emissive={
                  isActive ? "#fbbf24" : isHovered ? "#7dd3fc" : "#60a5fa"
                }
                emissiveIntensity={isActive ? 1 : isHovered ? 0.62 : 0.28}
                roughness={0.16}
                metalness={0.14}
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
                color={isActive ? "#fff3c4" : isHovered ? "#f8fbff" : "#cbd5e1"}
                emissive={
                  isActive ? "#fbbf24" : isHovered ? "#bae6fd" : "#93c5fd"
                }
                emissiveIntensity={isActive ? 0.7 : isHovered ? 0.38 : 0.16}
                roughness={0.12}
                metalness={0.08}
              />
            </mesh>
            {(isActive || isHovered) && (
              <mesh position={[point.x, handleY + 0.14, point.y]}>
                <sphereGeometry args={[0.05, 16, 16]} />
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

export function GateRotateHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  rotationOverrideRef,
}: {
  shape: GateShape | LadderShape | DiveGateShape | FlagShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  rotationOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const guideRotationDeg = getPreviewRotationGuideDegrees(shape);
  const ringRadius = Math.max(
    shape.kind === "gate"
      ? ((shape as GateShape).width ?? 3) / 2 + 0.85
      : shape.kind === "flag"
        ? Math.max(((shape as FlagShape).poleHeight ?? 3.5) * 0.22, 1.45)
        : shape.kind === "ladder"
          ? ((shape as LadderShape).width ?? 2) / 2 + 0.85
          : ((shape as DiveGateShape).size ?? 2.8) / 2 + 0.85,
    1.7
  );
  const yawRad = (-guideRotationDeg * Math.PI) / 180;
  const hitR = isMobile ? 0.65 : 0.5;
  const ringThickness = 0.16;
  const indicatorThickness = ringThickness;

  const ringColor = isDragging ? "#fbbf24" : hovered ? "#7dd3fc" : "#38bdf8";
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const needleMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const centerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const needleGroupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isDragging && needleGroupRef.current) {
      const rot = getPreviewRotationGuideDegrees({
        ...shape,
        rotation: rotationOverrideRef.current ?? shape.rotation,
      });
      needleGroupRef.current.rotation.y = (-rot * Math.PI) / 180;
    }
    if (isDragging || hovered) return;
    pulseRef.current += delta * 1.6;
    const t = 0.62 + Math.sin(pulseRef.current) * 0.13;
    if (ringMatRef.current) {
      ringMatRef.current.opacity = t;
    }
    if (needleMatRef.current) {
      needleMatRef.current.opacity = t * 0.88;
    }
    if (centerMatRef.current) {
      centerMatRef.current.opacity = t * 0.92;
    }
  });

  const ringOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.68;
  const needleOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.68;

  return (
    <group>
      <mesh position={[shape.x, 0.07, shape.y]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringRadius - 0.08, ringRadius + 0.08, 72]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={ringColor}
          transparent
          opacity={ringOpacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[shape.x, 0.07, shape.y]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry
          args={[Math.max(0.2, ringRadius - hitR), ringRadius + hitR, 72]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group
        ref={needleGroupRef}
        position={[shape.x, 0, shape.y]}
        rotation={[0, yawRad, 0]}
      >
        <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[indicatorThickness / 2, 32]} />
          <meshBasicMaterial
            ref={centerMatRef}
            color={ringColor}
            transparent
            opacity={needleOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          position={[0, 0.025, ringRadius / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[indicatorThickness, ringRadius]} />
          <meshBasicMaterial
            ref={needleMatRef}
            color={ringColor}
            transparent
            opacity={needleOpacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh
          position={[0, 0.027, ringRadius / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={(event) => {
            event.stopPropagation();
            onDragStart(event);
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry
            args={[Math.max(hitR * 1.2, 0.5), ringRadius + hitR]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export function DiveGateTiltHandle3D({
  shape,
  onDragStart,
  isDragging,
  isMobile,
  tiltOverrideRef,
}: {
  shape: DiveGateShape;
  onDragStart: (event: ThreeEvent<PointerEvent>) => void;
  isDragging: boolean;
  isMobile: boolean;
  tiltOverrideRef: RefObject<number | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const sz = shape.size ?? 2.8;
  const tilt = shape.tilt ?? 0;
  const tiltRad = (tilt * Math.PI) / 180;
  const yawRad = (-shape.rotation * Math.PI) / 180;
  const centerY = shape.elevation ?? 3.0;
  const arcR = sz / 2;
  const localX = arcR + 0.68;

  const tickY = centerY + arcR * Math.sin(tiltRad);
  const tickZ = -arcR * Math.cos(tiltRad);

  const arcPoints = useMemo(() => {
    const steps = 22;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = (i / steps) * (Math.PI / 2);
      return new THREE.Vector3(
        localX,
        centerY + arcR * Math.sin(t),
        -arcR * Math.cos(t)
      );
    });
  }, [arcR, centerY, localX]);

  const tubeCurve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints),
    [arcPoints]
  );
  const tubeGeo = useMemo(
    () =>
      new THREE.TubeGeometry(tubeCurve, 22, isMobile ? 0.55 : 0.42, 6, false),
    [isMobile, tubeCurve]
  );
  useEffect(() => () => tubeGeo.dispose(), [tubeGeo]);

  const visArcCurve = useMemo(
    () => new THREE.CatmullRomCurve3(arcPoints),
    [arcPoints]
  );
  const visArcGeo = useMemo(
    () => new THREE.TubeGeometry(visArcCurve, 22, 0.032, 8, false),
    [visArcCurve]
  );
  useEffect(() => () => visArcGeo.dispose(), [visArcGeo]);

  const arcColor = isDragging ? "#fb923c" : "#f97316";
  const arcMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const crossH = useRef<THREE.MeshStandardMaterial>(null);
  const crossV = useRef<THREE.MeshStandardMaterial>(null);
  const crosshairGroupRef = useRef<THREE.Group>(null);
  const crossVMeshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (isDragging && crosshairGroupRef.current && crossVMeshRef.current) {
      const liveTilt = tiltOverrideRef.current ?? tilt;
      const liveTiltRad = (liveTilt * Math.PI) / 180;
      crosshairGroupRef.current.position.y =
        centerY + arcR * Math.sin(liveTiltRad);
      crosshairGroupRef.current.position.z = -arcR * Math.cos(liveTiltRad);
      crossVMeshRef.current.rotation.x = liveTiltRad;
    }
    if (isDragging || hovered) return;
    pulseRef.current += delta * 1.6;
    const t = 0.62 + Math.sin(pulseRef.current) * 0.13;
    const ei = 0.45 + Math.sin(pulseRef.current) * 0.12;
    for (const ref of [arcMatRef, crossH, crossV]) {
      if (ref.current) {
        ref.current.opacity = t;
        ref.current.emissiveIntensity = ei;
      }
    }
  });

  const arcOpacity = isDragging ? 0.96 : hovered ? 0.88 : 0.7;
  const arcEI = isDragging ? 1.1 : hovered ? 0.8 : 0.5;
  const crossColor = isDragging ? "#fbbf24" : hovered ? "#fde68a" : arcColor;
  const crossOpacity = isDragging ? 0.98 : hovered ? 0.9 : 0.72;
  const crossEI = isDragging ? 1.1 : hovered ? 0.8 : 0.5;

  return (
    <group position={[shape.x, 0, shape.y]} rotation={[0, yawRad, 0]}>
      <DreiLine
        points={[
          new THREE.Vector3(arcR, centerY, 0),
          new THREE.Vector3(localX, centerY, 0),
        ]}
        color={arcColor}
        lineWidth={2}
        transparent
        opacity={arcOpacity * 0.5}
      />

      <mesh geometry={visArcGeo}>
        <meshStandardMaterial
          ref={arcMatRef}
          color={arcColor}
          emissive={arcColor}
          emissiveIntensity={arcEI}
          transparent
          opacity={arcOpacity}
          roughness={0.15}
          depthWrite={false}
        />
      </mesh>

      {(
        [
          [localX, centerY, -arcR],
          [localX, centerY + arcR, 0],
        ] as const
      ).map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.085, 10, 10]} />
          <meshStandardMaterial
            color={arcColor}
            emissive={arcColor}
            emissiveIntensity={arcEI * 0.85}
            transparent
            opacity={arcOpacity * 0.85}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh
        geometry={tubeGeo}
        onPointerDown={(event) => {
          event.stopPropagation();
          onDragStart(event);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={crosshairGroupRef} position={[localX, tickY, tickZ]}>
        <mesh>
          <boxGeometry args={[0.44, 0.058, 0.058]} />
          <meshStandardMaterial
            ref={crossH}
            color={crossColor}
            emissive={crossColor}
            emissiveIntensity={crossEI}
            transparent
            opacity={crossOpacity}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={crossVMeshRef} rotation={[tiltRad, 0, 0]}>
          <boxGeometry args={[0.058, 0.34, 0.058]} />
          <meshStandardMaterial
            ref={crossV}
            color={crossColor}
            emissive={crossColor}
            emissiveIntensity={crossEI}
            transparent
            opacity={crossOpacity}
            roughness={0.15}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

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
    ladder:
      Math.max(
        ((shape as LadderShape).height ?? 4.5) +
          ((shape as LadderShape).elevation ?? 0),
        1.8
      ) + 0.35,
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
  isPrimaryPolyline,
  isSelected,
  onSelect,
  shape,
  outerRef,
  tiltDragRef,
  elevationOverrideRef,
}: {
  isEditing: boolean;
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
          <Flag3D shape={shape} selected={isSelected} />
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
            editing={isEditing}
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
    prev.isEditing === next.isEditing &&
    prev.isPrimaryPolyline === next.isPrimaryPolyline &&
    prev.isSelected === next.isSelected &&
    prev.onSelect === next.onSelect &&
    prev.outerRef === next.outerRef &&
    prev.tiltDragRef === next.tiltDragRef &&
    prev.elevationOverrideRef === next.elevationOverrideRef
);

export function DroneCamera({
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
      (shape): shape is PolylineShape =>
        shape.kind === "polyline" && shape.points.length >= 2
    );
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

  useEffect(() => {
    if (!flightPath) return;
    tRef.current = 0;
    bankRef.current = 0;
    const start = flightPath.curve.getPoint(0);
    const ahead = flightPath.curve.getPoint(0.02);
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
