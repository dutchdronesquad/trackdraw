"use client";

import { useEffect } from "react";
import {
  parseThemePreference,
  resolveTheme,
  RESOLVED_THEME_COOKIE,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

export default function ThemeBootstrap() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      try {
        const storedTheme = parseThemePreference(
          localStorage.getItem(THEME_STORAGE_KEY)
        );
        const cookieTheme = parseThemePreference(
          document.cookie
            .split("; ")
            .find((value) => value.startsWith(`${THEME_COOKIE}=`))
            ?.split("=")[1]
        );
        const theme = storedTheme ?? cookieTheme ?? "system";
        const resolvedTheme = resolveTheme(theme, media.matches);

        document.documentElement.classList.toggle(
          "dark",
          resolvedTheme === "dark"
        );
        document.documentElement.style.colorScheme = resolvedTheme;
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        document.cookie = `${THEME_COOKIE}=${theme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
        document.cookie = `${RESOLVED_THEME_COOKIE}=${resolvedTheme}; Max-Age=${THEME_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
      } catch {
        // Ignore storage or media query errors during bootstrap.
      }
    };

    syncTheme();
    const handleChange = () => syncTheme();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return null;
}
