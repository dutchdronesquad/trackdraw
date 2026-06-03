"use client";

import { useEffect, useState } from "react";

export function usePersistentBoolean(key: string, defaultValue = false) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;

    try {
      const stored = window.localStorage.getItem(key);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // Keep the UI responsive when storage is blocked.
    }

    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? "true" : "false");
    } catch {
      // Ignore blocked or full storage; the in-memory state still updates.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
