"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OutdoorQuality } from "@/lib/track/outdoor-presentation";

type PresentationMode = "design" | "outdoor" | "outdoor-low";

export const usePresentationStore = create<{
  mode: PresentationMode;
  setMode: (mode: PresentationMode) => void;
}>()(
  persist(
    (set) => ({
      mode: "design",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "trackdraw.presentation",
      partialize: ({ mode }) => ({ mode }),
      merge: (saved, current) => {
        const mode = (saved as { mode?: unknown } | undefined)?.mode;
        return mode === "design" || mode === "outdoor" || mode === "outdoor-low"
          ? { ...current, mode }
          : current;
      },
    }
  )
);

export function useOutdoorQuality(
  isTouch: boolean,
  shapeCount: number,
  field: { width: number; height: number }
): OutdoorQuality | null {
  const mode = usePresentationStore((state) => state.mode);
  if (mode === "design") return null;
  // A single shadow map becomes expensive on dense courses and too coarse on wide fields.
  const span = Math.max(field.width, field.height);
  return mode === "outdoor-low" || isTouch || shapeCount >= 200 || span > 180
    ? "low"
    : "full";
}
