import "server-only";

import { getDesignShapes, serializeDesign } from "@/lib/track/design";
import { getDesignTimingMarkers } from "@/lib/track/timing";
import type { StoredProject } from "@/lib/server/projects";
import type { Shape } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSnakeCaseKey(key: string) {
  return key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function toSnakeCaseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toSnakeCaseValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      toSnakeCaseKey(key),
      toSnakeCaseValue(entry),
    ])
  );
}

export function toApiProjectSummary(project: StoredProject) {
  return {
    type: "project" as const,
    id: project.id,
    title: project.title,
    field: {
      width: project.fieldWidth ?? project.design.field.width,
      height: project.fieldHeight ?? project.design.field.height,
      unit: "m" as const,
    },
    shape_count: project.shapeCount,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}

function toApiShape(shape: Shape) {
  const {
    locked: _locked,
    frontOffsetDeg: _frontOffsetDeg,
    meta: _meta,
    ...shapeData
  } = shape;
  return toSnakeCaseValue(shapeData) as Record<string, unknown>;
}

export function toApiTrackPackage(project: StoredProject) {
  const shapes = getDesignShapes(project.design);

  return {
    type: "track" as const,
    schema: "trackdraw.track.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    field: {
      width: project.design.field.width,
      height: project.design.field.height,
      origin: project.design.field.origin,
      unit: "m" as const,
    },
    shape_count: shapes.length,
    timing_markers: getDesignTimingMarkers(project.design).map((marker) => ({
      shape_id: marker.shape.id,
      role: marker.marker.role,
      timing_id: marker.marker.timingId ?? null,
      title: marker.title,
    })),
    updated_at: project.designUpdatedAt,
    shapes: shapes.map(toApiShape),
  };
}

export function toApiTrackDrawExport(project: StoredProject) {
  return {
    type: "export" as const,
    schema: "trackdraw.export.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    updated_at: project.designUpdatedAt,
    design: serializeDesign(project.design),
  };
}
