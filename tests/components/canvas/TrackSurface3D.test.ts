// @vitest-environment happy-dom

import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  clampOrbitTargetAboveGround,
  createTrackSurfaceTexture,
  TrackSurface3D,
} from "@/components/canvas/preview3d/shared-scene";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";

const gridRender = vi.hoisted(() => vi.fn());

vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { distanceTo: vi.fn(() => 10) } },
    gl: { domElement: {} },
  })),
}));

vi.mock("@react-three/drei", () => ({
  Grid: (props: Record<string, unknown>) => {
    gridRender(props);
    return null;
  },
  useTexture: Object.assign(
    vi.fn(() => ({})),
    { preload: vi.fn() }
  ),
}));

afterEach(() => {
  cleanup();
  gridRender.mockClear();
});

describe("track surface texture", () => {
  it("lifts a panned orbit target and camera back to ground level", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(12, 4, 18);
    const controls = {
      target: new THREE.Vector3(10, -3, 10),
      update: vi.fn(),
    };

    expect(clampOrbitTargetAboveGround(camera, controls)).toBe(true);
    expect(controls.target.y).toBe(0);
    expect(camera.position.y).toBe(7);
    expect(clampOrbitTargetAboveGround(camera, controls)).toBe(false);
  });

  it("maps each checker cell to five metres across the configured field", () => {
    const texture = createTrackSurfaceTexture({
      baseColor: "#d0d8e4",
      checkerColor: "#c2ccd7",
      gridStep: 1,
      width: 60,
      height: 40,
    });

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture.repeat.x).toBe(6);
    expect(texture.repeat.y).toBe(4);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    if (!texture.image.data) throw new Error("Expected texture pixel data");
    expect(texture.image.width).toBe(64);
    expect(texture.image.height).toBe(64);
    expect(Array.from(texture.image.data.slice(0, 4))).toEqual([
      208, 216, 228, 255,
    ]);
    expect(Array.from(texture.image.data.slice(32 * 4, 33 * 4))).toEqual([
      194, 204, 215, 255,
    ]);

    texture.dispose();
  });

  it("aligns each checker cell to five non-default grid steps", () => {
    const texture = createTrackSurfaceTexture({
      baseColor: "#d0d8e4",
      checkerColor: "#c2ccd7",
      gridStep: 0.5,
      width: 60,
      height: 40,
    });

    expect(texture.repeat.x).toBe(12);
    expect(texture.repeat.y).toBe(8);

    texture.dispose();
  });

  it("keeps all surface rings clickable and disposes owned GPU resources", () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const textureDispose = vi.spyOn(THREE.Texture.prototype, "dispose");
    const onGroundClick = vi.fn();
    const view = render(
      React.createElement(TrackSurface3D, {
        field: { width: 60, height: 40, gridStep: 1 },
        onGroundClick,
        theme: SCENE_3D_THEME.dark,
      })
    );

    const surfaces = view.container.querySelectorAll("mesh");
    expect(surfaces).toHaveLength(3);
    surfaces.forEach((surface) => fireEvent.click(surface));
    expect(onGroundClick).toHaveBeenCalledTimes(3);

    view.unmount();
    expect(geometryDispose).toHaveBeenCalledTimes(2);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    geometryDispose.mockRestore();
    textureDispose.mockRestore();
  });

  it.each(["dark", "light"] as const)(
    "passes the configured %s minor and five-cell section hierarchy to the grid",
    (themeName) => {
      const theme = SCENE_3D_THEME[themeName];
      const field = { width: 75, height: 45, gridStep: 0.5 };

      const view = render(
        React.createElement(TrackSurface3D, { field, theme })
      );

      const props = gridRender.mock.calls.at(-1)?.[0] as
        Record<string, unknown> | undefined;
      expect(props).toEqual(
        expect.objectContaining({
          args: [field.width, field.height],
          cellColor: theme.gridCell,
          cellSize: field.gridStep,
          cellThickness: theme.gridCellThickness,
          infiniteGrid: false,
          sectionColor: theme.gridSection,
          sectionSize: field.gridStep * 5,
          sectionThickness: theme.gridSectionThickness,
        })
      );
      expect(theme.gridSectionThickness).toBeGreaterThan(
        theme.gridCellThickness
      );

      view.unmount();
    }
  );
});
