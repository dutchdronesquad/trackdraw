import { describe, expect, it } from "vitest";
import { zRangeForDesign, zToColor } from "@/lib/track/alt";
import { normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 0,
  flag: 0,
  cone: 0,
  startfinish: 0,
  ladder: 0,
  divegate: 0,
};

describe("track altitude helpers", () => {
  it("maps z values to blue-red hsl colors with clamping", () => {
    expect(zToColor(0, 0, 10)).toBe("hsl(240, 80%, 45%)");
    expect(zToColor(10, 0, 10)).toBe("hsl(0, 80%, 45%)");
    expect(zToColor(20, 0, 10)).toBe("hsl(0, 80%, 45%)");
    expect(zToColor(5, 5, 5)).toBe("hsl(240, 80%, 45%)");
  });

  it("returns the polyline z range for a design", () => {
    const design = normalizeDesign({
      id: "design-alt",
      version: 1,
      title: "Altitude",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "line-1",
          kind: "polyline",
          x: 0,
          y: 0,
          rotation: 0,
          points: [
            { x: 1, y: 1, z: -1 },
            { x: 2, y: 2, z: 3 },
            { x: 3, y: 4, z: 1 },
          ],
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(zRangeForDesign(design)).toEqual([-1, 3]);
  });
});
