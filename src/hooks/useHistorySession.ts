"use client";

import { useCallback, useEffect, useRef } from "react";

interface UseHistorySessionOptions {
  beginInteraction: () => void;
  endInteraction: () => void;
  pauseHistory: () => void;
  resumeHistory: () => void;
}

export function useHistorySession({
  beginInteraction,
  endInteraction,
  pauseHistory,
  resumeHistory,
}: UseHistorySessionOptions) {
  const activeRef = useRef(false);

  const startSession = useCallback(() => {
    if (activeRef.current) return false;
    activeRef.current = true;
    beginInteraction();
    pauseHistory();
    return true;
  }, [beginInteraction, pauseHistory]);

  const finishSession = useCallback(
    (commit?: () => void) => {
      if (!activeRef.current) return false;
      activeRef.current = false;
      resumeHistory();
      commit?.();
      endInteraction();
      return true;
    },
    [endInteraction, resumeHistory]
  );

  const cancelSession = useCallback(
    (cleanup?: () => void) => {
      if (!activeRef.current) return false;
      activeRef.current = false;
      resumeHistory();
      cleanup?.();
      endInteraction();
      return true;
    },
    [endInteraction, resumeHistory]
  );

  useEffect(
    () => () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      resumeHistory();
      endInteraction();
    },
    [endInteraction, resumeHistory]
  );

  return {
    activeRef,
    startSession,
    finishSession,
    cancelSession,
  };
}
