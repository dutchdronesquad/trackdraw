// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportPng } from "@/lib/export/exportPng";
import { createDefaultDesign, normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
  barrier: 0,
};

function createDensePracticalDesign() {
  const routePoints = Array.from({ length: 80 }, (_, index) => ({
    x: 4 + index * 0.75,
    y: 20 + Math.sin(index / 6) * 7,
    z: index % 4 === 0 ? 1 : 0,
  }));

  return normalizeDesign({
    id: "png-dense-layout",
    version: 1,
    title: "Dense PNG layout",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 80, height: 60, origin: "tl", gridStep: 0.1, ppm: 15 },
    shapes: [
      {
        id: "long-route",
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        points: routePoints,
      },
      ...routePoints.slice(1).map((point, index) => ({
        id: `gate-${String(index + 1).padStart(3, "0")}`,
        kind: "gate" as const,
        x: point.x,
        y: point.y,
        rotation: index % 3 === 0 ? 15 : 0,
        width: 2,
        height: 2,
      })),
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

class MockImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("exportPng", () => {
  let createdAnchor: HTMLAnchorElement | null = null;

  beforeEach(() => {
    createdAnchor = null;
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trackdraw");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => {
        callback(new Blob(["png"], { type: "image/png" }));
      }
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        createdAnchor = element as HTMLAnchorElement;
      }
      return element;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a design to a PNG download", async () => {
    const design = createDefaultDesign();

    await exportPng(design, "track.png", "dark", 2);

    expect(createdAnchor?.download).toBe("track.png");
    expect(createdAnchor?.href).toBe("blob:trackdraw");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("renders a dense practical layout to a PNG download", async () => {
    await exportPng(
      createDensePracticalDesign(),
      "dense-track.png",
      "light",
      2
    );

    expect(createdAnchor?.download).toBe("dense-track.png");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
