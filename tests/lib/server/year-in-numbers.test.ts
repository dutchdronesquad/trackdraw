import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import {
  aggregateYearNumbers,
  loadYearInNumbers,
} from "@/lib/server/year-in-numbers";
import {
  getYearInNumbers,
  type YearNumberDailyTotal,
} from "@/lib/year-in-numbers";

vi.mock("server-only", () => ({}));
const database = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/server/db", () => ({
  getDatabase: async () => database.current,
}));

function fixture() {
  const sqlite = createMigratedDatabase();
  sqlite.exec(
    "DELETE FROM year_number_daily_totals WHERE source = 'registration-history'"
  );
  sqlite
    .prepare(
      "UPDATE year_number_collection SET started_at = '2026-08-15T12:00:00.000Z'"
    )
    .run();
  sqlite
    .prepare(
      "UPDATE product_metric_measurement_state SET measured_since = '2026-08-16' WHERE metric_id = 'MTR-001'"
    )
    .run();
  const db = sqliteD1(sqlite);
  function event(
    id: string,
    type: string,
    properties = {},
    version: string | null = "1.1.0",
    day = "2026-08-16",
    actor = id
  ) {
    sqlite
      .prepare(
        `INSERT INTO product_events(id,event_type,session_id,contract_version,metadata_json,created_at)
      VALUES(?,?,?,?,?,?)`
      )
      .run(
        id,
        type,
        actor,
        version,
        JSON.stringify(properties),
        `${day}T12:00:00.000Z`
      );
  }
  const rows = () =>
    sqlite
      .prepare("SELECT * FROM year_number_daily_totals ORDER BY day_utc,metric")
      .all() as YearNumberDailyTotal[];
  return { sqlite, db, event, rows };
}

