"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
// Only the selected library is persisted. Private team content never enters device drafts.
export const useProjectLibrary = create<{
  byUser: Record<string, string>;
  clear: () => void;
  forget: (userId: string) => void;
  select: (userId: string, teamId: string) => void;
}>()(
  persist(
    (set) => ({
      byUser: {},
      clear: () => set({ byUser: {} }),
      forget: (userId) =>
        set((state) => {
          const byUser = { ...state.byUser };
          delete byUser[userId];
          return { byUser };
        }),
      select: (userId, teamId) =>
        set((state) => ({ byUser: { ...state.byUser, [userId]: teamId } })),
    }),
    { name: "trackdraw.projectLibrary" }
  )
);
