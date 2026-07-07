import { describe, expect, it } from "vitest";
import {
  applyShapePatch,
  insertPolylinePoint,
  nudgeShapes,
  rotateShapes,
  setPolylinePoints,
  updatePolylinePoint,
} from "@/lib/editor/shape-mutations";
import type { GateShape, PolylineShape, TrackDesign } from "@/lib/types";

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

  it("rejects out-of-range polyline insert positions", () => {
    const polyline: PolylineShape = {
      id: "line-5",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
      ],
    };

    expect(insertPolylinePoint(polyline, -1, { x: 1, y: 1, z: 0 })).toBe(false);
    expect(insertPolylinePoint(polyline, 3, { x: 1, y: 1, z: 0 })).toBe(false);
    expect(polyline.points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 1 },
    ]);

    expect(insertPolylinePoint(polyline, 2, { x: 4, y: 0, z: 0 })).toBe(true);
    expect(polyline.points).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 1 },
      { x: 4, y: 0, z: 0 },
    ]);
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

  it("reports no-op transform mutations accurately", () => {
    const gate: GateShape = {
      id: "gate-3",
      kind: "gate",
      x: 3,
      y: 5,
      rotation: 45,
      width: 2,
      height: 2,
    };
    const shapeById: TrackDesign["shapeById"] = {
      [gate.id]: gate,
    };

    expect(rotateShapes(shapeById, [gate.id], 0)).toBe(false);
    expect(rotateShapes(shapeById, [gate.id], 360)).toBe(false);
    expect(nudgeShapes(shapeById, [gate.id], 0, 0)).toBe(false);
    expect(gate).toMatchObject({ x: 3, y: 5, rotation: 45 });

    expect(rotateShapes(shapeById, [gate.id], -90)).toBe(true);
    expect(nudgeShapes(shapeById, [gate.id], 1, -2)).toBe(true);
    expect(gate).toMatchObject({ x: 4, y: 3, rotation: 315 });
  });
});
