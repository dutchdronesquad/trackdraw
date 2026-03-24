"use client";

import { useEffect } from "react";

export default function ThemeBootstrap() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("trackdraw.theme");
      const theme =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const isDark = theme === "dark" || (theme === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      // Ignore storage or media query errors during bootstrap.
    }
  }, []);

  return null;
}
