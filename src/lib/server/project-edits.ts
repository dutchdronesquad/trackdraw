import "server-only";
import { z } from "zod";
import {
  applyShapePatch,
  getPolylineAnchor,
} from "@/lib/editor/shape-mutations";
import {
  normalizeDesign,
  serializeDesign,
  getDesignShapes,
} from "@/lib/track/design";
import { shapeFitsField } from "@/lib/track/field-bounds";
import { DRAFT_UNVALIDATED_CONSTRAINTS } from "@/lib/track/draft";
import { getDatabase } from "./db";
import { getProjectForUser, type StoredProject } from "./projects";
import {
  ProjectToolError,
  assertDerivedDesign,
  MCP_MAX_RESULT_BYTES,
} from "./mcp/project-context";

const patch = z
  .strictObject({
    x: z.number().min(-1000).max(1000).optional(),
    y: z.number().min(-1000).max(1000).optional(),
    rotation: z.number().min(-360).max(360).optional(),
    name: z.string().trim().max(100).optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one changed field."
  );
export const trackEditChanges = z
  .array(
    z.strictObject({
      shape_id: z.string().min(1).max(128),
      patch,
    })
  )
  .min(1)
  .max(100);
export type TrackEditChanges = z.infer<typeof trackEditChanges>;
type Snapshot = {
  title: string;
  description: string;
  design: ReturnType<typeof serializeDesign>;
};
type EditRow = {
  id: string;
  project_id: string;
  base_revision: number;
  before_json: string;
  after_json: string;
  changes_json: string;
  expires_at: string;
  applied_at: string | null;
  applied_revision: number | null;
};
async function owned(projectId: string, userId: string) {
  const project = await getProjectForUser(projectId, userId);
  if (!project)
    throw new ProjectToolError(
      "not_found",
      "Project not found or unavailable."
    );
  return project;
}
function conflict() {
  return new ProjectToolError(
    "revision_conflict",
    "The project changed. Read its current revision and preview a new proposal before applying."
  );
}
function snapshot(project: StoredProject): Snapshot {
  return {
    title: project.title,
    description: project.description,
    design: serializeDesign(project.design),
  };
}
function invalid(message: string) {
  return new ProjectToolError("validation_failed", message);
}

/** Previews are immutable server records. Their IDs bind apply to the exact reviewed change. */
export async function previewProjectEdit(
  userId: string,
  projectId: string,
  baseRevision: number,
  input: { changes?: unknown; restoreVersionId?: string }
) {
  if (Boolean(input.changes) === Boolean(input.restoreVersionId))
    throw invalid("Provide changes or restoreVersionId, exclusively.");
  const project = await owned(projectId, userId);
  if (project.revision !== baseRevision) throw conflict();
  assertDerivedDesign(project);
  const db = await getDatabase();
  const before = snapshot(project);
  let after = structuredClone(before);
  let design = normalizeDesign(after.design);
  let changes: unknown[];
  if (input.restoreVersionId) {
    const version = await db
      .prepare(
        "SELECT before_json FROM mcp_project_edits WHERE id=? AND user_id=? AND project_id=? AND applied_at IS NOT NULL"
      )
      .bind(input.restoreVersionId, userId, projectId)
      .first<{ before_json: string }>();
    if (!version)
      throw new ProjectToolError(
        "not_found",
        "Saved project version not found."
      );
    after = JSON.parse(version.before_json) as Snapshot;
    design = normalizeDesign(after.design);
    const ids = new Set([...project.design.shapeOrder, ...design.shapeOrder]);
    changes = [...ids]
      .filter(
        (id) =>
          JSON.stringify(project.design.shapeById[id]) !==
          JSON.stringify(design.shapeById[id])
      )
      .map((shape_id) => ({
        shape_id,
        action: !design.shapeById[shape_id]
          ? "remove"
          : !project.design.shapeById[shape_id]
            ? "add"
            : "restore",
      }));
  } else {
    const parsed = trackEditChanges.safeParse(input.changes);
    if (!parsed.success)
      throw invalid(
        "Provide 1–100 item patches with finite position/rotation values or a name; unknown fields are rejected."
      );
    const ids = new Set<string>();
    changes = parsed.data.map(({ shape_id, patch }) => {
      if (ids.has(shape_id))
        throw invalid("Each item may appear only once in a proposal.");
      ids.add(shape_id);
      const shape = design.shapeById[shape_id];
      if (!shape || shape.locked)
        throw invalid(`Item ${shape_id} is missing or locked.`);
      if (
        shape.kind === "polyline" &&
        patch.rotation !== undefined &&
        patch.rotation !== 0
      )
        throw invalid(
          "Polyline rotation must remain zero; use its position to move the route."
        );
      const position =
        shape.kind === "polyline" ? getPolylineAnchor(shape) : shape;
      const previous = Object.fromEntries(
        Object.keys(patch).map((key) => [
          key,
          key === "x"
            ? position.x
            : key === "y"
              ? position.y
              : key === "rotation"
                ? shape.rotation
                : (shape.name ?? ""),
        ])
      );
      if (!applyShapePatch(shape, patch))
        throw invalid(`Item ${shape_id} has no changes.`);
      const normalized = normalizeDesign(design);
      if (!shapeFitsField(normalized.shapeById[shape_id], normalized.field))
        throw invalid(
          `Item ${shape_id} must fit within the field's shared 2D bounds.`
        );
      return { shape_id, kind: shape.kind, before: previous, after: patch };
    });
  }
  // A new timestamp keeps existing Studio conflict detection valid as well as revision CAS.
  design.updatedAt = new Date(
    Math.max(Date.now(), Date.parse(project.design.updatedAt) + 1 || 0)
  ).toISOString();
  after.design = serializeDesign(normalizeDesign(design));
  const id = crypto.randomUUID();
  const now = new Date().toISOString(),
    expires = new Date(Date.now() + 30 * 60_000).toISOString();
  const result = {
    type: "track_edit_preview",
    proposal_id: id,
    project_id: projectId,
    base_revision: baseRevision,
    expires_at: expires,
    changes,
    ...(input.restoreVersionId
      ? {
          restore_version_id: input.restoreVersionId,
          title: after.title,
          description: after.description,
        }
      : {}),
    unvalidated_constraints: DRAFT_UNVALIDATED_CONSTRAINTS,
  };
  if (
    new TextEncoder().encode(JSON.stringify(result)).byteLength >
    MCP_MAX_RESULT_BYTES
  )
    throw new ProjectToolError(
      "response_too_large",
      "This preview is too large. Propose fewer changes."
    );
  // Bound pending storage; applied records are recoverable versions and do not expire.
  await db
    .prepare(
      "DELETE FROM mcp_project_edits WHERE user_id=? AND applied_at IS NULL AND expires_at<=?"
    )
    .bind(userId, now)
    .run();
  const inserted = await db
    .prepare(
      `INSERT INTO mcp_project_edits(id,user_id,project_id,base_revision,before_json,after_json,changes_json,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM mcp_project_edits WHERE user_id=? AND applied_at IS NULL)<20 RETURNING id`
    )
    .bind(
      id,
      userId,
      projectId,
      baseRevision,
      JSON.stringify(before),
      JSON.stringify(after),
      JSON.stringify(changes),
      now,
      expires,
      userId
    )
    .first();
  if (!inserted)
    throw new ProjectToolError(
      "proposal_limit",
      "There are too many pending proposals. Apply one or wait for it to expire."
    );
  return result;
}

export async function applyProjectEdit(
  userId: string,
  projectId: string,
  proposalId: string,
  baseRevision: number
) {
  await owned(projectId, userId);
  const db = await getDatabase();
  const proposal = await db
    .prepare(
      "SELECT * FROM mcp_project_edits WHERE id=? AND user_id=? AND project_id=?"
    )
    .bind(proposalId, userId, projectId)
    .first<EditRow>();
  if (!proposal)
    throw new ProjectToolError("not_found", "Edit proposal not found.");
  if (proposal.base_revision !== baseRevision) throw conflict();
  let wasApplied = proposal.applied_at !== null;
  if (!wasApplied) {
    const now = new Date().toISOString();
    if (proposal.expires_at <= now)
      throw new ProjectToolError(
        "proposal_expired",
        "Preview a new proposal before applying."
      );
    const after = JSON.parse(proposal.after_json) as Snapshot;
    const design = normalizeDesign(after.design);
    const results = await db.batch([
      db
        .prepare(
          `UPDATE projects SET title=?,description=?,design_json=?,field_width=?,field_height=?,shape_count=?,updated_at=?,revision=revision+1
        WHERE id=? AND owner_user_id=? AND archived_at IS NULL AND revision=?
        AND EXISTS(SELECT 1 FROM mcp_project_edits WHERE id=? AND user_id=? AND project_id=? AND applied_at IS NULL AND expires_at>?) RETURNING id`
        )
        .bind(
          after.title,
          after.description,
          JSON.stringify(after.design),
          design.field.width,
          design.field.height,
          getDesignShapes(design).length,
          now,
          projectId,
          userId,
          baseRevision,
          proposalId,
          userId,
          projectId,
          now
        ),
      db
        .prepare(
          "UPDATE mcp_project_edits SET applied_at=?,applied_revision=base_revision+1 WHERE id=? AND user_id=? AND applied_at IS NULL AND changes()=1"
        )
        .bind(now, proposalId, userId),
    ]);
    wasApplied = results[0].results.length === 0;
  }
  const applied = await db
    .prepare(
      "SELECT applied_revision FROM mcp_project_edits WHERE id=? AND user_id=? AND project_id=? AND applied_at IS NOT NULL"
    )
    .bind(proposalId, userId, projectId)
    .first<{ applied_revision: number }>();
  if (!applied) throw conflict();
  return {
    type: "project_edit_applied",
    project_id: projectId,
    proposal_id: proposalId,
    revision: applied.applied_revision,
    previous_version_id: proposalId,
    replayed: wasApplied,
    current_revision: (await owned(projectId, userId)).revision,
  };
}

export async function listProjectVersions(
  userId: string,
  projectId: string,
  before?: number
) {
  await owned(projectId, userId);
  const db = await getDatabase();
  const rows = await db
    .prepare(
      `SELECT id,base_revision,applied_revision,applied_at FROM mcp_project_edits
    WHERE user_id=? AND project_id=? AND applied_at IS NOT NULL AND (? IS NULL OR applied_revision<?) ORDER BY applied_revision DESC LIMIT 21`
    )
    .bind(userId, projectId, before ?? null, before ?? null)
    .all<{
      id: string;
      base_revision: number;
      applied_revision: number;
      applied_at: string;
    }>();
  return {
    type: "project_versions",
    project_id: projectId,
    versions: rows.results.slice(0, 20).map((row) => ({
      version_id: row.id,
      revision: row.base_revision,
      replaced_by_revision: row.applied_revision,
      saved_at: row.applied_at,
    })),
    next_cursor:
      rows.results.length > 20 ? rows.results[19].applied_revision : null,
  };
}
