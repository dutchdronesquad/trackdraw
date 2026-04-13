import { describe, expect, it } from "vitest";
import {
  createEmptyInventoryProfile,
  getInventoryComparison,
  getRequiredInventoryCounts,
  normalizeInventoryProfile,
} from "@/lib/planning/inventory";
import { normalizeDesign } from "@/lib/track/design";

describe("planning inventory helpers", () => {
  it("creates and normalizes inventory profiles", () => {
    expect(createEmptyInventoryProfile()).toEqual({
      gate: 0,
      ladder: 0,
      divegate: 0,
      startfinish: 0,
      flag: 0,
      cone: 0,
    });

    expect(
      normalizeInventoryProfile({
        gate: 2.9,
        ladder: -1,
        cone: Number.NaN,
        flag: 4,
      })
    ).toEqual({
      gate: 2,
      ladder: 0,
      divegate: 0,
      startfinish: 0,
      flag: 4,
      cone: 0,
    });
  });

  it("counts required inventory from shapes and designs", () => {
    const shapes = [
      {
        id: "gate-1",
        kind: "gate" as const,
        x: 0,
        y: 0,
        rotation: 0,
        width: 2,
        height: 2,
      },
      {
        id: "flag-1",
        kind: "flag" as const,
        x: 0,
        y: 0,
        rotation: 0,
        radius: 0.25,
      },
    ];

    expect(getRequiredInventoryCounts(shapes)).toMatchObject({
      gate: 1,
      flag: 1,
      cone: 0,
    });

    const design = normalizeDesign({
      id: "design-1",
      version: 1,
      title: "Inventory",
      description: "",
      tags: [],
      authorName: "",
      inventory: {
        gate: 1,
        ladder: 0,
        divegate: 0,
        startfinish: 0,
        flag: 0,
        cone: 0,
      },
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes,
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(getRequiredInventoryCounts(design)).toMatchObject({
      gate: 1,
      flag: 1,
    });
  });

  it("compares available and required inventory", () => {
    const design = normalizeDesign({
      id: "design-2",
      version: 1,
      title: "Inventory",
      description: "",
      tags: [],
      authorName: "",
      inventory: {
        gate: 1,
        ladder: 0,
        divegate: 0,
        startfinish: 0,
        flag: 2,
        cone: 0,
      },
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "gate-1",
          kind: "gate",
          x: 0,
          y: 0,
          rotation: 0,
          width: 2,
          height: 2,
        },
        {
          id: "gate-2",
          kind: "gate",
          x: 1,
          y: 0,
          rotation: 0,
          width: 2,
          height: 2,
        },
        {
          id: "flag-1",
          kind: "flag",
          x: 0,
          y: 1,
          rotation: 0,
          radius: 0.25,
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const comparison = getInventoryComparison(design);
    const gate = comparison.find((item) => item.kind === "gate");
    const flag = comparison.find((item) => item.kind === "flag");

    expect(gate).toMatchObject({
      required: 2,
      available: 1,
      missing: 1,
      buildable: false,
    });
    expect(flag).toMatchObject({
      required: 1,
      available: 2,
      missing: 0,
      buildable: true,
    });
  });
});
