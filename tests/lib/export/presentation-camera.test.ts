import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  fitPresentationCamera,
  PRESENTATION_DIRECTION,
  PRESENTATION_FOV,
} from "@/lib/export/presentation-camera";

describe("transparent overview framing", () => {
  it.each([
    [3, 2, 1],
    [1000, 800, 30],
    [500, 4, 25],
    [4, 500, 25],
  ])("fits %s x %s courses and their elevation", (width, depth, height) => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-15, -0.1, -20),
      new THREE.Vector3(width, height, depth)
    );
    for (const aspect of [4 / 3, 0.5, 3]) {
      const camera = new THREE.PerspectiveCamera(PRESENTATION_FOV, aspect);
      const target = fitPresentationCamera(camera, bounds);
      expect(
        camera.position
          .clone()
          .sub(target)
          .normalize()
          .distanceTo(PRESENTATION_DIRECTION)
      ).toBeLessThan(1e-10);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = new THREE.Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(0.9);
            expect(Math.abs(projected.y)).toBeLessThan(0.9);
            expect(projected.z).toBeGreaterThan(-1);
            expect(projected.z).toBeLessThan(1);
          }
    }
  });
  it("is deterministic and includes rotated geometry outside the field", () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(70, 15, 3));
    mesh.rotation.y = Math.PI / 4;
    mesh.position.set(80, 20, -25);
    group.add(mesh);
    const bounds = new THREE.Box3().setFromObject(group, true);
    const a = new THREE.PerspectiveCamera(PRESENTATION_FOV, 4 / 3);
    const b = a.clone();
    fitPresentationCamera(a, bounds);
    fitPresentationCamera(b, bounds);
    expect(a.position.toArray()).toEqual(b.position.toArray());
    expect(a.quaternion.toArray()).toEqual(b.quaternion.toArray());
  });
});
