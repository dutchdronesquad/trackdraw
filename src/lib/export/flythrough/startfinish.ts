import * as THREE from "three";
import type { StartFinishShape } from "@/lib/types";

export function addStartFinishSceneShapes(
  shape: StartFinishShape,
  scene: THREE.Scene
): void {
  const color = shape.color ?? "#f59e0b";
  const totalW = shape.width ?? 3.0;
  const spacing = totalW / 4;
  const podW = spacing * 0.72;
  const podD = podW * 1.5;
  const podH = 0.08;
  const topInset = 0.08;
  const stripeW = 0.1;
  const gap = spacing - podW;
  const yaw = (-shape.rotation * Math.PI) / 180;

  const baseMat = new THREE.MeshStandardMaterial({
    color: "#111a26",
    roughness: 0.88,
    metalness: 0.08,
  });

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = yaw;

  for (let i = 0; i < 4; i++) {
    const px = -totalW / 2 + spacing * i + spacing / 2;
    const emissiveIntensity = 0.08 + i * 0.025;

    const podGroup = new THREE.Group();
    podGroup.position.x = px;

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(podW, podH, podD),
      baseMat
    );
    base.position.set(0, podH / 2, 0);
    podGroup.add(base);

    const topMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity,
      roughness: 0.34,
      metalness: 0.18,
    });
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(podW - topInset, 0.018, podD - topInset),
      topMat
    );
    top.position.set(0, podH + 0.012, 0);
    podGroup.add(top);

    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(podW - topInset * 1.2, stripeW),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
      })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, podH + 0.022, -(podD / 2) + 0.16);
    podGroup.add(stripe);

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(podW + 0.08, podD + 0.08),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.004, 0);
    podGroup.add(glow);

    group.add(podGroup);
  }

  for (const dir of [-1, 1]) {
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(gap + 0.02, 0.015, 0.1),
      new THREE.MeshStandardMaterial({
        color: "#1c2634",
        roughness: 0.9,
        metalness: 0.04,
      })
    );
    bridge.position.set(dir * spacing, 0.01, 0);
    group.add(bridge);
  }

  scene.add(group);
}
