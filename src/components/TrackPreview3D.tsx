"use client";

import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, Grid, RoundedBox, Text } from "@react-three/drei";
import { useEditor } from "@/store/editor";
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";

export interface TrackPreview3DHandle {
  screenshot: () => string;
}

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
import { Play, Pause, Wind } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type {
  GateShape,
  FlagShape,
  ConeShape,
  LabelShape,
  PolylineShape,
  Shape,
  StartFinishShape,
  CheckpointShape,
  LadderShape,
  DiveGateShape,
} from "@/lib/types";

// Creates a canvas texture with text drawn on it
function useTextTexture(
  text: string,
  color: string,
  fontSize: number
): THREE.CanvasTexture {
  return useMemo(() => {
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
// Beam / ray straight up — simple glowing cylinder
function Flag3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: FlagShape;
}) {
  const color = shape.color ?? "#a855f7";
  const ph = shape.poleHeight ?? 3.5;

  return (
    <group position={[shape.x, 0, shape.y]}>
      {/* Outer glow */}
      <mesh position={[0, ph / 2, 0]}>
        <cylinderGeometry args={[0.16, 0.16, ph, 8]} />
        <meshBasicMaterial
          color={selected ? "#60a5fa" : color}
          transparent
          opacity={selected ? 0.34 : 0.18}
        />
      </mesh>
      {/* Core beam */}
      <mesh position={[0, ph / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, ph, 8]} />
        <meshBasicMaterial color={selected ? "#93c5fd" : color} />
      </mesh>
      {/* Top cap glow */}
      <mesh position={[0, ph, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial
          color={selected ? "#93c5fd" : color}
          transparent
          opacity={selected ? 0.8 : 0.55}
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
  const h = r * 2.5;

  return (
    <mesh position={[shape.x, h / 2, shape.y]} castShadow>
      <coneGeometry args={[r, h, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? "#60a5fa" : color}
        emissiveIntensity={selected ? 0.45 : 0.06}
      />
    </mesh>
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

            <Text
              position={[0, podH + 0.026, -(podD / 2) + 0.16]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.11}
              color="#f8fafc"
              anchorX="center"
              anchorY="middle"
            >
              {String(i + 1)}
            </Text>

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

// ── Checkpoint ────────────────────────────────────────────────
function Checkpoint3D({
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: CheckpointShape;
}) {
  const color = shape.color ?? "#22c55e";
  const w = shape.width ?? 3;
  const h = 2.0;
  const rot: [number, number, number] = [
    0,
    (-shape.rotation * Math.PI) / 180,
    0,
  ];

  return (
    <group position={[shape.x, 0, shape.y]} rotation={rot}>
      {/* Thin arch-style checkpoint */}
      <mesh position={[-(w / 2), h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, h, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.72 : 0.4}
        />
      </mesh>
      <mesh position={[w / 2, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, h, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.72 : 0.4}
        />
      </mesh>
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w + 0.12, 0.12, 0.12]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#60a5fa" : color}
          emissiveIntensity={selected ? 0.72 : 0.4}
        />
      </mesh>
      {/* Glowing gate plane */}
      <mesh position={[0, h / 2, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={selected ? "#93c5fd" : color}
          transparent
          opacity={selected ? 0.18 : 0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
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
  selected = false,
  shape,
}: {
  selected?: boolean;
  shape: PolylineShape;
}) {
  const geometry = useMemo(() => {
    const pts = shape.points;
    if (pts.length < 2) return null;
    const vectors = pts.map(
      (p) => new THREE.Vector3(p.x, Math.max(p.z ?? 0, 0) + 0.5, p.y)
    );
    const curve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.5);
    const tubeRadius = Math.max(0.02, (shape.strokeWidth ?? 0.16) / 2);
    return new THREE.TubeGeometry(curve, 64, tubeRadius, 8, false);
  }, [shape.points, shape.strokeWidth]);

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
    checkpoint: 2.45,
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
  isSelected,
  onSelect,
  shape,
}: {
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
          <RaceLine3D shape={shape as PolylineShape} selected={isSelected} />
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
    case "checkpoint":
      return (
        <group onClick={(event) => onSelect(event, shape.id)}>
          <Checkpoint3D
            shape={shape as CheckpointShape}
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
}: {
  shapes: Shape[];
  playing: boolean;
  speed: number;
}) {
  const { camera } = useThree();
  const tRef = useRef(0);

  const curve = useMemo(() => {
    const pl = shapes.find(
      (s) => s.kind === "polyline" && (s as PolylineShape).points.length >= 2
    ) as PolylineShape | undefined;
    if (!pl) return null;
    const vecs = pl.points.map(
      (p) => new THREE.Vector3(p.x, Math.max(p.z ?? 0, 0) + 0.8, p.y)
    );
    return new THREE.CatmullRomCurve3(vecs, false, "catmullrom", 0.5);
  }, [shapes]);

  // Snap camera to start of path when activated
  useEffect(() => {
    if (!curve) return;
    tRef.current = 0;
    const start = curve.getPoint(0);
    const ahead = curve.getPoint(0.02);
    camera.position.copy(start);
    camera.lookAt(ahead);
  }, [curve, camera]);

  useFrame((_, delta) => {
    if (!playing || !curve) return;
    tRef.current = (tRef.current + delta * speed * 0.035) % 1;
    const t = tRef.current;
    const pos = curve.getPoint(t);
    const lookTarget = curve.getPoint((t + 0.02) % 1);
    camera.position.copy(pos);
    camera.lookAt(lookTarget);
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
    const img = new Image();
    img.onload = () => {
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
      setAspect(sourceW / sourceH);
      setTexture(tex);
    };
    img.src = `/assets/brand/trackdraw-logo-mono-${isDark ? "darkbg" : "lightbg"}.svg`;
  }, [isDark]);

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
const TrackPreview3D = forwardRef<TrackPreview3DHandle>(
  function TrackPreview3D(_, ref) {
    const { design, selection, setSelection } = useEditor();
    const theme = useTheme();
    const t = THEME[theme];
    const cx = design.field.width / 2;
    const cz = design.field.height / 2;
    const longest = Math.max(design.field.width, design.field.height);

    const [flyMode, setFlyMode] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const screenshotFnRef = useRef<(() => string) | null>(null);

    useImperativeHandle(ref, () => ({
      screenshot: () => screenshotFnRef.current?.() ?? "",
    }));

    const handleScreenshotReady = useCallback((fn: () => string) => {
      screenshotFnRef.current = fn;
    }, []);

    const hasPath = design.shapes.some(
      (s) => s.kind === "polyline" && (s as PolylineShape).points.length >= 2
    );
    const handleShapeSelect = useCallback(
      (event: ThreeEvent<MouseEvent>, shapeId: string) => {
        event.stopPropagation();
        if (event.delta > 3) {
          return;
        }

        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          const current = new Set(selection);
          if (current.has(shapeId)) current.delete(shapeId);
          else current.add(shapeId);
          setSelection(Array.from(current));
          return;
        }

        setSelection([shapeId]);
      },
      [selection, setSelection]
    );

    return (
      <div className="relative h-full w-full" style={{ background: t.bg }}>
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
            <planeGeometry args={[design.field.width, design.field.height]} />
            <meshStandardMaterial
              color={t.groundColor}
              roughness={0.98}
              metalness={0}
            />
          </mesh>

          {/* Grid */}
          <Grid
            position={[cx, 0, cz]}
            args={[design.field.width, design.field.height]}
            cellSize={design.field.gridStep}
            cellColor={t.gridCell}
            sectionSize={design.field.gridStep * 5}
            sectionColor={t.gridSection}
            fadeDistance={Math.max(90, longest * 2)}
            fadeStrength={1.15}
            infiniteGrid={false}
          />
          {/* Shapes */}
          {design.shapes.map((shape) => (
            <Shape3D
              key={shape.id}
              isSelected={selection.includes(shape.id)}
              onSelect={handleShapeSelect}
              shape={shape}
            />
          ))}

          <FieldWatermark
            fw={design.field.width}
            fh={design.field.height}
            isDark={theme === "dark"}
          />

          <ScreenshotHelper onReady={handleScreenshotReady} />
          {flyMode ? (
            <DroneCamera
              shapes={design.shapes}
              playing={playing}
              speed={speed}
            />
          ) : (
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              target={[cx, 0, cz]}
              maxPolarAngle={Math.PI / 2}
              minDistance={8}
              maxDistance={Math.max(120, longest * 3)}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.PAN,
              }}
            />
          )}
        </Canvas>

        {/* Fly-through controls overlay */}
        {hasPath && (
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-1.5 text-sm shadow-lg backdrop-blur select-none">
            {flyMode ? (
              <>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="flex size-7 items-center justify-center rounded text-white/80 transition-colors hover:bg-white/10 hover:text-white"
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
              </>
            ) : (
              <button
                onClick={() => {
                  setFlyMode(true);
                  setPlaying(true);
                }}
                className="flex items-center gap-1.5 px-1 text-[11px] text-white/50 transition-colors hover:text-white/90"
              >
                <Wind className="size-3.5" />
                Fly-Through
              </button>
            )}
          </div>
        )}

        {/* No path hint */}
        {!hasPath && (
          <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] text-white/20 select-none">
            Draw a race path in 2D to enable fly-through
          </div>
        )}
      </div>
    );
  }
);

export default TrackPreview3D;
