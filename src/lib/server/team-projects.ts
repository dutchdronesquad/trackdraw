import "server-only";
import { getDatabase } from "@/lib/server/db";
import {
  getAuthorizedTeam,
  type ProjectActor,
} from "@/lib/server/project-authorization";
import { getProjectForActor } from "@/lib/server/projects";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import type {
  ProjectMovePreview,
  TeamProjectSummary,
} from "@/lib/team-projects";

import { TeamProjectError } from "./team-project-error";
import { readProjectEditor } from "./team-project-leases";
export { TeamProjectError } from "./team-project-error";
const actorFor = (userId: string, teamId: string): ProjectActor => ({
  userId,
  scope: { kind: "team", teamId },
});
// Compare the entire publication state inside the ownership UPDATE, including new/revoked links.
// The client receives a hash, never the tokens used to construct this internal snapshot.
const publicationsSQL = `(SELECT COALESCE(json_group_array(json_array(token, revoked_at, expires_at, share_updated, gallery_state, gallery_updated)), '[]') FROM
  (SELECT s.token, s.revoked_at, s.expires_at, s.updated_at AS share_updated, g.gallery_state, g.updated_at AS gallery_updated
   FROM shares s LEFT JOIN gallery_entries g ON g.share_token=s.token WHERE s.project_id=projects.id ORDER BY s.token))`;
async function fingerprint(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}
export async function listTeamProjects(
  userId: string,
  teamId: string,
  afterId?: string
) {
  const actor = actorFor(userId, teamId);
  const team = await getAuthorizedTeam(actor, "list");
  if (!team) throw new TeamProjectError("not_found");
  const db = await getDatabase();
  let after: { id: string; updated_at: string } | null = null;
  if (afterId) {
    after = await db
      .prepare(
        `SELECT id, updated_at FROM projects WHERE id=? AND owner_team_id=? AND owner_user_id IS NULL AND archived_at IS NULL
      AND EXISTS (SELECT 1 FROM team_members WHERE organizationId=projects.owner_team_id AND userId=?)`
      )
      .bind(afterId, teamId, userId)
      .first<{ id: string; updated_at: string }>();
    if (!after) throw new TeamProjectError("invalid", 400);
  }
  const rows = await db
    .prepare(
      `SELECT id, title, revision, updated_at AS updatedAt, shape_count AS shapeCount
    FROM projects WHERE owner_team_id=? AND owner_user_id IS NULL AND archived_at IS NULL
    AND EXISTS (SELECT 1 FROM team_members WHERE organizationId=projects.owner_team_id AND userId=?)
    ${after ? "AND (updated_at < ? OR (updated_at = ? AND id > ?))" : ""}
    ORDER BY updated_at DESC, id ASC LIMIT 51`
    )
    .bind(
      teamId,
      userId,
      ...(after ? [after.updated_at, after.updated_at, after.id] : [])
    )
    .all<TeamProjectSummary>();
  const projects = rows.results.slice(0, 50);
  return {
    team,
    projects,
    nextCursor: rows.results.length > 50 ? projects.at(-1)!.id : null,
  };
}
export async function readTeamProject(
  userId: string,
  teamId: string,
  projectId: string
) {
  const actor = actorFor(userId, teamId);
  const project = await getProjectForActor(projectId, actor);
  const team = await getAuthorizedTeam(actor, "read");
  if (!project || !team) throw new TeamProjectError("not_found");
  return { team, project, editing: await readProjectEditor(projectId) };
}
export async function createTeamProject(
  userId: string,
  teamId: string,
  title: string
) {
  const db = await getDatabase();
  const design = { ...createDefaultDesign(), id: crypto.randomUUID(), title };
  const row = await db
    .prepare(
      `INSERT INTO projects (id,owner_team_id,created_by_user_id,title,design_json,field_width,field_height,shape_count,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,0,?,? WHERE EXISTS (SELECT 1 FROM team_members WHERE organizationId=? AND userId=? AND role IN ('owner','editor') AND NOT EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.team_id=team_members.organizationId AND c.state='recovery'))
    RETURNING id`
    )
    .bind(
      design.id,
      teamId,
      userId,
      title,
      JSON.stringify(serializeDesign(design)),
      design.field.width,
      design.field.height,
      design.createdAt,
      design.updatedAt,
      teamId,
      userId
    )
    .first<{ id: string }>();
  if (!row) throw new TeamProjectError("not_found");
  return readTeamProject(userId, teamId, row.id);
}
async function moveState(userId: string, projectId: string) {
  const db = await getDatabase();
  return db
    .prepare(
      `SELECT id, title, revision, ${publicationsSQL} AS publications,
    (SELECT count(*) FROM shares WHERE project_id=projects.id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)) AS shareCount,
    (SELECT count(*) FROM shares JOIN gallery_entries g ON g.share_token=shares.token WHERE project_id=projects.id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) AND g.gallery_state IN ('listed','featured')) AS galleryCount
    FROM projects WHERE id=? AND owner_user_id=? AND owner_team_id IS NULL AND archived_at IS NULL`
    )
    .bind(new Date().toISOString(), new Date().toISOString(), projectId, userId)
    .first<{
      id: string;
      title: string;
      revision: number;
      publications: string;
      shareCount: number;
      galleryCount: number;
    }>();
}
export async function previewProjectMove(
  userId: string,
  projectId: string
): Promise<ProjectMovePreview> {
  const row = await moveState(userId, projectId);
  if (!row) throw new TeamProjectError("not_found");
  return {
    projectId: row.id,
    title: row.title,
    revision: row.revision,
    publicationVersion: await fingerprint(row.publications),
    shareCount: row.shareCount,
    galleryCount: row.galleryCount,
  };
}
export async function movePersonalProject(
  userId: string,
  teamId: string,
  projectId: string,
  revision: number,
  publicationVersion: string
) {
  const state = await moveState(userId, projectId);
  if (!state) throw new TeamProjectError("not_found");
  if (
    state.revision !== revision ||
    (await fingerprint(state.publications)) !== publicationVersion
  )
    throw new TeamProjectError("conflict", 409);
  const db = await getDatabase();
  const row = await db
    .prepare(
      `UPDATE projects SET owner_user_id=NULL, owner_team_id=?, updated_at=?, revision=revision+1
    WHERE id=? AND owner_user_id=? AND owner_team_id IS NULL AND archived_at IS NULL AND revision=?
    AND EXISTS (SELECT 1 FROM team_members WHERE organizationId=? AND userId=? AND role='owner')
    AND NOT EXISTS (SELECT 1 FROM project_edit_leases WHERE project_id=projects.id AND expires_at > ?)
    AND ${publicationsSQL}=? RETURNING id`
    )
    .bind(
      teamId,
      new Date().toISOString(),
      projectId,
      userId,
      revision,
      teamId,
      userId,
      new Date().toISOString(),
      state.publications
    )
    .first<{ id: string }>();
  if (!row) throw new TeamProjectError("conflict", 409);
  return readTeamProject(userId, teamId, row.id);
}
