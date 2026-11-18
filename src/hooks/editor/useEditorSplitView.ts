"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "trackdraw.editorSplitRatio";
const DEFAULT_RATIO = 50;
const MIN_WORKSPACE_WIDTH = 1000;
const MIN_PANE_WIDTH = 400;

export function useEditorSplitView(enabled: boolean) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [requested, setRequested] = useState(false);
  const [preferredRatio, setPreferredRatio] = useState(DEFAULT_RATIO);
  const available = enabled && width >= MIN_WORKSPACE_WIDTH;
  const minRatio = available ? Math.ceil((MIN_PANE_WIDTH / width) * 100) : 40;
  const maxRatio = 100 - minRatio;
  const clamp = (value: number) =>
    Math.min(maxRatio, Math.max(minRatio, value));
  const ratio = clamp(preferredRatio);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    canvasRef.current?.style.setProperty("--editor-split-ratio", `${ratio}%`);
  }, [ratio]);

  function open() {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved > 0 && saved < 100) {
        setPreferredRatio(saved);
      }
    } catch {
      // The layout still works if browser storage is restricted.
    }
    setRequested(true);
  }

  function commit(value: number) {
    const next = clamp(value);
    canvasRef.current?.style.setProperty("--editor-split-ratio", `${next}%`);
    setPreferredRatio(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Keep the in-memory preference if browser storage is restricted.
    }
  }

  return [
    canvasRef,
    {
      active: available && requested,
      available,
      open,
      minRatio,
      maxRatio,
      ratio,
      setRequested,
      resize(value: number) {
        const next = clamp(value);
        // Preview layout directly. Committing on release updates React and storage.
        canvasRef.current?.style.setProperty(
          "--editor-split-ratio",
          `${next}%`
        );
        return next;
      },
      commit,
      reset: () => commit(DEFAULT_RATIO),
    },
  ] as const;
}