describe("year in numbers daily totals", () => {
  it("sums insertion counts, excludes legacy/current-day data, and preserves anonymous snapshots after erasure", async () => {
    const f = fixture();
    try {
      f.event(
        "gate",
        "editor.element_placed",
        { kind: "gate", count: 12 },
        "1.0.0"
      );
      f.event("cone", "editor.element_placed", { kind: "cone", count: 3 });
      f.event(
        "old",
        "editor.element_placed",
        { kind: "gate", count: 500 },
        null
      );
      f.event(
        "today",
        "editor.element_placed",
        { kind: "gate", count: 500 },
        "1.1.0",
        "2026-08-17"
      );
      f.event("export-1", "export.completed", { format: "png" });
      f.event("export-2", "export.completed", { format: "svg" });
      f.event("failure", "export.failed");
      f.event("share", "share.created");
      f.event("view", "share.viewed");
      const now = new Date("2026-08-17T00:00:00.000Z");
      await aggregateYearNumbers(f.db, now);
      const counts = Object.fromEntries(
        f
          .rows()
          .filter((r) => r.metric !== "accounts")
          .map((r) => [r.metric, r.total])
      );
      expect(counts).toEqual({
        sessions: 0,
        elements: 15,
        exports: 2,
        shares: 1,
        views: 1,
      });
      expect(f.rows().every((r) => r.day_utc === "2026-08-16")).toBe(true);
      const snapshot = f.rows();
      f.sqlite.exec("DELETE FROM product_events");
      await aggregateYearNumbers(f.db, now);
      expect(f.rows()).toEqual(snapshot);
    } finally {
      f.sqlite.close();
    }
  });

  it("counts an active browser session once across edits, projects, days and event versions", async () => {
    const f = fixture();
    try {
      f.event(
        "arrival",
        "acquisition.session_attributed",
        {},
        "1.0.0",
        "2026-08-16",
        "session-a"
      );
      f.event(
        "arrival-new-version",
        "acquisition.session_attributed",
        {},
        "1.1.0",
        "2026-08-17",
        "session-a"
      );
      f.event(
        "edit-1",
        "editor.meaningful_edit_completed",
        { edit_type: "place" },
        "1.0.0",
        "2026-08-16",
        "session-a"
      );
      f.event(
        "edit-2",
        "editor.meaningful_edit_completed",
        { edit_type: "transform" },
        "1.1.0",
        "2026-08-16",
        "session-a"
      );
      f.event(
        "edit-3",
        "editor.meaningful_edit_completed",
        { edit_type: "place" },
        "1.1.0",
        "2026-08-17",
        "session-a"
      );
      f.event(
        "opened-only",
        "acquisition.session_attributed",
        {},
        "1.1.0",
        "2026-08-16",
        "session-b"
      );
      f.event(
        "without-arrival",
        "editor.meaningful_edit_completed",
        {},
        "1.1.0",
        "2026-08-16",
        "session-c"
      );
      await aggregateYearNumbers(f.db, new Date("2026-08-18T00:00:00Z"));
      expect(
        f
          .rows()
          .filter((r) => r.metric === "sessions")
          .map((r) => r.total)
      ).toEqual([1, 0]);
    } finally {
      f.sqlite.close();
    }
  });

  it("never recounts a closed session day when a later edit arrives", async () => {
    const f = fixture();
    try {
      f.event(
        "arrival",
        "acquisition.session_attributed",
        {},
        "1.1.0",
        "2026-08-16",
        "session-a"
      );
      await aggregateYearNumbers(f.db, new Date("2026-08-17T00:00:00Z"));
      f.event(
        "late-edit",
        "editor.meaningful_edit_completed",
        {},
        "1.1.0",
        "2026-08-17",
        "session-a"
      );
      await aggregateYearNumbers(f.db, new Date("2026-08-18T00:00:00Z"));
      expect(
        f
          .rows()
          .filter((r) => r.metric === "sessions")
          .map((r) => r.total)
      ).toEqual([0, 0]);
    } finally {
      f.sqlite.close();
    }
  });

  it("retries interrupted maintenance without replacing finalized event days", async () => {
    const f = fixture();
    try {
      f.event("gate", "editor.element_placed", { kind: "gate", count: 2 });
      let fail = true;
      const db = sqliteD1(f.sqlite, (query) => {
        if (fail && query.includes("FROM year_number_collection")) {
          fail = false;
          throw new Error("interrupted");
        }
      });
      const now = new Date("2026-08-18T00:00:00.000Z");
      await expect(aggregateYearNumbers(db, now)).rejects.toThrow(
        "interrupted"
      );
      await aggregateYearNumbers(db, now);
      expect(
        f
          .rows()
          .filter((r) => r.metric === "elements")
          .map((r) => r.total)
      ).toEqual([2, 0]);
      expect(f.rows().filter((r) => r.metric === "accounts")).toHaveLength(2);
    } finally {
      f.sqlite.close();
    }
  });

  it("never reconstructs the partly expired retention day and prunes old anonymous rows", async () => {
    const f = fixture();
    try {
      f.sqlite
        .prepare(
          "UPDATE product_metric_measurement_state SET measured_since = '2025-01-01' WHERE metric_id = 'MTR-001'"
        )
        .run();
      f.sqlite
        .prepare(
          "INSERT INTO year_number_daily_totals VALUES ('2024-01-01','exports',10,5,'product-events-v1','2024-01-02')"
        )
        .run();
      const now = new Date("2026-08-17T00:00:00.000Z");
      await aggregateYearNumbers(f.db, now);
      const eventDays = f.rows().filter((r) => r.metric === "elements");
      expect(eventDays).toHaveLength(179);
      expect(eventDays[0].day_utc).toBe("2026-02-19");
      expect(f.rows().some((r) => r.day_utc === "2024-01-01")).toBe(false);
    } finally {
      f.sqlite.close();
    }
  });

  it("counts committed account insertions atomically, excludes initial admins and survives later promotion/deletion", () => {
    const f = fixture();
    try {
      const insert = f.sqlite.prepare(
        "INSERT INTO users(id,email,createdAt,updatedAt,role) VALUES(?,?,?,?,?)"
      );
      insert.run("u", "u@example.invalid", "2020-01-01", "2020-01-01", "user");
      insert.run("a", "a@example.invalid", "2020-01-01", "2020-01-01", "admin");
      f.sqlite.exec("BEGIN");
      insert.run(
        "rollback",
        "rollback@example.invalid",
        "2020-01-01",
        "2020-01-01",
        "user"
      );
      f.sqlite.exec("ROLLBACK");
      f.sqlite.exec(
        "UPDATE users SET role = 'admin' WHERE id = 'u'; DELETE FROM users"
      );
      const accounts = f.rows().filter((r) => r.metric === "accounts");
      expect(accounts).toHaveLength(1);
      expect(accounts[0].total).toBe(1);
      expect(accounts[0].day_utc).not.toBe("2020-01-01");
    } finally {
      f.sqlite.close();
    }
  });
});

