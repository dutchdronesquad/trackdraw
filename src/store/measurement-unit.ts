"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getMeasurementUnitSystemFromLocales,
  MEASUREMENT_STORAGE_KEY,
  normalizeMeasurementUnitSystem,
  type MeasurementUnitSystem,
} from "@/lib/track/units";

type MeasurementUnitState = {
  unitSystem: MeasurementUnitSystem;
  setUnitSystem: (unitSystem: MeasurementUnitSystem) => void;
};

function getBrowserDefault(): MeasurementUnitSystem {
  if (typeof navigator === "undefined") return "metric";
  return getMeasurementUnitSystemFromLocales(navigator.languages);
}

// Handles legacy format: the old hook stored a raw string ("metric" / "imperial")
// directly in localStorage instead of a Zustand JSON envelope. On first read we
// migrate transparently so existing user preferences are preserved.
const legacyAwareBackend = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      // Check for a valid Zustand envelope first
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "state" in parsed) {
          return raw;
        }
      } catch {
        // Not valid JSON — must be a legacy raw string like "metric"/"imperial"
      }
      // Legacy raw string — wrap in Zustand envelope
      const normalized = normalizeMeasurementUnitSystem(raw);
      return JSON.stringify({
        state: { unitSystem: normalized ?? getBrowserDefault() },
        version: 0,
      });
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
};

export const useMeasurementUnitStore = create<MeasurementUnitState>()(
  persist(
    (set) => ({
      unitSystem: getBrowserDefault(),
      setUnitSystem: (unitSystem) => set({ unitSystem }),
    }),
    {
      name: MEASUREMENT_STORAGE_KEY,
      storage: createJSONStorage(() => legacyAwareBackend),
    }
  )
);

// Sync changes made in other browser tabs back into this store.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === MEASUREMENT_STORAGE_KEY) {
      void useMeasurementUnitStore.persist.rehydrate();
    }
  });
}
