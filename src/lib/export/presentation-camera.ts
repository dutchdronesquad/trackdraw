import * as THREE from "three";
import { fitPerspectiveBounds } from "@/lib/track/camera-framing";

export {
  PRESENTATION_DIRECTION,
  PRESENTATION_FOV,
  PRESENTATION_PADDING,
} from "@/lib/track/camera-framing";

/** Presentation export frames the supplied scene at its output aspect ratio. */
export function fitPresentationCamera(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3
) {
  const { position, target } = fitPerspectiveBounds(bounds, camera);
  const distance = position.distanceTo(target);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.near = Math.max(0.01, distance / 1000);
  camera.far = distance + bounds.getSize(new THREE.Vector3()).length() * 2 + 10;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return target;
}