describe("year in numbers reporting", () => {
  const row = (
    day: string,
    metric: YearNumberDailyTotal["metric"],
    total: number,
    contributors = 5
  ): YearNumberDailyTotal => ({
    day_utc: day,
    metric,
    total,
    contributors,
    source:
      metric === "accounts" ? "registration-trigger" : "product-events-v1",
    updated_at: `${day}T23:59:00.000Z`,
  });
  it("keeps missing, partial, low-volume and zero data distinct and excludes the current UTC day", () => {
    const report = getYearInNumbers(
      2026,
      [
        row("2026-01-01", "elements", 50),
        row("2026-01-03", "elements", 0, 0),
        row("2026-01-04", "elements", 500),
        row("2026-01-01", "sessions", 100, 1),
      ],
      new Date("2026-01-04T12:00:00Z")
    );
    expect(report.metrics.find((r) => r.metric === "elements")).toMatchObject({
      total: 50,
      status: "partial",
      days: 2,
      expectedDays: 3,
      from: "2026-01-01",
      to: "2026-01-03",
    });
    expect(report.metrics.find((r) => r.metric === "sessions")).toMatchObject({
      total: null,
      reason: "lowVolume",
    });
    expect(report.metrics.find((r) => r.metric === "exports")).toMatchObject({
      total: null,
      reason: "noData",
    });
  });
  it("verifies only full registration coverage and never adds daily event actors as unique people", () => {
    const report = getYearInNumbers(
      2026,
      [
        row("2026-01-01", "accounts", 3, 3),
        row("2026-01-02", "accounts", 2, 2),
        row("2026-01-01", "elements", 20, 3),
        row("2026-01-02", "elements", 30, 3),
      ],
      new Date("2026-01-03T00:00:00Z")
    );
    expect(report.metrics.find((r) => r.metric === "accounts")).toMatchObject({
      total: 5,
      status: "verified",
    });
    expect(report.metrics.find((r) => r.metric === "elements")).toMatchObject({
      total: null,
      reason: "lowVolume",
    });
  });
  it("handles year boundaries, no complete days and invalid requested years", () => {
    const now = new Date("2027-01-01T00:00:00Z");
    expect(
      getYearInNumbers(
        2026,
        [row("2026-12-31", "accounts", 5), row("2027-01-01", "accounts", 10)],
        now
      )
    ).toMatchObject({
      from: "2026-01-01",
      to: "2026-12-31",
      yearToDate: false,
    });
    expect(getYearInNumbers(2027, [], now)).toMatchObject({
      to: null,
      yearToDate: true,
    });
    expect(() => getYearInNumbers(2028, [], now)).toThrow();
    expect(() => getYearInNumbers(2026.5, [], now)).toThrow();
  });
});

