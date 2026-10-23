import type { AccountDeletionDatabase as Db } from "./account-deletion";
import type { TransactionalMailer } from "@/lib/email/plunk-client";
import { buildEmailShell } from "@/lib/email/email-shell";

export async function deliverSuccessionNotices(
  db: Db,
  mailer: TransactionalMailer,
  now = new Date()
) {
  const current = now.toISOString();
  const startedAt = Date.now();
  // Owner activity or a valid owner session invalidates automatic succession.
  await db
    .prepare(
      `UPDATE team_succession_cases SET state='canceled' WHERE state='open' AND EXISTS(SELECT 1 FROM users u WHERE u.id=owner_id AND (u.last_active_at IS NOT activity_at OR EXISTS(SELECT 1 FROM sessions s WHERE s.userId=u.id AND (julianday(s.expiresAt)>julianday(?) OR julianday(s.expiresAt) IS NULL))))`
    )
    .bind(current)
    .run();
  const { results } = await db
    .prepare(
      `SELECT n.id FROM team_succession_notices n JOIN team_succession_cases c ON c.id=n.case_id
    WHERE n.sent_at IS NULL AND n.uncertain=0 AND n.due_at<=? AND (n.claimed_at IS NULL OR julianday(n.claimed_at)<julianday(?,'-5 minutes'))
    AND (c.state IN ('open','recovery') OR (c.state='resolved' AND n.event='outcome'))
    AND EXISTS(SELECT 1 FROM team_members m WHERE m.organizationId=c.team_id AND m.userId=n.user_id)
    ORDER BY n.due_at,n.id LIMIT 2`
    )
    .bind(current, current)
    .all<{ id: string }>();
  let failed = 0;
  for (const row of results) {
    const token = crypto.randomUUID();
    const n = await db
      .prepare(
        `UPDATE team_succession_notices SET claimed_at=?,claim_token=?,attempted_at=coalesce(attempted_at,?)
      WHERE id=? AND sent_at IS NULL AND uncertain=0 AND (claimed_at IS NULL OR julianday(claimed_at)<julianday(?,'-5 minutes'))
      RETURNING id,case_id,user_id,event,application_id,attempted_at,attempt_generation`
      )
      .bind(current, token, current, row.id, current)
      .first<{
        id: string;
        case_id: string;
        user_id: string;
        event: string;
        application_id: string | null;
        attempted_at: string;
        attempt_generation: number;
      }>();
    if (!n) continue;
    if (now.getTime() - Date.parse(n.attempted_at) > 23 * 3600000) {
      await db
        .prepare(
          "UPDATE team_succession_notices SET uncertain=1 WHERE id=? AND claim_token=?"
        )
        .bind(n.id, token)
        .run();
      failed++;
      continue;
    }
    const context = await db
      .prepare(
        `SELECT u.email,t.name,c.purge_at,c.removal_at,c.state,a.response_at,
      coalesce(nullif(applicant.name,''),'A team editor') AS applicant
      FROM team_succession_cases c JOIN teams t ON t.id=c.team_id JOIN users u ON u.id=?
      LEFT JOIN team_succession_applications a ON a.id=? LEFT JOIN users applicant ON applicant.id=a.user_id
      WHERE c.id=? AND EXISTS(SELECT 1 FROM team_members WHERE organizationId=c.team_id AND userId=u.id)`
      )
      .bind(n.user_id, n.application_id, n.case_id)
      .first<{
        email: string;
        name: string;
        purge_at: string | null;
        removal_at: string;
        state: string;
        applicant: string;
      }>();
    if (!context) continue;
    const deadline = context.purge_at ?? context.removal_at;
    const text =
      n.event === "application"
        ? `${context.applicant} requested ownership of ${context.name}. Ownership cannot transfer before the 30-day waiting period has elapsed after notice delivery. The first eligible editor to complete the 30-day process becomes owner. If you have concerns, contact TrackDraw support; an administrator can correct ownership. The current team recovery deadline is ${deadline}.`
        : n.event === "outcome"
          ? `Ownership of ${context.name} has been transferred. Sign in to review the team's current ownership and access.`
          : `${context.name} ${context.state === "recovery" ? "has no owner and is read-only" : "may lose its owner through account inactivity"}. ${context.state === "recovery" ? `The team and its published links will be permanently removed after ${deadline}, subject to the notified reminder periods.` : `The owner's account removal is scheduled no earlier than ${deadline}.`} Existing members can review succession in Teams. During recovery you can view and export projects; published links remain accessible until final removal. An eligible editor can request ownership. Downloaded copies cannot be recalled.`;
    const url = "https://trackdraw.app/studio?dialog=account&section=teams";
    try {
      await mailer.send({
        to: { address: context.email },
        subject: "TrackDraw team ownership update",
        textBody: `${text}\n${url}`,
        htmlBody: buildEmailShell({
          title: "Team ownership update",
          eyebrow: "TrackDraw teams",
          intro: text,
          actionLabel: "Review team",
          url,
          note: "Only existing authorized members can access private team projects.",
        }),
        emailType: "team-succession",
        idempotencyKey: `team-succession-${n.id}-${n.attempt_generation}`,
      });
      await db
        .prepare(
          "UPDATE team_succession_notices SET sent_at=?,claimed_at=NULL WHERE id=? AND claim_token=? AND sent_at IS NULL"
        )
        .bind(
          new Date(
            now.getTime() + Math.max(0, Date.now() - startedAt)
          ).toISOString(),
          n.id,
          token
        )
        .run();
    } catch {
      failed++;
      await db
        .prepare(
          "UPDATE team_succession_notices SET claimed_at=NULL WHERE id=? AND claim_token=?"
        )
        .bind(n.id, token)
        .run();
    }
  }
  const uncertain = await db
    .prepare(
      `SELECT count(*) AS count FROM team_succession_notices n JOIN team_succession_cases c ON c.id=n.case_id WHERE n.uncertain=1 AND n.sent_at IS NULL AND (c.state IN ('open','recovery') OR (c.state='resolved' AND n.event='outcome'))`
    )
    .first<{ count: number }>();
  failed += uncertain?.count ?? 0;
  if (failed)
    throw new Error(
      `Team succession delivery: ${failed} failed or uncertain notices require attention`
    );
  return { meta: { changes: 0 } };
}
export async function advanceTeamSuccession(db: Db, now = new Date()) {
  const current = now.toISOString();
  // The response period starts once every still-current recipient has an acknowledged send.
  await db
    .prepare(
      `UPDATE team_succession_applications AS a SET response_at=strftime('%Y-%m-%dT%H:%M:%fZ',
    (SELECT max(n.sent_at) FROM team_succession_notices n WHERE n.application_id=a.id),'+30 days')
    WHERE a.response_at IS NULL AND a.withdrawn_at IS NULL AND EXISTS(SELECT 1 FROM team_succession_notices WHERE application_id=a.id)
    AND NOT EXISTS(SELECT 1 FROM team_succession_notices n JOIN team_succession_cases c ON c.id=n.case_id JOIN team_members m ON m.organizationId=c.team_id AND m.userId=n.user_id WHERE n.application_id=a.id AND n.sent_at IS NULL)`
    )
    .run();
  const { results } = await db
    .prepare(
      `SELECT a.id,c.id AS case_id FROM team_succession_applications a JOIN team_succession_cases c ON c.id=a.case_id
    WHERE c.state IN ('open','recovery') AND a.withdrawn_at IS NULL AND julianday(a.response_at)<=julianday(?) ORDER BY coalesce(a.checked_at,''),a.response_at,a.requested_at,a.id LIMIT 2`
    )
    .bind(current)
    .all<{ id: string; case_id: string }>();
  for (const a of results) {
    await db
      .prepare(
        "UPDATE team_succession_applications SET checked_at=? WHERE id=?"
      )
      .bind(current, a.id)
      .run();
    await db
      .prepare(
        `INSERT INTO team_succession_commands(id,case_id,action,application_id,now)
      SELECT ?,?,'advance',?,? WHERE EXISTS(SELECT 1 FROM team_succession_cases c WHERE c.id=? AND c.state IN ('open','recovery')
      AND (c.owner_id IS NULL OR EXISTS(SELECT 1 FROM users u WHERE u.id=c.owner_id AND u.last_active_at=c.activity_at AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.userId=u.id AND (julianday(s.expiresAt)>julianday(?) OR julianday(s.expiresAt) IS NULL)))))`
      )
      .bind(crypto.randomUUID(), a.case_id, a.id, current, a.case_id, current)
      .run()
      .catch((error: unknown) => {
        if (
          !(error instanceof Error) ||
          !/succession_invalid|team_transfer_invalid/.test(error.message)
        )
          throw error;
      });
  }
  const due = await db
    .prepare(
      `SELECT c.id,c.team_id FROM team_succession_cases c WHERE c.state='recovery' AND c.purge_at<=? ORDER BY coalesce(c.purge_checked_at,''),c.purge_at,c.id LIMIT 2`
    )
    .bind(current)
    .all<{ id: string; team_id: string }>();
  let blocked = 0;
  let purged = 0;
  for (const c of due.results) {
    await db
      .prepare(
        "UPDATE team_succession_cases SET purge_checked_at=? WHERE id=? AND state='recovery'"
      )
      .bind(current, c.id)
      .run();
    const safe = await db
      .prepare(
        `SELECT c.id FROM team_succession_cases c WHERE c.id=? AND c.state='recovery' AND c.purge_at<=?
      AND NOT EXISTS(SELECT 1 FROM team_members m WHERE m.organizationId=c.team_id AND EXISTS(
        SELECT 1 FROM (SELECT 'reminder30' AS event,30 AS days UNION ALL SELECT 'reminder7',7) r
        WHERE NOT EXISTS(SELECT 1 FROM team_succession_notices n WHERE n.case_id=c.id AND n.user_id=m.userId AND n.event=r.event AND julianday(n.sent_at,'+'||r.days||' days')<=julianday(?))))`
      )
      .bind(c.id, current, current)
      .first<{ id: string }>();
    if (!safe) {
      blocked++;
      continue;
    }
    const cleanup = await db.batch<{ id: string }>([
      db
        .prepare(
          `UPDATE team_succession_cases SET state='resolved' WHERE id=? AND state='recovery' AND purge_at<=?`
        )
        .bind(c.id, current),
      db
        .prepare(
          `INSERT INTO audit_events(id,event_type,entity_type,entity_id,metadata_json,created_at,actor_kind,target_label) SELECT ?,'team.recovery_expired','team',id,'{}',?,'system',name FROM teams WHERE id=? AND changes()=1`
        )
        .bind(crypto.randomUUID(), current, c.team_id),
      db
        .prepare(
          `DELETE FROM teams WHERE id=? AND EXISTS(SELECT 1 FROM team_succession_cases WHERE id=? AND state='resolved') AND NOT EXISTS(SELECT 1 FROM team_members WHERE organizationId=? AND role='owner') RETURNING id`
        )
        .bind(c.team_id, c.id, c.team_id),
    ]);
    purged += cleanup[2].results.length;
  }
  if (blocked)
    throw new Error(
      `Team recovery cleanup: ${blocked} teams await acknowledged reminders and full lead time`
    );
  return { meta: { changes: purged } };
}
