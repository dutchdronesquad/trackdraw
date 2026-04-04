export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "trackdraw.theme";
export const THEME_COOKIE = "trackdraw-theme";
export const RESOLVED_THEME_COOKIE = "trackdraw-theme-resolved";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const THEME_EVENT = "trackdraw-theme";

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

export function getThemePreferenceFromSources(
  storedTheme: string | null | undefined,
  cookieTheme: string | null | undefined
): ThemePreference {
  return (
    parseThemePreference(storedTheme) ??
    parseThemePreference(cookieTheme) ??
    "system"
  );
}

export function getInitialResolvedTheme(
  preferenceCookie: string | null | undefined,
  resolvedCookie: string | null | undefined
): ResolvedTheme {
  const preference = parseThemePreference(preferenceCookie);
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return parseResolvedTheme(resolvedCookie) ?? "light";
}

export function applyResolvedThemeToDocument(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function persistThemePreference(
  theme: ThemePreference,
  resolvedTheme: ResolvedTheme
) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}

  document.cookie = `${THEME_COOKIE}=${theme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  document.cookie = `${RESOLVED_THEME_COOKIE}=${resolvedTheme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function buildThemeBootstrapScript() {
  return `
(() => {
  try {
    const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    const themeCookie = ${JSON.stringify(THEME_COOKIE)};
    const resolvedCookie = ${JSON.stringify(RESOLVED_THEME_COOKIE)};
    const maxAge = ${JSON.stringify(THEME_COOKIE_MAX_AGE)};
    const match = window.matchMedia("(prefers-color-scheme: dark)");
    const parseThemePreference = (value) =>
      value === "light" || value === "dark" || value === "system" ? value : null;
    const resolveTheme = (preference, prefersDark) =>
      preference === "system" ? (prefersDark ? "dark" : "light") : preference;
    const applyResolvedThemeToDocument = (theme) => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.style.colorScheme = theme;
    };
    const cookieMap = Object.fromEntries(
      document.cookie
        .split("; ")
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          return index === -1
            ? [part, ""]
            : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
        })
    );
    const storedTheme = localStorage.getItem(storageKey);
    const cookieTheme = cookieMap[themeCookie];
    const theme =
      parseThemePreference(storedTheme) ??
      parseThemePreference(cookieTheme) ??
      "system";
    const resolvedTheme = resolveTheme(theme, match.matches);

    applyResolvedThemeToDocument(resolvedTheme);
    localStorage.setItem(storageKey, theme);
    document.cookie = \`\${themeCookie}=\${theme}; Max-Age=\${maxAge}; Path=/; SameSite=Lax\`;
    document.cookie = \`\${resolvedCookie}=\${resolvedTheme}; Max-Age=\${maxAge}; Path=/; SameSite=Lax\`;
  } catch {}
})();
`;
}
