import { describe, expect, it } from "vitest";
import {
  getObstacleNumberMap,
  getObstacleNumberingReport,
} from "@/lib/track/obstacleNumbering";
import { normalizeDesign } from "@/lib/track/design";
import type { Shape, TrackDesign } from "@/lib/types";

const inventory = {
  gate: 4,
  flag: 2,
  cone: 2,
  startfinish: 1,
  ladder: 2,
  divegate: 2,
};

function makeDesign(shapes: Shape[]): TrackDesign {
  return normalizeDesign({
    id: "numbering-test",
    version: 1,
    title: "Numbering test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes,
    createdAt: "2026-04-26T10:00:00.000Z",
    updatedAt: "2026-04-26T10:00:00.000Z",
  });
}

function gate(id: string, x: number, y: number): Shape {
  return {
    id,
    kind: "gate",
    x,
    y,
    rotation: 0,
    width: 2,
    height: 2,
  };
}

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

describe("obstacle numbering", () => {
  it("numbers route obstacles by progress along the primary race line", () => {
    const design = makeDesign([
      raceLine,
      gate("gate-late", 20, 5),
      gate("gate-early", 5, 5),
    ]);

    expect(Object.fromEntries(getObstacleNumberMap(design))).toEqual({
      "gate-early": 1,
      "gate-late": 2,
    });
    expect(getObstacleNumberingReport(design)).toMatchObject({
      issueCount: 0,
      mappedObstacleCount: 2,
      primaryPolylineId: "line-1",
      status: "ready",
      totalNumberedObstacleCount: 2,
      unmappedObstacleCount: 0,
    });
  });

  it("reports missing route when numberable obstacles have no race line", () => {
    const report = getObstacleNumberingReport(
      makeDesign([gate("gate-1", 5, 5)])
    );

    expect(report.status).toBe("missing-route");
    expect(report.issueCount).toBe(1);
    expect(report.mappedObstacleCount).toBe(0);
    expect(report.obstacleNumberMap.size).toBe(0);
    expect(report.primaryPolylineId).toBeNull();
  });

  it("reports partial numbering when some route obstacles are off route", () => {
    const report = getObstacleNumberingReport(
      makeDesign([raceLine, gate("gate-on", 5, 5), gate("gate-off", 20, 15)])
    );

    expect(report.status).toBe("partial");
    expect(report.mappedObstacleCount).toBe(1);
    expect(report.unmappedObstacleCount).toBe(1);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      shapeId: "gate-off",
      type: "off-route",
    });
    expect(report.obstacleNumberMap.get("gate-on")).toBe(1);
  });

  it("reports no route matches when every numberable obstacle is off route", () => {
    const report = getObstacleNumberingReport(
      makeDesign([raceLine, gate("gate-off", 20, 15)])
    );

    expect(report.status).toBe("no-route-matches");
    expect(report.issueCount).toBe(1);
    expect(report.mappedObstacleCount).toBe(0);
  });

  it("keeps non-numbered layouts idle", () => {
    const flagOnly: Shape = {
      id: "flag-1",
      kind: "flag",
      x: 5,
      y: 5,
      rotation: 0,
      radius: 0.25,
    };

    expect(getObstacleNumberingReport(makeDesign([])).status).toBe("empty");
    expect(
      getObstacleNumberingReport(makeDesign([raceLine, flagOnly]))
    ).toMatchObject({
      issueCount: 0,
      mappedObstacleCount: 0,
      status: "no-numbered-obstacles",
      totalNumberedObstacleCount: 0,
    });
  });
});
