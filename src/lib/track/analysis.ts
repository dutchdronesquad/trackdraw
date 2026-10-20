import { getRequiredInventoryCounts } from "@/lib/planning/inventory";
import { buildSetupPlan } from "@/lib/planning/setup-estimate";
import { getDesignShapes } from "./design";
import { getTrackItemAdapter, trackItemAdapters } from "./items/registry";
import { getSmoothRouteLength } from "./overlay-prep";
import {
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
} from "./elements/catalog";
import type { Shape, TrackDesign } from "@/lib/types";

// These are stored shape fields, not inferred outer bounds or assembled parts.
const dimensionFields = [
  "width",
  "height",
  "radius",
  "poleHeight",
  "thick",
  "elevation",
  "tilt",
  "rungs",
  "levels",
] as const;
function storedDimensions(shape: Shape) {
  return Object.fromEntries(
    dimensionFields.flatMap((key) =>
      key in shape && typeof shape[key as keyof Shape] === "number"
        ? [[key, shape[key as keyof Shape]]]
        : []
    )
  ) as Record<string, number>;
}
export const TRACK_METRIC_DEFINITIONS = {
  shape_count: "All stored shapes, including labels and polylines.",
  material_item_count:
    "One placed physical item per shape, excluding labels and polylines. Towers and ladders each count as one assembly; not a parts/fastener bill of materials.",
  numbered_obstacle_count:
    "Placed shapes marked as numbered obstacles by the shared item registry.",
  route_length_m:
    "Length in meters of the shared smoothed 2D route, including the closing segment for closed routes. Available only with exactly one polyline containing at least two points; excludes elevation.",
  setup_elapsed_minutes:
    "Shared Race Pack setup estimate for a typical 2-3 person crew: unload, stage, pre-assemble, place and secure. Includes standard crew overhead; an empty track has no setup estimate.",
} as const;
export type TrackMaterial = {
  kind: Shape["kind"];
  variant: string | null;
  catalog: {
    id: string;
    name: string;
    nominal_dimensions: Record<string, number>;
  } | null;
  stored_dimensions: Record<string, number>;
  quantity: number;
};
export function analyzeTrack(design: TrackDesign) {
  const shapes = getDesignShapes(design);
  const physical = shapes.filter(
    (shape) => shape.kind !== "label" && shape.kind !== "polyline"
  );
  const groups = new Map<string, TrackMaterial>();
  for (const shape of physical) {
    const identity = getTrackElementCatalogIdentity(shape.meta);
    const entry = getTrackElementCatalogEntry(identity?.elementId);
    // Ignore mismatched/unknown provenance and never echo arbitrary metadata.
    const catalogEntry =
      entry?.kind === shape.kind && identity?.assignedKind === shape.kind
        ? entry
        : null;
    const material = {
      kind: shape.kind,
      variant: shape.kind === "barrier" ? shape.variant : null,
      catalog: catalogEntry
        ? {
            id: catalogEntry.id,
            name: catalogEntry.name,
            nominal_dimensions: Object.fromEntries(
              Object.entries(catalogEntry.dimensions).filter(
                ([, value]) => typeof value === "number"
              )
            ),
          }
        : null,
      stored_dimensions: storedDimensions(shape),
      quantity: 0,
    } satisfies TrackMaterial;
    const key = JSON.stringify(material);
    const group = groups.get(key) ?? material;
    group.quantity++;
    groups.set(key, group);
  }
  const materials = [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value);
  const routes = shapes.filter(
    (shape) => shape.kind === "polyline" && shape.points.length >= 2
  );
  const routeLength =
    routes.length === 1 && routes[0].kind === "polyline"
      ? getSmoothRouteLength(routes[0])
      : null;
  // Translation affects labels only; analysis exposes numeric outputs, never setup steps or custom names.
  const setup = physical.length
    ? buildSetupPlan(
        design,
        (key) => key,
        (key) => key
      )
    : null;
  const required = getRequiredInventoryCounts(design);
  const counts = Object.fromEntries(
    trackItemAdapters.map((adapter) => [
      adapter.kind,
      shapes.filter((shape) => shape.kind === adapter.kind).length,
    ])
  );
  return {
    facts: {
      shape_count: shapes.length,
      material_item_count: physical.length,
      numbered_obstacle_count: shapes.filter(
        (shape) => getTrackItemAdapter(shape.kind).numberedObstacle === true
      ).length,
      counts_by_kind: counts,
      inventory_required_by_kind: required,
      materials,
    },
    measured: {
      route_length_m: routeLength,
      route_status:
        routeLength !== null
          ? "available"
          : routes.length > 1
            ? "multiple_routes"
            : "missing_route",
    },
    estimates: {
      setup_elapsed_minutes: setup?.estimatedElapsedMinutes ?? null,
      setup_elapsed_range_minutes: setup?.estimatedElapsedRange ?? null,
      setup_status: setup ? "available" : "no_material_items",
    },
    unavailable: [
      "flight_safety_certification",
      "pilot_difficulty",
      "actual_lap_time",
      "component_and_fastener_quantities",
      "stock_availability",
    ],
  };
}
export function compareTracks(
  left: ReturnType<typeof analyzeTrack>,
  right: ReturnType<typeof analyzeTrack>
) {
  const difference = (a: number | null, b: number | null) =>
    a === null || b === null ? null : b - a;
  return {
    direction: "right_minus_left",
    shape_count: right.facts.shape_count - left.facts.shape_count,
    material_item_count:
      right.facts.material_item_count - left.facts.material_item_count,
    numbered_obstacle_count:
      right.facts.numbered_obstacle_count - left.facts.numbered_obstacle_count,
    counts_by_kind: Object.fromEntries(
      trackItemAdapters.map(({ kind }) => [
        kind,
        right.facts.counts_by_kind[kind] - left.facts.counts_by_kind[kind],
      ])
    ),
    route_length_m: difference(
      left.measured.route_length_m,
      right.measured.route_length_m
    ),
    setup_elapsed_minutes: difference(
      left.estimates.setup_elapsed_minutes,
      right.estimates.setup_elapsed_minutes
    ),
  };
}
