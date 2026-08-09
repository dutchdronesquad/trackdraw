import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/docs/route";
import type { SupportedLocale } from "@/lib/i18n/locales";

const expectedTitles: Record<SupportedLocale, string> = {
  en: "TrackDraw API Docs",
  nl: "TrackDraw API-documentatie",
  de: "TrackDraw API-Dokumentation",
  zh: "TrackDraw API 文档",
};

describe("GET /api/docs", () => {
  it.each(Object.entries(expectedTitles))(
    "renders the %s document language selected by cookie",
    async (locale, title) => {
      const response = GET(
        new Request("https://trackdraw.test/api/docs", {
          headers: {
            cookie: `trackdraw-locale=${locale}`,
            "accept-language": "en-GB",
          },
        })
      );
      const html = await response.text();

      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(`<title>${title}</title>`);
    }
  );

  it("uses the highest-priority supported Accept-Language locale", async () => {
    const response = GET(
      new Request("https://trackdraw.test/api/docs", {
        headers: { "accept-language": "fr-FR, de-DE;q=0.9, zh-CN;q=0.8" },
      })
    );
    const html = await response.text();

    expect(html).toContain('<html lang="de">');
    expect(html).toContain("<title>TrackDraw API-Dokumentation</title>");
  });

  it("falls back to English for unsupported locale preferences", async () => {
    const response = GET(
      new Request("https://trackdraw.test/api/docs", {
        headers: {
          cookie: "trackdraw-locale=fr",
          "accept-language": "fr-FR",
        },
      })
    );
    const html = await response.text();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>TrackDraw API Docs</title>");
  });
});
