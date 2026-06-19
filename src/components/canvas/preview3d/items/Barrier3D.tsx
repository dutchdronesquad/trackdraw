"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { getBarrierVisualSpec } from "@/lib/track/elements/visual";
import type { BarrierShape } from "@/lib/types";

function parseColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

interface BarrierMaterialProps {
  color: THREE.Color;
  selected: boolean;
  opacity?: number;
  transparent?: boolean;
  roughness?: number;
  metalness?: number;
}

function barrierMaterial({
  color,
  selected,
  opacity = 1,
  transparent = false,
  roughness = 0.7,
  metalness = 0.05,
}: BarrierMaterialProps) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={selected ? color : new THREE.Color(0, 0, 0)}
      emissiveIntensity={selected ? 0.22 : 0}
      roughness={roughness}
      metalness={metalness}
      opacity={opacity}
      transparent={transparent}
    />
  );
}

function HurdleBarrier3D({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  const color = useMemo(
    () => parseColor(shape.color ?? "#f59e0b"),
    [shape.color]
  );
  const w = shape.width;
  const h = shape.height;
  const postR = 0.04;
  const barR = 0.03;

  return (
    <group
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      {/* Top bar */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, barR * 2, barR * 2]} />
        {barrierMaterial({ color, selected })}
      </mesh>
      {/* Left post */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <cylinderGeometry args={[postR, postR, h, 8]} />
        {barrierMaterial({ color, selected })}
      </mesh>
      {/* Right post */}
      <mesh position={[w / 2, h / 2, 0]}>
        <cylinderGeometry args={[postR, postR, h, 8]} />
        {barrierMaterial({ color, selected })}
      </mesh>
    </group>
  );
}

function BannerBarrier3DTextured({
  shape,
  selected,
  texturePath,
}: {
  shape: BarrierShape;
  selected: boolean;
  texturePath: string;
}) {
  const texture = useTexture(texturePath);
  const color = useMemo(
    () => parseColor(shape.color ?? "#1e3a8a"),
    [shape.color]
  );
  const w = shape.width;
  const h = shape.height;
  const thick = 0.04;

  return (
    <group
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, thick]} />
        <meshStandardMaterial
          map={texture}
          emissive={selected ? color : new THREE.Color(0, 0, 0)}
          emissiveIntensity={selected ? 0.22 : 0}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>
      {/* Left post */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, h, 8]} />
        {barrierMaterial({
          color: new THREE.Color("#94a3b8"),
          selected: false,
        })}
      </mesh>
      {/* Right post */}
      <mesh position={[w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, h, 8]} />
        {barrierMaterial({
          color: new THREE.Color("#94a3b8"),
          selected: false,
        })}
      </mesh>
    </group>
  );
}

function BannerBarrier3D({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  const visual = getBarrierVisualSpec(shape);
  const texturePath = visual?.panel.texture ?? null;

  if (texturePath) {
    return (
      <BannerBarrier3DTextured
        shape={shape}
        selected={selected}
        texturePath={texturePath}
      />
    );
  }

  return <BannerBarrier3DPlain shape={shape} selected={selected} />;
}

function BannerBarrier3DPlain({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  const color = useMemo(
    () => parseColor(shape.color ?? "#ec4899"),
    [shape.color]
  );
  const w = shape.width;
  const h = shape.height;
  const thick = 0.04;

  return (
    <group
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, thick]} />
        {barrierMaterial({ color, selected, opacity: 0.82, transparent: true })}
      </mesh>
      <mesh position={[-w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, h, 8]} />
        {barrierMaterial({
          color: new THREE.Color("#94a3b8"),
          selected: false,
        })}
      </mesh>
      <mesh position={[w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, h, 8]} />
        {barrierMaterial({
          color: new THREE.Color("#94a3b8"),
          selected: false,
        })}
      </mesh>
    </group>
  );
}

