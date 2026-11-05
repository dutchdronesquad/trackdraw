// @vitest-environment happy-dom
import React, { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Barrier3D } from "@/components/canvas/preview3d/items/Barrier3D";
import type { BarrierShape } from "@/lib/types";

const wireRender = vi.hoisted(() => vi.fn());
vi.mock("@react-three/drei", () => ({ useTexture: vi.fn() }));
// The real net component supplies its dimensions and material to the GPU host.
// Geometry and raycasting are covered separately with actual Three.js objects.
vi.mock("@/components/canvas/preview3d/items/net-barrier-wires", () => ({
  NetBarrierWires: (props: {
    width: number;
    height: number;
    children: React.ReactNode;
  }) => {
    wireRender(props);
    return React.createElement("instancedMesh", null, props.children);
  },
}));
afterEach(() => {
  wireRender.mockClear();
  vi.restoreAllMocks();
});
const net: BarrierShape = {
  id: "net",
  kind: "barrier",
  variant: "net",
  x: 4,
  y: 8,
  rotation: 35,
  width: 9.25,
  height: 3.5,
  color: "#385ca8",
};

describe("net barrier rendering budget", () => {
  it.each([false, true])(
    "keeps a dense net to four mesh submissions, selected=%s",
    (selected) => {
      // React DOM is only a host-tree recorder here, not a WebGL implementation.
      vi.spyOn(console, "error").mockImplementation(() => {});
      const html = renderToStaticMarkup(
        <Barrier3D shape={net} selected={selected} />
      );
      const meshes = html.match(/<(?:mesh|instancedMesh)(?:\s|>)/gi) || [];
      expect(meshes).toHaveLength(4);
      expect(wireRender).toHaveBeenCalledTimes(1);
      const props = wireRender.mock.calls[0][0];
      expect(props.width).toBe(net.width);
      expect(props.height).toBe(net.height);
      const material = (props.children as ReactElement<Record<string, unknown>>)
        .props;
      expect(material.roughness).toBe(0.3);
      expect(material.metalness).toBe(0.7);
      expect(material.emissiveIntensity).toBe(selected ? 0.22 : 0);
    }
  );
});
