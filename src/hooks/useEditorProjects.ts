"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createRestorePoint,
  deleteProject,
  deleteProjects,
  deleteRestorePoint,
  listProjects,
  listRestorePointsForProject,
  loadProject,
  loadRestorePoint,
  renameProject,
  saveProject,
  type ProjectMeta,
  type RestorePointMeta,
} from "@/lib/projects";
import { parseDesign } from "@/lib/track/design";
import { decodeDesign } from "@/lib/share";
import { recordPerfSample } from "@/lib/perf";
import { useEditor } from "@/store/editor";
import { toast } from "sonner";
import type { TrackDesign } from "@/lib/types";

export function useEditorProjects({
  readOnly,
  seedToken,
  design,
  designShapesLength,
  historyPaused,
  interactionSessionDepth,
  replaceDesign,
}: {
  readOnly: boolean;
  seedToken?: string;
  design: TrackDesign;
  designShapesLength: number;
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
      const saved = localStorage.getItem("trackdraw-design");
      if (saved) {
        const parsed = parseDesign(JSON.parse(saved));
        if (parsed) {
          replaceDesign(parsed);
          setSaveStatusLabel("Restored from local autosave");
          setProjects(listProjects());
          setRestorePoints(listRestorePointsForProject(parsed.id));
          setInitialized(true);
          return;
        }
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
        const startedAt = performance.now();
        localStorage.setItem("trackdraw-design", JSON.stringify(design));
        if (designShapesLength > 0 || design.title.trim()) {
          saveProject(design);
          setProjects(listProjects());
        }
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
      } catch {
        /* ignore */
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    design,
    designShapesLength,
    historyPaused,
    interactionSessionDepth,
    readOnly,
  ]);

  // Periodic restore points — every 5 min if the design changed
  useEffect(() => {
    if (readOnly) return;
    let lastUpdatedAt = useEditor.getState().design.updatedAt;
    const intervalId = window.setInterval(
      () => {
        const current = useEditor.getState().design;
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
    setSaveStatusLabel(`Snapshot saved at ${time}`);
    toast.success("Snapshot saved", {
      description: `Restore point created at ${time}`,
    });
  }, [design]);

  // Cmd+S / Ctrl+S → manual snapshot
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "s") return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      )
        return;
      e.preventDefault();
      handleSaveSnapshot();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readOnly, handleSaveSnapshot]);

  const handleOpenProject = useCallback(
    (id: string) => {
      const loaded = loadProject(id);
      if (!loaded) return;
      // Save current work and snapshot before switching
      if (designShapesLength > 0 || design.title.trim()) {
        saveProject(design);
        createRestorePoint(design);
      }
      replaceDesign(loaded);
      setProjects(listProjects());
      setRestorePoints(listRestorePointsForProject(loaded.id));
      setActiveRestorePointId(null);
      setSaveStatusLabel("Project opened");
    },
    [design, designShapesLength, replaceDesign]
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
    if (designShapesLength > 0 || design.title.trim()) {
      saveProject(design);
      createRestorePoint(design);
      setProjects(listProjects());
      setRestorePoints(listRestorePointsForProject(design.id));
    }
  }, [design, designShapesLength]);

  return {
    projects,
    setProjects,
    restorePoints,
    setRestorePoints,
    activeRestorePointId,
    setActiveRestorePointId,
    saveStatusLabel,
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
