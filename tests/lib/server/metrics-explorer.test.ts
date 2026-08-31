import { describe, expect, it, vi } from "vitest";
import { createD1AllStatement } from "../../helpers/d1";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getProductMetricMeasurementStates: vi.fn(),
  getProductMetricSeries: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/server/product-metric-aggregates", () => ({
  getProductMetricMeasurementStates: mocks.getProductMetricMeasurementStates,
  getProductMetricSeries: mocks.getProductMetricSeries,
}));

import { getMetricsExplorerData } from "@/lib/server/metrics-explorer";

describe("metrics explorer failure attempts", () => {
  it("returns exact timestamps and structured causes without identifiers", async () => {
    const failures = createD1AllStatement([
      {
        occurred_at: "2026-08-14T09:32:00.000Z",
        operation: "export",
        category: "rendering",
        export_format: "png",
        reason: "rendering_failed",
      },
      {
        occurred_at: "2026-08-14T08:15:00.000Z",
        operation: "export",
        category: "rendering",
        export_format: null,
        reason: null,
      },
    ]);
    const prepare = vi.fn((sql: string) => {
      failures.sql = sql;
      return failures;
    });
    mocks.getDatabase.mockResolvedValue({ prepare });
    mocks.getProductMetricMeasurementStates.mockResolvedValue([
      {
        metric_id: "MTR-010",
        contract_version: "1.1.0",
        measured_since: "2026-08-01",
        completeness_state: "building",
        last_aggregated_day: "2026-08-14",
        last_success_at: "2026-08-15T00:17:00.000Z",
      },
    ]);
    mocks.getProductMetricSeries.mockImplementation(
      async (_db: unknown, metricId: string) =>
        metricId === "MTR-010"
          ? [
              {
                metric_id: "MTR-010",
                day_utc: "2026-08-14",
                dimension: "export:rendering",
                window_days: 7,
                numerator: 2,
                denominator: 12,
                sample_size: 12,
                completeness_state: "complete",
                quality_status: "low_volume",
                updated_at: "2026-08-15T00:17:00.000Z",
              },
            ]
          : []
    );

    const result = await getMetricsExplorerData(
      new Date("2026-08-15T12:00:00.000Z")
    );

    expect(result.failures.rows).toHaveLength(1);
    expect(failures.sql).toContain("event_type = 'export.failed'");
    expect(failures.sql).not.toContain("project_id");
    expect(failures.sql).not.toContain("session_id");
    expect(result.recentFailures).toEqual([
      {
        occurredAt: "2026-08-14T09:32:00.000Z",
        operation: "export",
        category: "rendering",
        exportFormat: "png",
        reason: "rendering_failed",
      },
      {
        occurredAt: "2026-08-14T08:15:00.000Z",
        operation: "export",
        category: "rendering",
        exportFormat: null,
        reason: null,
      },
    ]);
  });
});
