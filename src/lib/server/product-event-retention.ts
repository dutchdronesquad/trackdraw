type D1PreparedStatement = {
  run<T = unknown>(): Promise<T>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export async function cleanupExpiredProductEvents(
  db: D1Database,
  retentionDays = 180
) {
  const days = Math.max(31, Math.trunc(retentionDays));
  return db
    .prepare(
      `
        delete from product_events
        where created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${days} days')
      `
    )
    .run();
}
