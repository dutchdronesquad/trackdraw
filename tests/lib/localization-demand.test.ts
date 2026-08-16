import { describe, expect, it } from "vitest";
import { normalizePreferredLanguage } from "@/lib/localization-demand";
import {
  addInternalCountryHeader,
  getInternalCountryCode,
  normalizeCountryCode,
} from "@/lib/server/request-country";

describe("localization demand normalization", () => {
  it("selects the highest-priority supported primary browser language", () => {
    expect(normalizePreferredLanguage("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(normalizePreferredLanguage("en;q=0.4,es-MX;q=0.9")).toBe("es");
    expect(normalizePreferredLanguage("iw-IL")).toBe("he");
    expect(normalizePreferredLanguage("invalid-language")).toBe("unknown");
  });

  it("keeps only coarse Cloudflare country codes", () => {
    expect(normalizeCountryCode("nl")).toBe("NL");
    expect(normalizeCountryCode("T1")).toBe("unknown");
    expect(normalizeCountryCode("XX")).toBe("unknown");
    expect(normalizeCountryCode("NLD")).toBe("unknown");
  });

  it("replaces client country headers with Cloudflare request context", () => {
    const request = new Request(
      "https://trackdraw.app/api/localization-demand",
      {
        headers: { "x-trackdraw-visitor-country": "US" },
      }
    );
    Object.defineProperty(request, "cf", {
      value: { country: "DE" },
    });

    expect(getInternalCountryCode(addInternalCountryHeader(request))).toBe(
      "DE"
    );

    const spoofed = new Request(
      "https://trackdraw.app/api/localization-demand",
      { headers: { "x-trackdraw-visitor-country": "US" } }
    );
    expect(getInternalCountryCode(addInternalCountryHeader(spoofed))).toBe(
      "unknown"
    );
  });
});
