import { describe, expect, it } from "vitest";
import {
  banReasonCodes,
  getBanReasonLabel,
  isBanReasonCode,
} from "@/lib/account/ban-reasons";

describe("ban reason helpers", () => {
  it("exposes 'other' as the last code so it reads as the catch-all option", () => {
    expect(banReasonCodes[banReasonCodes.length - 1]).toBe("other");
  });

  it("recognizes every known ban reason code", () => {
    for (const code of banReasonCodes) {
      expect(isBanReasonCode(code)).toBe(true);
    }
  });

  it("rejects unknown or non-string values", () => {
    expect(isBanReasonCode("unknown")).toBe(false);
    expect(isBanReasonCode(123)).toBe(false);
    expect(isBanReasonCode(null)).toBe(false);
    expect(isBanReasonCode(undefined)).toBe(false);
  });

  it("returns a distinct, non-empty label for every code", () => {
    const labels = banReasonCodes.map(getBanReasonLabel);
    expect(new Set(labels).size).toBe(banReasonCodes.length);
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
