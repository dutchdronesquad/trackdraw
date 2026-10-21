import "server-only";
import { getDatabase } from "./db";
import { projectAuthorizationPredicate } from "./project-authorization";
import { TeamProjectError } from "./team-project-error";
import { getProjectForActor } from "./projects";
import { getDesignShapes, serializeDesign } from "@/lib/track/design";
import type { TrackDesign } from "@/lib/types";
import type { ProjectEditor } from "@/lib/team-projects";

// Evaluate expiry at statement execution, never against a request's earlier clock.
const now = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const expiry = "strftime('%Y-%m-%dT%H:%M:%fZ','now','+90 seconds')";
function access(userId: string, teamId: string) {
  return projectAuthorizationPredicate(
    { userId, scope: { kind: "team", teamId } },
    "update"
  );
}
export async function readProjectEditor(
  projectId: string
): Promise<ProjectEditor | null> {
  const db = await getDatabase();
  // Session secrets are never exposed to viewers or other tabs, including the same actor.
  return db
    .prepare(
      `SELECT l.user_id AS userId, COALESCE(NULLIF(u.name,''), 'Team member') AS name, l.expires_at AS expiresAt
    FROM project_edit_leases l JOIN users u ON u.id=l.user_id JOIN projects p ON p.id=l.project_id
    WHERE l.project_id=? AND l.expires_at > ${now} AND p.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM team_members m WHERE m.organizationId=p.owner_team_id AND m.userId=l.user_id AND m.role IN ('owner','editor'))`
    )
    .bind(projectId)
    .first<ProjectEditor>();
}
export async function acquireProjectLease(
  userId: string,
  teamId: string,
  projectId: string
) {
  const db = await getDatabase();
  const auth = access(userId, teamId);
  const sessionId = crypto.randomUUID();
  const lease = await db
    .prepare(
      `INSERT INTO project_edit_leases(project_id,user_id,session_id,expires_at)
    SELECT id,?,?,${expiry} FROM projects WHERE id=? AND archived_at IS NULL AND ${auth.sql}
    ON CONFLICT(project_id) DO UPDATE SET user_id=excluded.user_id,session_id=excluded.session_id,expires_at=excluded.expires_at
    WHERE project_edit_leases.expires_at <= ${now}
    RETURNING session_id AS sessionId, expires_at AS expiresAt`
    )
    .bind(userId, sessionId, projectId, ...auth.bindings)
    .first<{ sessionId: string; expiresAt: string }>();
  if (!lease) throw new TeamProjectError("lease_unavailable", 409);
  // No client draft is accepted during acquisition. Every new lease loads server state.
  const project = await getProjectForActor(projectId, {
    userId,
    scope: { kind: "team", teamId },
  });
  if (!project) throw new TeamProjectError("not_found");
  return { lease, project };
}
export async function renewProjectLease(
  userId: string,
  teamId: string,
  projectId: string,
  sessionId: string
) {
  const db = await getDatabase();
  const auth = access(userId, teamId);
  const lease = await db
    .prepare(
      `UPDATE project_edit_leases SET expires_at=${expiry}
    WHERE project_id=? AND user_id=? AND session_id=? AND expires_at > ${now}
    AND EXISTS (SELECT 1 FROM projects WHERE id=project_edit_leases.project_id AND archived_at IS NULL AND ${auth.sql})
    RETURNING session_id AS sessionId,expires_at AS expiresAt`
    )
    .bind(projectId, userId, sessionId, ...auth.bindings)
    .first<{ sessionId: string; expiresAt: string }>();
  if (!lease) throw new TeamProjectError("lease_lost", 409);
  return { lease };
}
export async function releaseProjectLease(
  userId: string,
  projectId: string,
  sessionId: string
) {
  const db = await getDatabase();
  // Matching the full tuple makes late unload/release harmless after a successor acquires.
  await db
    .prepare(
      "DELETE FROM project_edit_leases WHERE project_id=? AND user_id=? AND session_id=?"
    )
    .bind(projectId, userId, sessionId)
    .run();
  return {};
}
export async function saveTeamProject(
  userId: string,
  teamId: string,
  projectId: string,
  sessionId: string,
  revision: number,
  design: TrackDesign
) {
  if (design.id !== projectId) throw new TeamProjectError("invalid", 400);
  const db = await getDatabase();
  const auth = access(userId, teamId);
  const saved = await db
    .prepare(
      `UPDATE projects SET title=?,description=?,design_json=?,field_width=?,field_height=?,shape_count=?,updated_at=${now},revision=revision+1
    WHERE id=? AND archived_at IS NULL AND revision=? AND ${auth.sql}
    AND EXISTS (SELECT 1 FROM project_edit_leases WHERE project_id=projects.id AND user_id=? AND session_id=? AND expires_at > ${now})
    RETURNING revision`
    )
    .bind(
      design.title,
      design.description ?? "",
      JSON.stringify(serializeDesign(design)),
      design.field.width,
      design.field.height,
      getDesignShapes(design).length,
      projectId,
      revision,
      ...auth.bindings,
      userId,
      sessionId
    )
    .first<{ revision: number }>();
  if (!saved) {
    // Classify without ever retrying or forcing a failed compare-and-swap.
    await renewProjectLease(userId, teamId, projectId, sessionId);
    throw new TeamProjectError("conflict", 409);
  }
  return saved;
}
