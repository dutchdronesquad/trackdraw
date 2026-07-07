"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  isAccountProjectSyncConflictError,
  type ProjectSyncMeta,
} from "@/components/editor/useAccountProjectSync";
import type { TrackDesign } from "@/lib/types";

type UseManualProjectSaveOptions = {
  readOnly: boolean;
  design: TrackDesign;
  isAccountProject: boolean;
  currentProjectSyncMeta?: ProjectSyncMeta;
  handleSaveSnapshot: () => void;
  syncDesignToAccount: (
    design: TrackDesign,
    options?: {
      showToast?: boolean;
      updateStatusLabel?: boolean;
      forceCloudWrite?: boolean;
    }
  ) => Promise<void>;
  markProjectSyncFailed: (projectId: string, error: string) => void;
  setSaveStatusLabel: (label: string) => void;
};

export function useManualProjectSave({
  readOnly,
  design,
  isAccountProject,
  currentProjectSyncMeta,
  handleSaveSnapshot,
  syncDesignToAccount,
  markProjectSyncFailed,
  setSaveStatusLabel,
}: UseManualProjectSaveOptions) {
  const handleManualSave = useCallback(async () => {
    handleSaveSnapshot();

    if (
      readOnly ||
      !isAccountProject ||
      currentProjectSyncMeta?.status === "conflict"
    ) {
      return;
    }

    try {
      await syncDesignToAccount(design, {
        updateStatusLabel: true,
      });
    } catch (error) {
      if (isAccountProjectSyncConflictError(error)) {
        setSaveStatusLabel("Review project version");
        return;
      }

      const message =
        error instanceof Error ? error.message : "Account sync failed";
      markProjectSyncFailed(design.id, message);
      setSaveStatusLabel("Account sync failed; snapshot saved");
      toast.error("Account sync failed", {
        description:
          "TrackDraw saved a snapshot on this device, but could not update the account copy. Retry sync, or export JSON if you need a manual backup.",
      });
    }
  }, [
    currentProjectSyncMeta?.status,
    design,
    handleSaveSnapshot,
    isAccountProject,
    markProjectSyncFailed,
    readOnly,
    setSaveStatusLabel,
    syncDesignToAccount,
  ]);

  useEffect(() => {
    if (readOnly) return;

    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "s") return;

      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      void handleManualSave();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave, readOnly]);

  return { handleManualSave };
}
