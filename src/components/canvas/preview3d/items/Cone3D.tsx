"use client";

import * as THREE from "three";
import type { ConeShape } from "@/lib/types";

export function Cone3D({
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
