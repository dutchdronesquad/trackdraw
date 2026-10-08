import * as THREE from "three";

// Shared convention for TrackDraw #972 and Track Viewer #21: 46° perspective,
// camera on the negative X / positive Z side, elevated 18:14:20, 15% padding.
export const PRESENTATION_DIRECTION = new THREE.Vector3(
  -14,
  18,
  20
).normalize();
export const PRESENTATION_FOV = 46;
export const PRESENTATION_PADDING = 1.15;

/** Fit every corner in camera space, including height and depth perspective. */
export function fitPresentationCamera(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3
) {
  const target = bounds.getCenter(new THREE.Vector3());
  camera.position.copy(target).add(PRESENTATION_DIRECTION);
  camera.lookAt(target);
  const inverse = camera.quaternion.clone().invert();
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanX = tanY * camera.aspect;
  let distance = 1;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new THREE.Vector3(x, y, z)
          .sub(target)
          .applyQuaternion(inverse);
        distance = Math.max(
          distance,
          p.z + (PRESENTATION_PADDING * Math.abs(p.x)) / tanX,
          p.z + (PRESENTATION_PADDING * Math.abs(p.y)) / tanY
        );
      }
    }
  }
  camera.position
    .copy(target)
    .addScaledVector(PRESENTATION_DIRECTION, distance);
  camera.near = Math.max(0.01, distance / 1000);
  camera.far = distance + bounds.getSize(new THREE.Vector3()).length() * 2 + 10;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return target;
}
