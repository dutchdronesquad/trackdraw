import { afterEach, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { addUtcCalendarMonths } from "@/lib/server/account-retention-timeline";
import {
  createScheduledCleanupTasks,
  runScheduledCleanup,
} from "@/lib/server/scheduled-cleanup";

vi.mock("server-only", () => ({}));
afterEach(() => vi.useRealTimers());

it("keeps a full shared cleanup invocation within the Free budget without dropping its backlog", async () => {
  vi.useFakeTimers();
  const now = new Date("2026-10-20T12:00:00.000Z");
  vi.setSystemTime(now);
  const sqlite = createMigratedDatabase();
  try {
    sqlite
      .prepare(
        `UPDATE product_metric_measurement_state SET contract_version = '1.1.0', measured_since = '2026-07-01', last_aggregated_day = '2026-10-12', completeness_state = 'complete'`
      )
      .run();
    const noticeActivity = new Date(
      addUtcCalendarMonths(now, -11).getTime() - 86400000
    ).toISOString();
    const removalActivity = addUtcCalendarMonths(now, -13).toISOString();
    for (let i = 0; i < 25; i++) {
      for (const [kind, activity] of [
        ["notice", noticeActivity],
        ["removal", removalActivity],
      ]) {
        const id = `${kind}-${i}`;
        sqlite
          .prepare(
            "INSERT INTO users(id,email,name,createdAt,updatedAt,last_active_at) VALUES(?,?,?,?,?,?)"
          )
          .run(id, `${id}@example.invalid`, id, activity, activity, activity);
        if (kind === "removal") {
          for (const stage of ["first", "final"]) {
            sqlite
              .prepare(
                "INSERT INTO account_retention_notices(id,user_id,activity_at,stage,removal_at,sent_at) VALUES(?,?,?,?,?,?)"
              )
              .run(
                `${id}-${stage}`,
                id,
                activity,
                stage,
                "2026-10-17",
                stage === "first" ? "2026-09-10" : "2026-10-10"
              );
          }
        }
      }
    }
    for (let i = 0; i < 101; i++)
      sqlite
        .prepare("INSERT INTO account_deletion_media(object_key) VALUES(?)")
        .run(`media-${i}`);
    let queries = 0;
    const db = sqliteD1(sqlite, () => {
      queries++;
    });
    const send = vi.fn(async () => {});
    const remove = vi.fn(async (_keys: string | string[]) => {});
    const report = await runScheduledCleanup(
      { cron: "0 0 * * *", scheduledTime: now.getTime() },
      createScheduledCleanupTasks(
        db,
        { isConfigured: () => true, send },
        { delete: remove }
      ),
      { logger: { log() {}, error() {} } }
    );
    expect(report.status).toBe("success");
    // Count each SQL statement separately, including those submitted together in D1 batches.
    expect(
      queries + send.mock.calls.length + remove.mock.calls.length
    ).toBeLessThanOrEqual(50);
    expect(send).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toHaveLength(100);
    expect(
      sqlite
        .prepare("SELECT count(*) n FROM users WHERE id LIKE 'removal-%'")
        .get()
    ).toEqual({ n: 23 });
    expect(
      sqlite
        .prepare("SELECT count(*) n FROM users WHERE id LIKE 'notice-%'")
        .get()
    ).toEqual({ n: 25 });
    expect(
      sqlite.prepare("SELECT count(*) n FROM account_deletion_media").get()
    ).toEqual({ n: 1 });
    expect(
      report.tasks.find((task) => task.task === "product_events")
    ).toMatchObject({
      aggregation_health: { aggregated_days: 7, remaining_backfill_days: 0 },
    });
  } finally {
    sqlite.close();
  }
});
