import "server-only";
import type { getDatabase } from "./db";
import {
  adminOwnerChangeSchema,
  type AdminTeam,
  type AdminTeamMember,
} from "@/lib/admin-teams";
import { readSuccessionCases, SuccessionError } from "./team-succession";
type Db = Awaited<ReturnType<typeof getDatabase>>;
async function requireAdmin(db: Db, userId: string) {
  if (
    !(await db
      .prepare(
        "SELECT id FROM users WHERE id=? AND role='admin' AND banned_at IS NULL"
      )
      .bind(userId)
      .first())
  )
    throw new SuccessionError("forbidden");
}
export async function listAdminTeams(
  db: Db,
  userId: string,
  options: { search?: string; after?: string; attention?: boolean } = {}
) {
  await requireAdmin(db, userId);
  const { results } = await db
    .prepare(
      `SELECT t.id,t.name,owner.userId AS ownerId,u.name AS ownerName,
    (SELECT count(*) FROM team_members WHERE organizationId=t.id) AS memberCount,
    (SELECT count(*) FROM projects WHERE owner_team_id=t.id) AS projectCount,
    coalesce(c.state,'active') AS state,coalesce(c.purge_at,c.removal_at) AS deadline
    FROM teams t LEFT JOIN team_members owner ON owner.organizationId=t.id AND owner.role='owner'
    LEFT JOIN users u ON u.id=owner.userId LEFT JOIN team_succession_cases c ON c.team_id=t.id AND c.state IN ('open','recovery')
    WHERE t.id>? AND instr(lower(t.name),lower(?))>0 AND (?=0 OR c.id IS NOT NULL)
    ORDER BY t.id LIMIT 26`
    )
    .bind(options.after ?? "", options.search ?? "", options.attention ? 1 : 0)
    .all<AdminTeam>();
  return {
    teams: results.slice(0, 25),
    next: results.length > 25 ? results[24].id : null,
  };
}
export async function readAdminTeam(db: Db, userId: string, teamId: string) {
  await requireAdmin(db, userId);
  if (
    !(await db.prepare("SELECT id FROM teams WHERE id=?").bind(teamId).first())
  )
    return null;
  const { results } = await db
    .prepare(
      `SELECT m.userId AS id,coalesce(nullif(u.name,''),'Team member') AS name,m.role,
    (m.role='editor' AND u.emailVerified=1 AND u.banned_at IS NULL AND (SELECT count(*) FROM team_members WHERE userId=m.userId AND role='owner')<5) AS canOwn
    FROM team_members m JOIN users u ON u.id=m.userId WHERE m.organizationId=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END,m.createdAt,m.id`
    )
    .bind(teamId)
    .all<Omit<AdminTeamMember, "canOwn"> & { canOwn: number }>();
  return {
    members: results.map((m) => ({ ...m, canOwn: !!m.canOwn })),
    cases: await readSuccessionCases(db, userId, true, { teamId }),
  };
}
export async function correctTeamOwner(db: Db, userId: string, input: unknown) {
  await requireAdmin(db, userId);
  const c = adminOwnerChangeSchema.parse(input);
  const quota = await db
    .prepare(
      `INSERT INTO team_action_limits(user_id,action,window_start,used) VALUES(?,'mutation',?,1) ON CONFLICT(user_id,action) DO UPDATE SET window_start=excluded.window_start,used=CASE WHEN team_action_limits.window_start=excluded.window_start THEN team_action_limits.used+1 ELSE 1 END WHERE team_action_limits.window_start<>excluded.window_start OR team_action_limits.used<100 RETURNING used`
    )
    .bind(userId, Math.floor(Date.now() / 3600000))
    .first();
  if (!quota) throw new SuccessionError("limit");
  try {
    await db
      .prepare(
        "INSERT INTO team_admin_owner_changes(id,team_id,actor_id,owner_id,target_id,reason,now) VALUES(?,?,?,?,?,?,?)"
      )
      .bind(
        crypto.randomUUID(),
        c.teamId,
        userId,
        c.ownerId,
        c.targetId,
        c.reason,
        new Date().toISOString()
      )
      .run();
  } catch {
    throw new SuccessionError("conflict");
  }
}
