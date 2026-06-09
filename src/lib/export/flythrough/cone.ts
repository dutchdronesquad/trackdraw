import * as THREE from "three";
import type { ConeShape } from "@/lib/types";
import { makeMat } from "./shared";

export function addConeSceneShapes(shape: ConeShape, scene: THREE.Scene): void {
  const color = shape.color ?? "#f97316";
  const r = shape.radius ?? 0.2;
  const h = Math.max(r * 1.15, 0.11);
  const baseRadius = Math.max(r * 1.18, 0.12);
  const topRadius = Math.max(baseRadius * 0.6, 0.075);
  const mat = makeMat(color, 0.06);

  const coneGroup = new THREE.Group();
  coneGroup.position.set(shape.x, 0, shape.y);

  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(topRadius, baseRadius, h, 24),
    mat
  );
  cone.position.set(0, h / 2, 0);
  coneGroup.add(cone);

  const topRing = new THREE.Mesh(
    new THREE.RingGeometry(topRadius * 0.28, topRadius * 0.86, 24),
    new THREE.MeshBasicMaterial({
      color: "#fed7aa",
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    })
  );
  topRing.rotation.x = -Math.PI / 2;
  topRing.position.set(0, h + 0.004, 0);
  coneGroup.add(topRing);

  scene.add(coneGroup);
}
