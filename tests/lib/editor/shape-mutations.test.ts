import { describe, expect, it } from "vitest";
import {
  applyShapePatch,
  setPolylinePoints,
  updatePolylinePoint,
} from "@/lib/editor/shape-mutations";
import type { GateShape, PolylineShape } from "@/lib/types";

describe("shape mutations", () => {
  it("returns false for unchanged non-polyline patches", () => {
    const shape: GateShape = {
      id: "gate-1",
      kind: "gate",
      x: 10,
      y: 4,
      rotation: 0,
      width: 2.2,
      height: 1.8,
    };

    expect(applyShapePatch(shape, { rotation: 0 })).toBe(false);
    expect(shape.rotation).toBe(0);
  });

  it("returns false when a polyline anchor patch resolves to the same position", () => {
    const polyline: PolylineShape = {
      id: "line-1",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ],
    };

    expect(applyShapePatch(polyline, { x: 1, y: 0 })).toBe(false);
    expect(polyline.points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 1 },
    ]);
  });

  it("does not rewrite polyline points when they are unchanged", () => {
    const polyline: PolylineShape = {
      id: "line-2",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ],
    };

    expect(
      setPolylinePoints(polyline, [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ])
    ).toBe(false);
    expect(updatePolylinePoint(polyline, 1, { z: 1 })).toBe(false);
  });

  it("moves polyline points when the anchor position changes", () => {
    const polyline: PolylineShape = {
      id: "line-3",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ],
    };

    expect(applyShapePatch(polyline, { x: 2, y: 1 })).toBe(true);
    expect(polyline.points).toEqual([
      { x: 1, y: 1, z: 0 },
      { x: 3, y: 1, z: 1 },
    ]);
  });

  it("updates a polyline point when one value changes", () => {
    const polyline: PolylineShape = {
      id: "line-4",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ],
    };

    expect(updatePolylinePoint(polyline, 1, { z: 2 })).toBe(true);
    expect(polyline.points[1]).toEqual({ x: 2, y: 0, z: 2 });
  });

  it("applies and reports real changes", () => {
    const shape: GateShape = {
      id: "gate-2",
      kind: "gate",
      x: 3,
      y: 5,
      rotation: 0,
      width: 2,
      height: 2,
    };

    expect(applyShapePatch(shape, { rotation: 15 })).toBe(true);
    expect(shape.rotation).toBe(15);
  });
});
