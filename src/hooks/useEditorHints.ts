"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HINT_STORAGE_KEYS = {
  gate: "trackdraw-hint-gate-dismissed",
  path: "trackdraw-hint-path-dismissed",
  preview: "trackdraw-hint-preview-dismissed",
  review3d: "trackdraw-hint-review3d-dismissed",
  postPath: "trackdraw-hint-post-path-dismissed",
} as const;

function readStorage(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function useEditorHints({
  readOnly,
  hasPath,
}: {
  readOnly: boolean;
  hasPath: boolean;
}) {
  const [gateHintDismissed, setGateHintDismissed] = useState(() =>
    readStorage(HINT_STORAGE_KEYS.gate)
  );
  const [desktopPathHintDismissed, setDesktopPathHintDismissed] = useState(() =>
    readStorage(HINT_STORAGE_KEYS.path)
  );
  const [desktopPreviewHintDismissed, setDesktopPreviewHintDismissed] =
    useState(() => readStorage(HINT_STORAGE_KEYS.preview));
  const [review3DHintDismissed, setReview3DHintDismissed] = useState(() =>
    readStorage(HINT_STORAGE_KEYS.review3d)
  );
  const [postPathNudgeDismissed, setPostPathNudgeDismissed] = useState(() =>
    readStorage(HINT_STORAGE_KEYS.postPath)
  );
  const [showPostPathNudge, setShowPostPathNudge] = useState(false);
  const prevHasPath = useRef(false);

  // Detect first path completion and show a one-time nudge toward 3D preview.
  useEffect(() => {
    if (readOnly) return;
    if (!prevHasPath.current && hasPath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPostPathNudge(true);
    }
    prevHasPath.current = hasPath;
  }, [hasPath, readOnly]);

  const dismissGateHint = useCallback(() => {
    setGateHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.gate, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissDesktopPathHint = useCallback(() => {
    setDesktopPathHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.path, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissDesktopPreviewHint = useCallback(() => {
    setDesktopPreviewHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.preview, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissReview3DHint = useCallback(() => {
    setReview3DHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.review3d, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissPostPathNudge = useCallback(() => {
    setPostPathNudgeDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.postPath, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const resetGuidedHints = useCallback(() => {
    setGateHintDismissed(false);
    setDesktopPathHintDismissed(false);
    setDesktopPreviewHintDismissed(false);
    setReview3DHintDismissed(false);
    setPostPathNudgeDismissed(false);
    setShowPostPathNudge(false);
    prevHasPath.current = false;
    try {
      localStorage.removeItem(HINT_STORAGE_KEYS.gate);
      localStorage.removeItem(HINT_STORAGE_KEYS.path);
      localStorage.removeItem(HINT_STORAGE_KEYS.preview);
      localStorage.removeItem(HINT_STORAGE_KEYS.review3d);
      localStorage.removeItem(HINT_STORAGE_KEYS.postPath);
    } catch {
      /* ignore */
    }
  }, []);

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
