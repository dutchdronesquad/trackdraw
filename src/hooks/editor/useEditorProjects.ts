"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  createRestorePoint,
  deleteProject,
  deleteProjects,
  deleteRestorePoint,
  hasMeaningfulProjectContent,
  listProjects,
  listRestorePointsForProject,
  loadLocalDraft,
  loadProject,
  loadRestorePoint,
  renameProject,
  saveLocalDraft,
  saveProject,
  saveProjectWithResult,
  type ProjectMeta,
  type RestorePointMeta,
} from "@/lib/projects";
import { decodeDesign } from "@/lib/share";
import { nowIso } from "@/lib/track/design";
import { recordPerfSample } from "@/lib/perf";
import { useEditor } from "@/store/editor";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import type { TrackDesign } from "@/lib/types";

function formatLocalSaveTime(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toLocalSaveError(error: unknown) {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  return new Error("Could not save local project data.");
}

function getSharedEditableCopyTitle(
  title: string,
  tShell: (
    key: string,
    values?: Record<string, string | number | Date>
  ) => string
) {
  const trimmed = title.trim();
  if (!trimmed) return tShell("untitledTrackCopy");
  if (/^copy of /i.test(trimmed)) return trimmed;
  return tShell("copyOfTitle", { title: trimmed });
}

function createSharedEditableCopy(
  design: TrackDesign,
  tShell: (
    key: string,
    values?: Record<string, string | number | Date>
  ) => string
): TrackDesign {
  const timestamp = nowIso();

  return {
    ...design,
    id: nanoid(),
    title: getSharedEditableCopyTitle(design.title, tShell),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function useEditorProjects({
  readOnly,
  seedToken,
  design,
  historyPaused,
  interactionSessionDepth,
  replaceDesign,
  onSeedTokenImported,
}: {
  readOnly: boolean;
  seedToken?: string;
  design: TrackDesign;
  historyPaused: boolean;
  interactionSessionDepth: number;
  replaceDesign: (design: TrackDesign) => void;
  onSeedTokenImported?: () => void;
}) {
  const tShell = useTranslations("editor.shell");
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [restorePoints, setRestorePoints] = useState<RestorePointMeta[]>([]);
  const [activeRestorePointId, setActiveRestorePointId] = useState<
    string | null
  >(null);
  const [saveStatusLabel, setSaveStatusLabel] = useState(
    tShell("savingLocally")
  );
  const [lastSnapshotLabel, setLastSnapshotLabel] = useState<string | null>(
    null
  );
  const [initialized, setInitialized] = useState(false);

  const saveDesignLocally = useCallback(
    (targetDesign: TrackDesign) => {
      const startedAt = performance.now();
      const draftResult = saveLocalDraft(targetDesign);
      const projectResult = saveProjectWithResult(targetDesign);

      if (!draftResult.ok || !projectResult.ok) {
        throw toLocalSaveError(draftResult.error ?? projectResult.error);
      }

      setProjects(listProjects());
      recordPerfSample("autosave:localStorage", performance.now() - startedAt);
      setSaveStatusLabel(
        tShell("savedLocallyAt", { time: formatLocalSaveTime() })
      );
    },
    [tShell]
  );

  const reportLocalSaveFailure = useCallback(
    (error: unknown, onRecovered?: () => void) => {
      const localSaveError = toLocalSaveError(error);

      setSaveStatusLabel(tShell("localAutosaveFailed"));
      console.error("[TrackDraw local autosave]", localSaveError);
      toast.error(tShell("localAutosaveFailed"), {
        description: tShell("localAutosaveFailedDescription"),
        action: {
          label: tShell("retry"),
          onClick: () => {
            try {
              saveDesignLocally(useEditor.getState().track.design);
              onRecovered?.();
              toast.success(tShell("localAutosaveRecovered"), {
                description: tShell("latestLocalCopySaved"),
              });
            } catch (retryError) {
              setSaveStatusLabel(tShell("localAutosaveFailed"));
              console.error(
                "[TrackDraw local autosave retry]",
                toLocalSaveError(retryError)
              );
              toast.error(tShell("localAutosaveStillFailing"), {
                description: tShell("localAutosaveStillFailingDescription"),
              });
            }
          },
        },
      });
    },
    [saveDesignLocally, tShell]
  );

  // Load persisted design on mount
  useEffect(() => {
    if (readOnly) return;

    // Load from share token if provided (takes priority over autosave)
    if (seedToken) {
      const shared = decodeDesign(seedToken);
      if (shared) {
        const editableCopy = createSharedEditableCopy(shared, tShell);
        replaceDesign(editableCopy);
        try {
          const startedAt = performance.now();
          const draftResult = saveLocalDraft(editableCopy);
          const projectResult = saveProjectWithResult(editableCopy);

          if (!draftResult.ok || !projectResult.ok) {
            throw toLocalSaveError(draftResult.error ?? projectResult.error);
          }

          recordPerfSample(
            "autosave:localStorage",
            performance.now() - startedAt
          );
          onSeedTokenImported?.();
          // oxlint-disable-next-line react/react-compiler -- report the completed import
          setSaveStatusLabel(tShell("editableCopyCreated"));
        } catch (error) {
          reportLocalSaveFailure(error, onSeedTokenImported);
        } finally {
          setProjects(listProjects());
        }
        setRestorePoints([]);
        setInitialized(true);
        return;
      }
      console.warn(
        "[useEditorProjects] seedToken decode failed — falling back to autosave"
      );
    }

    try {
      const draft = loadLocalDraft();
      if (draft) {
        replaceDesign(draft);
        setSaveStatusLabel(tShell("restoredFromLocalDraft"));
        setProjects(listProjects());
        setRestorePoints(listRestorePointsForProject(draft.id));
        setInitialized(true);
        return;
      }
      setSaveStatusLabel(tShell("freshLocalProject"));
    } catch {
      setSaveStatusLabel(tShell("freshLocalProject"));
    }
    setProjects(listProjects());
    setRestorePoints(listRestorePointsForProject(design.id));
    setInitialized(true);
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  // Debounce full-design serialization so interactive edits do not fight local
  // autosave on every intermediate state.
  useEffect(() => {
    if (readOnly) return;
    if (historyPaused || interactionSessionDepth > 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        if (hasMeaningfulProjectContent(design)) {
          saveDesignLocally(design);
        }
      } catch (error) {
        reportLocalSaveFailure(error);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    design,
    historyPaused,
    interactionSessionDepth,
    readOnly,
    reportLocalSaveFailure,
    saveDesignLocally,
    tShell,
  ]);

  // Periodic restore points — every 5 min if the design changed
  useEffect(() => {
    if (readOnly) return;
    let lastUpdatedAt = useEditor.getState().track.design.updatedAt;
    const intervalId = window.setInterval(
      () => {
        const current = useEditor.getState().track.design;
        if (current.updatedAt === lastUpdatedAt) return;
        createRestorePoint(current);
        setRestorePoints(listRestorePointsForProject(current.id));
        lastUpdatedAt = current.updatedAt;
      },
      5 * 60 * 1000
    );
    return () => window.clearInterval(intervalId);
  }, [readOnly]);

  const handleSaveSnapshot = useCallback(() => {
    createRestorePoint(design);
    setRestorePoints(listRestorePointsForProject(design.id));
    setActiveRestorePointId(null);
    const time = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const nextSnapshotLabel = tShell("snapshotSavedAt", { time });
    setSaveStatusLabel(nextSnapshotLabel);
    setLastSnapshotLabel(nextSnapshotLabel);
    toast.success(tShell("snapshotSaved"), {
      description: tShell("restorePointCreatedAt", { time }),
    });
  }, [design, tShell]);

  const handleOpenProject = useCallback(
    (id: string) => {
      const loaded = loadProject(id);
      if (!loaded) return;
      // Save current work and snapshot before switching
      if (hasMeaningfulProjectContent(design)) {
        saveProject(design);
        createRestorePoint(design);
        saveLocalDraft(design);
      }
      replaceDesign(loaded);
      setProjects(listProjects());
      setRestorePoints(listRestorePointsForProject(loaded.id));
      setActiveRestorePointId(null);
      setSaveStatusLabel(tShell("projectOpened"));
    },
    [design, replaceDesign, tShell]
  );

  const handleDeleteProject = useCallback(
    (id: string) => {
      deleteProject(id);
      setProjects(listProjects());
      if (id === design.id) {
        setRestorePoints([]);
      }
    },
    [design.id]
  );

  const handleDeleteProjects = useCallback(
    (ids: string[]) => {
      deleteProjects(ids);
      setProjects(listProjects());
      if (ids.includes(design.id)) {
        setRestorePoints([]);
      }
    },
    [design.id]
  );

  const handleRenameProject = useCallback(
    (id: string, title: string) => {
      renameProject(id, title);
      setProjects(listProjects());
      // If renaming the active project, also update the design title
      if (id === design.id) {
        useEditor.getState().updateDesignMeta({ title });
      }
    },
    [design.id]
  );

  const handleRestorePoint = useCallback(
    (id: string) => {
      const loaded = loadRestorePoint(id);
      if (!loaded) return;
      replaceDesign(loaded);
      setRestorePoints(listRestorePointsForProject(loaded.id));
      setActiveRestorePointId(id);
      setSaveStatusLabel(tShell("restoredFromSnapshot"));
    },
    [replaceDesign, tShell]
  );

  const handleDeleteRestorePoint = useCallback(
    (id: string) => {
      deleteRestorePoint(id);
      setRestorePoints(listRestorePointsForProject(design.id));
    },
    [design.id]
  );

  const refreshAfterImport = useCallback((designId: string) => {
    setProjects(listProjects());
    setRestorePoints(listRestorePointsForProject(designId));
  }, []);

  const snapshotCurrentDesign = useCallback(() => {
    if (hasMeaningfulProjectContent(design)) {
      saveProject(design);
      createRestorePoint(design);
      setProjects(listProjects());
      setRestorePoints(listRestorePointsForProject(design.id));
    }
  }, [design]);

  return {
    projects,
    setProjects,
    restorePoints,
    setRestorePoints,
    activeRestorePointId,
    setActiveRestorePointId,
    saveStatusLabel:
      historyPaused || interactionSessionDepth > 0
        ? "Editing…"
        : saveStatusLabel,
    lastSnapshotLabel,
    setSaveStatusLabel,
    initialized,
    setInitialized,
    handleSaveSnapshot,
    handleOpenProject,
    handleDeleteProject,
    handleDeleteProjects,
    handleRenameProject,
    handleRestorePoint,
    handleDeleteRestorePoint,
    refreshAfterImport,
    snapshotCurrentDesign,
  };
}
