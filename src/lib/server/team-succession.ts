import "server-only";
import type { getDatabase } from "./db";
import {
  successionCommandSchema,
  type SuccessionCase,
} from "@/lib/team-succession";

type Db = Awaited<ReturnType<typeof getDatabase>>;
export class SuccessionError extends Error {}
export async function readSuccessionCases(
  db: Db,
  userId: string,
  admin = false,
  options: { after?: string; teamId?: string } = {}
): Promise<SuccessionCase[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id,c.team_id AS teamId,t.name AS teamName,c.state,c.removal_at AS removalAt,c.purge_at AS purgeAt,
    (SELECT count(*) FROM team_members WHERE organizationId=c.team_id) AS memberCount,
    EXISTS(SELECT 1 FROM team_succession_eligible e JOIN team_members m ON m.id=e.member_id AND m.userId=e.user_id JOIN users u ON u.id=m.userId WHERE e.case_id=c.id AND e.user_id=? AND m.role='editor' AND u.banned_at IS NULL AND u.emailVerified=1) AS eligible
    FROM team_succession_cases c JOIN teams t ON t.id=c.team_id WHERE (c.state IN ('open','recovery') OR (?=1 AND c.state='resolved' AND EXISTS(SELECT 1 FROM team_succession_notices n WHERE n.case_id=c.id AND n.uncertain=1 AND n.sent_at IS NULL)))
    AND (?=1 OR EXISTS(SELECT 1 FROM team_members WHERE organizationId=c.team_id AND userId=?)) AND c.id>? AND (? IS NULL OR c.team_id=?) ORDER BY c.id LIMIT 10`
    )
    .bind(
      userId,
      admin ? 1 : 0,
      admin ? 1 : 0,
      userId,
      options.after ?? "",
      options.teamId ?? null,
      options.teamId ?? null
    )
    .all<
      Omit<
        SuccessionCase,
        "canApply" | "viewerId" | "applications" | "notices"
      > & { eligible: number }
    >();
  return Promise.all(
    results.map(async ({ eligible, ...c }) => {
      const apps = await db
        .prepare(
          `SELECT a.id,a.user_id AS userId,coalesce(nullif(u.name,''),'Team member') AS name,a.requested_at AS requestedAt,a.response_at AS responseAt,a.withdrawn_at AS withdrawnAt,
      EXISTS(SELECT 1 FROM team_succession_eligible e JOIN team_members m ON m.id=e.member_id AND m.userId=e.user_id WHERE e.case_id=a.case_id AND e.user_id=a.user_id AND m.role='editor' AND u.banned_at IS NULL AND u.emailVerified=1) AS eligible
      FROM team_succession_applications a JOIN users u ON u.id=a.user_id WHERE a.case_id=? ORDER BY a.requested_at,a.id`
        )
        .bind(c.id)
        .all<SuccessionCase["applications"][number]>();
      return {
        ...c,
        viewerId: userId,
        ...(admin
          ? {
              notices: (
                await db
                  .prepare(
                    `SELECT n.id,n.event,n.sent_at AS sentAt,n.uncertain,u.email AS recipient,'team-succession-'||n.id||'-'||n.attempt_generation AS deliveryKey FROM team_succession_notices n JOIN users u ON u.id=n.user_id WHERE n.case_id=? AND EXISTS(SELECT 1 FROM team_members m WHERE m.organizationId=? AND m.userId=n.user_id) ORDER BY n.due_at,n.id`
                  )
                  .bind(c.id, c.teamId)
                  .all<NonNullable<SuccessionCase["notices"]>[number]>()
              ).results,
            }
          : {}),
        canApply:
          !!eligible &&
          !apps.results.some((a) => a.userId === userId) &&
          (!c.purgeAt || Date.parse(c.purgeAt) - Date.now() >= 30 * 86400000),
        applications: apps.results.map((a) => ({
          ...a,
          eligible: !!a.eligible,
        })),
      };
    })
  );
}
export async function executeSuccessionCommand(
  db: Db,
  userId: string,
  input: unknown,
  admin = false
) {
  const parsed = successionCommandSchema.safeParse(input);
  if (!parsed.success) throw new SuccessionError("invalid");
  const c = parsed.data;
  if (["confirm-notice", "retry-notice"].includes(c.action) && !admin)
    throw new SuccessionError("forbidden");
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
        `INSERT INTO team_succession_commands(id,case_id,actor_id,action,notice_id,reason,now) VALUES(?,?,?,?,?,?,?)`
      )
      .bind(
        crypto.randomUUID(),
        c.caseId,
        userId,
        c.action,

        c.noticeId ?? null,
        c.reason,
        new Date().toISOString()
      )
      .run();
  } catch {
    throw new SuccessionError("conflict");
  }
}
