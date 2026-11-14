import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import { getPolylineManeuverDetections } from "@/lib/track/polyline-derived";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import type { FieldSpec, PolylineShape, Shape } from "@/lib/types";

export const GROUND_MARKER_RADIUS = 0.36;
export const MAX_GROUND_MARKERS = 96;
const MIN_SPACING = 4;
const END_CLEARANCE = 2;
// Convert the 2D rectangles at high scale so their minimum on-screen
// strokes do not turn into metres of extra clearance.
const FOOTPRINT_PIXELS_PER_METRE = 100;
const EQUIPMENT_CLEARANCE = 0.85 + GROUND_MARKER_RADIUS;
const PASSAGE_CLEARANCE = 2.5;
const LOCAL_ROUTE_DISTANCE = 4.5;
const MAX_HEIGHT = 3;
const MAX_GRADE = 0.65;
const MAX_WAYPOINTS = 512;
const MAX_SHAPES = 2048;
const MAX_FIELD_DIMENSION = 2000;
const EPSILON = 1e-6;

type GroundMarker = { x: number; y: number };
type Station = GroundMarker & { height: number; distance: number };
type Span = { start: Station; end: Station; length: number };
type Omission = "elevation" | "nearPass" | "clearance";

export type GroundMarkerPreview = {
  markers: GroundMarker[];
  omissions: Record<Omission, number>;
  limited: boolean;
};

function positionAlong(span: Span, fraction: number): Station {
  const { start, end, length } = span;
  return {
    x: start.x + fraction * (end.x - start.x),
    y: start.y + fraction * (end.y - start.y),
    height: start.height + fraction * (end.height - start.height),
    distance: start.distance + fraction * length,
  };
}

function hasNearbyPass(
  station: Station,
  spans: Span[],
  length: number,
  closed: boolean
) {
  // Exclude only the neighborhood along the route. A nonlocal approach at
  // the same ground position can be a crossing, a return leg or a repeat.
  const excluded = closed
    ? [station.distance - length, station.distance, station.distance + length]
    : [station.distance];
  return spans.some((span) => {
    const { start, end } = span;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // Clip out the local arc intervals before finding the nearest point on
    // each remaining piece. Checking just the closest point of a whole span
    // can miss a return that starts or ends inside the local neighborhood.
    let cursor = start.distance;
    const near = (from: number, to: number) => {
      if (to <= from || span.length <= EPSILON) return false;
      const fraction = Math.max(
        (from - start.distance) / span.length,
        Math.min(
          (to - start.distance) / span.length,
          ((station.x - start.x) * dx + (station.y - start.y) * dy) /
            (span.length * span.length)
        )
      );
      return (
        Math.hypot(
          station.x - start.x - dx * fraction,
          station.y - start.y - dy * fraction
        ) < PASSAGE_CLEARANCE
      );
    };
    for (const center of excluded) {
      if (near(cursor, Math.min(end.distance, center - LOCAL_ROUTE_DISTANCE))) {
        return true;
      }
      cursor = Math.max(cursor, center + LOCAL_ROUTE_DISTANCE);
    }
    return near(cursor, end.distance);
  });
}

