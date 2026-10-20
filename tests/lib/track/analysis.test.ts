import { describe, expect, it } from "vitest";
import { analyzeTrack, compareTracks } from "@/lib/track/analysis";
import { createDefaultDesign } from "@/lib/track/design";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { buildSetupPlan } from "@/lib/planning/setup-estimate";
import { getOverlayPrepReport } from "@/lib/track/overlay-prep";
import type { Shape } from "@/lib/types";
function design(shapes: Shape[]) {
  return {
    ...createDefaultDesign(),
    shapeOrder: shapes.map((s) => s.id),
    shapeById: Object.fromEntries(shapes.map((s) => [s.id, s])),
  };
}
const base = { x: 0, y: 0, rotation: 0 };
const gate = (id: string): Shape => ({
  ...createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
    ...base,
    includeCatalogMetadata: true,
  }),
  id,
});
describe("shared track analysis", () => {
  it("groups repeated variants and stored dimensions, includes towers and excludes annotations", () => {
    const track = design([
      gate("a"),
      gate("b"),
      { ...gate("c"), width: 4 } as Shape,
      { id: "tower", kind: "tower", ...base, width: 2, height: 3, levels: 3 },
      { id: "ladder", kind: "ladder", ...base, width: 3, height: 2, rungs: 4 },
      {
        id: "dive",
        kind: "divegate",
        ...base,
        width: 3,
        elevation: 5,
        tilt: 90,
      },
      { id: "flag", kind: "flag", ...base, radius: 0.5, poleHeight: 3 },
      { id: "cone", kind: "cone", ...base, radius: 0.2 },
      {
        id: "net",
        kind: "barrier",
        variant: "net",
        ...base,
        width: 5,
        height: 2,
      },
      {
        id: "fence",
        kind: "barrier",
        variant: "fence",
        ...base,
        width: 5,
        height: 2,
      },
      { id: "label", kind: "label", ...base, text: "secret annotation" },
    ]);
    const result = analyzeTrack(track);
    expect(result.facts.material_item_count).toBe(10);
    expect(result.facts.shape_count).toBe(11);
    expect(result.facts.numbered_obstacle_count).toBe(7);
    expect(result.facts.materials).toHaveLength(9);
    expect(result.facts.materials.find((m) => m.quantity === 2)).toMatchObject({
      kind: "gate",
      catalog: { id: MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID },
      stored_dimensions: { width: expect.closeTo(1.524, 8) },
      quantity: 2,
    });
    expect(
      result.facts.materials.find((m) => m.kind === "tower")
    ).toMatchObject({ stored_dimensions: { levels: 3 } });
    expect(result.facts.inventory_required_by_kind).toMatchObject({
      gate: 3,
      ladder: 1,
      divegate: 1,
      barrier: 2,
    });
    const shared = buildSetupPlan(
      track,
      (k) => k,
      (k) => k
    );
    expect(result.estimates.setup_elapsed_minutes).toBe(
      shared.estimatedElapsedMinutes
    );
    expect(result.estimates.setup_elapsed_range_minutes).toEqual(
      shared.estimatedElapsedRange
    );
    expect(JSON.stringify(result)).not.toContain("secret annotation");
    expect(
      analyzeTrack(design(Object.values(track.shapeById).reverse())).facts
        .materials
    ).toEqual(result.facts.materials);
  });
  it.each([false, true])(
    "uses shared smoothed route geometry (closed=%s), not straight lines or elevation",
    (closed) => {
      const track = design([
        {
          id: "route",
          kind: "polyline",
          ...base,
          closed,
          points: [
            { x: 0, y: 0, z: 0 },
            { x: 10, y: 0, z: 100 },
            { x: 10, y: 10, z: 0 },
          ],
        },
      ]);
      expect(analyzeTrack(track).measured.route_length_m).toBe(
        getOverlayPrepReport(track).routeLength
      );
      expect(analyzeTrack(track).measured.route_length_m).toBeGreaterThan(20);
    }
  );
  it("reports empty tracks, missing or ambiguous routes and unsupported metrics explicitly", () => {
    const empty = analyzeTrack(design([]));
    expect(empty.facts.materials).toEqual([]);
    expect(empty.facts.material_item_count).toBe(0);
    expect(empty.estimates).toMatchObject({
      setup_status: "no_material_items",
      setup_elapsed_minutes: null,
    });
    expect(empty.measured).toEqual({
      route_length_m: null,
      route_status: "missing_route",
    });
    expect(empty.unavailable).toContain("flight_safety_certification");
    const routes: Shape[] = ["a", "b"].map((id) => ({
      id,
      kind: "polyline",
      ...base,
      points: [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
    }));
    expect(analyzeTrack(design(routes)).measured).toEqual({
      route_length_m: null,
      route_status: "multiple_routes",
    });
    const degenerate = analyzeTrack(
      design([{ ...routes[0], kind: "polyline", points: [{ x: 0, y: 0 }] }])
    );
    expect(degenerate.measured.route_status).toBe("missing_route");
  });
  it("ignores unrecognized provenance, private metadata and custom names", () => {
    const placed = {
      ...gate("a"),
      name: "private",
      meta: {
        secret: "hidden",
        catalog: {
          version: 1,
          elementId: "unknown",
          assignedKind: "gate",
          official: false,
          snapshot: {
            name: "forged",
            organization: "bad",
            dimensionsLabel: "bad",
          },
        },
      },
    };
    const result = analyzeTrack(design([placed]));
    expect(result.facts.materials[0].catalog).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/private|hidden|forged/);
  });
  it("measures a 3-4-5 route without elevation and computes its comparison delta", () => {
    const route = (size: number): Shape => ({
      id: "route",
      kind: "polyline",
      ...base,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 3 * size, y: 4 * size, z: 1000 },
      ],
    });
    const left = analyzeTrack(design([route(1)]));
    const right = analyzeTrack(design([route(2)]));
    expect(left.measured.route_length_m).toBeCloseTo(5, 8);
    expect(right.measured.route_length_m).toBeCloseTo(10, 8);
    expect(compareTracks(left, right).route_length_m).toBeCloseTo(5, 8);
  });
  it("compares right minus left, preserves null metrics, and is stable for the same track", () => {
    const a = analyzeTrack(design([gate("a")])),
      b = analyzeTrack(design([gate("a"), gate("b")]));
    expect(compareTracks(a, b)).toMatchObject({
      direction: "right_minus_left",
      material_item_count: 1,
      counts_by_kind: { gate: 1 },
      route_length_m: null,
    });
    expect(compareTracks(b, a).material_item_count).toBe(-1);
    expect(compareTracks(a, a)).toMatchObject({
      material_item_count: 0,
      setup_elapsed_minutes: 0,
      route_length_m: null,
    });
    expect(
      compareTracks(analyzeTrack(design([])), a).setup_elapsed_minutes
    ).toBeNull();
  });
});
