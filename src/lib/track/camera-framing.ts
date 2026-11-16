import * as THREE from "three";

export const PRESENTATION_DIRECTION = new THREE.Vector3(
  -14,
  18,
  20
).normalize();
export const PRESENTATION_FOV = 46;
export const PRESENTATION_PADDING = 1.15;

export interface CameraFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/** Fit a world-space box inside the usable part of a perspective viewport. */
export function fitPerspectiveBounds(
  bounds: THREE.Box3,
  { fov, aspect }: { fov: number; aspect: number },
  {
    direction = PRESENTATION_DIRECTION,
    visibleWidth = 1,
    visibleHeight = 1,
  } = {}
): CameraFrame {
  const target = bounds.getCenter(new THREE.Vector3());
  const inverseView = new THREE.Matrix4()
    .lookAt(direction, new THREE.Vector3(), new THREE.Vector3(0, 1, 0))
    .transpose();
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const usableX = tanY * aspect * visibleWidth;
  const usableY = tanY * visibleHeight;
  const corner = new THREE.Vector3();
  let distance = 1;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        corner.set(x, y, z).sub(target).applyMatrix4(inverseView);
        distance = Math.max(
          distance,
          corner.z + 0.1,
          corner.z + (PRESENTATION_PADDING * Math.abs(corner.x)) / usableX,
          corner.z + (PRESENTATION_PADDING * Math.abs(corner.y)) / usableY
        );
      }
    }
  }

  return {
    target,
    position: target.clone().addScaledVector(direction, distance),
  };
}

/** Expand immediately to retain newly visible content, then ease inward. */
export function updateOverviewBounds(
  current: THREE.Box3,
  next: THREE.Box3,
  deltaSeconds: number
) {
  if (next.isEmpty()) return current;
  if (current.isEmpty()) return current.copy(next);
  const alpha = 1 - Math.exp(-Math.max(0, deltaSeconds) / 0.75);
  current.min.lerp(next.min, alpha).min(next.min);
  current.max.lerp(next.max, alpha).max(next.max);
  return current;
}
