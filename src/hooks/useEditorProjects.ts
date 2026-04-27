"use client";

import { useCallback, useEffect, useState } from "react";
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
  type ProjectMeta,
  type RestorePointMeta,
} from "@/lib/projects";
import { decodeDesign } from "@/lib/share";
import { recordPerfSample } from "@/lib/perf";
import { useEditor } from "@/store/editor";
import { toast } from "sonner";
import type { TrackDesign } from "@/lib/types";

export function useEditorProjects({
  readOnly,
  seedToken,
  design,
  historyPaused,
  interactionSessionDepth,
  replaceDesign,
}: {
  readOnly: boolean;
  seedToken?: string;
  design: TrackDesign;
  historyPaused: boolean;
  interactionSessionDepth: number;
  replaceDesign: (design: TrackDesign) => void;
}) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [restorePoints, setRestorePoints] = useState<RestorePointMeta[]>([]);
  const [activeRestorePointId, setActiveRestorePointId] = useState<
    string | null
  >(null);
  const [saveStatusLabel, setSaveStatusLabel] = useState("Saving locally…");
  const [lastSnapshotLabel, setLastSnapshotLabel] = useState<string | null>(
    null
  );
  const [initialized, setInitialized] = useState(false);

  // Load persisted design on mount
  useEffect(() => {
    if (readOnly) return;

    // Load from share token if provided (takes priority over autosave)
    if (seedToken) {
      const shared = decodeDesign(seedToken);
      if (shared) {
        replaceDesign(shared);
        setSaveStatusLabel("Loaded from shared link");
        setProjects(listProjects());
        setRestorePoints(listRestorePointsForProject(shared.id));
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
        setSaveStatusLabel("Restored from local draft");
        setProjects(listProjects());
        setRestorePoints(listRestorePointsForProject(draft.id));
        setInitialized(true);
        return;
      }
      setSaveStatusLabel("Fresh local project");
    } catch {
      setSaveStatusLabel("Fresh local project");
    }
    setProjects(listProjects());
    setRestorePoints(listRestorePointsForProject(design.id));
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce full-design serialization so interactive edits do not fight local
  // autosave on every intermediate state.
  useEffect(() => {
    if (readOnly) return;
    if (historyPaused || interactionSessionDepth > 0) {
      setSaveStatusLabel("Editing…");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        if (hasMeaningfulProjectContent(design)) {
          const startedAt = performance.now();
          saveLocalDraft(design);
          saveProject(design);
          setProjects(listProjects());
          recordPerfSample(
            "autosave:localStorage",
            performance.now() - startedAt
          );
          setSaveStatusLabel(
            `Saved locally at ${new Intl.DateTimeFormat(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date())}`
          );
        }
      } catch {
        /* ignore */
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [design, historyPaused, interactionSessionDepth, readOnly]);

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
    const nextSnapshotLabel = `Snapshot saved at ${time}`;
    setSaveStatusLabel(nextSnapshotLabel);
    setLastSnapshotLabel(nextSnapshotLabel);
    toast.success("Snapshot saved", {
      description: `Restore point created at ${time}`,
    });
  }, [design]);

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
      setSaveStatusLabel("Project opened");
    },
    [design, replaceDesign]
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
      setSaveStatusLabel("Restored from snapshot");
    },
    [replaceDesign]
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
    saveStatusLabel,
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
