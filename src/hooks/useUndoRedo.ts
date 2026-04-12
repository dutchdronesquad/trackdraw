"use client";

import { useCallback, useEffect } from "react";
import { useSessionActions } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { useStore } from "zustand";

export function useUndoRedo() {
  const { undo, redo, pastStates, futureStates } = useStore(useEditor.temporal);
  const { sanitizeHistoryState } = useSessionActions();

  const runHistoryStep = useCallback(
    (step: () => void) => {
      step();
      const temporal = useEditor.temporal.getState();
      temporal.pause();
      sanitizeHistoryState();
      temporal.resume();
    },
    [sanitizeHistoryState]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        runHistoryStep(undo);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        runHistoryStep(redo);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, runHistoryStep, undo]);

  return {
    undo: () => runHistoryStep(undo),
    redo: () => runHistoryStep(redo),
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  };
}
