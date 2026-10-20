import { afterEach, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import { addUtcCalendarMonths } from "@/lib/server/account-retention-timeline";
import {
  createScheduledCleanupTasks,
  runScheduledCleanup,
} from "@/lib/server/scheduled-cleanup";

vi.mock("server-only", () => ({}));
afterEach(() => vi.useRealTimers());

it.each([
  { cron: "0 0 * * *", minute: 0, sent: 0, removed: 0, media: 0, sql: 24 },
  {
    cron: "15,30 * * * *",
    minute: 15,
    sent: 0,
    removed: 10,
    media: 100,
    sql: 43,
  },
  { cron: "15,30 * * * *", minute: 30, sent: 5, removed: 0, media: 0, sql: 27 },
])(
  "keeps $cron at minute $minute within its own Free budget without dropping its backlog",
  async ({ cron, minute, sent, removed, media, sql }) => {
    vi.useFakeTimers();
    const now = new Date(Date.UTC(2026, 9, 20, 12, minute));
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
        { cron, scheduledTime: now.getTime() },
        createScheduledCleanupTasks(
          { cron, scheduledTime: now.getTime() },
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
      expect(queries).toBe(sql);
      expect(send).toHaveBeenCalledTimes(sent);
      expect(remove).toHaveBeenCalledTimes(media ? 1 : 0);
      if (media) expect(remove.mock.calls[0][0]).toHaveLength(media);
      expect(
        sqlite
          .prepare("SELECT count(*) n FROM users WHERE id LIKE 'removal-%'")
          .get()
      ).toEqual({ n: 25 - removed });
      expect(
        sqlite
          .prepare("SELECT count(*) n FROM users WHERE id LIKE 'notice-%'")
          .get()
      ).toEqual({ n: 25 });
      expect(
        sqlite.prepare("SELECT count(*) n FROM account_deletion_media").get()
      ).toEqual({ n: 101 - media });
      if (cron === "0 0 * * *") {
        expect(
          report.tasks.find((task) => task.task === "product_events")
        ).toMatchObject({
          aggregation_health: {
            aggregated_days: 7,
            remaining_backfill_days: 0,
          },
        });
      } else {
        expect(report.tasks).toHaveLength(1);
      }
      // Subsequent invocations drain the durable backlog without duplicate warnings.
      if (cron !== "0 0 * * *") {
        for (let i = 0; i < 4; i++) {
          queries = 0;
          send.mockClear();
          remove.mockClear();
          vi.setSystemTime(new Date(now.getTime() + (i + 1) * 3600000));
          await runScheduledCleanup(
            { cron, scheduledTime: Date.now() },
            createScheduledCleanupTasks(
              { cron, scheduledTime: Date.now() },
              db,
              { isConfigured: () => true, send },
              { delete: remove }
            ),
            { logger: { log() {}, error() {} } }
          );
          expect(
            queries + send.mock.calls.length + remove.mock.calls.length
          ).toBeLessThanOrEqual(50);
        }
        if (removed) {
          expect(
            sqlite
              .prepare("SELECT count(*) n FROM users WHERE id LIKE 'removal-%'")
              .get()
          ).toEqual({ n: 0 });
          expect(
            sqlite
              .prepare("SELECT count(*) n FROM account_deletion_media")
              .get()
          ).toEqual({ n: 0 });
        } else {
          expect(
            sqlite
              .prepare(
                "SELECT count(*) n FROM account_retention_notices WHERE user_id LIKE 'notice-%' AND sent_at IS NOT NULL"
              )
              .get()
          ).toEqual({ n: 25 });
          expect(send).toHaveBeenCalledTimes(5);
        }
      }
    } finally {
      sqlite.close();
    }
  }
);
