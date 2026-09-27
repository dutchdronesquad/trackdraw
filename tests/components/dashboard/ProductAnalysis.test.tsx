// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  WeeklyActivity,
  JourneyDropoff,
  TimeToResult,
  ExportReliability,
} from "@/components/dashboard/ProductAnalysis";
import type { ProductActivityAnalysis } from "@/lib/metrics-analysis";

afterEach(cleanup);
const analysis: ProductActivityAnalysis = {
  weeks: [
    {
      week: "2026-07-06",
      from: "2026-07-06",
      to: "2026-07-12",
      started: 40,
      edited: 20,
      valuable: 5,
      completed: 8,
      exports: 9,
      views: 70,
      medianSeconds: 180,
      p75Seconds: 600,
    },
  ],
  journey: { started: 40, edited: 20, valuable: 5, completed: 8 },
  timeToResult: { samples: 8, medianSeconds: 180, p75Seconds: 600 },
  exportReliability: [
    {
      format: "png",
      legacy: false,
      successes: 31,
      failures: 9,
      failureRate: 9 / 40,
    },
    {
      format: "legacy",
      legacy: true,
      successes: 10,
      failures: 2,
      failureRate: null,
    },
  ],
};

describe("product analysis", () => {
  it("shows drop-off against the preceding stage and weekly progression", async () => {
    render(<JourneyDropoff analysis={analysis} />);
    expect(screen.getByText("20 of 40")).toBeTruthy();
    expect(screen.getByText("5 of 20")).toBeTruthy();
    expect(screen.getByText("Drop-off: 50%")).toBeTruthy();
    expect(screen.getByText("Drop-off: 75%")).toBeTruthy();
    expect(screen.getAllByText("Limited sample (< 30)")).toHaveLength(1);
    await userEvent.click(screen.getByText("View progression by start week"));
    expect(screen.getByText("12.5%")).toBeTruthy();
  });
  it("reports durations only for completed sessions and exposes excluded sessions", () => {
    render(<TimeToResult analysis={analysis} />);
    expect(screen.getByText("3 min")).toBeTruthy();
    expect(screen.getByText("10 min")).toBeTruthy();
    expect(screen.getByText(/Without a result: 32 \(excluded\)/)).toBeTruthy();
    expect(screen.getByText("Limited sample (< 30)")).toBeTruthy();
  });
  it("keeps sub-minute results visible instead of rounding them to zero minutes", () => {
    render(
      <TimeToResult
        analysis={{
          ...analysis,
          timeToResult: { samples: 8, medianSeconds: 1, p75Seconds: 30 },
        }}
      />
    );
    expect(screen.getByText("1 sec")).toBeTruthy();
    expect(screen.getByText("30 sec")).toBeTruthy();
  });

  it("does not display zero duration or a drop-off percentage for an empty cohort", () => {
    const empty = {
      ...analysis,
      journey: { started: 0, edited: 0, valuable: 0, completed: 0 },
      timeToResult: { samples: 0, medianSeconds: null, p75Seconds: null },
    };
    render(
      <>
        <TimeToResult analysis={empty} />
        <JourneyDropoff analysis={empty} />
      </>
    );
    expect(screen.queryByText("0 min")).toBeNull();
    expect(
      screen.getByText("No completed sessions to calculate a duration.")
    ).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getAllByText("Drop-off: —")).toHaveLength(2);
  });
  it("compares export volumes on one scale without charting legacy outcomes", () => {
    render(
      <ExportReliability
        analysis={{
          ...analysis,
          exportReliability: [
            ...analysis.exportReliability,
            {
              format: "svg",
              legacy: false,
              successes: 80,
              failures: 0,
              failureRate: 0,
            },
          ],
        }}
      />
    );
    const figures = screen.getAllByRole("figure");
    expect(figures).toHaveLength(2);
    const png = figures.find((figure) => within(figure).queryByText("PNG"))!;
    const segments = png.querySelectorAll<HTMLElement>("[aria-hidden] > div");
    expect(segments[0].style.width).toBe("38.75%");
    expect(segments[1].style.width).toBe("11.25%");
    expect(screen.queryByText("About these numbers")).toBeNull();
  });
  it("keeps legacy events out of format failure rates", () => {
    render(<ExportReliability analysis={analysis} />);
    expect(screen.getByText("22.5%")).toBeTruthy();
    const legacy = screen
      .getByText("Earlier events (all formats)")
      .closest("li")!;
    expect(within(legacy).getByText("—")).toBeTruthy();
    expect(within(legacy).getByText("10")).toBeTruthy();
    expect(within(legacy).getByText("2")).toBeTruthy();
  });
  it("labels partial weeks and shows unknown history as unavailable rather than zero", async () => {
    render(
      <WeeklyActivity
        analysis={{
          ...analysis,
          weeks: [
            {
              ...analysis.weeks[0],
              week: "2026-06-29",
              from: "2026-07-01",
              to: "2026-07-05",
              started: 0,
              exports: 0,
              views: 0,
            },
            { ...analysis.weeks[0], to: "2026-07-10" },
          ],
        }}
        coverage={{
          availableFrom: "2026-07-06",
          from: "2026-07-07",
          complete: false,
          comparisonReady: false,
        }}
      />
    );
    await userEvent.click(screen.getByText("View weekly counts and coverage"));
    const table = screen.getByRole("table");
    expect(within(table).getByText("Unavailable")).toBeTruthy();
    expect(within(table).getAllByText("—")).toHaveLength(3);
    expect(within(table).getByText("Partial week / history")).toBeTruthy();
    expect(within(table).getByText("40")).toBeTruthy();
  });
});
