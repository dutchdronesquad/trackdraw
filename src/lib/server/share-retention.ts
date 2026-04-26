type D1PreparedStatement = {
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export async function cleanupExpiredShares(db: D1Database) {
  return db
    .prepare(
      `
      delete from shares
      where (
           revoked_at is not null
           and datetime(revoked_at) < datetime('now', '-30 days')
         )
         or (
           share_type = 'temporary'
           and
           expires_at is not null
           and datetime(expires_at) < datetime('now', '-30 days')
         )
    `
    )
    .run();
}