function FenceBarrier3D({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  const color = useMemo(
    () => parseColor(shape.color ?? "#94a3b8"),
    [shape.color]
  );
  const w = shape.width;
  const h = shape.height;
  const frameR = 0.045;
  const barR = 0.016;
  // Frame floats above the ground — supported only by the feet
  const groundClearance = Math.min(0.16, h * 0.18);
  const footSpread = Math.min(0.42, h * 0.45); // how far legs extend in ±Z
  const footR = frameR * 0.85;
  const footAttachX = w * 0.27; // where feet bracket along the width

  const frameH = h - groundClearance; // height of the frame rectangle itself
  const frameBottom = groundClearance;
  const frameTop = h;
  // Corner radius clamped so straight segments always have positive length
  const cornerR = Math.min(frameR * 3, frameH * 0.32, w * 0.14);
  const straightPostH = Math.max(0, frameH - 2 * cornerR);
  const straightRailW = Math.max(0, w - 2 * cornerR);

  const barCount = Math.max(3, Math.round((w - frameR * 4) / 0.16));
  const innerW = w - frameR * 4;
  const innerH = frameH - frameR * 2;

  // V-leg: diagonal from (fx, groundClearance, 0) to (fx, 0, ±footSpread)
  const legLen = Math.sqrt(
    groundClearance * groundClearance + footSpread * footSpread
  );
  const legAngle = Math.PI / 2 + Math.atan2(groundClearance, footSpread);

  const mat = () =>
    barrierMaterial({ color, selected, roughness: 0.28, metalness: 0.82 });

  return (
    <group
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      {/* Straight side posts (shortened to leave room for corner arcs) */}
      {straightPostH > 0 && (
        <>
          <mesh position={[-w / 2, (frameBottom + frameTop) / 2, 0]}>
            <cylinderGeometry args={[frameR, frameR, straightPostH, 8]} />
            {mat()}
          </mesh>
          <mesh position={[w / 2, (frameBottom + frameTop) / 2, 0]}>
            <cylinderGeometry args={[frameR, frameR, straightPostH, 8]} />
            {mat()}
          </mesh>
        </>
      )}
      {/* Straight rails (shortened) */}
      {straightRailW > 0 && (
        <>
          <mesh position={[0, frameTop, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[frameR, frameR, straightRailW, 8]} />
            {mat()}
          </mesh>
          <mesh position={[0, frameBottom, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[frameR, frameR, straightRailW, 8]} />
            {mat()}
          </mesh>
        </>
      )}
      {/*
        Quarter-torus corners. Default torus arc (0→π/2) in XY plane goes:
          θ=0  → (+R, 0)   θ=π/2 → (0, +R)
        Rotating the mesh remaps which corner each arc fills:
          top-right:    no rotation     (R,0)→(w/2)  (0,R)→(frameTop)
          top-left:     rotY=π  → (-R,0)→(-w/2)  (0,R)→(frameTop)
          bottom-left:  rotZ=π  → (-R,0)→(-w/2)  (0,-R)→(frameBottom)
          bottom-right: rotX=π  → (R,0)→(w/2)   (0,-R)→(frameBottom)
      */}
      <mesh position={[w / 2 - cornerR, frameTop - cornerR, 0]}>
        <torusGeometry args={[cornerR, frameR, 6, 8, Math.PI / 2]} />
        {mat()}
      </mesh>
      <mesh
        position={[-w / 2 + cornerR, frameTop - cornerR, 0]}
        rotation={[0, Math.PI, 0]}
      >
        <torusGeometry args={[cornerR, frameR, 6, 8, Math.PI / 2]} />
        {mat()}
      </mesh>
      <mesh
        position={[-w / 2 + cornerR, frameBottom + cornerR, 0]}
        rotation={[0, 0, Math.PI]}
      >
        <torusGeometry args={[cornerR, frameR, 6, 8, Math.PI / 2]} />
        {mat()}
      </mesh>
      <mesh
        position={[w / 2 - cornerR, frameBottom + cornerR, 0]}
        rotation={[Math.PI, 0, 0]}
      >
        <torusGeometry args={[cornerR, frameR, 6, 8, Math.PI / 2]} />
        {mat()}
      </mesh>
      {/* Vertical bars inside the frame */}
      {Array.from({ length: barCount }, (_, i) => {
        const x = -innerW / 2 + ((i + 1) / (barCount + 1)) * innerW;
        return (
          <mesh key={i} position={[x, frameBottom + frameR + innerH / 2, 0]}>
            <cylinderGeometry args={[barR, barR, innerH, 6]} />
            {mat()}
          </mesh>
        );
      })}
      {/* Two V-shaped foot structures, each with two diagonal legs to the ground */}
      {([-footAttachX, footAttachX] as const).flatMap((fx, fi) => [
        <mesh
          key={`ff${fi}`}
          position={[fx, groundClearance / 2, footSpread / 2]}
          rotation={[legAngle, 0, 0]}
        >
          <cylinderGeometry args={[footR, footR, legLen, 6]} />
          {mat()}
        </mesh>,
        <mesh
          key={`fb${fi}`}
          position={[fx, groundClearance / 2, -footSpread / 2]}
          rotation={[-legAngle, 0, 0]}
        >
          <cylinderGeometry args={[footR, footR, legLen, 6]} />
          {mat()}
        </mesh>,
      ])}
    </group>
  );
}

const NET_WIRE_RADIUS = 0.005;
const NET_CELL_H = 0.12; // vertical wires closer together
const NET_CELL_V = 0.22; // horizontal wires further apart

function NetBarrier3D({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  const color = useMemo(
    () => parseColor(shape.color ?? "#94a3b8"),
    [shape.color]
  );
  const w = shape.width;
  const h = shape.height;

  const { hWires, vWires } = useMemo(() => {
    const cols = Math.max(2, Math.round(w / NET_CELL_H));
    const rows = Math.max(2, Math.round(h / NET_CELL_V));

    const horizontalWires = Array.from({ length: rows + 1 }, (_, r) => ({
      y: (r / rows) * h,
    }));
    const verticalWires = Array.from({ length: cols + 1 }, (_, c) => ({
      x: -w / 2 + (c / cols) * w,
    }));

    return { hWires: horizontalWires, vWires: verticalWires };
  }, [w, h]);

  const postColor = new THREE.Color("#9ca3af");
  const wireMat = (
    <meshStandardMaterial
      color={color}
      emissive={selected ? color : new THREE.Color(0, 0, 0)}
      emissiveIntensity={selected ? 0.22 : 0}
      roughness={0.3}
      metalness={0.7}
    />
  );
  const postMat = (
    <meshStandardMaterial
      color={postColor}
      emissive={selected ? postColor : new THREE.Color(0, 0, 0)}
      emissiveIntensity={selected ? 0.22 : 0}
      roughness={0.3}
      metalness={0.8}
    />
  );

  return (
    <group
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      {/* Horizontal wires */}
      {hWires.map((wire, i) => (
        <mesh
          key={`h${i}`}
          position={[0, wire.y, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[NET_WIRE_RADIUS, NET_WIRE_RADIUS, w, 5]} />
          {wireMat}
        </mesh>
      ))}
      {/* Vertical wires */}
      {vWires.map((wire, i) => (
        <mesh key={`v${i}`} position={[wire.x, h / 2, 0]}>
          <cylinderGeometry args={[NET_WIRE_RADIUS, NET_WIRE_RADIUS, h, 5]} />
          {wireMat}
        </mesh>
      ))}
      {/* Left post */}
      <mesh position={[-w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, h + 0.1, 8]} />
        {postMat}
      </mesh>
      {/* Right post */}
      <mesh position={[w / 2, h / 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, h + 0.1, 8]} />
        {postMat}
      </mesh>
      {/* Top rail */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, 0.05, 0.05]} />
        {postMat}
      </mesh>
    </group>
  );
}

export function Barrier3D({
  shape,
  selected,
}: {
  shape: BarrierShape;
  selected: boolean;
}) {
  switch (shape.variant) {
    case "hurdle":
      return <HurdleBarrier3D shape={shape} selected={selected} />;
    case "banner":
      return <BannerBarrier3D shape={shape} selected={selected} />;
    case "fence":
      return <FenceBarrier3D shape={shape} selected={selected} />;
    case "net":
      return <NetBarrier3D shape={shape} selected={selected} />;
  }
}

export function getBarrierTopY(shape: BarrierShape): number {
  return Math.max(shape.height, 0.1);
}
