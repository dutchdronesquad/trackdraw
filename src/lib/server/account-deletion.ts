import { addUtcCalendarMonths } from "@/lib/server/account-retention-timeline";

type Statement = {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run<T = unknown>(): Promise<T>;
};
export type AccountDeletionDatabase = { prepare(query: string): Statement };
export type AccountDeletionMediaBucket = {
  delete(key: string): Promise<unknown>;
};
type RetentionPeriod = { activityAt: string; now: Date };

class MediaCleanupError extends Error {
  constructor(failed: number) {
    super(`Account media cleanup: ${failed} failed deletions`);
    this.name = "MediaCleanupError";
  }
}

// Both acknowledged notices must belong to the current activity period. A
// delayed final warning can extend the date but never shorten its seven days.
function retentionGuard(current: string) {
  return `NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.userId = u.id
      AND (julianday(s.expiresAt) IS NULL OR julianday(s.expiresAt) > julianday(${current}))
  ) AND EXISTS (
    SELECT 1 FROM account_retention_notices f JOIN account_retention_notices r
      ON r.user_id = f.user_id AND r.activity_at = f.activity_at AND r.stage = 'final'
    WHERE f.user_id = u.id AND f.activity_at = u.last_active_at AND f.stage = 'first'
      AND julianday(f.sent_at) <= julianday(r.sent_at)
      AND julianday(f.removal_at) <= julianday(${current})
      AND julianday(r.removal_at) <= julianday(${current})
      AND julianday(r.sent_at, '+7 days') <= julianday(${current})
  )`;
}

// The migration's lifecycle trigger makes the eligibility check and every
// related database deletion one atomic operation, including self-deletion.
export async function deleteUserAccount(
  db: AccountDeletionDatabase,
  userId: string,
  retention?: RetentionPeriod
) {
  const lifecycle = await db
    .prepare(
      "SELECT count(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name IN ('account_deleted_data', 'gallery_deleted_media')"
    )
    .first<{ count: number }>();
  if (lifecycle?.count !== 2)
    throw new Error("Account deletion requires migration 0023");
  const statement = retention
    ? db
        .prepare(
          `DELETE FROM users AS u WHERE u.id = ?1
        AND u.last_active_at = ?2 AND julianday(?3) <= julianday(?4)
        AND ${retentionGuard("?4")} RETURNING id`
        )
        .bind(
          userId,
          retention.activityAt,
          addUtcCalendarMonths(
            new Date(retention.activityAt),
            12
          ).toISOString(),
          retention.now.toISOString()
        )
    : db.prepare("DELETE FROM users WHERE id = ? RETURNING id").bind(userId);
  return (await statement.first<{ id: string }>()) !== null;
}

export async function cleanupAccountDeletionMedia(
  db: AccountDeletionDatabase,
  bucket: AccountDeletionMediaBucket | null | undefined
) {
  const { results } = await db
    .prepare(
      "SELECT object_key FROM account_deletion_media ORDER BY created_at, object_key LIMIT 100"
    )
    .all<{ object_key: string }>();
  if (!bucket) {
    if (results.length)
      throw new Error("Account media cleanup requires MEDIA_BUCKET");
    return;
  }
  let failed = 0;
  for (const row of results) {
    try {
      await bucket.delete(row.object_key);
      await db
        .prepare("DELETE FROM account_deletion_media WHERE object_key = ?")
        .bind(row.object_key)
        .run();
    } catch {
      // Keep the key until R2 confirms removal; never log object or account data.
      failed += 1;
    }
  }
  if (failed) throw new MediaCleanupError(failed);
}

export async function cleanupInactiveAccounts(
  db: AccountDeletionDatabase,
  bucket: AccountDeletionMediaBucket | null | undefined,
  { now = () => new Date() }: { now?: () => Date } = {}
) {
  const current = now();
  // Widen the inverse cutoff for clamped calendar months; the destructive
  // statement checks the exact twelve-month anniversary for each candidate.
  const cutoff = new Date(
    addUtcCalendarMonths(current, -12).getTime() + 3 * 86400000
  );
  const { results } = await db
    .prepare(
      `SELECT u.id, u.last_active_at AS activity_at
    FROM users u WHERE julianday(u.last_active_at) <= julianday(?2)
      AND ${retentionGuard("?1")}
    ORDER BY u.last_active_at, u.id LIMIT 25`
    )
    .bind(current.toISOString(), cutoff.toISOString())
    .all<{ id: string; activity_at: string }>();
  let deleted = 0;
  let failed = 0;
  for (const candidate of results) {
    try {
      if (
        await deleteUserAccount(db, candidate.id, {
          activityAt: candidate.activity_at,
          now: now(),
        })
      )
        deleted += 1;
    } catch {
      failed += 1;
    }
  }
  try {
    await cleanupAccountDeletionMedia(db, bucket);
  } catch (error) {
    throw new Error(
      `Account deletion: ${deleted} accounts permanently deleted, ${failed} failed accounts; ${error instanceof MediaCleanupError ? error.message : "media cleanup pending"}`
    );
  }
  if (failed)
    throw new Error(
      `Account deletion: ${failed} failed accounts, ${deleted} accounts permanently deleted`
    );
  return { meta: { changes: deleted } };
}
