import { afterEach, describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));

import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";
import { getMetricsExplorerData } from "@/lib/server/metrics-explorer";

const databases: ReturnType<typeof createMigratedDatabase>[] = [];
afterEach(() => databases.splice(0).forEach((db) => db.close()));

describe("dashboard raw-event read budget", () => {
  it.each([
    ["cockpit", getDailyCockpit, 1],
    ["explorer", getMetricsExplorerData, 0],
  ] as const)(
    "bounds raw-event calculations per %s request",
    async (_name, load, expected) => {
      const sqlite = createMigratedDatabase();
      databases.push(sqlite);
      sqlite.exec(
        `update product_metric_measurement_state set measured_since = '2026-08-01'`
      );
      const queries: string[] = [];
      mocks.getDatabase.mockResolvedValue(
        sqliteD1(sqlite, (sql) => queries.push(sql))
      );

      await load(new Date("2026-10-18T12:00:00.000Z"));

      expect(
        queries.filter((sql) => sql.includes("events28 as ("))
      ).toHaveLength(expected);
    }
  );
});

describe("batched metric correctness", () => {
  it("preserves dimensions, independent history ranges, and request-local live values", async () => {
    const { getProductMetricSeries } =
      await import("@/lib/server/product-metric-aggregates");
    const sqlite = createMigratedDatabase();
    databases.push(sqlite);
    sqlite.exec(`
      update product_metric_measurement_state set measured_since = '2026-08-01';
      insert into product_metric_daily_aggregates values
        ('MTR-001', '2026-10-16', '', 7, 10, null, 10, 'complete', 'healthy', '2026-10-17'),
        ('MTR-001', '2026-10-17', '', 7, 20, null, 20, 'complete', 'healthy', '2026-10-18'),
        ('MTR-009', '2026-10-16', 'export', 28, 30, 40, 40, 'complete', 'healthy', '2026-10-17');
      insert into product_events(id, contract_version, event_type, session_id, created_at) values
        ('start', '1.1.0', 'editor.session_started', 'session', '2026-10-18T10:00:00.000Z'),
        ('edit', '1.1.0', 'editor.meaningful_edit_completed', 'session', '2026-10-18T10:01:00.000Z'),
        ('export', '1.1.0', 'export.completed', 'session', '2026-10-18T10:02:00.000Z');
    `);
    const queries: string[] = [];
    const db = sqliteD1(sqlite, (sql) => queries.push(sql));
    const ranges = [
      {
        metricId: "MTR-001" as const,
        fromDay: "2026-10-17",
        toDayExclusive: "2026-10-19",
      },
      {
        metricId: "MTR-009" as const,
        fromDay: "2026-10-16",
        toDayExclusive: "2026-10-19",
      },
      {
        metricId: "MTR-005" as const,
        fromDay: "2026-10-01",
        toDayExclusive: "2026-10-18",
      },
    ];
    const rows = await getProductMetricSeries(
      db,
      ranges,
      new Date("2026-10-18T12:00:00.000Z")
    );
    expect(rows["MTR-001"]?.map((row) => [row.day_utc, row.numerator])).toEqual(
      [
        ["2026-10-17", 20],
        ["2026-10-18", 1],
      ]
    );
    expect(
      rows["MTR-009"]?.find(
        (row) => row.day_utc === "2026-10-18" && row.dimension === "export"
      )
    ).toMatchObject({
      numerator: 1,
      denominator: 1,
      completeness_state: "incomplete",
    });
    expect(
      rows["MTR-009"]?.filter((row) => row.day_utc === "2026-10-18")
    ).toHaveLength(5);
    expect(rows["MTR-005"]).toEqual([]);
    expect(queries.filter((sql) => sql.includes("events28 as ("))).toHaveLength(
      1
    );

    // A later request must see new activity, rather than a shared D1 promise.
    sqlite.exec(`insert into product_events(id, contract_version, event_type, session_id, created_at)
      values ('new-edit', '1.1.0', 'editor.meaningful_edit_completed', 'another-session', '2026-10-18T11:00:00.000Z')`);
    const refreshed = await getProductMetricSeries(
      db,
      ranges,
      new Date("2026-10-18T12:01:00.000Z")
    );
    expect(refreshed["MTR-001"]?.at(-1)?.numerator).toBe(2);
    const nextDay = await getProductMetricSeries(
      db,
      ranges,
      new Date("2026-10-19T00:00:00.000Z")
    );
    expect(
      nextDay["MTR-001"]?.some((row) => row.completeness_state === "incomplete")
    ).toBe(false);
  });

  it("only rewrites the matured retention cohort, preserving other snapshots", async () => {
    const { runProductMetricMaintenance } =
      await import("@/lib/server/product-metric-aggregates");
    const sqlite = createMigratedDatabase();
    databases.push(sqlite);
    sqlite.exec(`
      update product_metric_measurement_state set measured_since = '2026-08-01', last_aggregated_day = '2026-10-17';
      insert into product_metric_daily_aggregates values
        ('MTR-001', '2026-09-17', '', 7, 42, null, 50, 'complete', 'healthy', '2026-09-18');
    `);
    await runProductMetricMaintenance(
      sqliteD1(sqlite),
      new Date("2026-10-18T00:00:00.000Z")
    );
    expect(
      sqlite
        .prepare(
          "select numerator, updated_at from product_metric_daily_aggregates where metric_id = 'MTR-001' and day_utc = '2026-09-17'"
        )
        .get()
    ).toMatchObject({ numerator: 42, updated_at: "2026-09-18" });
    expect(
      sqlite
        .prepare(
          "select completeness_state from product_metric_daily_aggregates where metric_id = 'MTR-005' and day_utc = '2026-09-17'"
        )
        .get()
    ).toMatchObject({ completeness_state: "complete" });
  });
});
