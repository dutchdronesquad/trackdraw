"use client";

import * as THREE from "three";

export const ROTATION_SNAP_STEP_DEG = 5;

export function groundAngle(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  pivotX: number,
  pivotZ: number
): number | null {
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return Math.atan2(hit.x - pivotX, hit.z - pivotZ);
}

export function sideGateTiltAngle(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  camera: THREE.Camera,
  arcCenterWorld: THREE.Vector3,
  planeNormal: THREE.Vector3,
  gateForward: THREE.Vector3
): number | null {
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    arcCenterWorld
  );
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  const toHit = hit.clone().sub(arcCenterWorld);
  return Math.atan2(toHit.y, -toHit.dot(gateForward));
}

export function snapRotationDegrees(rotation: number) {
  return Math.round(rotation / ROTATION_SNAP_STEP_DEG) * ROTATION_SNAP_STEP_DEG;
}
