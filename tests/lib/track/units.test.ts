import { describe, expect, it } from "vitest";
import {
  feetToMeters,
  formatFieldSize,
  formatMeasurement,
  formatMeasurementInputValue,
  getMeasurementUnitSystemFromLocales,
  m2px,
  parseMeasurementInput,
  px2m,
} from "@/lib/track/units";

describe("track unit helpers", () => {
  it("converts meters to pixels", () => {
    expect(m2px(2.5, 20)).toBe(50);
  });

  it("converts pixels to meters", () => {
    expect(px2m(50, 20)).toBe(2.5);
  });

  it("roundtrips between meters and pixels", () => {
    const meters = 7.25;
    const ppm = 18;
    expect(px2m(m2px(meters, ppm), ppm)).toBe(meters);
  });

  it("derives first-run unit defaults from browser locales", () => {
    expect(getMeasurementUnitSystemFromLocales(["en-US"])).toBe("imperial");
    expect(getMeasurementUnitSystemFromLocales(["en-GB"])).toBe("metric");
    expect(getMeasurementUnitSystemFromLocales(["ja-JP"])).toBe("metric");
    expect(getMeasurementUnitSystemFromLocales(["nl-NL"])).toBe("metric");
  });

  it("formats metric and imperial measurements", () => {
    expect(formatMeasurement(10, "metric")).toBe("10 m");
    expect(formatMeasurement(10, "imperial")).toBe("33 ft");
    expect(formatFieldSize(60, 40, "metric")).toBe("60 x 40 m");
    expect(formatFieldSize(60, 40, "imperial")).toBe("197 x 131 ft");
  });

  it("formats negative measurement input values using absolute precision", () => {
    expect(formatMeasurementInputValue(-100, "metric")).toBe("-100");
    expect(formatMeasurementInputValue(-2, "metric")).toBe("-2");
    expect(formatMeasurementInputValue(-100, "imperial")).toBe("-328.1");
  });

  it("parses metric and imperial measurement input into meters", () => {
    expect(parseMeasurementInput("10", "metric")).toBe(10);
    expect(parseMeasurementInput("10", "imperial")).toBeCloseTo(
      feetToMeters(10)
    );
    expect(parseMeasurementInput("10 ft", "metric")).toBeCloseTo(
      feetToMeters(10)
    );
    expect(parseMeasurementInput("12 in", "metric")).toBeCloseTo(
      feetToMeters(1)
    );
    expect(parseMeasurementInput("3 m", "imperial")).toBe(3);
  });
});
