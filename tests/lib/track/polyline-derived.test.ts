import { describe, expect, it } from "vitest";
import {
  getPolylineRouteWarningSegmentVisuals,
  getPolylineRouteWarningVisuals,
  getPolylineRouteWarnings,
  getRouteWarningSegmentColor,
} from "@/lib/track/polyline-derived";
import type { PolylineShape } from "@/lib/types";

describe("polyline derived helpers", () => {
  it("flags stub and flat paths", () => {
    const stub: PolylineShape = {
      id: "stub",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [{ x: 0, y: 0, z: 0 }],
    };
    const flat: PolylineShape = {
      id: "flat",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ],
    };

    expect(getPolylineRouteWarnings(stub)).toEqual([{ kind: "stub" }]);
    expect(getPolylineRouteWarnings(flat)).toEqual([{ kind: "flat" }]);
  });

  it("detects close-points, steep, hairpin, and spacing-shift", () => {
    const closePoints: PolylineShape = {
      id: "close",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 0.2, y: 0, z: 0 },
      ],
    };
    const steep: PolylineShape = {
      id: "steep",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 1 },
      ],
    };
    const hairpin: PolylineShape = {
      id: "hairpin",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
        { x: 0.5, y: 0.2, z: 2 },
      ],
    };
    const spacingShift: PolylineShape = {
      id: "spacing",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 1.5, y: 0, z: 1.2 },
        { x: 6, y: 0, z: 1.4 },
      ],
    };

    expect(getPolylineRouteWarnings(closePoints)).toContainEqual({
      kind: "close-points",
      waypointIndex: 1,
    });
    expect(getPolylineRouteWarnings(steep)).toContainEqual({
      kind: "steep",
      waypointIndex: 1,
    });
    expect(getPolylineRouteWarnings(hairpin)).toContainEqual({
      kind: "hairpin",
      waypointIndex: 1,
    });
    expect(getPolylineRouteWarnings(spacingShift)).toContainEqual({
      kind: "spacing-shift",
      waypointIndex: 1,
    });
  });

  it("builds warning visuals and segment colors", () => {
    const path: PolylineShape = {
      id: "visuals",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 2 },
        { x: 2, y: 0, z: 3 },
      ],
    };

    expect(getPolylineRouteWarningVisuals(path)).toEqual([
      {
        kind: "steep",
        waypointIndex: 1,
        point: { x: 1, y: 0, z: 2 },
        previousPoint: { x: 0, y: 0, z: 1 },
      },
      {
        kind: "steep",
        waypointIndex: 2,
        point: { x: 2, y: 0, z: 3 },
        previousPoint: { x: 1, y: 0, z: 2 },
      },
    ]);

    expect(getPolylineRouteWarningSegmentVisuals(path)).toEqual([
      {
        kind: "steep",
        segmentIndex: 0,
        startPoint: { x: 0, y: 0, z: 1 },
        endPoint: { x: 1, y: 0, z: 2 },
      },
      {
        kind: "steep",
        segmentIndex: 1,
        startPoint: { x: 1, y: 0, z: 2 },
        endPoint: { x: 2, y: 0, z: 3 },
      },
    ]);

    expect(getRouteWarningSegmentColor(undefined, "#123456")).toBe("#123456");
    expect(getRouteWarningSegmentColor("close-points", "#123456")).toBe(
      "#ef4444"
    );
    expect(getRouteWarningSegmentColor("alignment-drift", "#123456")).toBe(
      "#84cc16"
    );
    expect(getRouteWarningSegmentColor("hairpin", "#123456")).toBe("#fbbf24");
  });
});
