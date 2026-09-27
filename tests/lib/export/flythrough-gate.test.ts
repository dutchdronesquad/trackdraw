import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { addGateSceneShapes } from "@/lib/export/flythrough/gate";
import {
  createCatalogShapeDraft,
  RACEGOW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";

function createRaceGowGate(meta?: Record<string, unknown>): GateShape {
  const draft = createCatalogShapeDraft(RACEGOW_GATE_ELEMENT_ID, {
    x: 4,
    y: 6,
    includeCatalogMetadata: true,
  });
  return {
    ...draft,
    id: "racegow-1",
    meta: { ...draft.meta, ...meta },
  } as GateShape;
}

function countMeshes(object: THREE.Object3D) {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) count += 1;
  });
  return count;
}

describe("flythrough gate scene", () => {
  it("builds the RaceGOW gate from PVC tubes and modelled fittings", async () => {
    const scene = new THREE.Scene();
    await addGateSceneShapes(createRaceGowGate(), scene);

    expect(scene.children).toHaveLength(1);
    const group = scene.children[0]!;
    expect(group.position.x).toBe(4);
    expect(group.position.z).toBe(6);
    // 3 tubes + 14 fitting sleeves + 4 hubs.
    expect(countMeshes(group)).toBe(21);
  });

  it("fills the RaceGOW start/finish opening with a translucent panel", async () => {
    const scene = new THREE.Scene();
    await addGateSceneShapes(
      createRaceGowGate({ timing: { role: "start_finish" } }),
      scene
    );

    const panels: THREE.Mesh[] = [];
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry instanceof THREE.PlaneGeometry
      ) {
        panels.push(child);
      }
    });
    expect(panels).toHaveLength(1);
    const material = panels[0]!.material as THREE.MeshStandardMaterial;
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.35);
  });
});
