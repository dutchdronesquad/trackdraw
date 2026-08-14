import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  statements: [] as Array<{
    sql: string;
    bind: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@/lib/server/db", () => ({
  getDatabase: vi.fn(async () => ({ prepare: mocks.prepare })),
}));

vi.mock("@/lib/server/product-metric-aggregates", () => ({
  getProductMetricMeasurementStates: vi.fn(async () => []),
  getProductMetricSeries: vi.fn(async () => []),
}));

import { getDailyCockpit } from "@/lib/server/dashboard-cockpit";

beforeEach(() => {
  mocks.prepare.mockReset();
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
});
