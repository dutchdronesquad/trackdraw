"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { LayoutPreset } from "@/lib/planning/layout-presets";

interface UserPresetState {
  userPresets: LayoutPreset[];
  addUserPreset: (preset: Omit<LayoutPreset, "id">) => string;
  removeUserPreset: (id: string) => void;
  renameUserPreset: (id: string, name: string) => void;
  setUserPresets: (presets: LayoutPreset[]) => void;
}

export const useUserPresets = create<UserPresetState>()((set) => ({
  userPresets: [],
  addUserPreset: (preset) => {
    const id = nanoid();
    set((state) => ({
      userPresets: [...state.userPresets, { ...preset, id }],
    }));
    return id;
  },
  removeUserPreset: (id) => {
    set((state) => ({
      userPresets: state.userPresets.filter((p) => p.id !== id),
    }));
  },
  renameUserPreset: (id, name) => {
    set((state) => ({
      userPresets: state.userPresets.map((p) =>
        p.id === id ? { ...p, name } : p
      ),
    }));
  },
  setUserPresets: (presets) => set({ userPresets: presets }),
}));
