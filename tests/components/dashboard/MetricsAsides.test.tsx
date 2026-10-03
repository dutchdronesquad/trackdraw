// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ExportReliabilityAside,
  JourneyAside,
  WeeklyAside,
} from "@/components/dashboard/MetricsAsides";
import type { ProductActivityAnalysis } from "@/lib/metrics-analysis";

afterEach(cleanup);

const week = {
  from: "2026-09-21",
  to: "2026-09-27",
  exports: 0,
  views: 0,
  medianSeconds: null,
  p75Seconds: null,
  completed: 0,
};

const analysis: ProductActivityAnalysis = {
  weeks: [
    { ...week, week: "2026-W38", started: 80, edited: 60, valuable: 30 },
    { ...week, week: "2026-W39", started: 100, edited: 70, valuable: 40 },
  ],
  journey: { started: 100, edited: 40, valuable: 30, completed: 20 },
  timeToResult: { samples: 0, medianSeconds: null, p75Seconds: null },
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

describe("metrics asides", () => {
  it("compares the latest week with the week before", () => {
    render(<WeeklyAside analysis={analysis} />);

    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("+25% vs the week before")).toBeTruthy();
    expect(
      screen.getByText("40 sessions reached a valuable result (40%).")
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

    expect(screen.getByText("4%")).toBeTruthy();
    expect(
      screen.getByText("PDF has the highest failure rate at 9%.")
    ).toBeTruthy();
  });

  it("renders nothing without data", () => {
    const { container } = render(<WeeklyAside analysis={undefined} />);

    expect(container.textContent).toBe("");
  });
});
