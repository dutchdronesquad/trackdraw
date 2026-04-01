"use client";

import { useCallback, useState } from "react";
import { createStarterLayoutDesign } from "@/lib/planning/starter-layouts";
import { shouldShowStarterForDesign } from "@/components/editor/StarterFlow";
import { useEditorHints } from "@/hooks/useEditorHints";
import type { TrackDesign } from "@/lib/types";

type UseStarterExperienceOptions = {
  readOnly: boolean;
  authUserId: string | null;
  design: TrackDesign;
  designShapeCount: number;
  hasPath: boolean;
  syncDesignToAccount: (
    design: TrackDesign,
    options?: { showToast?: boolean; updateStatusLabel?: boolean }
  ) => Promise<void>;
  markProjectSyncFailed: (projectId: string, error: string) => void;
  setSaveStatusLabel: (label: string) => void;
  replaceDesign: (design: TrackDesign) => void;
  handleTabChange: (tab: "2d" | "3d") => void;
  resetSelectionState: () => void;
  setActiveTool: (tool: string) => void;
  fitCanvas: () => void;
  closeProjectAndToolSurfaces: () => void;
  createBlankDesign: () => TrackDesign;
};

export function useStarterExperience({
  readOnly,
  authUserId,
  design,
  designShapeCount,
  hasPath,
  syncDesignToAccount,
  markProjectSyncFailed,
  setSaveStatusLabel,
  replaceDesign,
  handleTabChange,
  resetSelectionState,
  setActiveTool,
  fitCanvas,
  closeProjectAndToolSurfaces,
  createBlankDesign,
}: UseStarterExperienceOptions) {
  const [starterDismissed, setStarterDismissed] = useState(false);
  const [starterMode, setStarterMode] = useState<"guided" | "blank" | null>(
    null
  );

  const {
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
    resetGuidedHints: resetGuidedHintsFromHints,
  } = useEditorHints({ readOnly, hasPath });

  const shouldShowStarter =
    !readOnly &&
    !starterDismissed &&
    shouldShowStarterForDesign({
      title: design.title,
      shapeCount: designShapeCount,
    });

  const syncStarterDesign = useCallback(
    (nextDesign: TrackDesign, logLabel: string) => {
      if (!authUserId) return;

      void syncDesignToAccount(nextDesign, {
        updateStatusLabel: true,
      }).catch((error) => {
        markProjectSyncFailed(
          nextDesign.id,
          error instanceof Error ? error.message : "Cloud sync failed"
        );
        setSaveStatusLabel("Cloud sync failed");
        console.error(logLabel, error);
      });
    },
    [authUserId, markProjectSyncFailed, setSaveStatusLabel, syncDesignToAccount]
  );

  const applyStarterDesign = useCallback(
    (kind: "blank" | "gate") => {
      const nextDesign = createBlankDesign();
      replaceDesign(nextDesign);
      setStarterDismissed(true);
      handleTabChange("2d");

      if (kind === "gate") {
        setStarterMode("guided");
        resetGuidedHintsFromHints();
        setActiveTool("gate");
      } else {
        setStarterMode("blank");
        setActiveTool("select");
      }

      window.requestAnimationFrame(() => {
        fitCanvas();
      });

      syncStarterDesign(nextDesign, "[TrackDraw new-project sync]");
    },
    [
      createBlankDesign,
      fitCanvas,
      handleTabChange,
      replaceDesign,
      resetGuidedHintsFromHints,
      setActiveTool,
      syncStarterDesign,
    ]
  );

  const applyStarterLayout = useCallback(
    (layoutId: string) => {
      const nextDesign = createStarterLayoutDesign(layoutId);
      if (!nextDesign) return;

      replaceDesign(nextDesign);
      setStarterDismissed(true);
      setStarterMode(null);
      resetSelectionState();
      closeProjectAndToolSurfaces();
      handleTabChange("2d");
      setActiveTool("select");

      window.requestAnimationFrame(() => {
        fitCanvas();
      });

      syncStarterDesign(nextDesign, "[TrackDraw starter-layout sync]");
    },
    [
      closeProjectAndToolSurfaces,
      fitCanvas,
      handleTabChange,
      replaceDesign,
      resetSelectionState,
      setActiveTool,
      syncStarterDesign,
    ]
  );

  return {
    starterDismissed,
    setStarterDismissed,
    starterMode,
    shouldShowStarter,
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
    applyStarterDesign,
    applyStarterLayout,
  };
}
