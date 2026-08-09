export const supportedLocales = ["en", "nl", "de", "zh-CN"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";
export const LOCALE_COOKIE = "trackdraw-locale";
export const LOCALE_STORAGE_KEY = "trackdraw.locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isValidLocale(value: unknown): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function resolveSupportedLocale(
  value: unknown
): SupportedLocale | undefined {
  if (typeof value !== "string") return undefined;

  const tag = value.trim().replaceAll("_", "-").toLowerCase();
  if (!tag) return undefined;

  const language = tag.split("-")[0];
  if (language === "en" || language === "nl" || language === "de") {
    return language;
  }

  if (
    tag === "zh" ||
    tag === "zh-cn" ||
    tag.startsWith("zh-cn-") ||
    tag === "zh-sg" ||
    tag.startsWith("zh-sg-") ||
    tag === "zh-hans" ||
    tag.startsWith("zh-hans-")
  ) {
    return "zh-CN";
  }

  return undefined;
}

export function normalizeLocale(value: unknown): SupportedLocale {
  return resolveSupportedLocale(value) ?? defaultLocale;
}

export function getLocaleFromAcceptLanguage(
  value: string | null | undefined
): SupportedLocale {
  if (!value) return defaultLocale;

  const candidates = value
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        tag,
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const candidate of candidates) {
    const locale = resolveSupportedLocale(candidate.tag);
    if (locale) return locale;
  }

  return defaultLocale;
}

export function getLocaleFromBrowser(): SupportedLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  for (const lang of navigator.languages) {
    const locale = resolveSupportedLocale(lang);
    if (locale) return locale;
  }
  return defaultLocale;
}
