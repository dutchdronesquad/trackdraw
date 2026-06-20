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

// Legacy per-key storage used before this store was introduced.
const LEGACY_KEYS = {
  gate: "trackdraw-hint-gate-dismissed",
  path: "trackdraw-hint-path-dismissed",
  preview: "trackdraw-hint-preview-dismissed",
  review3d: "trackdraw-hint-review3d-dismissed",
  postPath: "trackdraw-hint-post-path-dismissed",
} as const;

// Access localStorage lazily so the reference is re-evaluated on each call.
// This ensures test mocks installed after module load are picked up correctly.
// On first load, migrates any persisted values from the legacy per-key format.
const legacyAwareBackend = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name);
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && "state" in parsed)
            return raw;
        } catch {
          /* malformed JSON, fall through to legacy check */
        }
      }
      // No valid envelope yet — check for legacy per-key values
      const gateHintDismissed =
        localStorage.getItem(LEGACY_KEYS.gate) === "true";
      const desktopPathHintDismissed =
        localStorage.getItem(LEGACY_KEYS.path) === "true";
      const desktopPreviewHintDismissed =
        localStorage.getItem(LEGACY_KEYS.preview) === "true";
      const review3DHintDismissed =
        localStorage.getItem(LEGACY_KEYS.review3d) === "true";
      const postPathNudgeDismissed =
        localStorage.getItem(LEGACY_KEYS.postPath) === "true";
      const hasAnyLegacy =
        gateHintDismissed ||
        desktopPathHintDismissed ||
        desktopPreviewHintDismissed ||
        review3DHintDismissed ||
        postPathNudgeDismissed;
      if (!raw && !hasAnyLegacy) return null;
      return JSON.stringify({
        state: {
          gateHintDismissed,
          desktopPathHintDismissed,
          desktopPreviewHintDismissed,
          review3DHintDismissed,
          postPathNudgeDismissed,
        },
        version: 0,
      });
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
      storage: createJSONStorage(() => legacyAwareBackend),
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
