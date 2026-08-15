import { describe, expect, it } from "vitest";
import { buildMetricsExplorerData } from "@/lib/metrics-explorer";
import type {
  ProductMetricDailyRow,
  ProductMetricId,
  ProductMetricMeasurementState,
} from "@/lib/server/product-metric-aggregates";

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function row(
  metricId: ProductMetricId,
  day: string,
  dimension: string,
  numerator: number,
  denominator: number | null,
  overrides: Partial<ProductMetricDailyRow> = {}
): ProductMetricDailyRow {
  return {
    metric_id: metricId,
    day_utc: day,
    dimension,
    window_days: metricId === "MTR-005" ? 30 : 28,
    numerator,
    denominator,
    sample_size: denominator,
    completeness_state: "complete",
    quality_status: "healthy",
    updated_at: `${day}T03:17:00.000Z`,
    ...overrides,
  };
}

function state(metricId: ProductMetricId): ProductMetricMeasurementState {
  return {
    metric_id: metricId,
    contract_version: "1.0.0",
    measured_since: "2026-01-01",
    completeness_state: "complete",
    last_aggregated_day: "2026-08-14",
    last_success_at: "2026-08-15T03:17:00.000Z",
  };
}

describe("metrics explorer", () => {
  it("shows a comparison only after eight preceding healthy periods", () => {
    const currentDay = "2026-08-14";
    const acquisition = [
      row("MTR-008", currentDay, "direct", 40, 100),
      ...Array.from({ length: 8 }, (_, index) =>
        row(
          "MTR-008",
          addUtcDays(currentDay, -(index + 1) * 28),
          "direct",
          30 - index,
          100
        )
      ),
    ];

    const result = buildMetricsExplorerData(
      { "MTR-008": acquisition },
      [state("MTR-008")],
      new Date("2026-08-15T12:00:00.000Z")
    );

    expect(result.acquisition.rows[0]).toMatchObject({
      dimension: "direct",
      value: 0.4,
      previousValue: 0.3,
      comparisonReady: true,
    });

    acquisition[3] = row("MTR-008", acquisition[3]!.day_utc, "direct", 4, 10, {
      quality_status: "low_volume",
    });
    const lowVolumeHistory = buildMetricsExplorerData(
      { "MTR-008": acquisition },
      [state("MTR-008")]
    );

    expect(lowVolumeHistory.acquisition.rows[0]).toMatchObject({
      previousValue: null,
      comparisonReady: false,
    });
  });

  it("merges acquisition cells below five sessions", () => {
    const result = buildMetricsExplorerData(
      {
        "MTR-008": [
          row("MTR-008", "2026-08-14", "direct", 40, 50),
          row("MTR-008", "2026-08-14", "campaign", 3, 50),
          row("MTR-008", "2026-08-14", "unknown", 2, 50),
        ],
      },
      [state("MTR-008")]
    );

    expect(
      result.acquisition.rows.map(({ dimension, numerator }) => ({
        dimension,
        numerator,
      }))
    ).toEqual([
      { dimension: "direct", numerator: 40 },
      { dimension: "other", numerator: 5 },
    ]);
  });

  it("omits immature and invalid retention cohorts", () => {
    const result = buildMetricsExplorerData(
      {
        "MTR-005": [
          row("MTR-005", "2026-06-01", "", 8, 24),
          row("MTR-005", "2026-07-01", "", 0, null, {
            completeness_state: "incomplete",
            quality_status: "building",
          }),
          row("MTR-005", "2026-05-01", "", 10, 22, {
            quality_status: "invalid",
          }),
        ],
      },
      [state("MTR-005")]
    );

    expect(result.retention.rows.map((entry) => entry.day)).toEqual([
      "2026-06-01",
    ]);
  });
});