describe("historical account migration", () => {
  it("snapshots surviving non-admin accounts once, preserves totals and trigger, and reads disjoint complete days", async () => {
    const sqlite = createMigratedDatabase("0038_year_in_numbers.sql");
    try {
      sqlite.exec(
        "UPDATE year_number_collection SET started_at = '2026-08-15T12:00:00Z'"
      );
      const user = sqlite.prepare(
        "INSERT INTO users(id,email,role,createdAt,updatedAt) VALUES (?,?,?,?,?)"
      );
      for (let i = 0; i < 5; i++)
        user.run(
          `old-${i}`,
          `old-${i}@example.invalid`,
          "user",
          "2026-08-14T23:59:59Z",
          "2026-08-14"
        );
      user.run(
        "admin",
        "admin@example.invalid",
        "admin",
        "2026-08-14",
        "2026-08-14"
      );
      user.run(
        "deleted",
        "deleted@example.invalid",
        "user",
        "2026-08-14",
        "2026-08-14"
      );
      sqlite.exec("DELETE FROM users WHERE id='deleted'");
      user.run(
        "transition",
        "transition@example.invalid",
        "user",
        "2026-08-15T00:00:00Z",
        "2026-08-15"
      );
      user.run(
        "after",
        "after@example.invalid",
        "user",
        "2026-08-16T00:00:00Z",
        "2026-08-16"
      );
      sqlite.exec(
        "INSERT INTO year_number_daily_totals VALUES ('2026-08-16','accounts',2,2,'registration-trigger','2026-08-17'); INSERT INTO year_number_daily_totals VALUES ('2026-08-15','accounts',1,1,'registration-trigger','2026-08-15'); INSERT INTO year_number_daily_totals VALUES ('2026-08-14','elements',10,5,'product-events-v1','2026-08-15')"
      );
      sqlite.exec("BEGIN");
      sqlite.exec(
        readFileSync(
          new URL(
            "../../../migrations/0039_year_number_account_history.sql",
            import.meta.url
          ),
          "utf8"
        )
      );
      sqlite.exec("COMMIT");
      expect(
        sqlite
          .prepare(
            "SELECT total,source FROM year_number_daily_totals WHERE day_utc='2026-08-14' AND metric='accounts'"
          )
          .get()
      ).toMatchObject({ total: 5, source: "registration-history" });
      database.current = sqliteD1(sqlite);
      const report = await loadYearInNumbers(
        2026,
        new Date("2026-08-17T12:00:00Z")
      );
      expect(
        report.metrics.find((row) => row.metric === "accounts")
      ).toMatchObject({
        total: 7,
        status: "partial",
        historicalAccounts: true,
        from: "2026-01-01",
        to: "2026-08-16",
      });
      expect(
        report.metrics.find((row) => row.metric === "elements")
      ).toMatchObject({ total: 10 });
      sqlite.exec("DELETE FROM users WHERE id='old-0'");
      user.run(
        "backdated",
        "backdated@example.invalid",
        "user",
        "2026-08-14",
        "2026-08-14"
      );
      expect(
        sqlite
          .prepare(
            "SELECT total FROM year_number_daily_totals WHERE day_utc='2026-08-14' AND metric='accounts'"
          )
          .get()
      ).toMatchObject({ total: 5 });
      expect(
        sqlite
          .prepare(
            "SELECT total FROM year_number_daily_totals WHERE day_utc=date('now') AND metric='accounts'"
          )
          .get()
      ).toMatchObject({ total: 9 });
    } finally {
      sqlite.close();
    }
  });
  it("never verifies historical lower bounds even when every reporting day has a snapshot", () => {
    expect(
      getYearInNumbers(
        2026,
        [
          {
            day_utc: "2026-01-01",
            metric: "accounts",
            total: 5,
            contributors: 5,
            source: "registration-history",
            updated_at: "2026-01-02",
          },
        ],
        new Date("2026-01-02")
      ).metrics.find((row) => row.metric === "accounts")
    ).toMatchObject({ status: "partial", historicalAccounts: true });
  });
});
