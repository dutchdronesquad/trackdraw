import { describe, expect, it } from "vitest";
import {
  distance2D,
  elevationSamples,
  getAdaptiveCurveSegments,
  getPolyline2DPoints,
  getPolylineArrowMarkers,
  getPolylineSegment2DPoints,
  polylineLength,
  smoothPolyline3D,
  totalLength2D,
} from "@/lib/track/geometry";
import type { PolylineShape } from "@/lib/types";

describe("track geometry helpers", () => {
  const path: PolylineShape = {
    id: "path-1",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 4, z: 1 },
      { x: 6, y: 4, z: 2 },
    ],
  };

  it("calculates distances and path lengths", () => {
    expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(polylineLength(path.points)).toBe(8);
    expect(totalLength2D(path)).toBe(8);
  });

  it("builds cumulative elevation samples", () => {
    expect(elevationSamples(path)).toEqual([
      { d: 0, z: 0 },
      { d: 5, z: 1 },
      { d: 8, z: 2 },
    ]);
  });

  it("returns unsmoothed 2d and segmented points when requested", () => {
    expect(getPolyline2DPoints(path.points, { smooth: false })).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 6, y: 4 },
    ]);
    expect(
      getPolylineSegment2DPoints(path.points, { smooth: false, closed: true })
    ).toEqual([
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      [
        { x: 3, y: 4 },
        { x: 6, y: 4 },
      ],
      [
        { x: 6, y: 4 },
        { x: 0, y: 0 },
      ],
    ]);
  });

  it("produces smoothed 3d points with explicit z values", () => {
    const smoothed = smoothPolyline3D(path.points, 4);

    expect(smoothed.length).toBeGreaterThan(path.points.length);
    expect(smoothed[0]).toEqual({ x: 0, y: 0, z: 0 });
    expect(smoothed.at(-1)).toEqual({ x: 6, y: 4, z: 2 });
  });

  it("creates arrow markers along a path", () => {
    const markers = getPolylineArrowMarkers(path.points, 3, { closed: false });

    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      angle: expect.any(Number),
    });
  });

  it("returns adaptive curve segments within configured bounds", () => {
    expect(getAdaptiveCurveSegments(path.points)).toBeGreaterThanOrEqual(32);
    expect(getAdaptiveCurveSegments([{ x: 0, y: 0, z: 0 }])).toBe(0);
  });
});
