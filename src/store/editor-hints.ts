"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type EditorHintsState = {
  gateHintDismissed: boolean;
  desktopPathHintDismissed: boolean;
  desktopPreviewHintDismissed: boolean;
  review3DHintDismissed: boolean;
  postPathNudgeDismissed: boolean;
  dismissGateHint: () => void;
  dismissDesktopPathHint: () => void;
  dismissDesktopPreviewHint: () => void;
  dismissReview3DHint: () => void;
  dismissPostPathNudge: () => void;
  resetGuidedHints: () => void;
};

// Access localStorage lazily so the reference is re-evaluated on each call.
// This ensures test mocks installed after module load are picked up correctly.
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

export const useEditorHintsStore = create<EditorHintsState>()(
  persist(
    (set) => ({
      gateHintDismissed: false,
      desktopPathHintDismissed: false,
      desktopPreviewHintDismissed: false,
      review3DHintDismissed: false,
      postPathNudgeDismissed: false,
      dismissGateHint: () => set({ gateHintDismissed: true }),
      dismissDesktopPathHint: () => set({ desktopPathHintDismissed: true }),
      dismissDesktopPreviewHint: () =>
        set({ desktopPreviewHintDismissed: true }),
      dismissReview3DHint: () => set({ review3DHintDismissed: true }),
      dismissPostPathNudge: () => set({ postPathNudgeDismissed: true }),
      resetGuidedHints: () =>
        set({
          gateHintDismissed: false,
          desktopPathHintDismissed: false,
          desktopPreviewHintDismissed: false,
          review3DHintDismissed: false,
          postPathNudgeDismissed: false,
        }),
    }),
    {
      name: "trackdraw.editorHints",
      storage: createJSONStorage(() => safeLocalStorageBackend),
      partialize: (state) => ({
        gateHintDismissed: state.gateHintDismissed,
        desktopPathHintDismissed: state.desktopPathHintDismissed,
        desktopPreviewHintDismissed: state.desktopPreviewHintDismissed,
        review3DHintDismissed: state.review3DHintDismissed,
        postPathNudgeDismissed: state.postPathNudgeDismissed,
      }),
    }
  )
);
