// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

import { z } from "zod";
import { VIEWER_SNAPSHOT_SCHEMA } from "./types";
import type { ViewerDesignSnapshot } from "./types";

const catalogIdentitySchema = z.object({
  version: z.number(),
  elementId: z.string(),
  assignedKind: z.string(),
  official: z.boolean(),
  snapshot: z.object({
    name: z.string(),
    organization: z.string().optional(),
    dimensionsLabel: z.string(),
  }),
});

// Loosely typed on purpose: per-shape-kind fields (width/height/points/...)
// are already allowlisted upstream by toViewerShape() in the app; this
// schema's job is to catch structural corruption/oversized payloads, not to
// re-derive the ~150-line discriminated Shape union Phase 1 explicitly
// deferred vendoring on (see packages/viewer/src/types.ts's own comment).
const viewerShapeSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    name: z.string().optional(),
    x: z.number(),
    y: z.number(),
    rotation: z.number(),
    frontOffsetDeg: z.number().optional(),
    locked: z.boolean().optional(),
    color: z.string().optional(),
    meta: z.object({ catalog: catalogIdentitySchema.optional() }).optional(),
  })
  .loose();

const assetManifestEntrySchema = z.object({
  path: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "must be a lowercase hex sha256 digest"),
  attribution: z.string().optional(),
});

export const viewerDesignSnapshotSchema = z.object({
  schema: z.literal(VIEWER_SNAPSHOT_SCHEMA),
  snapshotId: z.string(),
  requiredViewer: z.object({
    schema: z.literal(VIEWER_SNAPSHOT_SCHEMA),
    minRendererVersion: z.string(),
    capabilities: z.array(z.string()),
  }),
  design: z.object({
    version: z.literal(2),
    title: z.string(),
    field: z.object({
      width: z.number().nonnegative(),
      height: z.number().nonnegative(),
      origin: z.enum(["tl", "bl"]),
      gridStep: z.number().nonnegative(),
      ppm: z.number().nonnegative(),
    }),
    shapes: z.array(viewerShapeSchema),
    updatedAt: z.string(),
  }),
  assets: z.array(assetManifestEntrySchema),
});

/**
 * No embedded asset bytes ship in the snapshot JSON, so this is a generous
 * ceiling meant to catch a genuinely corrupt/runaway design, not a tight limit.
 */
export const MAX_VIEWER_SNAPSHOT_BYTES = 4_000_000;

export type ViewerSnapshotValidationFailure =
  | { type: "schema"; issues: z.core.$ZodIssue[] }
  | { type: "too_large"; byteLength: number };

export class ViewerSnapshotValidationError extends Error {
  constructor(
    message: string,
    readonly cause_: ViewerSnapshotValidationFailure
  ) {
    super(message);
    this.name = "ViewerSnapshotValidationError";
  }
}

/**
 * Validates a candidate viewer snapshot against the schema and a maximum
 * serialized-byte-size cap, throwing ViewerSnapshotValidationError on
 * failure. Used by the shared snapshot builder (src/lib/track/viewer-snapshot.ts)
 * before handing a snapshot to either the manual-export path or the API
 * route - and will also be the consumer-side validator for an untrusted
 * incoming snapshot in a future import path (e.g. RotorHazard local import).
 */
export function validateViewerDesignSnapshot(
  value: unknown
): ViewerDesignSnapshot {
  const parsed = viewerDesignSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new ViewerSnapshotValidationError(
      "Viewer snapshot failed schema validation.",
      { type: "schema", issues: parsed.error.issues }
    );
  }

  const byteLength = new TextEncoder().encode(
    JSON.stringify(parsed.data)
  ).byteLength;
  if (byteLength > MAX_VIEWER_SNAPSHOT_BYTES) {
    throw new ViewerSnapshotValidationError(
      `Viewer snapshot (${byteLength} bytes) exceeds the ${MAX_VIEWER_SNAPSHOT_BYTES}-byte limit.`,
      { type: "too_large", byteLength }
    );
  }

  return parsed.data as ViewerDesignSnapshot;
}
