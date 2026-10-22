import "server-only";
import { getDatabase } from "@/lib/server/db";
import { getAuthorizedTeam } from "@/lib/server/project-authorization";
import { sendTeamInvitationEmail } from "@/lib/server/team-mail";
import {
  teamCommandSchema,
  type TeamErrorCode,
  type TeamOverview,
  type TeamDetails,
  type TeamInvitation,
  type TeamDeletionImpact,
} from "@/lib/teams";

export class TeamError extends Error {
  constructor(
    readonly code: TeamErrorCode,
    readonly status = 400
  ) {
    super(code);
    this.name = "TeamError";
  }
}
type Db = Awaited<ReturnType<typeof getDatabase>>;
const scope = (userId: string, teamId: string) => ({
  userId,
  scope: { kind: "team" as const, teamId },
});
const ownerSQL = `EXISTS (SELECT 1 FROM team_members AS manager WHERE manager.organizationId = ? AND manager.userId = ? AND manager.role = 'owner')`;
const verifiedSQL = `EXISTS (SELECT 1 FROM users WHERE id = ? AND emailVerified = 1 AND banned_at IS NULL)`;
async function owner(userId: string, teamId: string) {
  const team = await getAuthorizedTeam(scope(userId, teamId), "manage-members");
  if (!team) throw new TeamError("not_found", 404);
  return team;
}
async function verified(db: Db, userId: string) {
  const user = await db
    .prepare(
      "SELECT email FROM users WHERE id=? AND emailVerified=1 AND banned_at IS NULL"
    )
    .bind(userId)
    .first<{ email: string }>();
  if (!user) throw new TeamError("verification", 403);
  return user;
}
async function budget(
  db: Db,
  userId: string,
  action: "mutation" | "invitation"
) {
  const window = Math.floor(Date.now() / 3600000);
  const limit = action === "invitation" ? 10 : 100;
  const result = await db
    .prepare(
      `INSERT INTO team_action_limits(user_id,action,window_start,used) VALUES(?,?,?,1)
    ON CONFLICT(user_id,action) DO UPDATE SET window_start=excluded.window_start,
      used=CASE WHEN team_action_limits.window_start=excluded.window_start THEN team_action_limits.used+1 ELSE 1 END
    WHERE team_action_limits.window_start<>excluded.window_start OR team_action_limits.used<? RETURNING used`
    )
    .bind(userId, action, window, limit)
    .first();
  if (!result) throw new TeamError("limit", 429);
}
const invitationColumns = `i.id,i.organizationId AS teamId,t.name AS teamName,i.role,
  CASE WHEN i.status='pending' AND i.expiresAt<=? THEN 'expired' WHEN i.status='pending' AND i.delivery_state='pending' THEN 'sending' ELSE i.status END AS status,i.expiresAt`;
export async function listTeams(userId: string): Promise<TeamOverview> {
  const db = await getDatabase();
  const teams = await db
    .prepare(
      `SELECT t.id,t.name,m.role,
        CASE WHEN m.role='owner' THEN (SELECT count(*) FROM team_members member WHERE member.organizationId=t.id) END AS member_count,
        CASE WHEN m.role='owner' THEN (
          SELECT json_group_array(display_name) FROM (
            SELECT coalesce(nullif(trim(u.name),''),u.email) AS display_name
            FROM team_members member JOIN users u ON u.id=member.userId
            WHERE member.organizationId=t.id
            ORDER BY CASE WHEN member.role='owner' THEN 0 ELSE 1 END,member.createdAt,member.id LIMIT 3
          )
        ) END AS member_names
      FROM teams t JOIN team_members m ON m.organizationId=t.id WHERE m.userId=? ORDER BY t.name,t.id LIMIT 20`
    )
    .bind(userId)
    .all<
      Omit<TeamOverview["teams"][number], "memberPreview"> & {
        member_count: number | null;
        member_names: string | null;
      }
    >();
  const invitations = await db
    .prepare(
      `SELECT ${invitationColumns} FROM team_invitations i JOIN teams t ON t.id=i.organizationId
    JOIN users u ON lower(u.email)=lower(i.email) AND u.id=? AND u.emailVerified=1 AND u.banned_at IS NULL
    WHERE i.createdAt>=? ORDER BY i.createdAt DESC,i.id LIMIT 50`
    )
    .bind(
      new Date().toISOString(),
      userId,
      new Date(Date.now() - 30 * 86400000).toISOString()
    )
    .all<TeamInvitation>();
  return {
    teams: teams.results.map(({ member_count, member_names, ...team }) =>
      member_count === null
        ? team
        : {
            ...team,
            memberPreview: {
              total: member_count,
              names: JSON.parse(member_names ?? "[]") as string[],
            },
          }
    ),
    invitations: invitations.results,
  };
}
export async function getTeamInvitationForUser(
  userId: string,
  invitationId: string
): Promise<TeamInvitation> {
  const db = await getDatabase();
  const invitation = await db
    .prepare(
      `SELECT ${invitationColumns} FROM team_invitations i JOIN teams t ON t.id=i.organizationId
    JOIN users u ON lower(u.email)=lower(i.email) AND u.id=? AND u.emailVerified=1 AND u.banned_at IS NULL
    WHERE i.id=?`
    )
    .bind(new Date().toISOString(), userId, invitationId)
    .first<TeamInvitation>();
  if (!invitation) throw new TeamError("not_found", 404);
  return invitation;
}

