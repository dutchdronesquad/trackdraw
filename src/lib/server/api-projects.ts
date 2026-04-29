import "server-only";

import {
  getDesignShapes,
  serializeDesign,
  serializeDesignForShare,
} from "@/lib/track/design";
import type { StoredProject } from "@/lib/server/projects";

export function toApiProjectSummary(project: StoredProject) {
  return {
    type: "project" as const,
    id: project.id,
    title: project.title,
    description: project.description,
    field: {
      width: project.fieldWidth,
      height: project.fieldHeight,
      unit: "m" as const,
    },
    shapeCount: project.shapeCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    designUpdatedAt: project.designUpdatedAt,
  };
}

export function toApiTrackPackage(project: StoredProject) {
  return {
    type: "track" as const,
    schema: "trackdraw.track.v1" as const,
    source: {
      type: "project" as const,
      id: project.id,
    },
    title: project.title,
    description: project.description,
    field: {
      width: project.design.field.width,
      height: project.design.field.height,
      origin: project.design.field.origin,
      gridStep: project.design.field.gridStep,
      unit: "m" as const,
    },
    shapeCount: getDesignShapes(project.design).length,
    timingMarkers: [],
    updatedAt: project.designUpdatedAt,
    design: serializeDesignForShare(project.design),
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
    updatedAt: project.designUpdatedAt,
    design: serializeDesign(project.design),
  };
}
