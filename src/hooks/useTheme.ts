"use client";
import { useEffect, useState } from "react";

export function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const update = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
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
