import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT_PRESET_ID,
  getLayoutPresetBounds,
  getLayoutPresetById,
  getLayoutPresetKindCounts,
  getLayoutPresetShapeCount,
  placeLayoutPreset,
} from "@/lib/planning/layout-presets";

describe("planning layout preset helpers", () => {
  it("returns presets by id and exposes the default preset id", () => {
    expect(getLayoutPresetById(DEFAULT_LAYOUT_PRESET_ID)?.id).toBe(
      DEFAULT_LAYOUT_PRESET_ID
    );
    expect(getLayoutPresetById("missing")).toBeNull();
  });

  it("reports shape count and kind counts for a preset", () => {
    const preset = getLayoutPresetById("start-finish-setup");
    if (!preset) {
      throw new Error("Expected preset");
    }

    expect(getLayoutPresetShapeCount(preset)).toBe(4);
    expect(getLayoutPresetKindCounts(preset).get("startfinish")).toBe(1);
    expect(getLayoutPresetKindCounts(preset).get("gate")).toBe(1);
    expect(getLayoutPresetKindCounts(preset).get("flag")).toBe(2);
  });

  it("calculates layout bounds", () => {
    const preset = getLayoutPresetById("slalom-run");
    if (!preset) {
      throw new Error("Expected preset");
    }

    expect(getLayoutPresetBounds(preset)).toEqual({
      minX: -2.6,
      minY: 0,
      maxX: 2.6,
      maxY: 18,
      width: 5.2,
      height: 18,
    });
  });

  it("places a layout preset at an anchor with rotation and preset metadata", () => {
    const preset = getLayoutPresetById("straight-gate-run");
    if (!preset) {
      throw new Error("Expected preset");
    }

    const placed = placeLayoutPreset(preset, { x: 20, y: 10 }, 90);

    expect(placed).toHaveLength(4);
    expect(placed[0]).toMatchObject({
      kind: "gate",
      x: 20,
      y: 10,
      rotation: 90,
      meta: { presetId: "straight-gate-run" },
    });
    expect(placed[1]).toMatchObject({
      kind: "gate",
      x: 15,
      y: 10,
      rotation: 90,
      meta: { presetId: "straight-gate-run" },
    });
  });
});