function getClearanceChecks(shapes: readonly Shape[]) {
  return shapes.flatMap((shape) => {
    if (shape.kind === "polyline" || shape.kind === "label") return [];
    const bounds = getShapeLocalBounds(shape, FOOTPRINT_PIXELS_PER_METRE);
    if (!bounds) return [];
    const angle = (shape.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Include the opening as well as the equipment. Give stacked and diving
    // passages a wider gap so dots don't suggest how to enter or exit them.
    const buffer =
      EQUIPMENT_CLEARANCE +
      (shape.kind === "tower" ||
      shape.kind === "ladder" ||
      shape.kind === "divegate"
        ? 1.5
        : 0);
    return [
      (point: GroundMarker) => {
        const dx = point.x - shape.x;
        const dy = point.y - shape.y;
        const x = dx * cos + dy * sin;
        const y = -dx * sin + dy * cos;
        return (
          x >= bounds.x / FOOTPRINT_PIXELS_PER_METRE - buffer &&
          x <=
            (bounds.x + bounds.width) / FOOTPRINT_PIXELS_PER_METRE + buffer &&
          y >= bounds.y / FOOTPRINT_PIXELS_PER_METRE - buffer &&
          y <= (bounds.y + bounds.height) / FOOTPRINT_PIXELS_PER_METRE + buffer
        );
      },
    ];
  });
}

export function deriveGroundMarkers(
  route: PolylineShape,
  shapes: readonly Shape[],
  field: Pick<FieldSpec, "width" | "height">
): GroundMarkerPreview {
  const result: GroundMarkerPreview = {
    markers: [],
    omissions: { elevation: 0, nearPass: 0, clearance: 0 },
    limited: false,
  };
  if (
    route.points.length > MAX_WAYPOINTS ||
    shapes.length > MAX_SHAPES ||
    ![field.width, field.height].every(
      (size) => Number.isFinite(size) && size > 0 && size <= MAX_FIELD_DIMENSION
    ) ||
    route.points.some(
      ({ x, y, z }) =>
        ![x, y, z ?? 0].every(
          (coordinate) =>
            Number.isFinite(coordinate) &&
            Math.abs(coordinate) <= MAX_FIELD_DIMENSION
        )
    )
  ) {
    result.limited = true;
    return result;
  }

  const curveData = getPolylineCurve3Derived(route);
  if (!curveData) return result;
  // Sample the same spline as the 3D line. Arc length here is measured on
  // the ground, so a climb cannot create a cluster of dots in one place.
  const samples = curveData.curve.getPoints(curveData.segmentCount * 2);
  let distance = 0;
  const spans = samples.slice(1).map((point, index): Span => {
    const previous = samples[index];
    const start = {
      x: previous.x,
      y: previous.z,
      height: previous.y,
      distance,
    };
    const length = Math.hypot(point.x - previous.x, point.z - previous.z);
    distance += length;
    return {
      start,
      end: { x: point.x, y: point.z, height: point.y, distance },
      length,
    };
  });

  const closed = route.closed ?? false;
  const usableLength = distance - (closed ? 0 : END_CLEARANCE * 2);
  if (usableLength < MIN_SPACING - EPSILON) return result;

  const count = Math.min(
    MAX_GROUND_MARKERS,
    Math.floor((usableLength + EPSILON) / MIN_SPACING)
  );
  const spacing = usableLength / count;
  const offset = (closed ? 0 : END_CLEARANCE) + spacing / 2;
  const clearanceChecks = getClearanceChecks(shapes);
  const elevatedSpans = spans.filter(
    ({ start, end, length }) =>
      Math.max(start.height, end.height) > MAX_HEIGHT ||
      Math.abs(end.height - start.height) >
        MAX_GRADE * Math.max(length, EPSILON)
  );

  // Leave the ground below detected maneuvers clear even if their height
  // and grade alone would allow individual dots.
  const maneuverLegs = getPolylineManeuverDetections(route).flatMap(
    ({ startWaypointIndex, endWaypointIndex }) =>
      route.points
        .slice(startWaypointIndex, endWaypointIndex)
        .map(
          (start, index) =>
            [start, route.points[startWaypointIndex + index + 1]] as const
        )
  );

  let spanIndex = 0;
  for (let index = 0; index < count; index += 1) {
    const target = offset + spacing * index;
    while (spans[spanIndex].end.distance <= target) spanIndex += 1;
    const span = spans[spanIndex];
    const point = positionAlong(
      span,
      (target - span.start.distance) / span.length
    );
    const near = (from: number, to: number) =>
      target + END_CLEARANCE >= from && target - END_CLEARANCE <= to;
    if (
      maneuverLegs.some(([start, end]) => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const fraction = Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) /
              Math.max(dx * dx + dy * dy, EPSILON)
          )
        );
        return (
          Math.hypot(
            point.x - start.x - dx * fraction,
            point.y - start.y - dy * fraction
          ) < END_CLEARANCE
        );
      }) ||
      elevatedSpans.some(
        ({ start, end }) =>
          near(start.distance, end.distance) ||
          (closed &&
            (near(start.distance - distance, end.distance - distance) ||
              near(start.distance + distance, end.distance + distance)))
      )
    ) {
      result.omissions.elevation += 1;
    } else if (hasNearbyPass(point, spans, distance, closed)) {
      result.omissions.nearPass += 1;
    } else if (
      point.x < GROUND_MARKER_RADIUS ||
      point.x > field.width - GROUND_MARKER_RADIUS ||
      point.y < GROUND_MARKER_RADIUS ||
      point.y > field.height - GROUND_MARKER_RADIUS ||
      clearanceChecks.some((isBlocked) => isBlocked(point))
    ) {
      result.omissions.clearance += 1;
    } else {
      result.markers.push({ x: point.x, y: point.y });
    }
  }
  return result;
}
