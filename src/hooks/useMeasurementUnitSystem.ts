"use client";

import { useSyncExternalStore } from "react";
import {
  getMeasurementUnitSystemFromLocales,
  MEASUREMENT_STORAGE_KEY,
  normalizeMeasurementUnitSystem,
  type MeasurementUnitSystem,
} from "@/lib/track/units";

const EVENT = "trackdraw-measurement-unit-system";
let memoryUnitSystem: MeasurementUnitSystem | null = null;

function getBrowserDefault(): MeasurementUnitSystem {
  if (typeof navigator === "undefined") return "metric";
  return getMeasurementUnitSystemFromLocales(navigator.languages);
}

function getSnapshot(): MeasurementUnitSystem {
  if (typeof window === "undefined") return "metric";

  try {
    const stored = normalizeMeasurementUnitSystem(
      window.localStorage.getItem(MEASUREMENT_STORAGE_KEY)
    );
    return stored ?? memoryUnitSystem ?? getBrowserDefault();
  } catch {
    return memoryUnitSystem ?? getBrowserDefault();
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === MEASUREMENT_STORAGE_KEY) callback();
  };

  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function setMeasurementUnitSystem(unitSystem: MeasurementUnitSystem) {
  if (typeof window === "undefined") return;

  memoryUnitSystem = unitSystem;

  try {
    window.localStorage.setItem(MEASUREMENT_STORAGE_KEY, unitSystem);
  } catch {
    // Keep the in-memory UI responsive even when storage is unavailable.
  }

  window.dispatchEvent(new Event(EVENT));
}

export function useMeasurementUnitSystem() {
  const unitSystem = useSyncExternalStore<MeasurementUnitSystem>(
    subscribe,
    getSnapshot,
    () => "metric"
  );

  return {
    unitSystem,
    setUnitSystem: setMeasurementUnitSystem,
  };
}
