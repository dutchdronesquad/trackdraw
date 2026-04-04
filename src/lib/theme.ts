export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "trackdraw.theme";
export const THEME_COOKIE = "trackdraw-theme";
export const RESOLVED_THEME_COOKIE = "trackdraw-theme-resolved";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseThemePreference(
  value: string | null | undefined
): ThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

export function parseResolvedTheme(
  value: string | null | undefined
): ResolvedTheme | null {
  if (value === "light" || value === "dark") return value;
  return null;
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }
  return preference;
}
