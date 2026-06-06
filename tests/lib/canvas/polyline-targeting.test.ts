import { describe, expect, it } from "vitest";
import {
  findPolylineTarget,
  resolveClosestPointOnPolyline,
} from "@/lib/canvas/polyline-targeting";
import { getPolylineSmoothSegmentPointsPx } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape } from "@/lib/types";

const designPpm = 10;

function route(
  id: string,
  points: PolylineShape["points"],
  options: Partial<PolylineShape> = {}
): PolylineShape {
  return {
    id,
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points,
    ...options,
  };
}

describe("polyline targeting", () => {
  it("projects a pointer to the closest point on a polyline", () => {
    const result = resolveClosestPointOnPolyline([0, 0, 100, 0], {
      x: 40,
      y: 12,
    });

    expect(result.pointPx).toEqual({ x: 40, y: 0 });
    expect(result.distanceSq).toBe(144);
  });

  it("returns the nearest route segment within the hit radius", () => {
    const first = route("first", [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    const second = route("second", [
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 5, z: 0 },
    ]);

    const hit = findPolylineTarget({
      designPpm,
      maxDistancePx: 8,
      pointer: { x: 42, y: 52 },
      shapes: [first, second],
    });

    expect(hit?.shape.id).toBe("second");
    expect(hit?.segmentIndex).toBe(0);
    expect(hit?.pointPx.x).toBeCloseTo(42, 4);
    expect(hit?.pointPx.y).toBeCloseTo(50, 4);
  });

  it("returns null outside the hit radius", () => {
    const hit = findPolylineTarget({
      designPpm,
      maxDistancePx: 5,
      pointer: { x: 50, y: 20 },
      shapes: [
        route("path", [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
        ]),
      ],
    });

    expect(hit).toBeNull();
  });

  it("ignores locked paths, non-path shapes, and stub paths", () => {
    const shapes: Shape[] = [
      {
        id: "gate",
        kind: "gate",
        x: 5,
        y: 0,
        rotation: 0,
        width: 2,
        height: 1.5,
      },
      route(
        "locked",
        [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
        ],
        { locked: true }
      ),
      route("stub", [{ x: 5, y: 0, z: 0 }]),
      route("target", [
        { x: 0, y: 2, z: 0 },
        { x: 10, y: 2, z: 0 },
      ]),
    ];

    const hit = findPolylineTarget({
      designPpm,
      maxDistancePx: 8,
      pointer: { x: 50, y: 20 },
      shapes,
    });

    expect(hit?.shape.id).toBe("target");
  });

  it("targets the closing segment of a closed path", () => {
    const closed = route(
      "closed",
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 },
        { x: 0, y: 10, z: 0 },
      ],
      { closed: true }
    );
    const closingSegment = getPolylineSmoothSegmentPointsPx(
      closed,
      designPpm
    )[3];
    const pointOffset = Math.floor(closingSegment.length / 4) * 2;

    const hit = findPolylineTarget({
      designPpm,
      maxDistancePx: 6,
      pointer: {
        x: closingSegment[pointOffset] + 1,
        y: closingSegment[pointOffset + 1],
      },
      shapes: [closed],
    });

    expect(hit?.shape.id).toBe("closed");
    expect(hit?.segmentIndex).toBe(3);
    expect(hit?.distanceSq).toBeLessThanOrEqual(36);
  });
});
