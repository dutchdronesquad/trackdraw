"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  getMeasurementUnitSystemFromLocales,
  MEASUREMENT_STORAGE_KEY,
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

const safeLocalStorageBackend = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
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
      storage: createJSONStorage(() => safeLocalStorageBackend),
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
