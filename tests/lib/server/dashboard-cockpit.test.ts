import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  getMeasurementStates: vi.fn(),
  getMetricSeries: vi.fn(),
  statements: [] as Array<{
    sql: string;
    bind: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

vi.mock("@/lib/server/product-metric-aggregates", () => ({
  getProductMetricMeasurementStates: mocks.getMeasurementStates,
  getProductMetricSeries: mocks.getMetricSeries,
}));

import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";

beforeEach(() => {
  mocks.prepare.mockReset();
  mocks.getMeasurementStates.mockReset();
  mocks.getMeasurementStates.mockResolvedValue([]);
  mocks.getMetricSeries.mockReset();
  mocks.getMetricSeries.mockResolvedValue([]);
  mocks.statements.length = 0;
  mocks.prepare.mockImplementation((sql: string) => {
    const statement = {
      sql,
      bind: vi.fn(),
      first: vi.fn(async () =>
        sql.includes("from apikey") ? { unused: 0, expired: 0 } : { count: 0 }
      ),
    };
    statement.bind.mockReturnValue(statement);
    mocks.statements.push(statement);
    return statement;
  });
});

describe("daily cockpit server data", () => {
  it("binds the unused API-key age as a full ISO timestamp", async () => {
    const now = new Date("2026-08-14T12:34:56.000Z");

    await getDailyCockpit(now);

    const apiKeyStatement = mocks.statements.find((statement) =>
      statement.sql.includes("from apikey")
    );
    expect(apiKeyStatement?.bind).toHaveBeenCalledWith(
      "2026-08-14T12:34:56.000Z",
      "2026-07-15T12:34:56.000Z",
      "2026-08-14T12:34:56.000Z"
    );
  });

  it("does not report unavailable measurement checks as clear", async () => {
    const cockpit = await getDailyCockpit(new Date("2026-08-14T12:34:56.000Z"));

    expect(cockpit.operations.availability).toEqual({
      failures: false,
      pipeline: false,
    });
    expect(cockpit.operations.analyticsPipelineGaps).toBe(0);
  });

  it("reports pipeline availability separately from building metrics", async () => {
    mocks.getMeasurementStates.mockResolvedValue([
      {
        metric_id: "MTR-001",
        contract_version: "1.0.0",
        measured_since: "2026-08-14",
        completeness_state: "building",
        last_aggregated_day: null,
        last_success_at: null,
      },
    ]);

    const cockpit = await getDailyCockpit(new Date("2026-08-14T12:34:56.000Z"));

    expect(cockpit.operations.availability.pipeline).toBe(true);
    expect(cockpit.operations.buildingMetrics).toBe(1);
    expect(cockpit.operations.analyticsPipelineGaps).toBe(0);
  });
});
