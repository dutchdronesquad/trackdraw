"use client";

import { RoundedBox } from "@react-three/drei";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type { StartFinishShape } from "@/lib/types";

export function StartFinish3D({
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
