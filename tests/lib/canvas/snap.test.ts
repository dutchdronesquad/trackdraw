import { describe, expect, it } from "vitest";
import {
  findNearestSnapPoint,
  findNearestSnapTarget,
  resolveSnapPosition,
} from "@/lib/canvas/snap";
import type { Shape } from "@/lib/types";

const candidates: Shape[] = [
  {
    id: "gate-1",
    kind: "gate",
    x: 10,
    y: 10,
    rotation: 0,
    width: 2,
    height: 2,
  },
  {
    id: "flag-1",
    kind: "flag",
    x: 14,
    y: 9,
    rotation: 0,
    radius: 0.25,
  },
];

describe("canvas snap helpers", () => {
  it("finds the nearest snap point and target inside the radius", () => {
    expect(
      findNearestSnapPoint({
        candidates,
        pos: { x: 10.8, y: 10.4 },
        snapRadiusMeters: 2,
      })
    ).toEqual({ x: 10, y: 10 });

    expect(
      findNearestSnapTarget({
        candidates,
        excludeIds: ["gate-1"],
        pos: { x: 13.6, y: 8.8 },
        snapRadiusMeters: 2,
      })
    ).toEqual({ id: "flag-1", x: 14, y: 9 });
  });

  it("returns null when no shape is within snap range", () => {
    expect(
      findNearestSnapPoint({
        candidates,
        pos: { x: 30, y: 30 },
        snapRadiusMeters: 1,
      })
    ).toBeNull();
  });

  it("prefers shape snapping before grid snapping", () => {
    expect(
      resolveSnapPosition({
        pos: { x: 10.7, y: 10.1 },
        snapToGrid: true,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 1,
        candidates,
      })
    ).toEqual({ x: 10, y: 10 });
  });

  it("falls back to grid snapping or raw positions as configured", () => {
    expect(
      resolveSnapPosition({
        pos: { x: 3.2, y: 4.8 },
        snapToGrid: true,
        snapToShapes: false,
        gridStep: 1,
        magneticRadiusMeters: 0.3,
        candidates: [],
      })
    ).toEqual({ x: 3, y: 5 });

    expect(
      resolveSnapPosition({
        pos: { x: 3.6, y: 4.8 },
        snapToGrid: false,
        snapToShapes: false,
        gridStep: 1,
        magneticRadiusMeters: 0.3,
        candidates: [],
      })
    ).toEqual({ x: 3.6, y: 4.8 });
  });
});
