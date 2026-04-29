type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export async function cleanupExpiredApiKeys(
  db: D1Database,
  retentionDays = 90
) {
  const days = Math.max(1, Math.trunc(retentionDays));

  return db
    .prepare(
      `
      delete from apikey
      where expiresAt is not null
        and datetime(expiresAt) < datetime('now', ?)
    `
    )
    .bind(`-${days} days`)
    .run();
}
