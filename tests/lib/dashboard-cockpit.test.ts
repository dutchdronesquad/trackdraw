import { describe, expect, it } from "vitest";
import {
  buildCockpitHeadlineMetrics,
  selectReliableProductWarning,
} from "@/lib/dashboard-cockpit";
import type {
  ProductMetricDailyRow,
  ProductMetricId,
} from "@/lib/server/product-metric-aggregates";

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function metricRow(
  metricId: ProductMetricId,
  day: string,
  options: Partial<ProductMetricDailyRow> = {}
): ProductMetricDailyRow {
  return {
    metric_id: metricId,
    day_utc: day,
    dimension: "",
    window_days: metricId === "MTR-005" ? 30 : 7,
    numerator: 10,
    denominator: null,
    sample_size: 40,
    completeness_state: "complete",
    quality_status: "healthy",
    updated_at: `${day}T01:00:00.000Z`,
    ...options,
  };
}

describe("daily dashboard cockpit", () => {
  it("shows low-volume counts without enabling comparison styling", () => {
    const rows = [
      metricRow("MTR-001", "2026-08-13", {
        numerator: 4,
        sample_size: 9,
      }),
      metricRow("MTR-001", "2026-08-14", {
        numerator: 5,
        sample_size: 10,
        completeness_state: "incomplete",
        quality_status: "building",
      }),
    ];

    const metric = buildCockpitHeadlineMetrics(
      { "MTR-001": rows },
      new Date("2026-08-14T12:00:00.000Z")
    )[0];

    expect(metric).toMatchObject({
      id: "MTR-001",
      quality: "low_volume",
      comparisonReady: false,
      previous: null,
    });
    expect(metric.current?.numerator).toBe(4);
    expect(metric.live?.numerator).toBe(5);
  });

  it("compares only after eight equally spaced healthy periods", () => {
    const currentDay = "2026-08-13";
    const rows = [
      metricRow("MTR-001", currentDay, { numerator: 12 }),
      metricRow("MTR-001", "2026-08-14", {
        numerator: 13,
        completeness_state: "incomplete",
        quality_status: "building",
      }),
      ...Array.from({ length: 8 }, (_, index) =>
        metricRow("MTR-001", addUtcDays(currentDay, -(index + 1) * 7), {
          numerator: 10,
        })
      ),
    ];

    const metric = buildCockpitHeadlineMetrics(
      { "MTR-001": rows },
      new Date("2026-08-14T12:00:00.000Z")
    )[0];

    expect(metric.comparisonReady).toBe(true);
    expect(metric.previous?.day_utc).toBe("2026-08-06");
    expect(metric.previous?.numerator).toBe(10);
  });

  it("returns at most one warning after volume and historical deviation gates", () => {
    const currentDay = "2026-08-13";
    const activeRows = [
      metricRow("MTR-001", currentDay, { numerator: 5 }),
      ...Array.from({ length: 8 }, (_, index) =>
        metricRow("MTR-001", addUtcDays(currentDay, -(index + 1) * 7), {
          numerator: 10,
        })
      ),
    ];
    const reachRows = [
      metricRow("MTR-006", currentDay, { numerator: 8 }),
      ...Array.from({ length: 8 }, (_, index) =>
        metricRow("MTR-006", addUtcDays(currentDay, -(index + 1) * 7), {
          numerator: 10,
        })
      ),
    ];
    const series = {
      "MTR-001": activeRows,
      "MTR-006": reachRows,
    };
    const headlines = buildCockpitHeadlineMetrics(
      series,
      new Date("2026-08-14T12:00:00.000Z")
    );

    expect(selectReliableProductWarning(series, headlines)).toMatchObject({
      metricId: "MTR-001",
      currentValue: 5,
      historicalMedian: 10,
    });
  });

  it("suppresses the same movement when minimum volume is not met", () => {
    const currentDay = "2026-08-13";
    const rows = [
      metricRow("MTR-001", currentDay, {
        numerator: 5,
        sample_size: 12,
      }),
      ...Array.from({ length: 8 }, (_, index) =>
        metricRow("MTR-001", addUtcDays(currentDay, -(index + 1) * 7), {
          numerator: 10,
          sample_size: 12,
        })
      ),
    ];
    const series = { "MTR-001": rows };
    const headlines = buildCockpitHeadlineMetrics(
      series,
      new Date("2026-08-14T12:00:00.000Z")
    );

    expect(selectReliableProductWarning(series, headlines)).toBeNull();
  });
});
