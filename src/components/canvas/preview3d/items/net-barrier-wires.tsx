"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

export const NET_WIRE_RADIUS = 0.005;
const NET_CELL_H = 0.12;
const NET_CELL_V = 0.22;

export function createNetWireMatrices(width: number, height: number) {
  const cols = Math.max(2, Math.round(width / NET_CELL_H));
  const rows = Math.max(2, Math.round(height / NET_CELL_V));
  const matrices: THREE.Matrix4[] = [];
  for (let row = 0; row <= rows; row++) {
    matrices.push(
      new THREE.Matrix4()
        .makeRotationZ(Math.PI / 2)
        .scale(new THREE.Vector3(1, width, 1))
        .setPosition(0, (row / rows) * height, 0)
    );
  }
  for (let col = 0; col <= cols; col++) {
    matrices.push(
      new THREE.Matrix4()
        .makeScale(1, height, 1)
        .setPosition(-width / 2 + (col / cols) * width, height / 2, 0)
    );
  }
  return matrices;
}

export function updateNetWireInstances(
  target: THREE.InstancedMesh,
  matrices: THREE.Matrix4[]
) {
  matrices.forEach((matrix, index) => target.setMatrixAt(index, matrix));
  target.instanceMatrix.needsUpdate = true;
  target.computeBoundingBox();
  target.computeBoundingSphere();
}

export function NetBarrierWires({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const matrices = useMemo(
    () => createNetWireMatrices(width, height),
    [width, height]
  );
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    updateNetWireInstances(target, matrices);
  }, [matrices]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, matrices.length]}>
      <cylinderGeometry args={[NET_WIRE_RADIUS, NET_WIRE_RADIUS, 1, 5]} />
      {children}
    </instancedMesh>
  );
}
