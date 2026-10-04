// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EmbedShareAside,
  ExportReliabilityAside,
  JourneyAside,
  ShareReachAside,
} from "@/components/dashboard/MetricsAsides";
import type { ProductActivityAnalysis } from "@/lib/metrics-analysis";
import type { ProductUsageMetrics } from "@/lib/server/metrics";

afterEach(cleanup);

const week = {
  from: "2026-09-21",
  to: "2026-09-27",
  exports: 0,
  medianSeconds: null,
  p75Seconds: null,
  completed: 0,
};

const analysis: ProductActivityAnalysis = {
  weeks: [
    {
      ...week,
      week: "2026-09-14",
      started: 80,
      edited: 60,
      valuable: 30,
      views: 800,
      embedViews: 80,
    },
    {
      ...week,
      week: "2026-09-21",
      started: 100,
      edited: 70,
      valuable: 40,
      views: 1000,
      embedViews: 300,
    },
  ],
  journey: { started: 100, edited: 40, valuable: 30, completed: 20 },
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
      successes: 95,
      failures: 1,
      failureRate: 0.01,
    },
    {
      format: "pdf",
      legacy: false,
      successes: 40,
      failures: 4,
      failureRate: 0.09,
    },
  ],
};

const usage = {
  exports: 200,
  exportFormats: [
    { format: "png", count: 150 },
    { format: "pdf", count: 50 },
  ],
  embedReferrers: [
    {
      shareToken: "a",
      shareTitle: "Indoor Cup",
      hostname: "club.example",
      views: 120,
      previousViews: 0,
      lastSeen: "2026-09-27",
    },
  ],
} as unknown as ProductUsageMetrics;

describe("metrics asides", () => {
  it("compares the latest week of share views with the week before", () => {
    render(<ShareReachAside analysis={analysis} usage={usage} />);

    expect(screen.getByText("1,000")).toBeTruthy();
    expect(screen.getByText("views in week 39")).toBeTruthy();
    expect(screen.getByText("+25% vs week 38")).toBeTruthy();
    expect(
      screen.getByText("Embeds account for 21% of all views in this period.")
    ).toBeTruthy();
    expect(
      screen.getByText("Completed exports this period: 200 (PNG 75%, PDF 25%).")
    ).toBeTruthy();
  });

  it("shows the embed share and where it started", () => {
    render(<EmbedShareAside analysis={analysis} usage={usage} />);

    expect(screen.getByText("21%")).toBeTruthy();
    expect(screen.getByText("From 10% in week 38")).toBeTruthy();
    expect(
      screen.getByText(
        "club.example is the largest embedding website with 120 views."
      )
    ).toBeTruthy();
  });

  it("names the step with the largest drop", () => {
    render(<JourneyAside analysis={analysis} />);

    expect(screen.getByText("30%")).toBeTruthy();
    expect(
      screen.getByText(
        "The largest drop happens before the first edit: 60% of sessions stop there."
      )
    ).toBeTruthy();
  });

  it("points at the export format with the highest failure rate", () => {
    render(<ExportReliabilityAside analysis={analysis} />);

    expect(screen.getByText("135")).toBeTruthy();
    expect(
      screen.getByText("PDF fails 9× more often than other formats")
    ).toBeTruthy();
    expect(
      screen.getByText("PDF has the highest failure rate at 9%.")
    ).toBeTruthy();
  });

  it("renders nothing without data", () => {
    const { container } = render(
      <ShareReachAside analysis={undefined} usage={undefined} />
    );

    expect(container.textContent).toBe("");
  });
});