const impactQueries = {
  projects: "SELECT count(*) FROM projects WHERE owner_team_id = teams.id",
  members: "SELECT count(*) FROM team_members WHERE organizationId = teams.id",
  invitations:
    "SELECT count(*) FROM team_invitations WHERE organizationId = teams.id AND status = 'pending' AND expiresAt > strftime('%Y-%m-%dT%H:%M:%fZ','now')",
  shares:
    "SELECT count(*) FROM shares s JOIN projects p ON p.id = s.project_id WHERE p.owner_team_id = teams.id AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
  galleryEntries:
    "SELECT count(*) FROM gallery_entries g JOIN shares s ON s.token = g.share_token JOIN projects p ON p.id = s.project_id WHERE p.owner_team_id = teams.id",
  editingSessions:
    "SELECT count(*) FROM project_edit_leases l JOIN projects p ON p.id = l.project_id WHERE p.owner_team_id = teams.id AND l.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')",
} satisfies Record<keyof TeamDeletionImpact, string>;
async function deletionImpact(db: Db, userId: string, teamId: string) {
  return db
    .prepare(
      `SELECT ${Object.entries(impactQueries)
        .map(([key, query]) => `(${query}) AS ${key}`)
        .join(",")} FROM teams WHERE id=? AND ${ownerSQL}`
    )
    .bind(teamId, teamId, userId)
    .first<TeamDeletionImpact>();
}

export async function getTeamDetails(
  userId: string,
  teamId: string
): Promise<TeamDetails> {
  const team = await getAuthorizedTeam(scope(userId, teamId), "read");
  if (!team) throw new TeamError("not_found", 404);
  if (team.role !== "owner") return { ...team, members: [], invitations: [] };
  const db = await getDatabase();
  const members = await db
    .prepare(
      `SELECT m.userId,u.name,u.email,m.role FROM team_members m JOIN users u ON u.id=m.userId
    WHERE m.organizationId=? AND ${ownerSQL} ORDER BY m.createdAt,m.id LIMIT 50`
    )
    .bind(teamId, teamId, userId)
    .all<TeamDetails["members"][number]>();
  const invitations = await db
    .prepare(
      `SELECT ${invitationColumns},i.email FROM team_invitations i JOIN teams t ON t.id=i.organizationId
    WHERE i.organizationId=? AND ${ownerSQL} ORDER BY (i.status='pending') DESC,i.createdAt DESC,i.id LIMIT 100`
    )
    .bind(new Date().toISOString(), teamId, teamId, userId)
    .all<TeamDetails["invitations"][number]>();
  return {
    ...team,
    deletionImpact: (await deletionImpact(db, userId, teamId)) ?? undefined,
    members: members.results,
    invitations: invitations.results,
  };
}

