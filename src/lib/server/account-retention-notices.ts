import {
  buildAccountRetentionEmail,
  type AccountRetentionNoticeStage,
} from "@/lib/email/account-retention-email";
import {
  addUtcCalendarMonths,
  ceilUtcDay,
} from "@/lib/server/account-retention-timeline";
import type { TransactionalMailer } from "@/lib/email/plunk-client";
import { auditEventTypes } from "@/lib/audit-events";

type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};
type Database = {
  prepare(query: string): Statement;
  batch<T>(statements: Statement[]): Promise<{ results: T[] }[]>;
};
type Candidate = {
  id: string;
  activity_at: string;
  first_sent_at: string | null;
  removal_at: string | null;
};
type Notice = {
  id: string;
  stage: AccountRetentionNoticeStage;
  removal_at: string;
};
export type AccountRetentionNoticeHealth = {
  sent: number;
  failed: number;
  uncertain: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Plunk retains idempotency keys for 24h. Never replay an ambiguous attempt
// after that window; an operator must reconcile it with the provider first.
const SAFE_RETRY_MS = 23 * 60 * 60 * 1000;
const CLAIM_MS = 5 * 60 * 1000;
const BATCH_SIZE = 25;

// Unknown session expiry protects the account just like a valid session.
const SESSION_GUARD = `NOT EXISTS (
  SELECT 1 FROM sessions s WHERE s.userId = u.id
    AND (julianday(s.expiresAt) IS NULL OR julianday(s.expiresAt) > julianday(?))
)`;

export class AccountRetentionNoticeError extends Error {
  constructor(readonly noticeHealth: AccountRetentionNoticeHealth) {
    super(
      `Account retention notices: ${noticeHealth.failed} failed, ${noticeHealth.uncertain} uncertain attempts require reconciliation`
    );
    this.name = "AccountRetentionNoticeError";
  }
}

export async function sendAccountRetentionNotices(
  db: Database,
  {
    now = () => new Date(),
    mailer,
  }: {
    now?: () => Date;
    mailer: TransactionalMailer;
  }
) {
  const startedAt = now();
  const current = startedAt.toISOString();
  const retryAfter = new Date(
    startedAt.getTime() - SAFE_RETRY_MS
  ).toISOString();
  // Widen by three days for inverse end-of-month clamping, then check the
  // exact eleven-calendar-month boundary in code.
  const candidateBefore = new Date(
    addUtcCalendarMonths(startedAt, -11).getTime() + 3 * DAY_MS
  ).toISOString();
  const { results: candidates } = await db
    .prepare(
      `
    SELECT u.id, u.last_active_at AS activity_at,
      f.sent_at AS first_sent_at, f.removal_at
    FROM users u
    LEFT JOIN account_retention_notices f ON f.user_id = u.id AND f.activity_at = u.last_active_at AND f.stage = 'first'
    LEFT JOIN account_retention_notices r ON r.user_id = u.id AND r.activity_at = u.last_active_at AND r.stage = 'final'
    WHERE julianday(u.last_active_at) <= julianday(?) AND ${SESSION_GUARD}
      AND (
        f.id IS NULL
        OR (f.sent_at IS NULL AND (f.attempted_at IS NULL OR julianday(f.attempted_at) > julianday(?)) AND (f.claim_until IS NULL OR julianday(f.claim_until) <= julianday(?)))
        OR (f.sent_at IS NOT NULL AND r.id IS NULL AND julianday(f.removal_at) <= julianday(?))
        OR (r.sent_at IS NULL AND r.id IS NOT NULL AND (r.attempted_at IS NULL OR julianday(r.attempted_at) > julianday(?)) AND (r.claim_until IS NULL OR julianday(r.claim_until) <= julianday(?)))
      )
    ORDER BY u.last_active_at, u.id LIMIT ${BATCH_SIZE}
  `
    )
    .bind(
      candidateBefore,
      current,
      retryAfter,
      current,
      new Date(startedAt.getTime() + 7 * DAY_MS).toISOString(),
      retryAfter,
      current
    )
    .all<Candidate>();

  const health: AccountRetentionNoticeHealth = {
    sent: 0,
    failed: 0,
    uncertain: 0,
  };
  if (candidates.length && !mailer.isConfigured()) {
    throw new Error("Account retention notices require Plunk configuration");
  }
  for (const candidate of candidates) {
    const time = now();
    if (addUtcCalendarMonths(new Date(candidate.activity_at), 11) > time)
      continue;
    const stage = candidate.first_sent_at ? "final" : "first";
    // A delayed first/final notice still grants a full response period.
    const baseline = candidate.removal_at
      ? new Date(candidate.removal_at)
      : addUtcCalendarMonths(new Date(candidate.activity_at), 12);
    const removalAt = ceilUtcDay(
      new Date(
        Math.max(
          baseline.getTime(),
          stage === "first"
            ? addUtcCalendarMonths(time, 1).getTime()
            : time.getTime() + 7 * DAY_MS
        )
      )
    );
    try {
      await db
        .prepare(
          `
        INSERT INTO account_retention_notices (id, user_id, activity_at, stage, removal_at)
        SELECT ?, u.id, u.last_active_at, ?, ? FROM users u
        WHERE u.id = ? AND u.last_active_at = ? AND ${SESSION_GUARD}
        ON CONFLICT(user_id, activity_at, stage) DO NOTHING
      `
        )
        .bind(
          crypto.randomUUID(),
          stage,
          removalAt.toISOString(),
          candidate.id,
          candidate.activity_at,
          time.toISOString()
        )
        .run();

      const claim = crypto.randomUUID();
      const notice = await db
        .prepare(
          `
        UPDATE account_retention_notices
        SET claim_token = ?, claim_until = ?,
          removal_at = CASE WHEN attempted_at IS NULL THEN ? ELSE removal_at END
        WHERE user_id = ? AND activity_at = ? AND stage = ? AND sent_at IS NULL
          AND (claim_until IS NULL OR julianday(claim_until) <= julianday(?))
          AND (attempted_at IS NULL OR julianday(attempted_at) > julianday(?))
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.last_active_at = activity_at AND ${SESSION_GUARD})
        RETURNING id, stage, removal_at
      `
        )
        .bind(
          claim,
          new Date(time.getTime() + CLAIM_MS).toISOString(),
          removalAt.toISOString(),
          candidate.id,
          candidate.activity_at,
          stage,
          time.toISOString(),
          new Date(time.getTime() - SAFE_RETRY_MS).toISOString(),
          time.toISOString()
        )
        .first<Notice>();
      if (!notice) continue;
      const recipient = await db
        .prepare(
          `
        UPDATE account_retention_notices SET attempted_at = coalesce(attempted_at, ?)
        WHERE id = ? AND claim_token = ?
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = user_id AND u.last_active_at = activity_at AND ${SESSION_GUARD})
        RETURNING (SELECT email FROM users WHERE id = user_id) AS email,
          (SELECT lifecycle_audit_ref FROM users WHERE id = user_id) AS audit_ref,
          (SELECT name FROM users WHERE id = user_id) AS name, attempted_at
      `
        )
        .bind(now().toISOString(), notice.id, claim, now().toISOString())
        .first<{
          email: string;
          name: string | null;
          attempted_at: string;
          audit_ref: string;
        }>();
      if (!recipient) continue;
      await mailer.send({
        to: { address: recipient.email, name: recipient.name },
        ...buildAccountRetentionEmail(
          notice.stage,
          new Date(notice.removal_at),
          new Date(candidate.activity_at),
          new Date(recipient.attempted_at)
        ),
        emailType: "account-retention",
        idempotencyKey: `account-retention-${notice.id}`,
      });
      const sentAt = now().toISOString();
      // A sign-in or deletion while Plunk is sending can remove notice state.
      // Keep confirmed provider acceptance using the already captured reference.
      await db.batch([
        db
          .prepare(
            `
        UPDATE account_retention_notices SET sent_at = ?, claim_token = NULL, claim_until = NULL
        WHERE id = ? AND claim_token = ?
      `
          )
          .bind(sentAt, notice.id, claim),
        db
          .prepare(
            `INSERT INTO audit_events
          (id, target_user_id, event_type, entity_type, entity_id, metadata_json, created_at, actor_kind, target_label)
          VALUES (?, (SELECT id FROM users WHERE id = ? AND lifecycle_audit_ref = ?), ?, 'account_lifecycle', ?, ?, ?, 'system',
            (CASE WHEN EXISTS (SELECT 1 FROM users WHERE id = ? AND lifecycle_audit_ref = ?) THEN 'Account (' ELSE 'Deleted account (' END) || ? || ')')
          ON CONFLICT(id) DO NOTHING`
          )
          .bind(
            `retention-sent-${notice.id}`,
            candidate.id,
            recipient.audit_ref,
            notice.stage === "first"
              ? auditEventTypes.accountRetentionFirstNoticeSent
              : auditEventTypes.accountRetentionFinalNoticeSent,
            recipient.audit_ref,
            JSON.stringify({
              stage: notice.stage,
              noticeId: notice.id,
              activityAt: candidate.activity_at,
              removalAt: notice.removal_at,
              status: "provider_accepted",
            }),
            sentAt,
            candidate.id,
            recipient.audit_ref,
            recipient.audit_ref
          ),
      ]);
      health.sent += 1;
    } catch {
      // Provider/DB errors can include addresses or payloads. Only counts leave
      // this owner; keep the durable attempt for safe retries/reconciliation.
      health.failed += 1;
    }
  }
  const uncertain = await db
    .prepare(
      `
    SELECT count(*) AS count FROM account_retention_notices n JOIN users u ON u.id = n.user_id
    WHERE n.sent_at IS NULL AND julianday(n.attempted_at) <= julianday(?)
      AND u.last_active_at = n.activity_at AND ${SESSION_GUARD}
  `
    )
    .bind(
      new Date(now().getTime() - SAFE_RETRY_MS).toISOString(),
      now().toISOString()
    )
    .first<{ count: number }>();
  health.uncertain = uncertain?.count ?? 0;
  if (health.failed || health.uncertain)
    throw new AccountRetentionNoticeError(health);
  return { notice_health: health };
}
