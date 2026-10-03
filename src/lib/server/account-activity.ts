import "server-only";

type ActivityStatement = {
  bind(...values: string[]): ActivityStatement;
  first<T>(): Promise<T | null>;
  run<T = unknown>(): Promise<T>;
};

type ActivityDatabase = {
  prepare(query: string): ActivityStatement;
};

type ActivityAccount = {
  id: string;
  lastActiveAt?: unknown;
};

const ACTIVITY_REFRESH_MS = 24 * 60 * 60 * 1000;

export async function recordAuthenticatedAccountActivity(
  db: ActivityDatabase,
  account: ActivityAccount,
  now = new Date()
) {
  const previous =
    account.lastActiveAt instanceof Date
      ? account.lastActiveAt.getTime()
      : typeof account.lastActiveAt === "string"
        ? new Date(account.lastActiveAt).getTime()
        : NaN;
  const cutoff = new Date(now.getTime() - ACTIVITY_REFRESH_MS);
  if (Number.isFinite(previous) && previous > cutoff.getTime()) return;

  try {
    // The persisted condition also prevents duplicate writes from concurrent
    // requests that resolved the same stale user before the first update.
    await db
      .prepare(
        `update users set last_active_at = ?
         where id = ?
           and (last_active_at is null
                or julianday(last_active_at) is null
                or julianday(last_active_at) <= julianday(?))`
      )
      .bind(now.toISOString(), account.id, cutoff.toISOString())
      .run();
  } catch (error) {
    // Activity bookkeeping must not break sign-in or authenticated features.
    // The independent session guard still protects accounts if this fails.
    console.error("[TrackDraw] Account activity update failed", {
      error_name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function isAccountInactive(
  db: ActivityDatabase,
  userId: string,
  inactiveBefore: Date,
  now = new Date()
) {
  const row = await db
    .prepare(
      `select u.id from users u
       where u.id = ?
         and julianday(u.last_active_at) < julianday(?)
         and not exists (
           select 1 from sessions s
           where s.userId = u.id
             and (julianday(s.expiresAt) > julianday(?)
                  or julianday(s.expiresAt) is null)
         )
       limit 1`
    )
    .bind(userId, inactiveBefore.toISOString(), now.toISOString())
    .first<{ id: string }>();

  // Missing/invalid activity or session expiry fails closed. This helper only
  // checks eligibility; warning delivery and destructive cleanup are separate.
  return row !== null;
}
