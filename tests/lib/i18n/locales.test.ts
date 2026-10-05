import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLocaleDirectory,
  getLocaleFromBrowser,
  getLocaleFromAcceptLanguage,
  isValidLocale,
  normalizeLocale,
  resolveSupportedLocale,
  supportedLocales,
} from "@/lib/i18n/locales";

describe("locale resolution", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses Spanish browser preferences", () => {
    vi.stubGlobal("navigator", { languages: ["fr-FR", "es-MX", "en-GB"] });
    expect(getLocaleFromBrowser()).toBe("es");
  });

  it("maps product locales to regional locale directories", () => {
    expect(
      Object.fromEntries(
        supportedLocales.map((locale) => [locale, getLocaleDirectory(locale)])
      )
    ).toEqual({
      en: "en-US",
      nl: "nl-NL",
      de: "de-DE",
      "zh-CN": "zh-CN",
      es: "es-ES",
    });
  });

  it("uses zh-CN as the canonical Simplified Chinese locale", () => {
    expect(supportedLocales).toContain("zh-CN");
    expect(supportedLocales).not.toContain("zh");
  });

  it.each([
    "es",
    "es-ES",
    "es-MX",
    "es-AR",
    "es-419",
    "es_ES",
    "ES-mx",
    "es-ES-u-nu-latn",
  ])("resolves the Spanish language tag %s", (locale) => {
    expect(resolveSupportedLocale(locale)).toBe("es");
    expect(normalizeLocale(locale)).toBe("es");
    expect(
      getLocaleFromAcceptLanguage(`fr-FR, ${locale};q=0.9, en;q=0.8`)
    ).toBe("es");
  });

  it("accepts the canonical Spanish product locale", () => {
    expect(isValidLocale("es")).toBe(true);
    expect(isValidLocale("es-ES")).toBe(false);
  });

  it.each([
    "zh",
    "zh-CN",
    "zh_CN",
    "zh-CN-u-ca-chinese",
    "zh-CN-x-private",
    "zh-Hans",
    "zh-Hans-CN",
    "zh-SG",
    "zh-SG-u-nu-hanidec",
  ])("normalizes the Simplified Chinese alias %s", (locale) => {
    expect(resolveSupportedLocale(locale)).toBe("zh-CN");
    expect(normalizeLocale(locale)).toBe("zh-CN");
  });

  it("does not map explicit Traditional Chinese locales to Simplified Chinese", () => {
    expect(resolveSupportedLocale("zh-TW")).toBeUndefined();
    expect(resolveSupportedLocale("zh-Hant")).toBeUndefined();
  });

  it("resolves supported regional browser locales", () => {
    expect(resolveSupportedLocale("en-GB")).toBe("en");
    expect(resolveSupportedLocale("nl-NL")).toBe("nl");
    expect(resolveSupportedLocale("de-DE")).toBe("de");
  });

  it("selects zh-CN from weighted Accept-Language aliases", () => {
    expect(
      getLocaleFromAcceptLanguage("fr-FR, zh-Hans;q=0.9, en-GB;q=0.8")
    ).toBe("zh-CN");
  });
});