async function invite(
  db: Db,
  userId: string,
  teamId: string,
  email: string,
  role: "editor" | "viewer",
  oldId?: string
) {
  const team = await owner(userId, teamId);
  await verified(db, userId);
  await budget(db, userId, "invitation");
  const id = crypto.randomUUID(),
    now = new Date().toISOString(),
    expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const replacement = oldId
    ? [
        db
          .prepare(
            `UPDATE team_invitations SET status='canceled' WHERE id=? AND organizationId=? AND status='pending' AND ${ownerSQL}`
          )
          .bind(oldId, teamId, teamId, userId),
      ]
    : [];
  const results = await db.batch<{ id: string }>([
    ...replacement,
    db
      .prepare(
        `INSERT INTO team_invitations(id,organizationId,email,role,status,inviterId,expiresAt,createdAt,delivery_state)
    SELECT ?,?,?,?,'pending',?,?,?,'pending' WHERE ${ownerSQL} AND ${verifiedSQL}
    AND (SELECT COUNT(*) FROM team_invitations WHERE organizationId=? AND status='pending' AND expiresAt>?)<20
    AND NOT EXISTS (SELECT 1 FROM team_invitations WHERE organizationId=? AND lower(email)=? AND status='pending')
    AND NOT EXISTS (SELECT 1 FROM team_members m JOIN users u ON u.id=m.userId WHERE m.organizationId=? AND lower(u.email)=?)
    ${oldId ? "AND changes()=1" : ""} RETURNING id`
      )
      .bind(
        id,
        teamId,
        email,
        role,
        userId,
        expires,
        now,
        teamId,
        userId,
        userId,
        teamId,
        now,
        teamId,
        email,
        teamId,
        email
      ),
  ]);
  if (!results.at(-1)?.results.length) throw new TeamError("limit", 409);
  try {
    await sendTeamInvitationEmail(id, email, team.name);
    await db
      .prepare(
        "UPDATE team_invitations SET delivery_state='sent' WHERE id=? AND status='pending'"
      )
      .bind(id)
      .run();
  } catch {
    // A failed/ambiguous delivery never leaves a usable invitation behind.
    await db
      .prepare(
        "UPDATE team_invitations SET status='canceled',delivery_state='failed' WHERE id=? AND status='pending'"
      )
      .bind(id)
      .run();
    throw new TeamError("delivery", 502);
  }
  return { teamId };
}

