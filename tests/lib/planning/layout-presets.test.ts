import { describe, expect, it } from "vitest";
import {
  findPresetById,
  getLayoutPresetBounds,
  getLayoutPresetKindCounts,
  getLayoutPresetShapeCount,
  placeLayoutPreset,
  type LayoutPreset,
  type LayoutPresetShapeDraft,
} from "@/lib/planning/layout-presets";
import {
  createCatalogShapeDraft,
  TRACKDRAW_FLAG_ELEMENT_ID,
  TRACKDRAW_GATE_ELEMENT_ID,
  TRACKDRAW_START_FINISH_ELEMENT_ID,
} from "@/lib/track/elements/catalog";

function gate(x: number, y: number): LayoutPresetShapeDraft {
  return createCatalogShapeDraft(TRACKDRAW_GATE_ELEMENT_ID, { x, y });
}

function flag(x: number, y: number, rotation = 0): LayoutPresetShapeDraft {
  return createCatalogShapeDraft(TRACKDRAW_FLAG_ELEMENT_ID, { x, y, rotation });
}

function startFinish(x: number, y: number): LayoutPresetShapeDraft {
  return createCatalogShapeDraft(TRACKDRAW_START_FINISH_ELEMENT_ID, { x, y });
}

const straightPreset: LayoutPreset = {
  id: "straight",
  name: "Straight",
  description: "",
  shapes: [gate(0, 0), gate(0, 5), gate(0, 10), gate(0, 15)],
};

const slalomPreset: LayoutPreset = {
  id: "slalom",
  name: "Slalom",
  description: "",
  shapes: [
    flag(0, 0),
    flag(2.6, 4.5, 180),
    flag(-2.6, 9, 0),
    flag(2.6, 13.5, 180),
    flag(-2.6, 18, 0),
  ],
};

const startFinishPreset: LayoutPreset = {
  id: "start-finish",
  name: "Start Finish",
  description: "",
  shapes: [startFinish(0, 0), gate(0, 5), flag(-2.8, 0, 180), flag(2.8, 0)],
};

describe("planning layout preset helpers", () => {
  it("finds a user preset by id and returns null for unknown ids", () => {
    const presets = [straightPreset, slalomPreset];
    expect(findPresetById("straight", presets)?.id).toBe("straight");
    expect(findPresetById("slalom", presets)?.id).toBe("slalom");
    expect(findPresetById("missing", presets)).toBeNull();
    expect(findPresetById(null, presets)).toBeNull();
  });

  it("reports shape count and kind counts for a preset", () => {
    expect(getLayoutPresetShapeCount(startFinishPreset)).toBe(4);
    expect(
      getLayoutPresetKindCounts(startFinishPreset).get("startfinish")
    ).toBe(1);
    expect(getLayoutPresetKindCounts(startFinishPreset).get("gate")).toBe(1);
    expect(getLayoutPresetKindCounts(startFinishPreset).get("flag")).toBe(2);
  });

  it("calculates layout bounds", () => {
    expect(getLayoutPresetBounds(slalomPreset)).toEqual({
      minX: -2.6,
      minY: 0,
      maxX: 2.6,
      maxY: 18,
      width: 5.2,
      height: 18,
    });
  });

  it("places a layout preset at an anchor with rotation and preset metadata", () => {
    const placed = placeLayoutPreset(straightPreset, { x: 20, y: 10 }, 90);

    expect(placed).toHaveLength(4);
    expect(placed[0]).toMatchObject({
      kind: "gate",
      x: 20,
      y: 10,
      rotation: 90,
      meta: { presetId: "straight" },
    });
    expect(placed[1]).toMatchObject({
      kind: "gate",
      x: 15,
      y: 10,
      rotation: 90,
      meta: { presetId: "straight" },
    });
  });
});
