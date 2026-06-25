export const supportedLocales = ["en", "nl"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "en";
export const LOCALE_COOKIE = "trackdraw-locale";
export const LOCALE_STORAGE_KEY = "trackdraw.locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isValidLocale(value: unknown): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function getLocaleFromBrowser(): SupportedLocale {
  if (typeof navigator === "undefined") return defaultLocale;
  for (const lang of navigator.languages) {
    const code = lang.split("-")[0];
    if (isValidLocale(code)) return code as SupportedLocale;
  }
  return defaultLocale;
}
