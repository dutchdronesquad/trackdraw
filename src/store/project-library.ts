"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
// Only the selected library is persisted. Private team content never enters device drafts.
export const useProjectLibrary = create<{
  byUser: Record<string, string>;
  select: (userId: string, teamId: string) => void;
}>()(
  persist(
    (set) => ({
      byUser: {},
      select: (userId, teamId) =>
        set((state) => ({ byUser: { ...state.byUser, [userId]: teamId } })),
    }),
    { name: "trackdraw.projectLibrary" }
  )
);
