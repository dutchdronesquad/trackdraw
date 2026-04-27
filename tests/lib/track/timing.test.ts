import { describe, expect, it } from "vitest";
import {
  getDesignTimingMarkers,
  getTimingMarkerMeta,
  normalizeTimingMarker,
} from "@/lib/track/timing";
import { normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

describe("track timing markers", () => {
  it("normalizes supported timing marker metadata", () => {
    expect(
      normalizeTimingMarker({
        role: "split",
        timingId: " split-a ",
      })
    ).toEqual({
      role: "split",
      timingId: "split-a",
    });

    expect(normalizeTimingMarker({ role: "unknown" })).toBeNull();
    expect(normalizeTimingMarker(null)).toBeNull();
  });

  it("updates meta without dropping unrelated metadata", () => {
    expect(
      getTimingMarkerMeta({ groupId: "group-1" }, { role: "start_finish" })
    ).toEqual({
      groupId: "group-1",
      timing: { role: "start_finish" },
    });

    expect(
      getTimingMarkerMeta(
        { groupId: "group-1", timing: { role: "split" } },
        null
      )
    ).toEqual({
      groupId: "group-1",
    });
  });

  it("collects timing markers in design order with split fallback labels", () => {
    const design = normalizeDesign({
      id: "design-timing",
      version: 1,
      title: "Timing test",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "gate-1",
          kind: "gate",
          x: 10,
          y: 8,
          rotation: 0,
          width: 2,
          height: 2,
          meta: { timing: { role: "start_finish", timingId: "main" } },
        },
        {
          id: "gate-2",
          kind: "gate",
          x: 20,
          y: 8,
          rotation: 0,
          width: 2,
          height: 2,
          meta: { timing: { role: "split" } },
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(
      getDesignTimingMarkers(design).map((marker) => marker.title)
    ).toEqual(["Start / finish", "Split 1"]);
  });
});
