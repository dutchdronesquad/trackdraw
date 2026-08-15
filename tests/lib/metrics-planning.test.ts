import { describe, expect, it } from "vitest";
import {
  calculateCostCoverageEstimate,
  calculateCostPerActiveCreator,
  calculateCreatorRange,
  calculatePlanLimitImpact,
} from "@/lib/metrics-planning";

describe("planning metric helpers", () => {
  it("separates empty, near-limit, and above-limit accounts", () => {
    const impact = calculatePlanLimitImpact(
      [
        [0, 0, 0],
        [4, 1, 1],
        [5, 4, 1],
        [6, 1, 1],
        [1, 6, 1],
      ],
      { projects: 5, shares: 5, presets: 5 }
    );

    expect(impact).toMatchObject({
      accountsWithContent: 4,
      emptyAccounts: 1,
      nearAny: 2,
      aboveAny: 2,
      nearOrAboveAny: 4,
      resources: {
        projects: { near: 2, above: 1 },
        shares: { near: 1, above: 1 },
        presets: { near: 0, above: 0 },
      },
    });
  });

  it("does not classify zero-limit resources as near", () => {
    const impact = calculatePlanLimitImpact([[1, 0, 0]], {
      projects: 0,
      shares: 0,
      presets: 0,
    });

    expect(impact.nearAny).toBe(0);
    expect(impact.aboveAny).toBe(1);
  });

  it("derives cost only from a positive cost and creator count", () => {
    expect(calculateCostPerActiveCreator(42.8, 184)).toBeCloseTo(0.2326);
    expect(calculateCostPerActiveCreator(0, 184)).toBeNull();
    expect(calculateCostPerActiveCreator(42.8, 0)).toBeNull();
  });

  it("derives a cost-covering estimate from explicit assumptions", () => {
    expect(calculateCostCoverageEstimate(100, 200, 5, 25)).toEqual({
      expectedPaidCreators: 10,
      breakEvenPerPaidCreator: 10,
      costCoveringPricePerPaidCreator: 12.5,
    });
  });

  it("rejects incomplete or impossible pricing assumptions", () => {
    expect(calculateCostCoverageEstimate(0, 200, 5, 25)).toBeNull();
    expect(calculateCostCoverageEstimate(100, 200, 0, 25)).toBeNull();
    expect(calculateCostCoverageEstimate(100, 200, 5, 101)).toBeNull();
  });

  it("normalizes behavioral bounds into a projected creator range", () => {
    expect(calculateCreatorRange(200, 5, -10)).toEqual([180, 210]);
    expect(
      calculateCreatorRange(200, Number.NaN, Number.POSITIVE_INFINITY)
    ).toEqual([200, 200]);
    expect(calculateCreatorRange(Number.POSITIVE_INFINITY, -10, 10)).toEqual([
      0, 0,
    ]);
  });
});
