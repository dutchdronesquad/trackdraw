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

// Access window.localStorage lazily so server evaluation stays storage-free and
// test/browser storage installed after module load is picked up correctly.
const safeLocalStorageBackend = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;

    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage unavailable */
    }
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(name);
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
