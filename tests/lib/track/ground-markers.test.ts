import { describe, expect, it } from "vitest";
import {
  deriveGroundMarkers,
  GROUND_MARKER_RADIUS,
  MAX_GROUND_MARKERS,
} from "@/lib/track/ground-markers";
import type { PolylinePoint, PolylineShape, Shape } from "@/lib/types";

function route(points: PolylinePoint[], closed = false): PolylineShape {
  return {
    kind: "polyline",
    id: "route",
    x: 0,
    y: 0,
    rotation: 0,
    points,
    closed,
  };
}

const field = { width: 60, height: 60 };

describe("ground marker preview", () => {
  it("uses ground meters, leaves open ends clear and skips rotated gate openings and equipment", () => {
    const path = route([
      { x: 2, y: 12, z: 1 },
      { x: 30, y: 12, z: 1 },
    ]);
    const equipment: Shape[] = [
      {
        kind: "gate",
        id: "gate",
        x: 10,
        y: 12,
        rotation: 90,
        width: 3,
        height: 2,
      },
      {
        kind: "barrier",
        variant: "net",
        id: "net",
        x: 18,
        y: 14,
        rotation: 90,
        width: 6,
        height: 2,
      },
      { kind: "cone", id: "cone", x: 26, y: 12, rotation: 0, radius: 0.3 },
    ];
    const unobstructed = deriveGroundMarkers(path, [], field);
    expect(unobstructed.markers.map(({ x }) => x)).toEqual(
      [6, 10, 14, 18, 22, 26].map((x) => expect.closeTo(x))
    );
    const placed = deriveGroundMarkers(path, equipment, field);
    expect(placed.markers.map(({ x }) => x)).toEqual(
      [6, 14, 22].map((x) => expect.closeTo(x))
    );
    expect(placed.omissions.clearance).toBe(3);
  });

  it("keeps dots away from the field edge", () => {
    const path = route([
      { x: 0, y: 0.1 },
      { x: 40, y: 0.1 },
    ]);
    const result = deriveGroundMarkers(path, [], field);
    expect(result.markers).toHaveLength(0);
    expect(result.omissions.clearance).toBeGreaterThan(0);
  });

  it("leaves a gap at a crossing but retains distinct legs", () => {
    const path = route([
      { x: 8, y: 8 },
      { x: 48, y: 48 },
      { x: 8, y: 48 },
      { x: 48, y: 8 },
    ]);
    const result = deriveGroundMarkers(path, [], field);
    expect(result.omissions.nearPass).toBeGreaterThan(0);
    expect(result.markers.length).toBeGreaterThan(15);
    expect(
      result.markers.every(({ x, y }) => Math.hypot(x - 28, y - 28) > 2.5)
    ).toBe(true);
  });

  it("omits repeated passages rather than doubling markers on the same ground", () => {
    const path = route([
      { x: 5, y: 12 },
      { x: 35, y: 12 },
      { x: 5, y: 12 },
      { x: 5, y: 45 },
    ]);
    const result = deriveGroundMarkers(path, [], field);
    expect(result.omissions.nearPass).toBeGreaterThan(5);
    expect(result.markers.some(({ y }) => y > 25)).toBe(true);
    expect(
      result.markers.every(({ x, y }) => Math.abs(y - 12) > 1 || x < 12)
    ).toBe(true);
  });

  it("does not imply a ground route below elevated or steep flight", () => {
    const path = route([
      { x: 4, y: 12 },
      { x: 19, y: 12 },
      { x: 20, y: 12, z: 7 },
      { x: 44, y: 12, z: 7 },
      { x: 45, y: 12 },
      { x: 59, y: 12 },
    ]);
    const result = deriveGroundMarkers(path, [], field);
    expect(result.omissions.elevation).toBeGreaterThan(2);
    expect(result.markers.some(({ x }) => x < 15)).toBe(true);
    expect(result.markers.every(({ x }) => x < 19 || x > 45)).toBe(true);
  });

  it("spaces all the way around a closed route without duplicating the seam", () => {
    const path = route(
      [
        { x: 18, y: 18 },
        { x: 42, y: 18 },
        { x: 42, y: 42 },
        { x: 18, y: 42 },
      ],
      true
    );
    const result = deriveGroundMarkers(path, [], field);
    expect(result.markers.length).toBeGreaterThan(15);
    expect(result.omissions.nearPass).toBe(0);
    const first = result.markers[0];
    const last = result.markers.at(-1)!;
    expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeGreaterThan(
      2 * GROUND_MARKER_RADIUS
    );
  });

  it("spreads a capped count across a long route and refuses an oversized source", () => {
    const path = route([
      { x: 5, y: 12 },
      { x: 1500, y: 12 },
    ]);
    const longField = { ...field, width: 1600 };
    const result = deriveGroundMarkers(path, [], longField);
    expect(result.markers).toHaveLength(MAX_GROUND_MARKERS);
    expect(result.markers.at(-1)?.x).toBeGreaterThan(1450);
    expect(
      deriveGroundMarkers(route(Array(513).fill(path.points[0])), [], longField)
    ).toMatchObject({
      limited: true,
      markers: [],
    });
  });
});
