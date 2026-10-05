import { beforeEach, describe, expect, it, vi } from "vitest";
import { supportedLocales } from "@/lib/i18n/locales";

const mocks = vi.hoisted(() => ({
  getCurrentUserFromHeaders: vi.fn(),
  getInternalCountryCode: vi.fn(),
  isTrustedRequest: vi.fn(),
  recordLocalizationDemand: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.getCurrentUserFromHeaders,
}));
vi.mock("@/lib/server/csrf", () => ({
  isTrustedRequest: mocks.isTrustedRequest,
}));
vi.mock("@/lib/server/localization-demand", () => ({
  recordLocalizationDemand: mocks.recordLocalizationDemand,
}));
vi.mock("@/lib/server/request-country", () => ({
  getInternalCountryCode: mocks.getInternalCountryCode,
}));

import { POST } from "@/app/api/localization-demand/route";

beforeEach(() => {
  mocks.getCurrentUserFromHeaders.mockReset().mockResolvedValue(null);
  mocks.getInternalCountryCode.mockReset().mockReturnValue("FR");
  mocks.isTrustedRequest.mockReset().mockReturnValue(true);
  mocks.recordLocalizationDemand.mockReset().mockResolvedValue(undefined);
});

describe("POST /api/localization-demand", () => {
  it.each(supportedLocales)(
    "accepts the configured locale %s",
    async (servedLocale) => {
      const response = await POST(
        new Request("https://trackdraw.app/api/localization-demand", {
          method: "POST",
          body: JSON.stringify({ servedLocale }),
        })
      );

      expect(response.status).toBe(204);
      expect(mocks.recordLocalizationDemand).toHaveBeenCalledWith(
        expect.objectContaining({ servedLocale })
      );
    }
  );

  it.each(["unsupported-locale", "en-US", "", null, 42, undefined])(
    "rejects an unconfigured or missing served locale %s before persistence",
    async (servedLocale) => {
      const response = await POST(
        new Request("https://trackdraw.app/api/localization-demand", {
          method: "POST",
          body: JSON.stringify({ servedLocale }),
        })
      );

      expect(response.status).toBe(400);
      expect(mocks.recordLocalizationDemand).not.toHaveBeenCalled();
    }
  );

  it("records only normalized request context and the served locale", async () => {
    const response = await POST(
      new Request("https://trackdraw.app/api/localization-demand", {
        method: "POST",
        headers: {
          "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
          "content-type": "application/json",
          origin: "https://trackdraw.app",
        },
        body: JSON.stringify({ servedLocale: "en" }),
      })
    );

    expect(response.status).toBe(204);
    expect(mocks.recordLocalizationDemand).toHaveBeenCalledWith({
      preferredLanguage: "fr",
      servedLocale: "en",
      countryCode: "FR",
    });
  });

  it("rejects unknown fields and honors the account objection", async () => {
    const invalid = await POST(
      new Request("https://trackdraw.app/api/localization-demand", {
        method: "POST",
        body: JSON.stringify({ servedLocale: "en", country: "FR" }),
      })
    );
    expect(invalid.status).toBe(400);

    mocks.getCurrentUserFromHeaders.mockResolvedValueOnce({
      id: "user-1",
      role: "user",
      productAnalyticsEnabled: false,
    });
    const optedOut = await POST(
      new Request("https://trackdraw.app/api/localization-demand", {
        method: "POST",
        body: JSON.stringify({ servedLocale: "en" }),
      })
    );
    expect(optedOut.status).toBe(204);
    expect(mocks.recordLocalizationDemand).not.toHaveBeenCalled();
  });
});
