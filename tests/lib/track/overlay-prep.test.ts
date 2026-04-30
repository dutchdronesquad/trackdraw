import { describe, expect, it } from "vitest";
import { getOverlayPrepReport } from "@/lib/track/overlay-prep";
import { normalizeDesign } from "@/lib/track/design";
import type { Shape, TrackDesign } from "@/lib/types";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

const raceLine: Shape = {
  id: "line-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 5, z: 1 },
    { x: 30, y: 5, z: 1 },
  ],
};

function makeDesign(shapes: Shape[]): TrackDesign {
  return normalizeDesign({
    id: "overlay-prep-test",
    version: 1,
    title: "Overlay prep test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes,
    createdAt: "2026-04-28T10:00:00.000Z",
    updatedAt: "2026-04-28T10:00:00.000Z",
  });
}

function gate(
  id: string,
  x: number,
  y: number,
  timing?: NonNullable<Shape["meta"]>["timing"]
): Shape {
  return {
    id,
    kind: "gate",
    x,
    y,
    rotation: 0,
    width: 2,
    height: 2,
    meta: timing ? { timing } : undefined,
  };
}

describe("overlay prep report", () => {
  it("maps timing points onto the single race route by route progress", () => {
    const report = getOverlayPrepReport(
      makeDesign([
        raceLine,
        gate("split-1", 20, 5, { role: "split", timingId: "split-a" }),
        gate("start-1", 5, 5, { role: "start_finish" }),
      ])
    );

    expect(report.status).toBe("ready");
    expect(report.raceRouteId).toBe("line-1");
    expect(report.routeLength).toBeCloseTo(30);
    expect(report.timingPoints.map((point) => point.shapeId)).toEqual([
      "start-1",
      "split-1",
    ]);
    expect(report.timingPoints[0]?.routeDistance).toBeCloseTo(5);
    expect(report.timingPoints[1]?.routeProgress).toBeCloseTo(20 / 30);
  });

  it("blocks overlay prep without exactly one route", () => {
    expect(
      getOverlayPrepReport(
        makeDesign([gate("start-1", 5, 5, { role: "start_finish" })])
      ).issues.map((issue) => issue.type)
    ).toContain("missing-route");

    expect(
      getOverlayPrepReport(
        makeDesign([
          raceLine,
          {
            ...raceLine,
            id: "line-2",
            points: [
              { x: 0, y: 10 },
              { x: 30, y: 10 },
            ],
          },
          gate("start-1", 5, 5, { role: "start_finish" }),
        ])
      ).issues.map((issue) => issue.type)
    ).toContain("multiple-routes");
  });

  it("blocks missing or conflicting timing setup", () => {
    const report = getOverlayPrepReport(
      makeDesign([
        raceLine,
        gate("start-1", 5, 5, { role: "start_finish", timingId: "main" }),
        gate("start-2", 6, 5, { role: "start_finish" }),
        gate("split-1", 10, 5, { role: "split" }),
        gate("split-2", 15, 5, { role: "split", timingId: "main" }),
      ])
    );

    expect(report.status).toBe("blocked");
    expect(report.issues.map((issue) => issue.type)).toEqual(
      expect.arrayContaining([
        "duplicate-start-finish",
        "duplicate-timing-id",
        "missing-split-id",
      ])
    );
  });

  it("keeps route metrics available when timing setup is incomplete", () => {
    const report = getOverlayPrepReport(makeDesign([raceLine]));

    expect(report.status).toBe("blocked");
    expect(report.raceRouteId).toBe("line-1");
    expect(report.routeLength).toBeCloseTo(30);
    expect(report.issues.map((issue) => issue.type)).toContain(
      "missing-start-finish"
    );
  });

  it("blocks timing points too far from the race route", () => {
    const report = getOverlayPrepReport(
      makeDesign([
        raceLine,
        gate("start-1", 5, 5, { role: "start_finish" }),
        gate("split-off", 20, 15, { role: "split", timingId: "split-a" }),
      ])
    );

    expect(report.status).toBe("blocked");
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          shapeId: "split-off",
          type: "timing-point-off-route",
        }),
      ])
    );
  });
});
