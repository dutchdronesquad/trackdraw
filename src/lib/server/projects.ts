import "server-only";

import {
  projectAuthorizationPredicate,
  type ProjectAction,
  type ProjectActor,
  type ProjectOwner,
} from "@/lib/server/project-authorization";

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
  revision: number;
  id: string;
  owner_user_id: string | null;
  owner_team_id: string | null;
  created_by_user_id: string | null;
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
  revision: number;
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
  baseRevision?: number;
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

function mapProjectData(row: ProjectRow): Omit<StoredProject, "ownerUserId"> {
  const rawDesign =
    typeof row.design_json === "string"
      ? (JSON.parse(row.design_json) as SerializedTrackDesign)
      : row.design_json;
  const design = normalizeDesign(rawDesign);

  return {
    revision: row.revision,
    id: row.id,
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

function mapProjectRow(row: ProjectRow): StoredProject {
  if (!row.owner_user_id || row.owner_team_id) {
    throw new Error("Expected a personal project");
  }
  return { ...mapProjectData(row), ownerUserId: row.owner_user_id };
}

export type AuthorizedProject = Omit<StoredProject, "ownerUserId"> & {
  owner: ProjectOwner;
  createdByUserId: string | null;
};

function projectOwner(
  row: Pick<ProjectRow, "owner_team_id" | "owner_user_id">
): ProjectOwner {
  if (row.owner_team_id && !row.owner_user_id) {
    return { kind: "team", teamId: row.owner_team_id };
  }
  if (row.owner_user_id && !row.owner_team_id) {
    return { kind: "personal", userId: row.owner_user_id };
  }
  throw new Error("Invalid project ownership");
}

/** Internal team-capable read boundary. Public endpoints remain personal-only. */
export async function getProjectForActor(
  projectId: string,
  actor: ProjectActor,
  action: ProjectAction = "read"
): Promise<AuthorizedProject | null> {
  const db = await getDatabase();
  const access = projectAuthorizationPredicate(actor, action);
  const row = await db
    .prepare(
      `
    SELECT revision, id, owner_user_id, owner_team_id, created_by_user_id,
      title, description, design_json, field_width, field_height, shape_count,
      created_at, updated_at, archived_at
    FROM projects WHERE id = ? AND ${access.sql}
      AND archived_at IS NULL LIMIT 1
  `
    )
    .bind(projectId, ...access.bindings)
    .first<ProjectRow>();
  if (!row) return null;
  return {
    ...mapProjectData(row),
    owner: projectOwner(row),
    createdByUserId: row.created_by_user_id,
  };
}

/** Bounded metadata only; no design/history is loaded to populate a team list. */
export async function listProjectSummariesForActor(
  actor: ProjectActor,
  limit = 100
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid project page size");
  }
  const db = await getDatabase();
  const access = projectAuthorizationPredicate(actor, "list");
  const rows = await db
    .prepare(
      `
    SELECT id, owner_user_id, owner_team_id, created_by_user_id, title,
      field_width, field_height, shape_count, created_at, updated_at
    FROM projects WHERE ${access.sql} AND archived_at IS NULL
    ORDER BY updated_at DESC, id ASC LIMIT ?
  `
    )
    .bind(...access.bindings, limit)
    .all<
      ProjectSummaryRow &
        Pick<ProjectRow, "owner_team_id" | "created_by_user_id">
    >();
  return rows.results.map((row) => {
    return {
      ...mapProjectSummaryData(row),
      owner: projectOwner(row),
      createdByUserId: row.created_by_user_id,
    };
  });
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

  if (existingProject) {
    if (
      (options.baseRevision !== undefined &&
        existingProject.revision !== options.baseRevision) ||
      (!options.forceWrite &&
        options.baseDesignUpdatedAt &&
        existingProject.designUpdatedAt !== options.baseDesignUpdatedAt) ||
      (!options.forceWrite &&
        options.baseRevision === undefined &&
        !options.baseDesignUpdatedAt &&
        existingSerializedJson !== serializedJson)
    ) {
      throw new ProjectVersionConflictError({
        projectId,
        title,
        localUpdatedAt: normalized.updatedAt,
        cloudUpdatedAt: existingProject.designUpdatedAt,
        cloudProject: existingProject,
      });
    }

    if (
      existingSerializedJson === serializedJson &&
      existingProject.title === title &&
      existingProject.description === description
    ) {
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
          archived_at,
          created_by_user_id
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?)
        on conflict(id) do update set
          title = excluded.title,
          description = excluded.description,
          design_json = excluded.design_json,
          field_width = excluded.field_width,
          field_height = excluded.field_height,
          shape_count = excluded.shape_count,
          updated_at = excluded.updated_at,
          archived_at = null,
          revision = projects.revision + 1
        where projects.owner_user_id = excluded.owner_user_id
          and projects.owner_team_id is null
          and projects.archived_at is null
          and projects.revision = ?
        returning
          revision,
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
      ownerUserId,
      existingProject?.revision ?? 0
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
        `INSERT INTO projects(id,owner_user_id,title,description,design_json,field_width,field_height,shape_count,created_at,updated_at,archived_at,created_by_user_id)
      SELECT ?,?,?,?,?,?,?,?,?,?,NULL,? FROM mcp_draft_requests WHERE user_id=? AND request_key=? AND request_hash=? AND project_id=?
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
  const access = projectAuthorizationPredicate(
    { userId: ownerUserId, scope: { kind: "personal" } },
    "read"
  );
  const row = await db
    .prepare(
      `
        select
          revision,
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
        where id = ? and ${access.sql} and archived_at is null
        limit 1
      `
    )
    .bind(projectId, ...access.bindings)
    .first<ProjectRow>();

  return row ? mapProjectRow(row) : null;
}

export async function listProjectsForUser(ownerUserId: string) {
  const db = await getDatabase();
  const result = await db
    .prepare(
      `
        select
          revision,
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
        where owner_user_id = ? and owner_team_id is null and archived_at is null
        order by updated_at desc
      `
    )
    .bind(ownerUserId)
    .all<ProjectRow>();

  return result.results.map(mapProjectRow);
}

type ProjectSummaryRow = {
  id: string;
  owner_user_id: string | null;
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
        `SELECT id, updated_at FROM projects WHERE id = ? AND owner_user_id = ? AND owner_team_id IS NULL AND archived_at IS NULL ${projectAccess?.mode === "selected" ? "AND id IN (SELECT value FROM json_each(?))" : ""}`
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
        where owner_user_id = ? and owner_team_id is null and archived_at is null
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

function mapProjectSummaryData(
  row: ProjectSummaryRow
): Omit<StoredProjectSummary, "ownerUserId"> {
  return {
    id: row.id,
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

function mapProjectSummary(row: ProjectSummaryRow): StoredProjectSummary {
  if (!row.owner_user_id)
    throw new Error("Expected a personal project summary");
  return { ...mapProjectSummaryData(row), ownerUserId: row.owner_user_id };
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
        where id = ? and owner_user_id = ? and owner_team_id is null and archived_at is null
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
