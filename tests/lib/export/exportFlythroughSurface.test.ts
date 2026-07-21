import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createFlythroughSurface,
  disposeFlythroughSceneResources,
  resolveFlythroughGridStep,
} from "@/lib/export/exportFlythrough";
import {
  cloneTextureForPanel,
  loadTexture,
} from "@/lib/export/flythrough/shared";

describe("flythrough track surface", () => {
  it("builds the bounded live-scene hierarchy with five minor cells per section", () => {
    const surface = createFlythroughSurface(
      { width: 60, height: 40, gridStep: 1 },
      "light"
    );

    expect(surface.group.getObjectByName("flythrough-terrain")).toBeTruthy();
    expect(
      surface.group.getObjectByName("flythrough-track-border")
    ).toBeTruthy();
    expect(surface.group.children).toHaveLength(4);

    const mat = surface.group.getObjectByName(
      "flythrough-track-mat"
    ) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    expect(mat).toBeTruthy();
    expect(mat.geometry.parameters.width).toBe(60);
    expect(mat.geometry.parameters.height).toBe(40);
    expect(mat.material.map).toBe(surface.ownedTextures[0]);
    expect(mat.material.map?.repeat.x).toBe(6);
    expect(mat.material.map?.repeat.y).toBe(4);

    const grid = surface.group.getObjectByName(
      "flythrough-track-grid"
    ) as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    expect(grid).toBeTruthy();
    expect(grid.geometry.getAttribute("position").count).toBe(4);
    expect(grid.material.glslVersion).toBe(THREE.GLSL3);
    expect(grid.material.uniforms.cellSize.value).toBe(1);
    expect(grid.material.uniforms.sectionSize.value).toBe(5);
    expect(surface.sectionSize / surface.gridStep).toBe(5);

    disposeFlythroughSceneResources(surface.group, surface.ownedTextures);
  });

  it("links checker blocks and major sections to a custom grid step", () => {
    const surface = createFlythroughSurface(
      { width: 60, height: 40, gridStep: 0.5 },
      "dark"
    );
    const texture = surface.ownedTextures[0];

    expect(surface.gridStep).toBe(0.5);
    expect(surface.sectionSize).toBe(2.5);
    expect(texture?.repeat.x).toBe(12);
    expect(texture?.repeat.y).toBe(8);

    disposeFlythroughSceneResources(surface.group, surface.ownedTextures);
  });

  it("caps extreme imported grid density without adding grid geometry", () => {
    const gridStep = resolveFlythroughGridStep({
      width: 100_000,
      height: 50_000,
      gridStep: 0.000_001,
    });
    expect(gridStep).toBeCloseTo(100_000 / 4096);

    const surface = createFlythroughSurface(
      { width: 100_000, height: 50_000, gridStep: 0.000_001 },
      "light"
    );
    const grid = surface.group.getObjectByName(
      "flythrough-track-grid"
    ) as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

    expect(grid.geometry.getAttribute("position").count).toBe(4);
    expect(grid.material.uniforms.cellSize.value).toBe(gridStep);
    expect(grid.material.uniforms.sectionSize.value).toBe(gridStep * 5);

    disposeFlythroughSceneResources(surface.group, surface.ownedTextures);
  });

  it("disposes generated geometry, materials, and owned textures", () => {
    const surface = createFlythroughSurface(
      { width: 60, height: 40, gridStep: 1 },
      "dark"
    );
    const terrain = surface.group.getObjectByName(
      "flythrough-terrain"
    ) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    const geometryDispose = vi.spyOn(terrain.geometry, "dispose");
    const materialDispose = vi.spyOn(terrain.material, "dispose");
    const textureDispose = vi.spyOn(surface.ownedTextures[0]!, "dispose");

    disposeFlythroughSceneResources(surface.group, surface.ownedTextures);

    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(materialDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
  });

  it("disposes per-export material textures but preserves shared cache entries", async () => {
    const sharedTexture = new THREE.Texture({} as HTMLImageElement);
    const textureLoad = vi
      .spyOn(THREE.TextureLoader.prototype, "load")
      .mockImplementation((_url, onLoad) => {
        onLoad?.(sharedTexture);
        return sharedTexture;
      });
    const cachedTexture = await loadTexture(
      `/tests/flythrough-cache-${crypto.randomUUID()}.png`
    );
    const exportTexture = cloneTextureForPanel(cachedTexture, {
      flipX: true,
    });
    const sharedDispose = vi.spyOn(cachedTexture, "dispose");
    const exportDispose = vi.spyOn(exportTexture, "dispose");
    const root = new THREE.Group();
    root.add(
      new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ map: cachedTexture })
      ),
      new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({ map: exportTexture })
      )
    );

    disposeFlythroughSceneResources(root, []);

    expect(sharedDispose).not.toHaveBeenCalled();
    expect(exportDispose).toHaveBeenCalledOnce();
    textureLoad.mockRestore();
  });
});
