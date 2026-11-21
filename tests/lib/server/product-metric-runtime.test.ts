import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import { createMigratedDatabase } from "../../helpers/sqlite-d1";
import {
  getProductMetricSeries,
  runProductMetricMaintenance,
  type ProductMetricId,
} from "@/lib/server/product-metric-aggregates";
import { createScheduledCleanupTasks } from "@/lib/server/scheduled-cleanup";

vi.mock("server-only", () => ({}));

type Database = Parameters<typeof createScheduledCleanupTasks>[1];
const metricIds = Array.from(
  { length: 10 },
  (_, i) => `MTR-${String(i + 1).padStart(3, "0")}` as ProductMetricId
);

describe("product metrics in the D1 runtime", () => {
  const folder = mkdtempSync(join(tmpdir(), "trackdraw-metrics-d1-"));
  let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: Database }>>>;
  beforeAll(async () => {
    const config = join(folder, "wrangler.json");
    writeFileSync(
      config,
      JSON.stringify({
        name: "metrics-regression",
        compatibility_date: "2026-03-27",
        d1_databases: [
          {
            binding: "DB",
            database_name: "metrics-regression",
            database_id: "00000000-0000-0000-0000-000000000001",
          },
        ],
      })
    );
    proxy = await getPlatformProxy<{ DB: Database }>({
      configPath: config,
      persist: false,
      remoteBindings: false,
      envFiles: [],
    });
    const sqlite = createMigratedDatabase();
    try {
      // Real migrated definitions, isolated ephemeral D1: no production bindings/data.
      const schema = sqlite
        .prepare(
          "SELECT sql FROM sqlite_master WHERE type = 'table' AND name IN ('users','product_events','product_metric_measurement_state','product_metric_daily_aggregates','product_metric_creator_activations','year_number_collection','year_number_daily_totals') ORDER BY name"
        )
        .all() as { sql: string }[];
      for (const { sql } of schema) await proxy.env.DB.prepare(sql).run();
      for (const metric of metricIds)
        await proxy.env.DB.prepare(
          "INSERT INTO product_metric_measurement_state (metric_id,contract_version,measured_since,last_aggregated_day,updated_at) VALUES (?,'1.1.0','2026-10-01','2026-11-19','2026-11-20')"
        )
          .bind(metric)
          .run();
      await proxy.env.DB.prepare(
        "INSERT INTO year_number_collection VALUES (1,'2026-11-19T12:00:00.000Z')"
      ).run();
      await proxy.env.DB.prepare(
        "INSERT INTO users(id,email,createdAt,updatedAt) VALUES ('creator','creator@example.invalid','2026-10-21','2026-10-21')"
      ).run();
      const events = [
        [
          "first-edit",
          "editor.meaningful_edit_completed",
          "first",
          "2026-10-21T10:00:00.000Z",
          { edit_type: "place" },
        ],
        [
          "return",
          "editor.session_started",
          "return",
          "2026-10-23T10:00:00.000Z",
          {},
        ],
        [
          "start",
          "editor.session_started",
          "active",
          "2026-11-20T10:00:00.000Z",
          {},
        ],
        [
          "edit",
          "editor.meaningful_edit_completed",
          "active",
          "2026-11-20T10:01:00.000Z",
          { edit_type: "place" },
        ],
        [
          "export",
          "export.completed",
          "active",
          "2026-11-20T10:02:00.000Z",
          { format: "png" },
        ],
        [
          "share",
          "share.created",
          "active",
          "2026-11-20T10:03:00.000Z",
          { share_type: "published" },
        ],
        [
          "view",
          "share.viewed",
          "viewer",
          "2026-11-20T10:04:00.000Z",
          { share_type: "published", surface: "share" },
        ],
        [
          "acquisition",
          "acquisition.session_attributed",
          "active",
          "2026-11-20T09:59:00.000Z",
          { source: "social" },
        ],
        [
          "preview",
          "editor.3d_opened",
          "active",
          "2026-11-20T10:05:00.000Z",
          {},
        ],
        [
          "import",
          "project.imported",
          "active",
          "2026-11-20T10:06:00.000Z",
          { shape_count: 4 },
        ],
        [
          "publication",
          "publication.gallery_published",
          "active",
          "2026-11-20T10:07:00.000Z",
          {},
        ],
        [
          "failure",
          "export.failed",
          "active",
          "2026-11-20T10:08:00.000Z",
          { category: "network" },
        ],
      ] as const;
      for (const [id, type, session, at, metadata] of events)
        await proxy.env.DB.prepare(
          "INSERT INTO product_events(id,event_type,session_id,user_id,contract_version,created_at,expires_at,metadata_json) VALUES(?,?,?,'creator','1.1.0',?,'2099-01-01',?)"
        )
          .bind(id, type, session, at, JSON.stringify(metadata))
          .run();
    } finally {
      sqlite.close();
    }
  }, 30000);
  afterAll(async () => {
    vi.useRealTimers();
    await proxy?.dispose();
    rmSync(folder, { recursive: true, force: true });
  });

  it("finalizes both metric groups, dimensions and the matured return cohort within D1's SQL limits", async () => {
    const db = proxy.env.DB;
    const result = await runProductMetricMaintenance(
      db,
      new Date("2026-11-21T00:00:00.000Z")
    );
    expect(result.health).toMatchObject({
      last_aggregated_day: "2026-11-20",
      remaining_backfill_days: 0,
    });
    const { results } = await db
      .prepare(
        "SELECT metric_id,dimension,numerator,denominator,completeness_state FROM product_metric_daily_aggregates WHERE day_utc='2026-11-20'"
      )
      .all<{
        metric_id: ProductMetricId;
        dimension: string;
        numerator: number;
        denominator: number | null;
        completeness_state: string;
      }>();
    expect(new Set(results.map((row) => row.metric_id))).toEqual(
      new Set(metricIds)
    );
    expect(results.find((row) => row.metric_id === "MTR-001")).toMatchObject({
      numerator: 1,
      completeness_state: "complete",
    });
    expect(
      results.find(
        (row) => row.metric_id === "MTR-008" && row.dimension === "social"
      )
    ).toMatchObject({ numerator: 1, denominator: 1 });
    expect(results.filter((row) => row.metric_id === "MTR-009")).toHaveLength(
      5
    );
    expect(
      results.find(
        (row) =>
          row.metric_id === "MTR-010" && row.dimension === "export:network"
      )
    ).toMatchObject({ numerator: 1, denominator: 2 });
    expect(
      await db
        .prepare(
          "SELECT numerator,denominator,completeness_state FROM product_metric_daily_aggregates WHERE metric_id='MTR-005' AND day_utc='2026-10-21'"
        )
        .first()
    ).toEqual({ numerator: 1, denominator: 1, completeness_state: "complete" });
  });

  it("reads live values for both groups without replacing stored complete days", async () => {
    const rows = await getProductMetricSeries(
      proxy.env.DB,
      metricIds.map((metricId) => ({
        metricId,
        fromDay: "2026-11-20",
        toDayExclusive: "2026-11-22",
      })),
      new Date("2026-11-21T12:00:00.000Z")
    );
    expect(Object.keys(rows)).toEqual(metricIds);
    expect(
      rows["MTR-001"]?.find((row) => row.day_utc === "2026-11-20")
    ).toMatchObject({ numerator: 1, completeness_state: "complete" });
    expect(
      rows["MTR-001"]?.find((row) => row.day_utc === "2026-11-21")
    ).toMatchObject({ numerator: 1, completeness_state: "incomplete" });
    expect(
      rows["MTR-009"]?.filter((row) => row.day_utc === "2026-11-21")
    ).toHaveLength(5);
  });

  it("keeps raw events and progress after a group failure, then finishes annual/rolling aggregation and expiry on retry", async () => {
    const db = proxy.env.DB;
    await db
      .prepare(
        "UPDATE product_metric_measurement_state SET last_aggregated_day='2026-11-19'"
      )
      .run();
    await db
      .prepare(
        "INSERT INTO product_events(id,event_type,created_at,expires_at) VALUES ('expired','editor.session_started','2000-01-01','2000-06-01')"
      )
      .run();
    await db
      .prepare(
        "DELETE FROM product_metric_daily_aggregates WHERE day_utc='2026-11-20'"
      )
      .run();
    const failingDb: Database = {
      prepare: (sql) => {
        if (sql.includes("select * from metric_rows_secondary\n  )"))
          // A valid statement whose execution fails after the primary write.
          sql = sql.replace(
            "select * from final_rows where true",
            "select metric_id, day_utc, dimension, window_days, -1, denominator, sample_size, completeness_state, quality_status, updated_at from final_rows where true"
          );
        return db.prepare(sql);
      },
      batch: db.batch.bind(db),
    };
    const context = {
      cron: "0 0 * * *",
      scheduledTime: Date.parse("2026-11-21T00:00:00.000Z"),
    };
    const mailer = { isConfigured: () => false, send: vi.fn(async () => {}) };
    const task = (database: Database) =>
      createScheduledCleanupTasks(context, database, mailer).find(
        (t) => t.name === "product_events"
      )!;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(context.scheduledTime));
    try {
      await expect(task(failingDb).run()).rejects.toThrow(
        "CHECK constraint failed"
      );
      expect(
        await db
          .prepare(
            "SELECT count(*) as count FROM product_metric_daily_aggregates WHERE day_utc='2026-11-20'"
          )
          .first()
      ).toEqual({ count: 0 });
      expect(
        await db
          .prepare(
            "SELECT count(*) as count FROM product_events WHERE id='expired'"
          )
          .first()
      ).toEqual({ count: 1 });
      expect(
        await db
          .prepare(
            "SELECT last_aggregated_day FROM product_metric_measurement_state WHERE metric_id='MTR-001'"
          )
          .first()
      ).toEqual({ last_aggregated_day: "2026-11-19" });
      await task(db).run();
      expect(
        await db
          .prepare(
            "SELECT count(*) as count FROM product_events WHERE id='expired'"
          )
          .first()
      ).toEqual({ count: 0 });
      expect(
        await db
          .prepare(
            "SELECT last_aggregated_day FROM product_metric_measurement_state WHERE metric_id='MTR-010'"
          )
          .first()
      ).toEqual({ last_aggregated_day: "2026-11-20" });
      expect(
        await db
          .prepare(
            "SELECT count(*) as count FROM year_number_daily_totals WHERE day_utc='2026-11-20'"
          )
          .first()
      ).toEqual({ count: 6 });
      expect(
        await db
          .prepare(
            "SELECT count(*) as count FROM product_events WHERE id='export'"
          )
          .first()
      ).toEqual({ count: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
