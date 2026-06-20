"use client";

import { useMeasurementUnitStore } from "@/store/measurement-unit";
import type { MeasurementUnitSystem } from "@/lib/track/units";

export function setMeasurementUnitSystem(unitSystem: MeasurementUnitSystem) {
  useMeasurementUnitStore.getState().setUnitSystem(unitSystem);
}

export function useMeasurementUnitSystem() {
  const unitSystem = useMeasurementUnitStore((s) => s.unitSystem);
  const setUnitSystem = useMeasurementUnitStore((s) => s.setUnitSystem);
  return { unitSystem, setUnitSystem };
}
