import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMigratedDatabase } from "../../helpers/sqlite-d1";

const migration = readFileSync(
  new URL(
    "../../../migrations/0025_localization_demand_locale_constraint.sql",
    import.meta.url
  ),
  "utf8"
);
let sqlite: DatabaseSync;

beforeEach(() => {
  sqlite = createMigratedDatabase("0024_account_lifecycle_audit.sql");
});
afterEach(() => sqlite.close());

function insert(locale: string | null, sessions = 1) {
  return sqlite
    .prepare(
      `INSERT INTO localization_demand_daily VALUES
        ('2026-10-04', 'fr', ?, 'FR', ?, '2026-10-04T01:00:00Z', '2026-10-04T02:00:00Z')`
    )
    .run(locale, sessions);
}

describe("localization demand locale migration", () => {
  it("preserves every daily cell, timestamps, indexes, and measurement state", () => {
    for (const [index, locale] of ["en", "nl", "de", "zh-CN"].entries()) {
      insert(locale, index);
    }
    sqlite.exec(`
      INSERT INTO localization_demand_daily VALUES
        ('2026-10-03', 'fr', 'en', 'FR', 7, '2026-10-03T01:00:00Z', '2026-10-03T02:00:00Z'),
        ('2026-10-04', 'de', 'en', 'FR', 8, '2026-10-04T03:00:00Z', '2026-10-04T04:00:00Z'),
        ('2026-10-04', 'fr', 'en', 'BE', 9, '2026-10-04T05:00:00Z', '2026-10-04T06:00:00Z');
    `);
    const rows = () =>
      sqlite
        .prepare(
          "SELECT * FROM localization_demand_daily ORDER BY day_utc, preferred_language, served_locale, country_code"
        )
        .all();
    const indexes = () =>
      sqlite
        .prepare(
          "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'localization_demand_daily' ORDER BY name"
        )
        .all();
    const state = () =>
      sqlite.prepare("SELECT * FROM product_metric_measurement_state").all();
    const before = { rows: rows(), indexes: indexes(), state: state() };

    sqlite.exec(migration);

    expect(rows()).toEqual(before.rows);
    expect(indexes()).toEqual(before.indexes);
    expect(state()).toEqual(before.state);
  });

  it("allows future locale values without another schema migration", () => {
    expect(() => insert("future-locale")).toThrow(/CHECK constraint failed/);

    sqlite.exec(migration);

    expect(() => insert("future-locale")).not.toThrow();
    expect(
      sqlite
        .prepare("SELECT served_locale FROM localization_demand_daily")
        .get()
    ).toEqual({ served_locale: "future-locale" });
    expect(
      sqlite
        .prepare("PRAGMA table_info(localization_demand_daily)")
        .all()
        .find((column) => column.name === "served_locale")
    ).toMatchObject({ type: "TEXT", notnull: 1 });
  });

  it("keeps required locales, nonnegative counters, their default, and cell uniqueness", () => {
    sqlite.exec(migration);

    expect(() => insert(null)).toThrow(/NOT NULL constraint failed/);
    expect(() => insert("en", -1)).toThrow(/CHECK constraint failed/);
    sqlite.exec(`
      INSERT INTO localization_demand_daily (
        day_utc, preferred_language, served_locale, country_code, created_at, updated_at
      ) VALUES ('2026-10-04', 'fr', 'en', 'FR', '2026-10-04', '2026-10-04');
    `);
    expect(
      sqlite
        .prepare("SELECT creator_sessions FROM localization_demand_daily")
        .get()
    ).toEqual({ creator_sessions: 0 });
    expect(() => insert("en")).toThrow(/UNIQUE constraint failed/);
  });
});
