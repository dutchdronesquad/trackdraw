import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
