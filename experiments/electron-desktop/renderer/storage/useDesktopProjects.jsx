import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEditor } from "@/store/editor";
import {
  createProjectDuplicate,
  hasMeaningfulProjectContent,
  command,
  getState,
  listProjects,
  loadProject,
  loadLocalDraft,
  ready,
  saveDesign,
  saveCopy,
  subscribe,
} from "./projects.mjs";

// Desktop persistence adapter. The shared editor, renderer and track mutations remain
// unchanged; this host owns asynchronous native durability and its UI acknowledgements.
export function useEditorProjects({
  readOnly,
  design,
  historyPaused,
  interactionSessionDepth,
  replaceDesign,
}) {
  const t = useTranslations("editor.shell");
  const [view, setView] = useState(() => getState());
  const refresh = useCallback(() => setView(getState()), []);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState("Opening desktop projects…");
  const [activeRestorePointId, setActiveRestorePointId] = useState(null);
  const [lastSnapshotLabel, setLastSnapshotLabel] = useState(null);
  useEffect(() => subscribe(() => setView(getState())), []);
  const failure = useCallback((error) => {
    setStatus("Local save failed");
    toast.error("Local save failed. Export a project copy before closing.", {
      description: error.message,
    });
  }, []);
  useEffect(() => {
    let cancelled = false;
    ready
      .then(() => {
        if (cancelled) return;
        const restored = loadLocalDraft();
        if (restored) replaceDesign(restored);
        setView(getState());
        setInitialized(true);
        setStatus(
          restored
            ? "Restored from desktop database"
            : "Ready for local editing"
        );
      })
      .catch(failure);
    return () => {
      cancelled = true;
    };
  }, [replaceDesign, failure]);
  useEffect(() => {
    if (
      !initialized ||
      readOnly ||
      historyPaused ||
      interactionSessionDepth > 0
    )
      return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!hasMeaningfulProjectContent(design)) return;
      setStatus("Saving locally…");
      saveDesign(design)
        .then(() => {
          if (!cancelled) setStatus("Saved locally to desktop database");
        })
        .catch(failure);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    initialized,
    readOnly,
    design,
    historyPaused,
    interactionSessionDepth,
    failure,
  ]);
  useEffect(() => {
    if (!initialized || readOnly) return;
    let last = useEditor.getState().track.design.updatedAt;
    const timer = setInterval(() => {
      const current = useEditor.getState().track.design;
      if (current.updatedAt === last) return;
      saveDesign(current, true)
        .then(() => {
          last = current.updatedAt;
        })
        .catch(failure);
    }, 300000);
    return () => clearInterval(timer);
  }, [initialized, readOnly, failure]);
  const run = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      failure(error);
      return null;
    }
  };
  const snapshotCurrentDesign = useCallback(async () => {
    const current = useEditor.getState().track.design;
    if (hasMeaningfulProjectContent(current)) await saveDesign(current, true);
  }, []);
  const handleSaveSnapshot = () =>
    run(async () => {
      await saveDesign(useEditor.getState().track.design, true);
      setActiveRestorePointId(null);
      setLastSnapshotLabel("Snapshot saved");
      setStatus("Snapshot saved");
      toast.success(t("snapshotSaved"));
    });
  const handleOpenProject = (id) =>
    run(async () => {
      const loaded = loadProject(id);
      if (!loaded) throw new Error("Project is unavailable.");
      await snapshotCurrentDesign();
      await saveDesign(loaded);
      replaceDesign(loaded);
      useEditor.getState().clearHistory();
      setActiveRestorePointId(null);
      setStatus("Project opened");
    });
  const handleDeleteProjects = (ids) =>
    run(async () => {
      await command("delete", { ids });
      if (ids.includes(useEditor.getState().track.design.id))
        useEditor.getState().newProject();
    });
  return {
    projects: listProjects(),
    setProjects: refresh,
    restorePoints: view.restorePoints.filter(
      (point) => point.designId === design.id
    ),
    setRestorePoints: refresh,
    activeRestorePointId,
    setActiveRestorePointId,
    saveStatusLabel:
      historyPaused || interactionSessionDepth > 0 ? "Editing…" : status,
    lastSnapshotLabel,
    setSaveStatusLabel: setStatus,
    initialized,
    setInitialized,
    handleSaveSnapshot,
    handleOpenProject,
    handleDeleteProjects,
    handleDeleteProject: (id) => handleDeleteProjects([id]),
    handleRenameProject: (id, title) =>
      run(async () => {
        await command("rename", { id, title });
        if (id === useEditor.getState().track.design.id)
          useEditor.getState().updateDesignMeta({ title });
      }),
    handleDuplicateProject: (id) =>
      run(async () => {
        const source =
          id === design.id
            ? useEditor.getState().track.design
            : loadProject(id);
        if (!source) throw new Error("Project is unavailable.");
        const copy = createProjectDuplicate(
          source,
          `Copy of ${source.title || "Untitled"}`,
          listProjects().map((project) => project.title)
        );
        // Store a copy without switching the active editor's crash-recovery draft.
        await saveCopy(copy);
        return copy;
      }),
    handleRestorePoint: (id) =>
      run(async () => {
        await command("restore", { id });
        replaceDesign(loadLocalDraft());
        useEditor.getState().clearHistory();
        setActiveRestorePointId(id);
        setStatus("Restored from snapshot");
      }),
    handleDeleteRestorePoint: (id) =>
      run(() => command("delete-restore", { id })),
    refreshAfterImport: () => {
      setView(getState());
    },
    snapshotCurrentDesign,
  };
}
