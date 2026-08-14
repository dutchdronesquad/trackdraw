export const EMBED_REFERRER_RETENTION_DAYS = 90;

type D1Database = {
  prepare(query: string): { run<T = unknown>(): Promise<T> };
};

export async function cleanupExpiredEmbedReferrers(
  db: D1Database,
  retentionDays = EMBED_REFERRER_RETENTION_DAYS
) {
  const days = Math.max(31, Math.trunc(retentionDays));
  return db
    .prepare(
      `
        delete from embed_referrer_daily
        where viewed_on < date('now', '-${days} days')
      `
    )
    .run();
}
