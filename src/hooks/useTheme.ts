"use client";
import { useEffect, useState } from "react";

function getThemeFromDom(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(getThemeFromDom);

  useEffect(() => {
    const update = () => setTheme(getThemeFromDom());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
