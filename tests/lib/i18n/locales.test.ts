import { describe, expect, it } from "vitest";
import {
  getLocaleFromAcceptLanguage,
  normalizeLocale,
  resolveSupportedLocale,
  supportedLocales,
} from "@/lib/i18n/locales";

describe("locale resolution", () => {
  it("uses zh-CN as the canonical Simplified Chinese locale", () => {
    expect(supportedLocales).toContain("zh-CN");
    expect(supportedLocales).not.toContain("zh");
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
