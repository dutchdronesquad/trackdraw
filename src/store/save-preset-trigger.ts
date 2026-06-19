"use client";

import { create } from "zustand";

interface SavePresetTriggerState {
  pending: boolean;
  trigger: () => void;
  reset: () => void;
}

export const useSavePresetTrigger = create<SavePresetTriggerState>()((set) => ({
  pending: false,
  trigger: () => set({ pending: true }),
  reset: () => set({ pending: false }),
}));
