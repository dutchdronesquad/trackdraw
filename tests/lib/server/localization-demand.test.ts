import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supportedLocales } from "@/lib/i18n/locales";
import { createMigratedDatabase, sqliteD1 } from "../../helpers/sqlite-d1";
import {
  createD1AllStatement,
  createD1Statement,
  installD1Statements,
} from "../../helpers/d1";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

import {
  getLocalizationDemandMetrics,
  recordLocalizationDemand,
} from "@/lib/server/localization-demand";
import { cleanupExpiredLocalizationDemand } from "@/lib/server/localization-demand-retention";

beforeEach(() => {
  mocks.prepare.mockReset();
});

describe("localization demand aggregation", () => {
  it.each(supportedLocales)(
    "upserts the configured locale %s on the migrated schema",
    async (servedLocale) => {
      const sqlite = createMigratedDatabase();
      mocks.prepare.mockImplementation(sqliteD1(sqlite).prepare);
      try {
        const input = {
          preferredLanguage: "fr" as const,
          servedLocale,
          countryCode: "FR",
        };
        await recordLocalizationDemand({
          ...input,
          now: new Date("2026-10-04T01:00:00.000Z"),
        });
        await recordLocalizationDemand({
          ...input,
          now: new Date("2026-10-04T02:00:00.000Z"),
        });

        expect(
          sqlite.prepare("SELECT * FROM localization_demand_daily").all()
        ).toEqual([
          {
            day_utc: "2026-10-04",
            preferred_language: "fr",
            served_locale: servedLocale,
            country_code: "FR",
            creator_sessions: 2,
            created_at: "2026-10-04T01:00:00.000Z",
            updated_at: "2026-10-04T02:00:00.000Z",
          },
        ]);
      } finally {
        sqlite.close();
      }
    }
  );

  it("changes observed totals between three months and a year using the real aggregate query", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      create table localization_demand_daily(day_utc text, preferred_language text, served_locale text, country_code text, creator_sessions integer);
      create table product_metric_measurement_state(metric_id text, contract_version text, measured_since text);
      insert into product_metric_measurement_state values ('L10N-001', 'localization-demand-1.0.0', '2025-01-01');
      insert into localization_demand_daily values
        ('2026-01-10', 'fr', 'en', 'FR', 10),
        ('2026-08-10', 'fr', 'en', 'FR', 6),
        ('2026-08-16', 'fr', 'en', 'FR', 100);
    `);
    mocks.prepare.mockImplementation((query: string) => {
      const statement = db.prepare(query);
      let bindings: string[] = [];
      const adapter = {
        bind: (...args: string[]) => {
          bindings = args;
          return adapter;
        },
        all: async () => ({ results: statement.all(...bindings) }),
        first: async () => statement.get(...bindings),
      };
      return adapter;
    });
    try {
      const now = new Date("2026-08-16T12:00:00Z");
      const short = await getLocalizationDemandMetrics(now, {
        from: "2026-06-01",
        to: "2026-08-16",
      });
      const long = await getLocalizationDemandMetrics(now, {
        from: "2025-09-01",
        to: "2026-08-16",
      });
      expect(short.totalCreatorSessions).toBe(6);
      expect(long.totalCreatorSessions).toBe(16);
      expect(short.languages[0]?.creatorSessions).toBe(6);
      expect(long.languages[0]?.creatorSessions).toBe(16);
      expect(short.comparisonReady).toBe(true);
      expect(long.comparisonReady).toBe(false);
    } finally {
      db.close();
    }
  });

  it("increments an identifier-free UTC daily cell", async () => {
    const statement = createD1Statement({ run: {} });
    installD1Statements(mocks.prepare, [statement]);

    await recordLocalizationDemand({
      preferredLanguage: "fr",
      servedLocale: "en",
      countryCode: "FR",
      now: new Date("2026-08-16T13:00:00.000Z"),
    });

    expect(statement.sql).toContain("insert into localization_demand_daily");
    expect(statement.sql).toContain("creator_sessions = creator_sessions + 1");
    expect(statement.sql).not.toMatch(
      /session_id|user_id|project_id|ip_address/
    );
    expect(statement.bind).toHaveBeenCalledWith(
      "2026-08-16",
      "fr",
      "en",
      "FR",
      "2026-08-16T13:00:00.000Z",
      "2026-08-16T13:00:00.000Z"
    );
  });

  it("queries the selected complete days and an equally long preceding period", async () => {
    const rows = createD1AllStatement([]);
    const state = createD1Statement({
      first: { measured_since: "2026-01-01" },
    });
    installD1Statements(mocks.prepare, [rows, state]);
    const metrics = await getLocalizationDemandMetrics(
      new Date("2026-08-16T12:00:00Z"),
      { from: "2026-08-01", to: "2026-08-16" }
    );
    expect(rows.bind).toHaveBeenCalledWith(
      "2026-08-01",
      "2026-08-01",
      "2026-07-17",
      "2026-08-16"
    );
    expect(metrics).toMatchObject({
      windowDays: 15,
      period: { from: "2026-08-01", to: "2026-08-15" },
      comparisonReady: true,
    });
  });

  it("does not claim coverage for data older than retention", async () => {
    const rows = createD1AllStatement([]);
    const state = createD1Statement({
      first: { measured_since: "2020-01-01" },
    });
    installD1Statements(mocks.prepare, [rows, state]);
    const metrics = await getLocalizationDemandMetrics(
      new Date("2026-08-16T12:00:00Z"),
      { from: "2023-01-01", to: "2023-12-31" }
    );
    expect(metrics.quality).toBe("building");
    expect(metrics.comparisonReady).toBe(false);
  });

  it("rejects invalid and reversed date ranges before querying", async () => {
    await expect(
      getLocalizationDemandMetrics(new Date("2026-08-16"), {
        from: "2026-02-30",
        to: "2026-03-01",
      })
    ).rejects.toThrow();
    await expect(
      getLocalizationDemandMetrics(new Date("2026-08-16"), {
        from: "2026-03-02",
        to: "2026-03-01",
      })
    ).rejects.toThrow();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("merges low-volume language and country cells before disclosure", async () => {
    const rows = createD1AllStatement([
      {
        preferred_language: "fr",
        served_locale: "en",
        country_code: "FR",
        current_sessions: 6,
        previous_sessions: 3,
      },
      {
        preferred_language: "fr",
        served_locale: "en",
        country_code: "BE",
        current_sessions: 2,
        previous_sessions: 1,
      },
      {
        preferred_language: "es",
        served_locale: "en",
        country_code: "ES",
        current_sessions: 4,
        previous_sessions: 2,
      },
      {
        preferred_language: "en",
        served_locale: "en",
        country_code: "US",
        current_sessions: 20,
        previous_sessions: 15,
      },
    ]);
    const state = createD1Statement({
      first: { measured_since: "2026-05-01" },
    });
    installD1Statements(mocks.prepare, [rows, state]);

    const metrics = await getLocalizationDemandMetrics(
      new Date("2026-08-16T12:00:00.000Z")
    );

    expect(rows.bind).toHaveBeenCalledWith(
      "2026-07-19",
      "2026-07-19",
      "2026-06-21",
      "2026-08-16"
    );
    expect(metrics).toMatchObject({
      id: "L10N-001",
      quality: "healthy",
      comparisonReady: true,
      totalCreatorSessions: 32,
      unsupportedCreatorSessions: 12,
    });
    expect(
      metrics.languages.map((row) => ({
        language: row.language,
        sessions: row.creatorSessions,
      }))
    ).toEqual([
      { language: "en", sessions: 20 },
      { language: "fr", sessions: 8 },
      { language: "other", sessions: 4 },
    ]);
    expect(metrics.languages[1]?.countries).toEqual([
      { country: "FR", creatorSessions: 6 },
      { country: "other", creatorSessions: 2 },
    ]);
    expect(metrics.languages[2]).toMatchObject({
      language: "other",
      groupedLanguageCount: 1,
    });
  });

  it("counts distinct grouped languages, not grouped rows, in the other bucket", async () => {
    const rows = createD1AllStatement([
      {
        preferred_language: "de",
        served_locale: "en",
        country_code: "DE",
        current_sessions: 2,
        previous_sessions: 0,
      },
      {
        preferred_language: "de",
        served_locale: "en",
        country_code: "AT",
        current_sessions: 1,
        previous_sessions: 0,
      },
      {
        preferred_language: "it",
        served_locale: "en",
        country_code: "IT",
        current_sessions: 3,
        previous_sessions: 0,
      },
      {
        preferred_language: "en",
        served_locale: "en",
        country_code: "US",
        current_sessions: 20,
        previous_sessions: 15,
      },
    ]);
    const state = createD1Statement({
      first: { measured_since: "2026-05-01" },
    });
    installD1Statements(mocks.prepare, [rows, state]);

    const metrics = await getLocalizationDemandMetrics(
      new Date("2026-08-16T12:00:00.000Z")
    );

    const other = metrics.languages.find((row) => row.language === "other");
    expect(other).toMatchObject({
      creatorSessions: 6,
      groupedLanguageCount: 2,
    });
  });

  it("derives supported language primaries from the locale configuration", async () => {
    const rows = createD1AllStatement(
      supportedLocales.map((locale) => ({
        preferred_language: locale.toLowerCase().replace(/-.*/, ""),
        served_locale: "en",
        country_code: "unknown",
        current_sessions: 5,
        previous_sessions: 0,
      }))
    );
    const state = createD1Statement({
      first: { measured_since: "2026-05-01" },
    });
    installD1Statements(mocks.prepare, [rows, state]);

    const metrics = await getLocalizationDemandMetrics(
      new Date("2026-08-16T12:00:00.000Z")
    );

    expect(metrics.languages).toHaveLength(supportedLocales.length);
    expect(metrics.languages.every((row) => row.supported)).toBe(true);
  });

  it("removes aggregates after 24 months", async () => {
    const statement = createD1Statement({ run: {} });
    const db = { prepare: vi.fn((_query: string) => statement) };

    await cleanupExpiredLocalizationDemand(
      db as Parameters<typeof cleanupExpiredLocalizationDemand>[0]
    );

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining("localization_demand_daily")
    );
    expect(String(db.prepare.mock.calls[0]?.[0])).toContain("-24 months");
    expect(statement.run).toHaveBeenCalledOnce();
  });

  it("falls back to the default retention window for non-finite values", async () => {
    const statement = createD1Statement({ run: {} });
    const db = { prepare: vi.fn((_query: string) => statement) };

    await cleanupExpiredLocalizationDemand(
      db as Parameters<typeof cleanupExpiredLocalizationDemand>[0],
      Number.NaN
    );

    expect(String(db.prepare.mock.calls[0]?.[0])).toContain("-24 months");
    expect(String(db.prepare.mock.calls[0]?.[0])).not.toContain("NaN");
  });
});
