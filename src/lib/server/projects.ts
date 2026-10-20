import "server-only";

import type { ApiKeyProjectAccess } from "@/lib/api/project-access";

import {
  getDesignShapes,
  normalizeDesign,
  serializeDesign,
} from "@/lib/track/design";
import type { SerializedTrackDesign, TrackDesign } from "@/lib/types";
import { getDatabase } from "@/lib/server/db";
import { revokeSharesForProject } from "@/lib/server/shares";

type ProjectRow = {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  design_json: SerializedTrackDesign | string;
  field_width: number | null;
  field_height: number | null;
  shape_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type StoredProject = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  design: TrackDesign;
  designUpdatedAt: string;
  fieldWidth: number | null;
  fieldHeight: number | null;
  shapeCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type SaveProjectOptions = {
  projectId?: string;
  title?: string;
  description?: string | null;
  forceWrite?: boolean;
  baseDesignUpdatedAt?: string | null;
};

export class ProjectVersionConflictError extends Error {
  readonly projectId: string;
  readonly title: string;
  readonly localUpdatedAt: string;
  readonly cloudUpdatedAt: string;
  readonly cloudProject: StoredProject;

  constructor(options: {
    projectId: string;
    title: string;
    localUpdatedAt: string;
    cloudUpdatedAt: string;
    cloudProject: StoredProject;
  }) {
    super("Account project changed on another device.");
    this.name = "ProjectVersionConflictError";
    this.projectId = options.projectId;
    this.title = options.title;
    this.localUpdatedAt = options.localUpdatedAt;
    this.cloudUpdatedAt = options.cloudUpdatedAt;
    this.cloudProject = options.cloudProject;
  }
}

function mapProjectRow(row: ProjectRow): StoredProject {
  const rawDesign =
    typeof row.design_json === "string"
      ? (JSON.parse(row.design_json) as SerializedTrackDesign)
      : row.design_json;
  const design = normalizeDesign(rawDesign);

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description ?? "",
    design,
    designUpdatedAt: design.updatedAt,
    fieldWidth:
      row.field_width === null
        ? null
        : Number.parseFloat(String(row.field_width)),
    fieldHeight:
      row.field_height === null
        ? null
        : Number.parseFloat(String(row.field_height)),
    shapeCount: row.shape_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function saveProjectForUser(
  ownerUserId: string,
  design: TrackDesign,
  options: SaveProjectOptions = {}
) {
  const normalized = normalizeDesign(design);
  const serialized = serializeDesign(normalized);
  const serializedJson = JSON.stringify(serialized);
  const now = new Date().toISOString();
  const projectId = options.projectId ?? crypto.randomUUID();
  const title = options.title ?? normalized.title ?? "Untitled";
  const description = options.description ?? normalized.description ?? "";
  const shapeCount = getDesignShapes(normalized).length;
  const existingProject = options.projectId
    ? await getProjectForUser(projectId, ownerUserId)
    : null;
  const existingSerializedJson = existingProject
    ? JSON.stringify(serializeDesign(existingProject.design))
    : null;

  if (existingProject && !options.forceWrite) {
    if (
      options.baseDesignUpdatedAt &&
      existingProject.designUpdatedAt !== options.baseDesignUpdatedAt
    ) {
      throw new ProjectVersionConflictError({
        projectId,
        title,
        localUpdatedAt: normalized.updatedAt,
        cloudUpdatedAt: existingProject.designUpdatedAt,
        cloudProject: existingProject,
      });
    }

    if (existingSerializedJson === serializedJson) {
      return existingProject;
    }
  }

  const db = await getDatabase();

  const savedRow = await db
    .prepare(
      `
        insert into projects (
          id,
          owner_user_id,
          title,
          description,
          design_json,
          field_width,
          field_height,
          shape_count,
          created_at,
          updated_at,
          archived_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
        on conflict(id) do update set
          title = excluded.title,
          description = excluded.description,
          design_json = excluded.design_json,
          field_width = excluded.field_width,
          field_height = excluded.field_height,
          shape_count = excluded.shape_count,
          updated_at = excluded.updated_at,
          archived_at = null
        where projects.owner_user_id = excluded.owner_user_id
          and (? = 1 or projects.design_json = ?)
        returning
          id,
          owner_user_id,
          title,
          description,
          design_json,
          field_width,
          field_height,
          shape_count,
          created_at,
          updated_at,
          archived_at
      `
    )
    .bind(
      projectId,
      ownerUserId,
      title,
      description,
      serializedJson,
      normalized.field.width,
      normalized.field.height,
      shapeCount,
      now,
      now,
      options.forceWrite || !existingProject ? 1 : 0,
      existingSerializedJson ?? ""
    )
    .first<ProjectRow>();

  if (!savedRow) {
    // The DO UPDATE WHERE condition failed — another write raced in between our read and write.
    const current = await getProjectForUser(projectId, ownerUserId);
    if (!current) {
      throw new Error("Failed to load saved cloud project");
    }
    throw new ProjectVersionConflictError({
      projectId,
      title,
      localUpdatedAt: normalized.updatedAt,
      cloudUpdatedAt: current.designUpdatedAt,
      cloudProject: current,
    });
  }

  return mapProjectRow(savedRow);
}

export class ProjectCreateRequestError extends Error {
  constructor(
    readonly code: "idempotency_conflict" | "project_unavailable",
    message: string
  ) {
    super(message);
  }
}

/** Atomic create-only persistence: retry receipts never overwrite a saved or edited project. */
export async function createMcpProjectForUser(
  ownerUserId: string,
  design: TrackDesign,
  requestKey: string,
  requestHash: string
) {
  const db = await getDatabase();
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  const normalized = normalizeDesign({
    ...design,
    id: projectId,
    createdAt: now,
    updatedAt: now,
  });
  await db.batch([
    db
      .prepare(
        `INSERT INTO mcp_draft_requests(user_id,request_key,request_hash,project_id,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING`
      )
      .bind(ownerUserId, requestKey, requestHash, projectId, now),
    db
      .prepare(
        `INSERT INTO projects(id,owner_user_id,title,description,design_json,field_width,field_height,shape_count,created_at,updated_at,archived_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,NULL FROM mcp_draft_requests WHERE user_id=? AND request_key=? AND request_hash=? AND project_id=?
      ON CONFLICT(id) DO NOTHING`
      )
      .bind(
        projectId,
        ownerUserId,
        normalized.title,
        normalized.description ?? "",
        JSON.stringify(serializeDesign(normalized)),
        normalized.field.width,
        normalized.field.height,
        getDesignShapes(normalized).length,
        now,
        now,
        ownerUserId,
        requestKey,
        requestHash,
        projectId
      ),
  ]);
  const receipt = await db
    .prepare(
      "SELECT request_hash, project_id FROM mcp_draft_requests WHERE user_id=? AND request_key=?"
    )
    .bind(ownerUserId, requestKey)
    .first<{ request_hash: string; project_id: string }>();
  if (!receipt || receipt.request_hash !== requestHash)
    throw new ProjectCreateRequestError(
      "idempotency_conflict",
      "This idempotency key was used for a different proposal. Use a new key for a new project."
    );
  const project = await getProjectForUser(receipt.project_id, ownerUserId);
  if (!project)
    throw new ProjectCreateRequestError(
      "project_unavailable",
      "The original project was archived or deleted. It will not be recreated. Use a new key to create a new project."
    );
  return { project, replayed: receipt.project_id !== projectId };
}

export async function getProjectForUser(
  projectId: string,
  ownerUserId: string,
  projectAccess?: ApiKeyProjectAccess
) {
  if (
    projectAccess?.mode === "selected" &&
    !projectAccess.projectIds.includes(projectId)
  )
    return null;
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
        select
          id,
          owner_user_id,
          title,
          description,
          design_json,
          field_width,
          field_height,
          shape_count,
          created_at,
          updated_at,
          archived_at
        from projects
        where id = ? and owner_user_id = ? and archived_at is null
        limit 1
      `
    )
    .bind(projectId, ownerUserId)
    .first<ProjectRow>();

  return row ? mapProjectRow(row) : null;
}

export async function listProjectsForUser(ownerUserId: string) {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
        select
          id,
          owner_user_id,
          title,
          description,
          design_json,
          field_width,
          field_height,
          shape_count,
          created_at,
          updated_at,
          archived_at
        from projects
        where owner_user_id = ? and archived_at is null
        order by updated_at desc
      `
    )
    .bind(ownerUserId)
    .all<ProjectRow>();

  return result.results.map(mapProjectRow);
}

type ProjectSummaryRow = {
  id: string;
  owner_user_id: string;
  title: string;
  field_width: number | null;
  field_height: number | null;
  shape_count: number;
  created_at: string;
  updated_at: string;
};

export type StoredProjectSummary = {
  id: string;
  ownerUserId: string;
  title: string;
  fieldWidth: number | null;
  fieldHeight: number | null;
  shapeCount: number;
  createdAt: string;
  updatedAt: string;
};

export class ProjectCursorError extends Error {}

export async function listProjectSummariesForUser(
  ownerUserId: string,
  projectAccess?: ApiKeyProjectAccess,
  page?: { afterId?: string; limit: number }
): Promise<StoredProjectSummary[]> {
  const db = await getDatabase();
  if (
    page &&
    (!Number.isInteger(page.limit) || page.limit < 1 || page.limit > 101)
  )
    throw new Error("Invalid project page size");
  let after: { id: string; updated_at: string } | null = null;
  if (page?.afterId) {
    after = await db
      .prepare(
        `SELECT id, updated_at FROM projects WHERE id = ? AND owner_user_id = ? AND archived_at IS NULL ${projectAccess?.mode === "selected" ? "AND id IN (SELECT value FROM json_each(?))" : ""}`
      )
      .bind(
        page.afterId,
        ownerUserId,
        ...(projectAccess?.mode === "selected"
          ? [JSON.stringify(projectAccess.projectIds)]
          : [])
      )
      .first<{ id: string; updated_at: string }>();
    if (!after) throw new ProjectCursorError();
  }
  const result = await db
    .prepare(
      `
        select
          id,
          owner_user_id,
          title,
          field_width,
          field_height,
          shape_count,
          created_at,
          updated_at
        from projects
        where owner_user_id = ? and archived_at is null
          ${projectAccess?.mode === "selected" ? "and id in (select value from json_each(?))" : ""}
          ${after ? "and (updated_at < ? or (updated_at = ? and id > ?))" : ""}
        order by updated_at desc, id asc
        ${page ? "limit ?" : ""}
      `
    )
    .bind(
      ownerUserId,
      ...(projectAccess?.mode === "selected"
        ? [JSON.stringify(projectAccess.projectIds)]
        : []),
      ...(after ? [after.updated_at, after.updated_at, after.id] : []),
      ...(page ? [page.limit] : [])
    )
    .all<ProjectSummaryRow>();

  return result.results.map(mapProjectSummary);
}

function mapProjectSummary(row: ProjectSummaryRow): StoredProjectSummary {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    fieldWidth:
      row.field_width === null
        ? null
        : Number.parseFloat(String(row.field_width)),
    fieldHeight:
      row.field_height === null
        ? null
        : Number.parseFloat(String(row.field_height)),
    shapeCount: row.shape_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function archiveProjectForUser(
  projectId: string,
  ownerUserId: string
) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db
    .prepare(
      `
        update projects
        set archived_at = ?, updated_at = ?
        where id = ? and owner_user_id = ? and archived_at is null
      `
    )
    .bind(now, now, projectId, ownerUserId)
    .run<{ meta?: { changes?: number } }>();

  // Only cascade if the archive actually matched a row (right owner, not already archived).
  if ((result.meta?.changes ?? 0) > 0) {
    await revokeSharesForProject(projectId, ownerUserId);
    return true;
  }

  return false;
}
