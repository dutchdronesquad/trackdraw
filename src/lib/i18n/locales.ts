export const supportedLocales = ["en", "nl", "de", "zh"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";
export const LOCALE_COOKIE = "trackdraw-locale";
export const LOCALE_STORAGE_KEY = "trackdraw.locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isValidLocale(value: unknown): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
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
        code: tag?.split("-")[0],
        weight: Number.isFinite(weight) ? weight : 0,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const candidate of candidates) {
    if (isValidLocale(candidate.code)) return candidate.code;
  }

  return defaultLocale;
}

export function getLocaleFromBrowser(): SupportedLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  for (const lang of navigator.languages) {
    const code = lang.split("-")[0];
    if (isValidLocale(code)) return code as SupportedLocale;
  }
  return defaultLocale;
}
