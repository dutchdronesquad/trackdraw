import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createBeachflag } from "@/lib/track/beachflag";
import { addFlagSceneShapes } from "@/lib/export/flythrough/flag";

function cloth(model: ReturnType<typeof createBeachflag>) {
  return model.group.children.filter(
    (
      object
    ): object is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> =>
      object instanceof THREE.Mesh && Boolean(object.morphTargetInfluences)
  );
}

describe("3D beachflags", () => {
  it("keeps a zero-height flag anchored without building degenerate geometry", () => {
    const model = createBeachflag({ height: 0, id: "zero", color: "#fff" });
    model.setTime(1);
    expect(model.group.children).toHaveLength(0);
    model.dispose();
  });

  it.each([1.5, 3.048, 5])(
    "keeps the generic mount and height at %s m",
    (height) => {
      const model = createBeachflag({
        height,
        id: "generic",
        color: "#ef4444",
      });
      const [banner] = cloth(model);
      const positions = banner.geometry.getAttribute("position");
      const bounds = new THREE.Box3().setFromObject(model.group, true);
      expect(bounds.max.y).toBeCloseTo(height, 3);
      expect(bounds.min.y).toBeCloseTo(0, 3);
      const vertex = new THREE.Vector3();
      for (let row = 0; row < positions.count; row += 11) {
        model.setTime(2.5);
        banner.getVertexPosition(row, vertex);
        expect(vertex.z).toBe(0);
      }
      model.setTime(null);
      expect(banner.morphTargetInfluences).toEqual([0, 0]);
      model.dispose();
    }
  );

  it("uses the same surface and motion for front and back artwork with side-specific UVs", () => {
    const model = createBeachflag({
      height: 3.048,
      id: "catalog",
      color: "#ee0000",
      poleColor: "#111111",
    });
    const frontMap = new THREE.Texture();
    const backMap = new THREE.Texture();
    model.setTextures({ front: frontMap, back: backMap });
    const [front, back] = cloth(model);
    expect(front.material.map).toBe(frontMap);
    expect(back.material.map).toBe(backMap);
    expect(front.material.alphaTest).toBeGreaterThan(0);
    expect(front.castShadow).toBe(true);
    expect(back.castShadow).toBe(false);
    model.setTime(0.6);
    const pose = new THREE.Vector3();
    const backPose = new THREE.Vector3();
    const uv = front.geometry.getAttribute("uv");
    const backUv = back.geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      expect(front.getVertexPosition(i, pose)).toEqual(
        back.getVertexPosition(i, backPose)
      );
      expect(uv.getX(i) + backUv.getX(i)).toBeCloseTo(1);
      expect(uv.getY(i)).toBe(backUv.getY(i));
      expect(
        Math.abs(pose.z - front.geometry.getAttribute("position").getZ(i))
      ).toBeLessThanOrEqual(0.08);
    }
    model.setTextures(null);
    expect(cloth(model)).toHaveLength(1);
    expect(cloth(model)[0].material.side).toBe(THREE.DoubleSide);
    model.dispose();
  });

  it("keeps the export anchor and heading and reproduces a pose at any timestamp", () => {
    const shape = {
      kind: "flag" as const,
      id: "flag-a",
      x: 4,
      y: 7,
      rotation: 90,
      radius: 0.2,
    };
    const model = addFlagSceneShapes(shape);
    const another = addFlagSceneShapes({ ...shape, id: "flag-b" });
    expect(model.group.position.toArray()).toEqual([4, 0, 7]);
    expect(model.group.rotation.y).toBe(-Math.PI / 2);
    const [banner] = cloth(model);
    model.setTime(2);
    another.setTime(2);
    const pose = [...banner.morphTargetInfluences!];
    expect(cloth(another)[0].morphTargetInfluences).not.toEqual(pose);
    model.setTime(8);
    expect(banner.morphTargetInfluences).not.toEqual(pose);
    model.setTime(2);
    expect(banner.morphTargetInfluences).toEqual(pose);
    model.dispose();
    another.dispose();
  });
});
