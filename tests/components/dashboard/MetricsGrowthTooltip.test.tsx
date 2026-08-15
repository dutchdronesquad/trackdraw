// @vitest-environment happy-dom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GrowthByRange } from "@/lib/server/metrics";
import { UserGrowthCard } from "@/components/dashboard/MetricsCharts";

vi.mock("recharts", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children);
  const Empty = () => null;

  return {
    ResponsiveContainer: Passthrough,
    ComposedChart: Passthrough,
    Area: Empty,
    Bar: Empty,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Legend: Empty,
    Tooltip: ({ content }: { content?: React.ReactNode }) => {
      if (!React.isValidElement(content)) {
        return React.createElement(
          "div",
          { "data-testid": "growth-tooltip" },
          "totalUsers: 12 newUsers: 2"
        );
      }

      return React.createElement(
        "div",
        { "data-testid": "growth-tooltip" },
        React.cloneElement(
          content as React.ReactElement<Record<string, unknown>>,
          {
            active: true,
            label: "Jul 2026",
            payload: [
              {
                color: "#0284c7",
                dataKey: "totalUsers",
                name: "totalUsers",
                payload: { label: "Jul 2026" },
                value: 12,
              },
              {
                color: "#10b981",
                dataKey: "newUsers",
                name: "newUsers",
                payload: { label: "Jul 2026" },
                value: 2,
              },
            ],
          }
        )
      );
    },
  };
});

const growthData = {
  bucket: "month" as const,
  from: "2026-04-01",
  to: "2026-07-09",
  userGrowth: [{ period: "2026-07-01", label: "Jul 2026", users: 2 }],
  userGrowthCumulative: [
    { period: "2026-07-01", label: "Jul 2026", users: 12 },
  ],
};

const growthByRange: GrowthByRange = {
  "3m": growthData,
  "6m": growthData,
  "12m": growthData,
  ytd: growthData,
  previousYear: growthData,
};

describe("user growth tooltip", () => {
  afterEach(cleanup);

  it("uses translated labels instead of raw series keys", () => {
    render(
      <UserGrowthCard
        growthByRange={growthByRange}
        growthTimeline={{
          dailyGrowth: [{ date: "2026-07-01", users: 2 }],
          totalUsers: 12,
          today: "2026-07-09",
        }}
      />
    );

    const tooltip = within(screen.getByTestId("growth-tooltip"));
    expect(tooltip.getByText("Jul 2026")).toBeTruthy();
    expect(tooltip.getByText("New this month")).toBeTruthy();
    expect(tooltip.getByText("Total users")).toBeTruthy();
    expect(tooltip.getByText("+2")).toBeTruthy();
    expect(tooltip.getByText("12")).toBeTruthy();
    expect(tooltip.queryByText(/newUsers/)).toBeNull();
    expect(tooltip.queryByText(/totalUsers/)).toBeNull();
  });
});
