// @vitest-environment happy-dom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DailyCockpit from "@/components/dashboard/DailyCockpit";
import type { DailyCockpitData } from "@/lib/server/dashboard-cockpit";

function cockpitData({
  failureWarning = false,
}: {
  failureWarning?: boolean;
} = {}): DailyCockpitData {
  const metricRow = {
    metric_id: "MTR-001" as const,
    day_utc: "2026-08-30",
    dimension: "",
    window_days: 7 as const,
    numerator: 12,
    denominator: null,
    sample_size: 12,
    completeness_state: "complete" as const,
    quality_status: "healthy" as const,
    updated_at: "2026-08-31T00:17:00.000Z",
  };

  return {
    generatedAt: "2026-08-31T12:00:00.000Z",
    warning: failureWarning
      ? {
          metricId: "MTR-010",
          dimension: "export:rendering",
          currentValue: 0.3,
          historicalMedian: 0.05,
          absoluteChange: 0.25,
          score: 4,
        }
      : null,
    operations: {
      missingGalleryPreviews: 0,
      exportFailures: 6,
      publicationFailures: 4,
      unusedApiKeys: 0,
      expiredApiKeys: 0,
      analyticsPipelineGaps: 0,
      buildingMetrics: 0,
      availability: { failures: true, pipeline: true },
    },
    headlines: [
      {
        id: "MTR-001",
        windowDays: 7,
        minimumVolume: 30,
        valueKind: "count",
        unfavorableDirection: "down",
        drilldown: "/dashboard/metrics#creators",
        current: metricRow,
        live: null,
        previous: null,
        comparisonReady: false,
        quality: "healthy",
        measuredSince: "2026-08-01",
      },
      ...(["MTR-004", "MTR-005", "MTR-006"] as const).map((id) => ({
        id,
        windowDays: id === "MTR-005" ? (30 as const) : (7 as const),
        minimumVolume: id === "MTR-005" ? 20 : 30,
        valueKind: "rate" as const,
        unfavorableDirection: "down" as const,
        drilldown:
          id === "MTR-006"
            ? "/dashboard/metrics#distribution"
            : id === "MTR-004"
              ? "/dashboard/metrics#creation"
              : "/dashboard/metrics#creators",
        current: {
          ...metricRow,
          metric_id: id,
          window_days: id === "MTR-005" ? (30 as const) : (7 as const),
          numerator: 4,
          denominator: 10,
        },
        live: null,
        previous: null,
        comparisonReady: false,
        quality: "healthy" as const,
        measuredSince: "2026-08-01",
      })),
    ],
  };
}

describe("DailyCockpit", () => {
  it("keeps recorded failures out of the action queue without a reliable warning", async () => {
    render(await DailyCockpit({ data: cockpitData() }));

    expect(screen.getByText("No action needs attention")).toBeTruthy();
    const attention = screen
      .getByRole("heading", { name: "Needs attention" })
      .closest("section");
    expect(attention).toBeTruthy();
    expect(
      within(attention!).queryByText("Publication and export attempts")
    ).toBeNull();
    expect(
      screen.queryByText(/10 failed publication or export attempts/)
    ).toBeNull();
    expect(
      screen
        .getByRole("link", {
          name: "Open analytical context for Active creators",
        })
        .getAttribute("href")
    ).toBe("/dashboard/metrics#creators");
  });

  it("surfaces failures when their rate triggers a reliable warning", async () => {
    render(await DailyCockpit({ data: cockpitData({ failureWarning: true }) }));

    expect(
      screen.getByText("Export or publication reliability needs review")
    ).toBeTruthy();
    expect(screen.getByText("Publication and export attempts")).toBeTruthy();
    expect(
      screen.getByText(/reliable failure-rate warning is active/)
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Publication and export attempts/ })
        .getAttribute("href")
    ).toBe("/dashboard/metrics#operations");
  });
});
