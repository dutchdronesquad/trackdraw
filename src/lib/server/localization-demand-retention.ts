export const LOCALIZATION_DEMAND_RETENTION_MONTHS = 24;

type D1Database = {
  prepare(query: string): { run<T = unknown>(): Promise<T> };
};

export async function cleanupExpiredLocalizationDemand(
  db: D1Database,
  retentionMonths = LOCALIZATION_DEMAND_RETENTION_MONTHS
) {
  const months = Math.max(1, Math.trunc(retentionMonths));
  return db
    .prepare(
      `delete from localization_demand_daily
       where day_utc < date('now', '-${months} months')`
    )
    .run();
}
