import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  Home,
  Plus,
  Search,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  X,
  Pencil,
  Copy,
  Trash2,
  HardDrive,
  Route,
  Ruler,
  ArrowUpRight,
  Check,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { formatCompactFieldSize } from "@/lib/track/units";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import EditorShell from "@/components/editor/EditorShell";
import { StudioDialogsProvider } from "@/components/editor/StudioDialogsProvider";
import { designToSvg } from "@/lib/export/exportSvg";
import { parseDesign } from "@/lib/track/design";
import {
  getState,
  subscribe,
  getError,
  getSaveFailures,
  getErrorMessage,
} from "../storage/projects.mjs";
import { DocumentContext } from "./document-context.jsx";
import {
  useWorkspace,
  getDocument,
  openDocument,
  closeDocument,
  showLibrary,
  flushDocuments,
  renameDocument,
  duplicateDocument,
  deleteDocument,
  retryDocumentSave,
  canCloseWithBackups,
} from "./workspace.mjs";

function Preview({ design }) {
  const theme = useTheme();
  const src = useMemo(
    () =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(designToSvg(parseDesign(design), theme))}`,
    [design, theme]
  );
  // Local SVG output from the shared exporter needs no Next image service.
  // oxlint-disable-next-line nextjs/no-img-element
  return <img src={src || undefined} alt="" loading="lazy" />;
}

function Library({ onNew, onImport, onSample, run }) {
  const t = useTranslations("editor.desktopWorkspace");
  const locale = useLocale();
  const theme = useTheme();
  const { unitSystem } = useMeasurementUnitSystem();
  const repository = useSyncExternalStore(subscribe, getState);
  const recentIds = useWorkspace((state) => state.recentIds);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("recent");
  const [dialog, setDialog] = useState(null);
  const [title, setTitle] = useState("");
  const [menu, setMenu] = useState(null);
  const [working, setWorking] = useState(false);
  const designs = [...repository.designs]
    .sort((a, b) =>
      filter === "recent"
        ? (recentIds.indexOf(a.id) < 0 ? 999 : recentIds.indexOf(a.id)) -
            (recentIds.indexOf(b.id) < 0 ? 999 : recentIds.indexOf(b.id)) ||
          b.updatedAt.localeCompare(a.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt)
    )
    .filter((design) =>
      design.title.toLowerCase().includes(query.toLowerCase())
    );
  const submit = async (event) => {
    event.preventDefault();
    setWorking(true);
    try {
      await (dialog.kind === "rename"
        ? renameDocument(dialog.id, title)
        : deleteDocument(dialog.id));
      setDialog(null);
    } finally {
      setWorking(false);
    }
  };
  return (
    <div className="desktop-library">
      <aside className="library-sidebar">
        <div className="library-brand">
          <Image
            src={`/assets/brand/trackdraw-logo-color-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
            alt="TrackDraw"
            width={164}
            height={32}
            unoptimized
          />
          <span>{t("desktopAlpha")}</span>
        </div>
        <p className="library-device">{t("workspace")}</p>
        <button
          className={filter === "recent" ? "selected" : ""}
          aria-pressed={filter === "recent"}
          onClick={() => setFilter("recent")}
        >
          <Home size={16} />
          {t("recent")}
        </button>
        <button
          className={filter === "all" ? "selected" : ""}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          <FolderOpen size={16} />
          {t("allProjects")}
        </button>
        <div className="library-sidebar-bottom">
          <HardDrive size={18} aria-hidden="true" />
          <strong>{t("localWorkspace")}</strong>
          <p>{t("offlineNotice")}</p>
        </div>
      </aside>
      <main className="library-content">
        <header className="library-heading">
          <div>
            <span className="library-eyebrow">{t("workspace")}</span>
            <h1>{t("libraryTitle")}</h1>
            <p>{t("description")}</p>
          </div>
          <div className="library-actions">
            <button onClick={onImport}>
              <FolderOpen size={16} aria-hidden="true" />
              {t("import")}
            </button>
            <button className="primary" onClick={onNew}>
              <Plus size={16} />
              {t("newProject")}
            </button>
          </div>
        </header>
        <div className="library-toolbar">
          <h2>{t(filter === "recent" ? "recent" : "allProjects")}</h2>
          <span className="library-count">
            {t("projectCount", { count: designs.length })}
          </span>
          <div className="library-search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label={t("search")}
              placeholder={t("search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {designs.length ? (
          <div className="project-grid">
            {designs.map((design) => (
              <article className="project-tile" key={design.id}>
                <button
                  className="project-open"
                  aria-label={t("openProject", { title: design.title })}
                  onClick={() => run(() => openDocument(design.id))}
                >
                  <div className="project-preview">
                    <Preview design={design} />
                    {(design.mapReference ||
                      design.shapes.some((shape) => shape.appearance)) && (
                      <span
                        className="project-online-note"
                        title={t("onlineResourcesHelp")}
                      >
                        <TriangleAlert size={12} aria-hidden="true" />
                        {t("onlineResources")}
                      </span>
                    )}
                    <span className="project-field-size">
                      <Ruler size={12} aria-hidden="true" />
                      {formatCompactFieldSize(
                        design.field.width,
                        design.field.height,
                        unitSystem
                      )}
                    </span>
                    <span className="project-open-hint" aria-hidden="true">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <strong>{design.title || t("untitled")}</strong>
                  <span className="project-details">
                    <Route size={13} aria-hidden="true" />
                    {t("obstacles", { count: design.shapes.length })}
                    <span
                      className="project-detail-separator"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span>
                      {t("updated", {
                        date: new Date(design.updatedAt).toLocaleDateString(
                          locale,
                          { month: "short", day: "numeric" }
                        ),
                      })}
                    </span>
                  </span>
                </button>
                <DropdownMenu
                  open={menu === design.id}
                  onOpenChange={(open) => setMenu(open ? design.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      className="project-menu-trigger"
                      aria-label={t("projectActions", { title: design.title })}
                    >
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="desktop-project-menu"
                    onCloseAutoFocus={(event) => {
                      if (dialog) event.preventDefault();
                    }}
                  >
                    <DropdownMenuItem
                      onSelect={() => {
                        setDialog({ kind: "rename", id: design.id });
                        setTitle(design.title);
                      }}
                    >
                      <Pencil size={14} />
                      {t("rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(() =>
                          duplicateDocument(
                            design.id,
                            t("copyOf", { title: design.title })
                          )
                        )
                      }
                    >
                      <Copy size={14} />
                      {t("duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() =>
                        setDialog({ kind: "delete", id: design.id })
                      }
                    >
                      <Trash2 size={14} />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <LayoutGrid size={36} />
            <h2>{t(query ? "noResults" : "emptyTitle")}</h2>
            <p>{t(query ? "trySearch" : "emptyDescription")}</p>
            {!query && <button onClick={onSample}>{t("sample")}</button>}
          </div>
        )}
      </main>
      {dialog && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !working) setDialog(null);
          }}
        >
          <DialogContent>
            <form
              className="library-dialog-form"
              onSubmit={(event) => run(() => submit(event))}
            >
              <DialogHeader>
                <DialogTitle>
                  {t(dialog.kind === "rename" ? "rename" : "delete")}
                </DialogTitle>
                <DialogDescription>
                  {t(dialog.kind === "rename" ? "renameHelp" : "deleteWarning")}
                </DialogDescription>
              </DialogHeader>
              {dialog.kind === "rename" ? (
                <label>
                  {t("projectName")}
                  <input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
              ) : null}
              <footer>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => setDialog(null)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="primary"
                  disabled={
                    working || (dialog.kind === "rename" && !title.trim())
                  }
                >
                  {t(dialog.kind === "rename" ? "save" : "delete")}
                </button>
              </footer>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function Workspace({ onNew, onImport, onSave, onSample, run }) {
  const t = useTranslations("editor.desktopWorkspace");
  const state = useWorkspace();
  const repository = useSyncExternalStore(subscribe, getState);
  const document = getDocument(state.activeId);
  const failures = getSaveFailures();
  const saveFailed = Boolean(getError());
  const [recovering, setRecovering] = useState(null);
  const [status, setStatus] = useState("");
  const saving = state.busy || status === t("saving");
  useEffect(() => {
    if (!document) return;
    const update = () => {
      const design = document.store.getState().track.design;
      const saved = repository.designs.find((item) => item.id === design.id);
      setStatus(
        getError(document.id)
          ? t("saveFailed")
          : saved?.updatedAt === design.updatedAt
            ? t("saved")
            : t("saving")
      );
    };
    update();
    return document.store.subscribe(update);
  }, [document, repository, t]);
  useEffect(() => {
    const stop = window.trackdrawDesktop.onMenuAction((action) => {
      if (useWorkspace.getState().closing) return;
      run(() =>
        action === "open"
          ? onImport()
          : action === "new"
            ? onNew()
            : action === "home"
              ? showLibrary()
              : action === "close-tab"
                ? state.home || !state.activeId
                  ? Promise.resolve()
                  : closeDocument(state.activeId)
                : onSave()
      );
    });
    const close = window.trackdrawDesktop.onCloseRequested(() => {
      if (useWorkspace.getState().closing) return;
      useWorkspace.setState({ closing: true });
      run(async () => {
        try {
          await flushDocuments();
          await window.trackdrawDesktop.finishClose();
        } finally {
          useWorkspace.setState({ closing: false });
        }
      });
    });
    const action = (event) =>
      run(() => (event.detail === "import" ? onImport() : onNew()));
    window.addEventListener("desktop:action", action);
    const block = (event) => {
      if (useWorkspace.getState().busy || useWorkspace.getState().closing) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", block, true);
    return () => {
      stop();
      close();
      window.removeEventListener("desktop:action", action);
      window.removeEventListener("keydown", block, true);
    };
  }, [state.home, state.activeId, onImport, onSave, onNew, run]);
  useEffect(() => {
    if (!state.home && state.activeId)
      globalThis.document
        .getElementById(`desktop-tab-${state.activeId}`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [state.activeId, state.home]);
  const tabs = [null, ...state.openIds];
  const change = (id) => run(() => (id ? openDocument(id) : showLibrary()));
  const keyDown = (event, id) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(id);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    change(tabs[next]);
    globalThis.document
      .getElementById(`desktop-tab-${tabs[next] || "home"}`)
      ?.focus();
  };
  return (
    <div
      className="desktop-workbench"
      data-platform={window.trackdrawDesktop.platform}
      inert={state.closing || undefined}
    >
      <div className="desktop-titlebar">
        <div
          className="desktop-tabs"
          role="tablist"
          aria-label={t("documents")}
        >
          <button
            id="desktop-tab-home"
            role="tab"
            aria-selected={state.home}
            tabIndex={state.home ? 0 : -1}
            disabled={state.busy}
            onKeyDown={(event) => keyDown(event, null)}
            onClick={() => change(null)}
          >
            <Image
              src="/assets/pwa/icon-192.png"
              alt=""
              width={16}
              height={16}
              unoptimized
            />
            {t("home")}
          </button>
          <div className="document-tab-scroll">
            {state.openIds.map((id) => {
              const doc = getDocument(id);
              const design = doc?.store.getState().track.design;
              return (
                <div
                  className={`document-tab ${!state.home && id === state.activeId ? "active" : ""}`}
                  key={id}
                >
                  <button
                    role="tab"
                    id={`desktop-tab-${id}`}
                    aria-selected={!state.home && id === state.activeId}
                    tabIndex={!state.home && id === state.activeId ? 0 : -1}
                    disabled={state.busy}
                    onKeyDown={(event) => keyDown(event, id)}
                    onClick={() => change(id)}
                  >
                    <Route
                      size={14}
                      className="document-tab-icon"
                      aria-hidden="true"
                    />
                    <span
                      className="document-tab-title"
                      title={design?.title || t("untitled")}
                    >
                      {design?.title || t("untitled")}
                    </span>
                    {design &&
                      repository.designs.find((item) => item.id === id)
                        ?.updatedAt !== design.updatedAt && (
                        <span aria-label={t("saving")}>•</span>
                      )}
                  </button>
                  <button
                    className="tab-close"
                    aria-label={t("closeDocument", {
                      title: design?.title || t("untitled"),
                    })}
                    disabled={state.busy}
                    onClick={() => run(() => closeDocument(id))}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            className="new-tab"
            aria-label={t("newProject")}
            disabled={state.busy}
            onClick={onNew}
          >
            <Plus size={16} />
          </button>
        </div>
        <span
          className={`workspace-status ${saveFailed ? "save-failed" : ""}`}
          role="status"
        >
          {saveFailed ? (
            <TriangleAlert size={13} aria-hidden="true" />
          ) : saving && !state.home ? (
            <LoaderCircle
              size={13}
              className="saving-indicator"
              aria-hidden="true"
            />
          ) : state.home ? (
            <HardDrive size={13} aria-hidden="true" />
          ) : (
            <Check size={13} aria-hidden="true" />
          )}
          {saveFailed
            ? t("saveFailed")
            : state.busy
              ? t("saving")
              : state.home
                ? t("onDevice")
                : status}
        </span>
      </div>
      {failures.length > 0 && (
        <section
          className="desktop-save-recovery"
          aria-label={t("recoveryTitle")}
        >
          <p role="alert">{t("recoveryHelp")}</p>
          {failures.map(({ design, error }) => (
            <div className="recovery-project" key={design.id}>
              <div>
                <strong>
                  {getDocument(design.id)?.store.getState().track.design
                    .title ||
                    design.title ||
                    t("untitled")}
                </strong>
                <span>{getErrorMessage(error)}</span>
              </div>
              <button
                disabled={recovering !== null}
                onClick={() =>
                  run(async () => {
                    setRecovering(design.id);
                    try {
                      await retryDocumentSave(design.id);
                    } finally {
                      setRecovering(null);
                    }
                  })
                }
              >
                {t("retrySave")}
              </button>
              <button
                disabled={recovering !== null}
                onClick={() =>
                  run(async () => {
                    setRecovering(design.id);
                    try {
                      await onSave(design.id);
                    } finally {
                      setRecovering(null);
                    }
                  })
                }
              >
                {t("exportBackup")}
              </button>
            </div>
          ))}
          <button
            disabled={recovering !== null || !canCloseWithBackups()}
            onClick={() =>
              run(async () => {
                if (!canCloseWithBackups()) return;
                useWorkspace.setState({ closing: true });
                try {
                  await window.trackdrawDesktop.finishClose();
                } finally {
                  useWorkspace.setState({ closing: false });
                }
              })
            }
          >
            {t("closeWithBackups")}
          </button>
        </section>
      )}
      {state.home || !document ? (
        <Library
          onNew={onNew}
          onImport={onImport}
          onSample={onSample}
          run={run}
        />
      ) : (
        <div
          className="desktop-document"
          role="tabpanel"
          aria-labelledby={`desktop-tab-${document.id}`}
          inert={state.busy || undefined}
        >
          <DocumentContext.Provider value={document} key={document.id}>
            <StudioDialogsProvider>
              <EditorShell
                initialTab={document.view}
                showStarterExperience={false}
              />
            </StudioDialogsProvider>
          </DocumentContext.Provider>
        </div>
      )}
    </div>
  );
}
