import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createNetWireMatrices,
  updateNetWireInstances,
  NET_WIRE_RADIUS,
} from "@/components/canvas/preview3d/items/net-barrier-wires";

function wireMesh(width: number, height: number) {
  const matrices = createNetWireMatrices(width, height);
  const geometry = new THREE.CylinderGeometry(
    NET_WIRE_RADIUS,
    NET_WIRE_RADIUS,
    1,
    5
  );
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
  updateNetWireInstances(mesh, matrices);
  return { mesh, matrices, geometry, material };
}
function expectVectorClose(actual: THREE.Vector3, expected: THREE.Vector3) {
  expect(actual.distanceTo(expected)).toBeLessThan(0.00001);
}
describe("net wire instances", () => {
  it.each([
    [9.25, 3.5],
    [2, 0.5],
    [0.08, 0.07],
    [60, 10],
  ])(
    "preserves every wire's vertices and normals at %s x %s",
    (width, height) => {
      const { mesh, matrices, geometry, material } = wireMesh(width, height);
      const cols = Math.max(2, Math.round(width / 0.12)),
        rows = Math.max(2, Math.round(height / 0.22));
      expect(mesh.count).toBe(rows + 1 + cols + 1);
      const bounds = new THREE.Box3();
      matrices.forEach((matrix, index) => {
        const horizontal = index <= rows;
        const original = new THREE.CylinderGeometry(
          NET_WIRE_RADIUS,
          NET_WIRE_RADIUS,
          horizontal ? width : height,
          5
        );
        const transform = new THREE.Matrix4();
        if (horizontal)
          transform
            .makeRotationZ(Math.PI / 2)
            .setPosition(0, (index / rows) * height, 0);
        else
          transform.setPosition(
            -width / 2 + ((index - rows - 1) / cols) * width,
            height / 2,
            0
          );
        const instanceNormal = new THREE.Matrix3().getNormalMatrix(matrix);
        const originalNormal = new THREE.Matrix3().getNormalMatrix(transform);
        for (
          let vertex = 0;
          vertex < geometry.attributes.position.count;
          vertex++
        ) {
          expectVectorClose(
            new THREE.Vector3()
              .fromBufferAttribute(geometry.attributes.position, vertex)
              .applyMatrix4(matrix),
            new THREE.Vector3()
              .fromBufferAttribute(original.attributes.position, vertex)
              .applyMatrix4(transform)
          );
          expectVectorClose(
            new THREE.Vector3()
              .fromBufferAttribute(geometry.attributes.normal, vertex)
              .applyNormalMatrix(instanceNormal),
            new THREE.Vector3()
              .fromBufferAttribute(original.attributes.normal, vertex)
              .applyNormalMatrix(originalNormal)
          );
        }
        original.computeBoundingBox();
        bounds.union(original.boundingBox!.clone().applyMatrix4(transform));
        original.dispose();
      });
      expectVectorClose(mesh.boundingBox!.min, bounds.min);
      expectVectorClose(mesh.boundingBox!.max, bounds.max);
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    }
  );
  it("refreshes GPU matrices and culling bounds when dimensions change without changing instance count", () => {
    const { mesh, geometry, material } = wireMesh(9.25, 3.5);
    const before = mesh.boundingBox!.clone(),
      version = mesh.instanceMatrix.version;
    const matrices = createNetWireMatrices(9.26, 3.51);
    expect(matrices).toHaveLength(mesh.count);
    updateNetWireInstances(mesh, matrices);
    expect(mesh.instanceMatrix.version).toBeGreaterThan(version);
    expect(mesh.boundingBox!.max.x).toBeGreaterThan(before.max.x);
    expect(mesh.boundingBox!.max.y).toBeGreaterThan(before.max.y);
    expect(
      mesh.boundingSphere!.containsPoint(
        mesh.boundingBox!.getCenter(new THREE.Vector3())
      )
    ).toBe(true);
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  });
  it("retains ray hits on a moved and rotated net and rejects rays outside it", () => {
    const { mesh, geometry, material } = wireMesh(9.25, 3.5);
    mesh.position.set(4, 0, 8);
    mesh.rotation.y = (-35 * Math.PI) / 180;
    mesh.updateMatrixWorld(true);
    const point = new THREE.Vector3(0, 0, 0).applyMatrix4(mesh.matrixWorld);
    const direction = new THREE.Vector3(0, 0, -1).transformDirection(
      mesh.matrixWorld
    );
    const origin = point.clone().addScaledVector(direction, -2);
    const raycaster = new THREE.Raycaster(origin, direction);
    const hits = raycaster.intersectObject(mesh, false);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].instanceId).toBeDefined();
    raycaster.ray.origin.add(new THREE.Vector3(0, 10, 0));
    expect(raycaster.intersectObject(mesh, false)).toHaveLength(0);
    geometry.dispose();
    material.dispose();
    mesh.dispose();
  });
});
