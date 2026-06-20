"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorHintsStore } from "@/store/editor-hints";

export function useEditorHints({
  readOnly,
  hasPath,
}: {
  readOnly: boolean;
  hasPath: boolean;
}) {
  const {
    gateHintDismissed,
    desktopPathHintDismissed,
    desktopPreviewHintDismissed,
    review3DHintDismissed,
    postPathNudgeDismissed,
    dismissGateHint,
    dismissDesktopPathHint,
    dismissDesktopPreviewHint,
    dismissReview3DHint,
    dismissPostPathNudge,
    resetGuidedHints: storeResetGuidedHints,
  } = useEditorHintsStore();

  const [showPostPathNudge, setShowPostPathNudge] = useState(false);
  const prevHasPath = useRef(false);

  useEffect(() => {
    if (readOnly) return;
    if (!prevHasPath.current && hasPath) {
      setShowPostPathNudge(true);
    }
    prevHasPath.current = hasPath;
  }, [hasPath, readOnly]);

  const resetGuidedHints = useCallback(() => {
    storeResetGuidedHints();
    setShowPostPathNudge(false);
  }, [storeResetGuidedHints]);

  return {
    gateHintDismissed,
    desktopPathHintDismissed,
    desktopPreviewHintDismissed,
    review3DHintDismissed,
    postPathNudgeDismissed,
    showPostPathNudge,
    dismissGateHint,
    dismissDesktopPathHint,
    dismissDesktopPreviewHint,
    dismissReview3DHint,
    dismissPostPathNudge,
    resetGuidedHints,
  };
}
