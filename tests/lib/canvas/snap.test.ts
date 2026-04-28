import { describe, expect, it } from "vitest";
import {
  findNearestSnapPoint,
  findNearestSnapTarget,
  findNearestSnapTargetWithRoutes,
  resolveSnapPosition,
} from "@/lib/canvas/snap";
import { getPolyline2DDerived } from "@/lib/track/polyline-derived";
import type { PolylineShape, Shape } from "@/lib/types";

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

const route: PolylineShape = {
  id: "route-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 6, z: 1 },
    { x: 20, y: 6, z: 1 },
  ],
};

const curvedRoute: PolylineShape = {
  id: "curved-route-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 0, z: 1 },
    { x: 10, y: 8, z: 1 },
    { x: 20, y: 0, z: 1 },
  ],
};

function projectPointOntoSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-9) {
    return {
      distance: Math.hypot(point.x - start.x, point.y - start.y),
      point: { x: start.x, y: start.y },
    };
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
    )
  );
  const projectedPoint = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
  return {
    distance: Math.hypot(
      point.x - projectedPoint.x,
      point.y - projectedPoint.y
    ),
    point: projectedPoint,
  };
}

function getExpectedSmoothRouteSnap(
  routeShape: PolylineShape,
  point: { x: number; y: number }
) {
  const routePoints = getPolyline2DDerived(routeShape).smoothPoints;
  let nearest = point;
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < routePoints.length; index += 1) {
    const projection = projectPointOntoSegment(
      point,
      routePoints[index - 1],
      routePoints[index]
    );
    if (projection.distance < minDistance) {
      minDistance = projection.distance;
      nearest = projection.point;
    }
  }

  return nearest;
}

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

  it("snaps to nearby race-line segments before axis alignment and grid", () => {
    expect(
      resolveSnapPosition({
        pos: { x: 7.3, y: 6.4 },
        snapToGrid: true,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 1,
        candidates,
        routeCandidates: [route],
      })
    ).toEqual({ x: 7.3, y: 6 });
  });

  it("prefers explicit route waypoints over route-line projection", () => {
    expect(
      resolveSnapPosition({
        pos: { x: 9.7, y: 7.7 },
        snapToGrid: true,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 1,
        candidates: [],
        routeCandidates: [curvedRoute],
      })
    ).toEqual({ x: 10, y: 8 });
  });

  it("returns route waypoint targets for path drawing feedback", () => {
    expect(
      findNearestSnapTargetWithRoutes({
        candidates: [],
        pos: { x: 9.7, y: 7.7 },
        routeCandidates: [curvedRoute],
        snapRadiusMeters: 1,
      })
    ).toEqual({
      id: "curved-route-1:waypoint:1",
      x: 10,
      y: 8,
    });

    expect(
      findNearestSnapTargetWithRoutes({
        candidates: [],
        pos: { x: 9.4, y: 7.4 },
        routeCandidates: [curvedRoute],
        snapRadiusMeters: 1,
      })
    ).toBeNull();
  });

  it("uses the rendered smooth route for race-line snapping", () => {
    const pos = { x: 12, y: 7.4 };
    const expected = getExpectedSmoothRouteSnap(curvedRoute, pos);

    expect(
      resolveSnapPosition({
        pos,
        snapToGrid: true,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 2,
        candidates: [],
        routeCandidates: [curvedRoute],
      })
    ).toEqual(expected);
  });

  it("aligns individual axes to nearby objects when no center snap is available", () => {
    expect(
      resolveSnapPosition({
        pos: { x: 10.2, y: 15 },
        snapToGrid: false,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 0.5,
        candidates,
      })
    ).toEqual({ x: 10, y: 15 });

    expect(
      resolveSnapPosition({
        pos: { x: 8, y: 9.2 },
        snapToGrid: false,
        snapToShapes: true,
        gridStep: 1,
        magneticRadiusMeters: 0.5,
        candidates,
      })
    ).toEqual({ x: 8, y: 9 });
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
