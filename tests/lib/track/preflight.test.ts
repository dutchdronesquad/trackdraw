import { describe, expect, it } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { getTrackPreflightReport } from "@/lib/track/preflight";
import type { Shape, TrackDesign } from "@/lib/types";

function withShapes(shapes: Shape[]): TrackDesign {
  const design = createDefaultDesign();
  return {
    ...design,
    shapeOrder: shapes.map((shape) => shape.id),
    shapeById: Object.fromEntries(
      shapes.map((shape) => [shape.id, shape] as const)
    ),
  };
}

const gate = (id: string, x: number, meta?: Record<string, unknown>) =>
  ({
    id,
    kind: "gate",
    x,
    y: 5,
    rotation: 0,
    width: 2,
    height: 2,
    meta,
  }) satisfies Shape;

const route = (points: Array<{ x: number; y: number; z?: number }>) =>
  ({
    id: "route-1",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points,
  }) satisfies Shape;

describe("getTrackPreflightReport", () => {
  it("marks an empty design incomplete without activating checks", () => {
    const report = getTrackPreflightReport(createDefaultDesign());

    expect(report.status).toBe("incomplete");
    expect(report.issues).toEqual([]);
    expect(report.checks.every((check) => !check.active)).toBe(true);
  });

  it("marks a routed layout ready while ignoring flat elevation", () => {
    const report = getTrackPreflightReport(
      withShapes([
        gate("gate-1", 5),
        gate("gate-2", 15),
        route([
          { x: 0, y: 5 },
          { x: 20, y: 5 },
        ]),
      ])
    );

    expect(report.status).toBe("ready");
    expect(report.issues).toEqual([]);
  });

  it("reports off-route obstacles as actionable route issues", () => {
    const report = getTrackPreflightReport(
      withShapes([
        gate("gate-1", 5),
        { ...gate("gate-2", 15), y: 20 },
        route([
          { x: 0, y: 5 },
          { x: 20, y: 5 },
        ]),
      ])
    );

    expect(report.status).toBe("review");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        category: "route",
        shapeIds: ["gate-2"],
        type: "off-route",
      })
    );
  });

  it("reports a missing route when only a one-point polyline draft exists", () => {
    const report = getTrackPreflightReport(
      withShapes([gate("gate-1", 5), route([{ x: 5, y: 5 }])])
    );

    expect(report.status).toBe("review");
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        category: "route",
        type: "missing-route",
      })
    );
  });

  it("only activates timing checks after a timing marker is configured", () => {
    const withoutTiming = getTrackPreflightReport(
      withShapes([gate("gate-1", 5)])
    );
    const withTiming = getTrackPreflightReport(
      withShapes([gate("gate-1", 5, { timing: { role: "start_finish" } })])
    );

    expect(
      withoutTiming.checks.find((check) => check.category === "timing")?.active
    ).toBe(false);
    expect(
      withTiming.checks.find((check) => check.category === "timing")?.active
    ).toBe(true);
    expect(withTiming.issues.some((issue) => issue.category === "timing")).toBe(
      true
    );
  });

  it("only activates inventory checks for a configured profile", () => {
    const base = withShapes([gate("gate-1", 5), gate("gate-2", 15)]);
    const inactive = getTrackPreflightReport(base);
    const active = getTrackPreflightReport({
      ...base,
      inventory: { ...base.inventory, gate: 1 },
    });

    expect(
      inactive.checks.find((check) => check.category === "inventory")?.active
    ).toBe(false);
    expect(active.issues).toContainEqual(
      expect.objectContaining({
        inventoryKind: "gate",
        missing: 1,
        type: "inventory-shortage",
      })
    );
  });
});