export async function executeTeamCommand(userId: string, input: unknown) {
  const parsed = teamCommandSchema.safeParse(input);
  if (!parsed.success) throw new TeamError("invalid");
  const command = parsed.data,
    db = await getDatabase();
  await budget(db, userId, "mutation");
  if (command.action === "create") {
    await verified(db, userId);
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    const rows = await db.batch<{ id: string }>([
      db
        .prepare(
          `INSERT INTO teams(id,name,slug,createdAt) SELECT ?,?,?,? WHERE ${verifiedSQL}
        AND (SELECT COUNT(*) FROM team_members WHERE userId=?)<20
        AND (SELECT COUNT(*) FROM team_members WHERE userId=? AND role='owner')<5 RETURNING id`
        )
        .bind(id, command.name, id, now, userId, userId, userId),
      db
        .prepare(
          `INSERT INTO team_members(id,organizationId,userId,role,createdAt) SELECT ?,id,?,'owner',? FROM teams WHERE id=? RETURNING id`
        )
        .bind(crypto.randomUUID(), userId, now, id),
    ]);
    if (!rows[0].results.length) throw new TeamError("limit", 409);
    return { teamId: id };
  }
  if (command.action === "accept") {
    await verified(db, userId);
    const now = new Date().toISOString();
    // Conditional INSERT and terminal status update share one D1 transaction.
    const rows = await db.batch<{ organizationId: string }>([
      db
        .prepare(
          `INSERT INTO team_members(id,organizationId,userId,role,createdAt)
        SELECT ?,i.organizationId,u.id,i.role,? FROM team_invitations i JOIN users u ON lower(u.email)=lower(i.email)
        WHERE i.id=? AND i.status='pending' AND i.delivery_state='sent' AND i.expiresAt>? AND u.id=? AND u.emailVerified=1 AND u.banned_at IS NULL
        AND (SELECT COUNT(*) FROM team_members WHERE organizationId=i.organizationId)<50
        AND (SELECT COUNT(*) FROM team_members WHERE userId=u.id)<20
        AND EXISTS (SELECT 1 FROM team_members WHERE organizationId=i.organizationId AND role='owner')
        AND NOT EXISTS (SELECT 1 FROM team_members WHERE organizationId=i.organizationId AND userId=u.id)
        RETURNING organizationId`
        )
        .bind(crypto.randomUUID(), now, command.invitationId, now, userId),
      db
        .prepare(
          `UPDATE team_invitations SET status='accepted' WHERE id=? AND status='pending' AND changes()=1`
        )
        .bind(command.invitationId),
    ]);
    const joined = rows[0].results[0];
    if (!joined) throw new TeamError("not_found", 404);
    return { teamId: joined.organizationId };
  }
  if (command.action === "leave") {
    const removed = await db
      .prepare(
        "DELETE FROM team_members WHERE organizationId=? AND userId=? AND role<>'owner' RETURNING id"
      )
      .bind(command.teamId, userId)
      .first();
    if (!removed) {
      const member = await getAuthorizedTeam(
        scope(userId, command.teamId),
        "read"
      );
      throw new TeamError(
        member?.role === "owner" ? "owner_required" : "not_found",
        409
      );
    }
    return { teamId: command.teamId };
  }
  await owner(userId, command.teamId);
  if (command.action === "transfer-owner") {
    if (command.userId === userId) throw new TeamError("transfer_invalid", 409);
    try {
      const row = await db
        .prepare(
          `INSERT INTO team_owner_transfers(team_id,from_user_id,to_user_id)
        SELECT ?,?,? WHERE ${ownerSQL} RETURNING team_id`
        )
        .bind(command.teamId, userId, command.userId, command.teamId, userId)
        .first();
      if (!row) throw new TeamError("not_found", 404);
    } catch (error) {
      if (error instanceof TeamError) throw error;
      if (String(error).includes("team_transfer_invalid"))
        throw new TeamError("transfer_invalid", 409);
      throw error;
    }
    return { teamId: command.teamId };
  }
  if (command.action === "delete") {
    const row = await db
      .prepare(
        `DELETE FROM teams WHERE id=? AND name=? AND ${ownerSQL}
      AND ${Object.values(impactQueries)
        .map((query) => `(${query}) = ?`)
        .join(" AND ")} RETURNING id`
      )
      .bind(
        command.teamId,
        command.confirmation,
        command.teamId,
        userId,
        ...Object.keys(impactQueries).map(
          (key) => command.impact[key as keyof TeamDeletionImpact]
        )
      )
      .first();
    if (!row) throw new TeamError("impact_changed", 409);
    return { teamId: command.teamId };
  }
  if (command.action === "invite")
    return invite(db, userId, command.teamId, command.email, command.role);
  if (command.action === "resend") {
    const old = await db
      .prepare(
        `SELECT email,role FROM team_invitations WHERE id=? AND organizationId=? AND status='pending' AND ${ownerSQL}`
      )
      .bind(command.invitationId, command.teamId, command.teamId, userId)
      .first<{ email: string; role: "editor" | "viewer" }>();
    if (!old) throw new TeamError("not_found", 404);
    return invite(
      db,
      userId,
      command.teamId,
      old.email,
      old.role,
      command.invitationId
    );
  }
  let changed: unknown;
  if (command.action === "rename")
    changed = await db
      .prepare(
        `UPDATE teams SET name=? WHERE id=? AND ${ownerSQL} RETURNING id`
      )
      .bind(command.name, command.teamId, command.teamId, userId)
      .first();
  if (command.action === "revoke")
    changed = await db
      .prepare(
        `UPDATE team_invitations SET status='canceled' WHERE id=? AND organizationId=? AND status='pending' AND ${ownerSQL} RETURNING id`
      )
      .bind(command.invitationId, command.teamId, command.teamId, userId)
      .first();
  if (command.action === "role")
    changed = await db
      .prepare(
        `UPDATE team_members SET role=? WHERE organizationId=? AND userId=? AND role<>'owner' AND ${ownerSQL} RETURNING id`
      )
      .bind(
        command.role,
        command.teamId,
        command.userId,
        command.teamId,
        userId
      )
      .first();
  if (command.action === "remove")
    changed = await db
      .prepare(
        `DELETE FROM team_members WHERE organizationId=? AND userId=? AND role<>'owner' AND ${ownerSQL} RETURNING id`
      )
      .bind(command.teamId, command.userId, command.teamId, userId)
      .first();
  if (!changed) throw new TeamError("not_found", 404);
  return { teamId: command.teamId };
}
