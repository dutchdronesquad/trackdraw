import * as THREE from "three";
import type { BarrierShape } from "@/lib/types";

export function addBarrierSceneShapes(
  shape: BarrierShape,
  scene: THREE.Scene
): void {
  const color = new THREE.Color(
    shape.color ?? getBarrierDefaultColor(shape.variant)
  );
  const w = shape.width;
  const h = shape.height;
  const rotY = (-shape.rotation * Math.PI) / 180;

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = rotY;

  if (shape.variant === "hurdle") {
    const barGeo = new THREE.BoxGeometry(w, 0.06, 0.06);
    const barMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, h, 0);
    group.add(bar);

    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, h, 8);
    const postMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    [-w / 2, w / 2].forEach((x) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, h / 2, 0);
      group.add(post);
    });
  } else if (shape.variant === "banner") {
    const panelGeo = new THREE.BoxGeometry(w, h, 0.04);
    const panelMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      transparent: true,
      opacity: 0.82,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, h / 2, 0);
    group.add(panel);
  } else if (shape.variant === "fence") {
    const railGeo = new THREE.BoxGeometry(w, 0.04, 0.04);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
    [h - 0.02, h / 2].forEach((y) => {
      const rail = new THREE.Mesh(railGeo, mat);
      rail.position.set(0, y, 0);
      group.add(rail);
    });
    const postCount = Math.max(2, Math.round(w / 1.5) + 1);
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, h, 8);
    for (let i = 0; i < postCount; i++) {
      const x = -w / 2 + (w / (postCount - 1)) * i;
      const post = new THREE.Mesh(postGeo, mat);
      post.position.set(x, h / 2, 0);
      group.add(post);
    }
  } else {
    // net
    const netGeo = new THREE.BoxGeometry(w, h, 0.025);
    const netMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      transparent: true,
      opacity: 0.55,
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, h / 2, 0);
    group.add(net);
  }

  scene.add(group);
}

function getBarrierDefaultColor(variant: BarrierShape["variant"]): string {
  switch (variant) {
    case "hurdle":
      return "#f59e0b";
    case "banner":
      return "#ec4899";
    case "fence":
      return "#94a3b8";
    case "net":
      return "#06b6d4";
  }
}
