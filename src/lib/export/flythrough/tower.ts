import * as THREE from "three";
import type { TowerShape } from "@/lib/types";
import { getGateLadderYawRadians, makeMat } from "./shared";

function getTowerLevelCount(shape: TowerShape) {
  return Math.max(1, Math.min(4, Math.round(shape.levels ?? 1)));
}

export function addTowerSceneShapes(
  shape: TowerShape,
  scene: THREE.Scene
): void {
  const color = shape.color ?? "#38bdf8";
  const w = shape.width ?? 2;
  const h = shape.height ?? 2;
  const thick = shape.thick ?? 0.2;
  const levels = getTowerLevelCount(shape);
  const elevation = Math.max(shape.elevation ?? 0, 0);
  const totalH = elevation + levels * h;
  const yaw = getGateLadderYawRadians(shape.rotation);
  const mat = makeMat(color);

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = yaw;

  const leftPost = new THREE.Mesh(
    new THREE.BoxGeometry(thick, totalH, thick),
    mat
  );
  leftPost.position.set(-w / 2, totalH / 2, 0);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(
    new THREE.BoxGeometry(thick, totalH, thick),
    mat
  );
  rightPost.position.set(w / 2, totalH / 2, 0);
  group.add(rightPost);

  for (let index = 0; index <= levels; index += 1) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(w + thick, thick, thick),
      mat
    );
    bar.position.set(0, elevation + index * h, 0);
    group.add(bar);
  }

  scene.add(group);
}
