import { describe, expect, it } from "vitest";
import {
  getPolylineManeuverDetections,
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

  it("does not flag vertically separated maneuver points as close points", () => {
    const splitSLike: PolylineShape = {
      id: "split-s",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 4 },
        { x: 0, y: 0, z: 1 },
      ],
    };

    expect(getPolylineRouteWarnings(splitSLike)).not.toContainEqual({
      kind: "close-points",
      waypointIndex: 1,
    });
    expect(getPolylineRouteWarnings(splitSLike)).not.toContainEqual({
      kind: "steep",
      waypointIndex: 1,
    });
  });

  it("detects split-s and powerloop route sections", () => {
    const splitSLike: PolylineShape = {
      id: "split-s",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 4 },
        { x: 0.25, y: 0, z: 1 },
      ],
    };
    const powerloopLike: PolylineShape = {
      id: "powerloop",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 1.2, y: 0, z: 4 },
        { x: 0.2, y: 0, z: 1.1 },
      ],
    };

    expect(getPolylineManeuverDetections(splitSLike)).toEqual([
      {
        kind: "split-s",
        startWaypointIndex: 0,
        endWaypointIndex: 1,
      },
    ]);
    expect(getPolylineManeuverDetections(powerloopLike)).toEqual([
      {
        kind: "powerloop",
        startWaypointIndex: 0,
        apexWaypointIndex: 1,
        endWaypointIndex: 2,
      },
    ]);
    expect(getPolylineRouteWarnings(powerloopLike)).not.toContainEqual({
      kind: "steep",
      waypointIndex: 1,
    });
  });

  it("detects wider multi-waypoint powerloops", () => {
    const broadPowerloop: PolylineShape = {
      id: "broad-powerloop",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0.5 },
        { x: 2, y: 0, z: 2.4 },
        { x: 4, y: 0.2, z: 4.2 },
        { x: 5.4, y: 1.4, z: 3.4 },
        { x: 4.1, y: 2.2, z: 1.2 },
        { x: 2.4, y: 1.1, z: 0.8 },
      ],
    };

    expect(getPolylineManeuverDetections(broadPowerloop)).toContainEqual({
      kind: "powerloop",
      startWaypointIndex: 0,
      apexWaypointIndex: 2,
      endWaypointIndex: 4,
    });
  });

  it("returns mixed maneuver detections in waypoint order", () => {
    const path: PolylineShape = {
      id: "mixed-maneuvers",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 4 },
        { x: 0.2, y: 0, z: 1 },
        { x: 4, y: 0, z: 1 },
        { x: 5.2, y: 0, z: 4 },
        { x: 4.2, y: 0, z: 1.1 },
      ],
    };

    expect(getPolylineManeuverDetections(path)).toEqual([
      {
        kind: "split-s",
        startWaypointIndex: 0,
        endWaypointIndex: 1,
      },
      {
        kind: "powerloop",
        startWaypointIndex: 1,
        apexWaypointIndex: 3,
        endWaypointIndex: 4,
      },
    ]);
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
    expect(getRouteWarningSegmentColor("rhythm-break", "#123456")).toBe(
      "#f59e0b"
    );
    expect(getRouteWarningSegmentColor("hairpin", "#123456")).toBe("#fbbf24");
  });
});
