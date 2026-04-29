import { describe, expect, it, vi } from "vitest";
import { normalizeDesign } from "@/lib/track/design";

vi.mock("server-only", () => ({}));

import {
  toApiOverlayPackage,
  toApiProjectSummary,
  toApiTrackPackage,
} from "@/lib/server/api-projects";
import type { StoredProject } from "@/lib/server/projects";
import type { Shape, TrackDesign } from "@/lib/types";

const inventory = {
  gate: 4,
  flag: 0,
  cone: 0,
  startfinish: 0,
  ladder: 0,
  divegate: 0,
};

function makeDesign(shapes: Shape[]): TrackDesign {
  return normalizeDesign({
    id: "design-1",
    version: 1,
    title: "API test",
    description: "Editor-only description",
    tags: ["private"],
    authorName: "Author",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 5, ppm: 20 },
    shapes,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T12:29:48.000Z",
  });
}

function makeProject(design: TrackDesign): StoredProject {
  return {
    id: "project-1",
    ownerUserId: "user-1",
    title: "Race layout",
    description: "Project description",
    design,
    designUpdatedAt: design.updatedAt,
    fieldWidth: null,
    fieldHeight: null,
    shapeCount: design.shapeOrder.length,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T12:30:00.000Z",
    archivedAt: null,
  };
}

const raceLine: Shape = {
  id: "route-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 5, z: 0 },
    { x: 30, y: 5, z: 1.5 },
  ],
  showArrows: true,
  strokeWidth: 0.3,
};

function gate(id: string, x: number, timingId?: string): Shape {
  return {
    id,
    kind: "gate",
    name: id,
    x,
    y: 5,
    rotation: 90,
    width: 3,
    height: 1.8,
    locked: true,
    frontOffsetDeg: 0,
    meta: timingId
      ? { timing: { role: "split", timingId }, unknown: "hidden" }
      : { unknown: "hidden" },
  };
}

describe("API project serializers", () => {
  it("returns minimal project summaries with field metadata fallback", () => {
    const project = makeProject(makeDesign([]));

    expect(toApiProjectSummary(project)).toEqual({
      type: "project",
      id: "project-1",
      title: "Race layout",
      field: {
        width: 60,
        height: 40,
        unit: "m",
      },
      shape_count: 0,
      created_at: "2026-04-28T09:00:00.000Z",
      updated_at: "2026-04-28T12:30:00.000Z",
    });
  });

  it("strips editor-only shape fields from track packages", () => {
    const project = makeProject(makeDesign([gate("gate-1", 5, "split-a")]));

    const trackPackage = toApiTrackPackage(project);
    const shape = trackPackage.shapes[0];

    expect(trackPackage).toMatchObject({
      type: "track",
      schema: "trackdraw.track.v1",
      source: { type: "project", id: "project-1" },
      field: {
        width: 60,
        height: 40,
        origin: "tl",
        unit: "m",
      },
      shape_count: 1,
    });
    expect(trackPackage.field).not.toHaveProperty("grid_step");
    expect(shape).toMatchObject({
      id: "gate-1",
      kind: "gate",
      x: 5,
      y: 5,
      rotation: 90,
      width: 3,
      height: 1.8,
    });
    expect(shape).not.toHaveProperty("locked");
    expect(shape).not.toHaveProperty("front_offset_deg");
    expect(shape).not.toHaveProperty("meta");
  });

  it("builds compact overlay data with route progress for obstacles and timing markers", () => {
    const project = makeProject(
      makeDesign([
        raceLine,
        gate("gate-early", 5),
        gate("gate-late", 20, "split-a"),
      ])
    );

    const overlayPackage = toApiOverlayPackage(project);

    expect(overlayPackage).toMatchObject({
      type: "overlay_track",
      schema: "trackdraw.overlay.v1",
      source: { type: "project", id: "project-1" },
      route_status: "ready",
      field: {
        width: 60,
        height: 40,
        origin: "tl",
        unit: "m",
      },
    });
    expect(overlayPackage.route).toMatchObject({
      shape_id: "route-1",
      closed: false,
      waypoints: [
        { x: 0, y: 5, z: 0 },
        { x: 30, y: 5, z: 1.5 },
      ],
    });
    expect(overlayPackage.route?.length_m).toBeCloseTo(30, 1);
    expect(overlayPackage.route?.sampled_points.length).toBeGreaterThanOrEqual(
      2
    );

    expect(
      overlayPackage.route_obstacles.map((obstacle) => ({
        id: obstacle.id,
        route_number: obstacle.route_number,
      }))
    ).toEqual([
      { id: "gate-early", route_number: 1 },
      { id: "gate-late", route_number: 2 },
    ]);

    const lateGate = overlayPackage.route_obstacles.find(
      (obstacle) => obstacle.id === "gate-late"
    );
    expect(lateGate?.route_position).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      offset_m: expect.any(Number),
    });
    expect(lateGate?.route_position?.distance_m).toBeCloseTo(20, 1);
    expect(lateGate?.route_position?.progress).toBeCloseTo(2 / 3, 1);

    expect(overlayPackage.timing_markers).toHaveLength(1);
    expect(overlayPackage.timing_markers[0]).toMatchObject({
      shape_id: "gate-late",
      role: "split",
      timing_id: "split-a",
      route_position: {
        distance_m: expect.any(Number),
        progress: expect.any(Number),
      },
    });
  });
});
