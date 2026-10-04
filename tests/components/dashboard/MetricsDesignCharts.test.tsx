// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EditorSplit,
  EmbedSitesTable,
  ExportFormatTable,
  JourneyFunnel,
  SharingHealthGrid,
} from "@/components/dashboard/MetricsDesignCharts";
import { isoWeekNumber } from "@/components/dashboard/MetricsVisuals";
import type { ProductActivityAnalysis } from "@/lib/metrics-analysis";
import type { AdminMetrics, ProductUsageMetrics } from "@/lib/server/metrics";

afterEach(cleanup);

const analysis: ProductActivityAnalysis = {
  weeks: [],
  journey: { started: 3420, edited: 2610, valuable: 1480, completed: 1600 },
  timeToResult: {
    samples: 0,
    medianSeconds: null,
    p75Seconds: null,
    buckets: [0, 0, 0, 0, 0, 0],
  },
  exportReliability: [
    {
      format: "png",
      legacy: false,
      successes: 1104,
      failures: 9,
      failureRate: 9 / 1113,
    },
    {
      format: "pdf",
      legacy: false,
      successes: 591,
      failures: 14,
      failureRate: 14 / 605,
    },
    {
      format: "legacy",
      legacy: true,
      successes: 20,
      failures: 1,
      failureRate: null,
    },
  ],
};

describe("metrics design charts", () => {
  it("labels each funnel drop and marks the largest one", () => {
    render(<JourneyFunnel analysis={analysis} />);

    expect(screen.getByText("−24% drop")).toBeTruthy();
    expect(screen.getByText("−43% drop · largest")).toBeTruthy();
    expect(screen.getByText("3,420")).toBeTruthy();
  });

  it("flags formats with an elevated failure rate", () => {
    render(<ExportFormatTable analysis={analysis} />);

    const rows = screen.getAllByRole("row");
    expect(rows[1].textContent).toContain("PNG");
    expect(rows[2].textContent).toContain("2.3%");
    expect(rows[3].textContent).toContain("Earlier events (all formats)");
    expect(rows[3].textContent).toContain("—");
  });

  it("splits editor sessions and compares outcome rates", () => {
    const usage = {
      anonymousSessions: 2189,
      accountSessions: 1231,
      creatorFunnel: {
        anonymous: { started: 2189, edited: 1600, valuable: 219 },
        account: { started: 1231, edited: 1010, valuable: 369 },
      },
    } as unknown as ProductUsageMetrics;
    render(<EditorSplit usage={usage} />);

    expect(screen.getByText("64%")).toBeTruthy();
    expect(
      screen.getByText(
        "Signed-in sessions are 3× more likely to reach a valuable result."
      )
    ).toBeTruthy();
  });

  it("groups embed views below the reporting threshold", () => {
    const usage = {
      shareSurfaces: [{ surface: "embed", count: 800 }],
      embedReferrerSummary: { hostnames: 1, views: 743, rows: 1 },
      embedReferrers: [
        {
          shareToken: "abc",
          shareTitle: "Zwolle Indoor Cup R3",
          hostname: "fpv-zwolle.nl",
          views: 743,
          previousViews: 0,
          lastSeen: "2026-10-03",
        },
      ],
    } as unknown as ProductUsageMetrics;
    render(<EmbedSitesTable usage={usage} />);

    expect(screen.getByText("fpv-zwolle.nl")).toBeTruthy();
    expect(
      screen.getByText("Other embedded views below the reporting threshold")
    ).toBeTruthy();
    expect(screen.getByText("57")).toBeTruthy();
  });

  it("links sharing health cells to the pages that resolve them", () => {
    render(
      <SharingHealthGrid
        shares={
          {
            totalActive: 604,
            expired: 13,
            revoked: 9,
          } as AdminMetrics["shares"]
        }
        gallery={{ missingPreview: 2 } as AdminMetrics["gallery"]}
      />
    );

    expect(
      screen
        .getByText("Gallery entries without preview")
        .closest("a")
        ?.getAttribute("href")
    ).toBe("/dashboard/gallery");
  });

  it("numbers weeks using ISO weeks", () => {
    expect(isoWeekNumber("2026-09-28")).toBe(40);
    expect(isoWeekNumber("2026-01-01")).toBe(1);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
  });
});
