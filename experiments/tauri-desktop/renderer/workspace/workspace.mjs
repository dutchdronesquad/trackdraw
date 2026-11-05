import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createEditorStore,
  setActiveEditorStore,
} from "../shims/editor-store.jsx";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import {
  loadProject,
  saveDesign,
  saveCopy,
  command,
  getState,
  createProjectDuplicate,
  listProjects,
  getSaveFailures,
  waitForWrites,
} from "../storage/projects.mjs";

const documents = new Map();
const exportedBackups = new Map();
let queue = Promise.resolve();
export const useWorkspace = create(
  persist(
    () => ({
      openIds: [],
      activeId: null,
      recentIds: [],
      views: {},
      home: true,
      busy: false,
      closing: false,
    }),
    {
      name: "trackdraw.desktopWorkspace",
      // These are disposable UI preferences. A full browser-storage quota must
      // not prevent recovery/export of project data held in the editor.
      storage: createJSONStorage(() => ({
        getItem(name) {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem(name, value) {
          try {
            localStorage.setItem(name, value);
          } catch {
            /* Keep editing/recovery available. */
          }
        },
        removeItem(name) {
          try {
            localStorage.removeItem(name);
          } catch {
            /* Preferences are not project data. */
          }
        },
      })),
      partialize: (state) => ({
        openIds: state.openIds,
        activeId: state.activeId,
        recentIds: state.recentIds,
        views: state.views,
      }),
    }
  )
);
export function getDocument(id) {
  return documents.get(id);
}
export function getRecoveryDesign(id) {
  return (
    getDocument(id)?.store.getState().track.design ||
    getSaveFailures().find((failure) => failure.design.id === id)?.design
  );
}
export function retryDocumentSave(id) {
  const design = getRecoveryDesign(id);
  if (!design) throw new Error("This project is no longer available.");
  return useWorkspace.getState().activeId === id
    ? saveDesign(design)
    : saveCopy(design);
}
export function markProjectBackup(design) {
  exportedBackups.set(design.id, JSON.stringify(serializeDesign(design)));
  useWorkspace.setState({});
}
export function canCloseWithBackups() {
  const candidates = new Map(
    getSaveFailures().map(({ design }) => [design.id, design])
  );
  for (const document of documents.values())
    candidates.set(document.id, document.store.getState().track.design);
  const pending = [...candidates.values()].filter(
    (design) =>
      JSON.stringify(
        getState().designs.find((saved) => saved.id === design.id)
      ) !== JSON.stringify(serializeDesign(design))
  );
  return (
    pending.length > 0 &&
    pending.every(
      (design) =>
        exportedBackups.get(design.id) ===
        JSON.stringify(serializeDesign(design))
    )
  );
}
export function isDocumentOpen(document) {
  return documents.get(document.id) === document;
}
export function canLeaveDocument() {
  const document = getDocument(useWorkspace.getState().activeId);
  if (!document || useWorkspace.getState().home) return true;
  const { session, ui } = document.store.getState();
  return (
    !session.historyPaused &&
    !session.interactionSessionDepth &&
    !ui.draftPath.length &&
    !new URLSearchParams(location.search).get("dialog")
  );
}
function transition(operation) {
  const next = queue.then(async () => {
    if (!canLeaveDocument())
      throw new Error(
        "Finish the current interaction or close its dialog before switching documents."
      );
    useWorkspace.setState({ busy: true });
    try {
      return await operation();
    } finally {
      useWorkspace.setState({ busy: false });
    }
  });
  queue = next.catch(() => {});
  return next;
}
function makeDocument(design) {
  const store = createEditorStore();
  store.getState().replaceDesign(design);
  const document = {
    id: design.id,
    store,
    viewport2d: useWorkspace.getState().views[design.id]?.viewport2d || null,
    viewport3d: useWorkspace.getState().views[design.id]?.viewport3d || null,
    view: useWorkspace.getState().views[design.id]?.view === "3d" ? "3d" : "2d",
  };
  if (document.viewport2d) store.getState().setZoom(document.viewport2d.scale);
  store
    .getState()
    .setSelection(
      (useWorkspace.getState().views[design.id]?.selection || []).filter(
        (id) => design.shapeById[id]
      )
    );
  document.unsubscribe = store.subscribe((state, previous) => {
    if (state.track.design !== previous.track.design) useWorkspace.setState({});
  });
  documents.set(design.id, document);
  return document;
}
function rememberDocument(document) {
  if (
    document.id === useWorkspace.getState().activeId &&
    !useWorkspace.getState().home
  )
    document.view =
      new URLSearchParams(location.search).get("view") === "3d" ? "3d" : "2d";
  useWorkspace.setState((state) => ({
    views: {
      ...state.views,
      [document.id]: {
        view: document.view,
        viewport2d: document.viewport2d,
        viewport3d: document.viewport3d,
        selection: [...document.store.getState().session.selection],
      },
    },
  }));
}
async function preserveActive() {
  const document = getDocument(useWorkspace.getState().activeId);
  if (!document) return;
  if (!useWorkspace.getState().home)
    document.view =
      new URLSearchParams(location.search).get("view") === "3d" ? "3d" : "2d";
  await saveDesign(document.store.getState().track.design);
  rememberDocument(document);
}
function activate(document) {
  setActiveEditorStore(document.store);
  history.replaceState(null, "", `/studio?view=${document.view}`);
  const state = useWorkspace.getState();
  useWorkspace.setState({
    activeId: document.id,
    home: false,
    openIds: state.openIds.includes(document.id)
      ? state.openIds
      : [...state.openIds, document.id],
    recentIds: [
      document.id,
      ...state.recentIds.filter((id) => id !== document.id),
    ].slice(0, 100),
  });
}
export function openDocument(id) {
  return transition(async () => {
    if (
      id === useWorkspace.getState().activeId &&
      !useWorkspace.getState().home
    )
      return;
    await preserveActive();
    const document =
      getDocument(id) ||
      (() => {
        const design = loadProject(id);
        if (!design) throw new Error("This project is no longer available.");
        return makeDocument(design);
      })();
    await saveDesign(document.store.getState().track.design);
    activate(document);
  });
}
export function createDocument(design) {
  return transition(async () => {
    await preserveActive();
    await saveDesign(design);
    activate(makeDocument(design));
  });
}
export function newDocument(title) {
  const design = createDefaultDesign();
  design.title = title;
  return createDocument(design);
}
export function showLibrary() {
  return transition(async () => {
    await preserveActive();
    useWorkspace.setState({ home: true });
    history.replaceState(null, "", "/studio");
  });
}
export function closeDocument(id) {
  return transition(async () => {
    const document = getDocument(id);
    if (document) {
      await saveCopy(document.store.getState().track.design);
      rememberDocument(document);
    }
    const state = useWorkspace.getState();
    const index = state.openIds.indexOf(id);
    const ids = state.openIds.filter((item) => item !== id);
    if (state.activeId === id) {
      const nextId = ids[Math.min(index, ids.length - 1)];
      if (nextId) {
        const next = getDocument(nextId) || makeDocument(loadProject(nextId));
        await saveDesign(next.store.getState().track.design);
        activate(next);
      } else useWorkspace.setState({ activeId: null, home: true });
    }
    document?.unsubscribe();
    documents.delete(id);
    useWorkspace.setState({ openIds: ids });
  });
}
export async function flushDocuments() {
  await queue;
  await waitForWrites();
  for (const document of documents.values()) {
    const design = document.store.getState().track.design;
    const saved = getState().designs.find((item) => item.id === document.id);
    if (JSON.stringify(saved) !== JSON.stringify(serializeDesign(design)))
      await saveCopy(design);
    rememberDocument(document);
  }
  // A failed import/duplicate can exist only in recovery memory, without an open
  // editor tab. Closing must retain or acknowledge that project as well.
  for (const { design } of getSaveFailures()) {
    const saved = getState().designs.find((item) => item.id === design.id);
    if (JSON.stringify(saved) !== JSON.stringify(serializeDesign(design)))
      await saveCopy(design);
  }
  const active = getDocument(useWorkspace.getState().activeId);
  if (
    active &&
    JSON.stringify(getState().draft) !==
      JSON.stringify(serializeDesign(active.store.getState().track.design))
  )
    await saveDesign(active.store.getState().track.design);
}
export function initializeWorkspace() {
  const state = useWorkspace.getState();
  const known = new Set(getState().designs.map((design) => design.id));
  const ids = state.openIds.filter((id) => known.has(id));
  for (const id of ids) makeDocument(loadProject(id));
  const activeId = ids.includes(state.activeId)
    ? state.activeId
    : ids[0] || null;
  if (activeId) setActiveEditorStore(getDocument(activeId).store);
  useWorkspace.setState({
    openIds: ids,
    activeId,
    home: true,
    busy: false,
    closing: false,
    recentIds: state.recentIds.filter((id) => known.has(id)),
  });
}
export function renameDocument(id, title) {
  return transition(async () => {
    if (!title.trim()) throw new Error("Enter a project name.");
    await command("rename", { id, title: title.trim() });
    const document = getDocument(id);
    if (document) {
      document.store.getState().updateDesignMeta({ title: title.trim() });
      await saveCopy(document.store.getState().track.design);
    }
  });
}
export function duplicateDocument(id, title) {
  return transition(async () => {
    const source =
      getDocument(id)?.store.getState().track.design || loadProject(id);
    if (!source) throw new Error("This project is no longer available.");
    const copy = createProjectDuplicate(
      source,
      title || source.title,
      listProjects().map((project) => project.title)
    );
    await saveCopy(copy);
  });
}
export function deleteDocument(id) {
  return transition(async () => {
    await command("delete", { ids: [id] });
    const state = useWorkspace.getState();
    const ids = state.openIds.filter((item) => item !== id);
    getDocument(id)?.unsubscribe();
    documents.delete(id);
    const activeId = state.activeId === id ? ids[0] || null : state.activeId;
    if (activeId) setActiveEditorStore(getDocument(activeId).store);
    useWorkspace.setState({
      openIds: ids,
      activeId,
      home: activeId ? state.home : true,
      recentIds: state.recentIds.filter((item) => item !== id),
      views: Object.fromEntries(
        Object.entries(state.views).filter(([key]) => key !== id)
      ),
    });
  });
}

export function captureViewport(id, kind, view) {
  const document = documents.get(id);
  if (document) document[kind] = view;
}

export function isActiveDocument(document) {
  const state = useWorkspace.getState();
  return (
    isDocumentOpen(document) && state.activeId === document.id && !state.home
  );
}
