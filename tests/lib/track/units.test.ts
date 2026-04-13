import { describe, expect, it } from "vitest";
import { m2px, px2m } from "@/lib/track/units";

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
});
