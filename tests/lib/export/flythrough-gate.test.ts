import * as shared from "@/lib/export/flythrough/shared";
import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addGateSceneShapes } from "@/lib/export/flythrough/gate";
import {
  createCatalogShapeDraft,
  RACEGOW_GATE_ELEMENT_ID,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { GateShape } from "@/lib/types";

function createRaceGowGate(meta?: Record<string, unknown>): GateShape {
  const draft = createCatalogShapeDraft(
    RACEGOW_GATE_ELEMENT_ID,
    MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
    {
      x: 4,
      y: 6,
      includeCatalogMetadata: true,
    }
  );
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
  afterEach(() => vi.restoreAllMocks());
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

it("retains solid gate geometry when requested artwork and panel decoding are unavailable", async () => {
  vi.spyOn(shared, "loadPanelTextures").mockRejectedValueOnce(
    new Error("Offline")
  );
  const draft = createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
    x: 2,
    y: 3,
    includeCatalogMetadata: true,
  });
  const shape = {
    ...draft,
    id: "unavailable-gate",
    appearance: {
      source: "registry",
      collectionId: "dds",
      textureId: "standard-gate",
      templateId: "gate-standard-v2",
    },
  } as GateShape;
  const scene = new THREE.Scene();
  await addGateSceneShapes(shape, scene);
  expect(scene.children).toHaveLength(1);
  expect(countMeshes(scene.children[0]!)).toBe(8);
  expect(shape.appearance?.templateId).toBe("gate-standard-v2");
});
