import type {
  GateShape,
  Shape,
  StartFinishShape,
  TrackDesign,
} from "@/lib/types";

export const TIMING_ROLES = ["start_finish", "split"] as const;

export type TimingRole = (typeof TIMING_ROLES)[number];

export interface ShapeTimingMarker {
  role: TimingRole;
  timingId?: string;
}

export type TimingMarkerShape = GateShape | StartFinishShape;

export interface DesignTimingMarker {
  badgeText: string;
  marker: ShapeTimingMarker;
  shape: TimingMarkerShape;
  title: string;
}

export const timingRoleLabels: Record<TimingRole, string> = {
  start_finish: "Start / finish",
  split: "Split",
};

export const timingRoleColors: Record<TimingRole, string> = {
  start_finish: "#f59e0b",
  split: "#0ea5e9",
};

const TIMING_MARKER_SHAPE_KINDS = new Set<Shape["kind"]>([
  "gate",
  "startfinish",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeTimingId(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 32) : undefined;
}

export function isTimingMarkerShape(shape: Shape): shape is TimingMarkerShape {
  return TIMING_MARKER_SHAPE_KINDS.has(shape.kind);
}

export function normalizeTimingMarker(
  value: unknown
): ShapeTimingMarker | null {
  if (!isRecord(value)) return null;
  if (!TIMING_ROLES.includes(value.role as TimingRole)) return null;

  const timingId = sanitizeTimingId(value.timingId);
  return {
    role: value.role as TimingRole,
    ...(timingId ? { timingId } : {}),
  };
}

export function getShapeTimingMarker(shape: Shape): ShapeTimingMarker | null {
  if (!isTimingMarkerShape(shape)) return null;
  return normalizeTimingMarker(shape.meta?.timing);
}

export function normalizeShapeTimingMeta(shape: Shape): Shape {
  const currentTiming = normalizeTimingMarker(shape.meta?.timing);
  const nextMeta = { ...(shape.meta ?? {}) };
  const { meta: _meta, ...shapeWithoutMeta } = shape;

  if (currentTiming && isTimingMarkerShape(shape)) {
    nextMeta.timing = currentTiming;
  } else {
    delete nextMeta.timing;
  }

  if (!Object.keys(nextMeta).length) return shapeWithoutMeta as Shape;

  return {
    ...shapeWithoutMeta,
    meta: nextMeta,
  } as Shape;
}

export function getTimingMarkerMeta(
  meta: Shape["meta"],
  marker: ShapeTimingMarker | null
) {
  const nextMeta = { ...(meta ?? {}) };
  const normalizedMarker = normalizeTimingMarker(marker);
  if (normalizedMarker) {
    nextMeta.timing = normalizedMarker;
  } else {
    delete nextMeta.timing;
  }

  return Object.keys(nextMeta).length ? nextMeta : undefined;
}

export function getTimingMarkerBadgeText(marker: ShapeTimingMarker) {
  if (marker.role === "start_finish") return "SF";
  return marker.timingId?.trim().slice(0, 4).toUpperCase() || "SP";
}

export function getTimingMarkerColor(marker: ShapeTimingMarker) {
  return timingRoleColors[marker.role];
}

export function getTimingMarkerTitle(
  marker: ShapeTimingMarker,
  fallbackIndex: number
) {
  if (marker.role === "start_finish") return "Start / finish";
  return marker.timingId
    ? `Split ${marker.timingId}`
    : `Split ${fallbackIndex}`;
}

export function getDesignTimingMarkers(design: TrackDesign) {
  let splitIndex = 0;
  const shapes = design.shapeOrder
    .map((id) => design.shapeById[id])
    .filter((shape): shape is Shape => Boolean(shape));

  return shapes.reduce<DesignTimingMarker[]>((markers, shape) => {
    const marker = getShapeTimingMarker(shape);
    if (!marker || !isTimingMarkerShape(shape)) return markers;

    if (marker.role === "split") {
      splitIndex += 1;
    }

    markers.push({
      badgeText: getTimingMarkerBadgeText(marker),
      marker,
      shape,
      title: getTimingMarkerTitle(marker, splitIndex),
    });
    return markers;
  }, []);
}
