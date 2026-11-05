import "server-only";
import { getDatabase } from "./db";
import { TeamProjectError } from "./team-project-error";
import { normalizeDesign } from "@/lib/track/design";
import type { TeamProjectPoll } from "@/lib/team-projects";
import type { SerializedTrackDesign } from "@/lib/types";

type PollRow = {
  revision: number;
  design: string | null;
  teamId: string;
  teamName: string;
  role: TeamProjectPoll["team"]["role"];
  recovery: number;
  editorId: string | null;
  editorName: string | null;
  expiresAt: string | null;
};

/** Authorize and project a single snapshot, including current metadata when unchanged. */
export async function pollTeamProject(
  userId: string,
  teamId: string,
  projectId: string,
  knownRevision: number
): Promise<TeamProjectPoll> {
  const db = await getDatabase();
  const row = await db
    .prepare(
      `
    SELECT projects.revision,
      CASE WHEN projects.revision = ? THEN NULL ELSE projects.design_json END AS design,
      t.id AS teamId, t.name AS teamName, m.role,
      EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.team_id=t.id AND c.state='recovery') AS recovery,
      CASE WHEN em.id IS NOT NULL THEN u.id END AS editorId,
      COALESCE(NULLIF(u.name,''), 'Team member') AS editorName,
      CASE WHEN em.id IS NOT NULL THEN l.expires_at END AS expiresAt
    FROM projects
    JOIN teams t ON t.id=projects.owner_team_id
    JOIN team_members m ON m.organizationId=t.id AND m.userId=? AND m.role IN ('owner','editor','viewer')
    LEFT JOIN project_edit_leases l ON l.project_id=projects.id AND l.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
    LEFT JOIN users u ON u.id=l.user_id
    LEFT JOIN team_members em ON em.organizationId=t.id AND em.userId=l.user_id AND em.role IN ('owner','editor')
    WHERE projects.id=? AND projects.owner_team_id=? AND projects.owner_user_id IS NULL AND projects.archived_at IS NULL
  `
    )
    .bind(knownRevision, userId, projectId, teamId)
    .first<PollRow>();
  if (!row) throw new TeamProjectError("not_found");
  return {
    revision: row.revision,
    team: {
      id: row.teamId,
      name: row.teamName,
      role: row.role,
      ...(row.recovery ? { recovery: true } : {}),
    },
    editing:
      row.editorId && row.expiresAt
        ? {
            userId: row.editorId,
            name: row.editorName ?? "Team member",
            expiresAt: row.expiresAt,
          }
        : null,
    project:
      row.design === null
        ? null
        : {
            revision: row.revision,
            design: normalizeDesign(
              JSON.parse(row.design) as SerializedTrackDesign
            ),
          },
  };
}
