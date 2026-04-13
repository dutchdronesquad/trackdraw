import { describe, expect, it } from "vitest";
import { isPolylineShape, isShapeKind } from "@/lib/track/shape-utils";
import type { GateShape, PolylineShape } from "@/lib/types";

describe("track shape utils", () => {
  it("narrows shapes by kind", () => {
    const gate: GateShape = {
      id: "gate-1",
      kind: "gate",
      x: 0,
      y: 0,
      rotation: 0,
      width: 2,
      height: 2,
    };
    const polyline: PolylineShape = {
      id: "line-1",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      points: [],
    };

    expect(isShapeKind(gate, "gate")).toBe(true);
    expect(isShapeKind(gate, "flag")).toBe(false);
    expect(isPolylineShape(polyline)).toBe(true);
    expect(isPolylineShape(gate)).toBe(false);
  });
});
