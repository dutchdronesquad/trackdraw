import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDocument } from "../workspace/document-context.jsx";
import {
  openDocument,
  isDocumentOpen,
  isActiveDocument,
  renameDocument,
  duplicateDocument,
  deleteDocument,
} from "../workspace/workspace.mjs";
import {
  hasMeaningfulProjectContent,
  command,
  getState,
  listProjects,
  loadProject,
  loadLocalDraft,
  ready,
  saveDesign,
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
  const document = useDocument();
  const store = document.store;
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
        const restored = document;
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
  }, [document, replaceDesign, failure]);
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
      if (!hasMeaningfulProjectContent(design) || !isDocumentOpen(document))
        return;
      setStatus("Saving locally…");
      saveDesign(
        design,
        false,
        () =>
          isActiveDocument(document) && store.getState().track.design === design
      )
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
    document,
    store,
    readOnly,
    design,
    historyPaused,
    interactionSessionDepth,
    failure,
  ]);
  useEffect(() => {
    if (!initialized || readOnly) return;
    let last = store.getState().track.design.updatedAt;
    const timer = setInterval(() => {
      const current = store.getState().track.design;
      if (current.updatedAt === last) return;
      saveDesign(
        current,
        true,
        () =>
          isActiveDocument(document) &&
          store.getState().track.design === current
      )
        .then(() => {
          last = current.updatedAt;
        })
        .catch(failure);
    }, 300000);
    return () => clearInterval(timer);
  }, [initialized, readOnly, failure, store, document]);
  const run = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      failure(error);
      return null;
    }
  };
  const snapshotCurrentDesign = useCallback(async () => {
    const current = store.getState().track.design;
    if (hasMeaningfulProjectContent(current)) await saveDesign(current, true);
  }, [store]);
  const handleSaveSnapshot = () =>
    run(async () => {
      await saveDesign(store.getState().track.design, true);
      setActiveRestorePointId(null);
      setLastSnapshotLabel("Snapshot saved");
      setStatus("Snapshot saved");
      toast.success(t("snapshotSaved"));
    });
  const handleOpenProject = (id) =>
    run(() => {
      history.replaceState(null, "", "/studio");
      return openDocument(id);
    });
  const handleDeleteProjects = (ids) =>
    run(async () => {
      history.replaceState(null, "", "/studio");
      for (const id of ids) await deleteDocument(id);
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
      run(() => {
        history.replaceState(null, "", "/studio");
        return renameDocument(id, title);
      }),
    handleDuplicateProject: (id) =>
      run(() => {
        history.replaceState(null, "", "/studio");
        return duplicateDocument(
          id,
          t("copyOfTitle", { title: loadProject(id)?.title || "" })
        );
      }),
    handleRestorePoint: (id) =>
      run(async () => {
        await command("restore", { id });
        replaceDesign(loadLocalDraft());
        store.getState().clearHistory();
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
