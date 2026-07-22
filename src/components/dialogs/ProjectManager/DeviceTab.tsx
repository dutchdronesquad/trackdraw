"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Cloud,
  CloudUpload,
  Download,
  FilePlus,
  FolderOpen,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectMeta } from "@/lib/projects";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";
import { MobileDrawerHeader } from "@/components/MobileDrawer";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  CurrentBadge,
  DesktopActionTooltip,
  EmptyState,
  formatRelativeTime,
  getDisplayTitle,
  getEditableTitle,
  itemLabel,
  ProjectAvatar,
} from "./shared";

type AccountProjectItem = {
  id: string;
  title: string;
  updatedAt: string;
  shapeCount: number;
};

interface ProjectManagerDeviceTabProps {
  projects: ProjectMeta[];
  accountProjects: AccountProjectItem[];
  activeDesignId?: string;
  syncingProjectId?: string | null;
  projectSyncMetaById: Record<string, ProjectSyncMeta>;
  onOpenProject?: (id: string) => void;
  onOpenNewProject?: () => void;
  onSyncProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteProjects?: (ids: string[]) => void;
  onRenameProject?: (id: string, title: string) => void;
  onExportProject?: (id: string) => void;
  onResolveConflict?: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function ProjectManagerDeviceTab({
  projects,
  accountProjects,
  activeDesignId,
  syncingProjectId,
  projectSyncMetaById,
  onOpenProject,
  onOpenNewProject,
  onSyncProject,
  onDeleteProject,
  onDeleteProjects,
  onRenameProject,
  onExportProject,
  onResolveConflict,
  onOpenChange,
}: ProjectManagerDeviceTabProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOldProjects, setConfirmDeleteOldProjects] =
    useState(false);
  const [mobileActionsId, setMobileActionsId] = useState<string | null>(null);
  const [mobileDeleteConfirm, setMobileDeleteConfirm] = useState(false);

  const sorted = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const accountProjectIds = new Set(accountProjects.map((p) => p.id));
  const isAccountBackedBrowserCopy = (project: ProjectMeta) => {
    const syncMeta = projectSyncMetaById[project.id];
    return (
      accountProjectIds.has(project.id) ||
      syncMeta?.status === "synced" ||
      syncMeta?.status === "pending" ||
      syncMeta?.status === "syncing" ||
      syncMeta?.status === "failed" ||
      syncMeta?.status === "conflict"
    );
  };
  const accountLinkedLocalCopies = sorted.filter(isAccountBackedBrowserCopy);
  const deviceOnlyProjects = sorted.filter(
    (project) => !isAccountBackedBrowserCopy(project)
  );
  const showProjectGroups =
    Boolean(onSyncProject) &&
    accountLinkedLocalCopies.length > 0 &&
    deviceOnlyProjects.length > 0;
  const deletableOldProjectIds = sorted
    .filter((project) => project.id !== activeDesignId)
    .map((project) => project.id);
  const showDeleteOldProjectsConfirm =
    confirmDeleteOldProjects && deletableOldProjectIds.length > 0;

  function startRename(p: ProjectMeta) {
    setRenamingId(p.id);
    setRenameValue(getEditableTitle(p.title));
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameProject) onRenameProject(id, trimmed);
    setRenamingId(null);
  }

  function closeMobileActions() {
    setMobileActionsId(null);
    setMobileDeleteConfirm(false);
  }

  function handleOpenNewProject() {
    if (!onOpenNewProject) return;
    onOpenChange(false);
    window.setTimeout(onOpenNewProject, 0);
  }

  const mobileActionProject =
    mobileActionsId == null
      ? null
      : (sorted.find((p) => p.id === mobileActionsId) ?? null);
  const mobileActionSyncMeta = mobileActionProject
    ? projectSyncMetaById[mobileActionProject.id]
    : null;
  const mobileActionHasConflict = mobileActionSyncMeta?.status === "conflict";
  const mobileActionHasSyncFailure = mobileActionSyncMeta?.status === "failed";
  const mobileActionHasPendingChanges =
    mobileActionSyncMeta?.status === "pending";
  const mobileActionIsSynced = mobileActionProject
    ? mobileActionSyncMeta?.status === "synced" ||
      accountProjects.some((p) => p.id === mobileActionProject.id)
    : false;
  const mobileActionSyncTitle = mobileActionHasConflict
    ? t("projectManager.device.sync.resolveConflict")
    : mobileActionHasSyncFailure
      ? t("projectManager.device.sync.retry")
      : mobileActionIsSynced || mobileActionHasPendingChanges
        ? t("projectManager.device.sync.updateAccountCopy")
        : t("projectManager.device.sync.syncToAccount");
  const mobileActionSyncDescription = mobileActionHasConflict
    ? t("projectManager.device.sync.conflictDescription")
    : mobileActionHasSyncFailure
      ? t("projectManager.device.sync.failedDescription")
      : mobileActionHasPendingChanges
        ? t("projectManager.device.sync.pendingDescription")
        : mobileActionIsSynced
          ? t("projectManager.device.sync.updateDescription")
          : t("projectManager.device.sync.description");
  function ProjectCard({ p }: { p: ProjectMeta }) {
    const isCurrent = p.id === activeDesignId;
    const isRenaming = renamingId === p.id;
    const isConfirming = confirmDeleteId === p.id;
    const syncMeta = projectSyncMetaById[p.id];
    const isSynced =
      syncMeta?.status === "synced" ||
      accountProjects.some((proj) => proj.id === p.id);
    const isSyncing =
      syncingProjectId === p.id || syncMeta?.status === "syncing";
    const hasConflict = syncMeta?.status === "conflict";
    const hasSyncFailure = syncMeta?.status === "failed";
    const hasPendingChanges = syncMeta?.status === "pending";
    const projectTitle = getDisplayTitle(
      p.title,
      t("projectManager.device.fallback.untitled")
    );
    const itemCountLabel = itemLabel(p.shapeCount, t);
    const fallbackLine = syncMeta?.fallbackSavedAt
      ? t("projectManager.device.sync.latestLocalCopySaved", {
          relativeTime: formatRelativeTime(syncMeta.fallbackSavedAt, t),
        })
      : null;
    const syncLabel = isSyncing
      ? t("projectManager.device.status.syncing")
      : hasConflict
        ? t("projectManager.device.status.reviewNeeded")
        : hasPendingChanges
          ? tCommon("status.pending")
          : hasSyncFailure
            ? t("projectManager.device.status.failed")
            : isSynced
              ? t("projectManager.device.status.synced")
              : t("projectManager.device.status.localOnly");
    const syncDetail = hasConflict
      ? (syncMeta?.error ??
        t("projectManager.device.sync.changedOnAnotherDevice"))
      : hasSyncFailure
        ? (fallbackLine ??
          syncMeta?.error ??
          t("projectManager.device.sync.couldNotSyncProject"))
        : hasPendingChanges
          ? t("projectManager.device.sync.localChangesWaiting")
          : null;
    const metaLine = hasConflict
      ? syncDetail
      : hasSyncFailure
        ? syncDetail
        : hasPendingChanges
          ? t("projectManager.device.meta.localCopyWaitingToSync", {
              itemLabel: itemCountLabel,
            })
          : isSynced && syncMeta?.lastSyncedAt
            ? t("projectManager.device.meta.localCopySynced", {
                itemLabel: itemCountLabel,
                relativeTime: formatRelativeTime(syncMeta.lastSyncedAt, t),
              })
            : isSynced
              ? t("projectManager.device.meta.localCopy", {
                  itemLabel: itemCountLabel,
                })
              : t("projectManager.device.meta.onlyOnThisDevice", {
                  itemLabel: itemCountLabel,
                  relativeTime: formatRelativeTime(p.updatedAt, t),
                });

    return (
      <div
        onClick={
          onOpenProject && !isCurrent && !isRenaming && !isConfirming
            ? () => {
                onOpenProject(p.id);
                onOpenChange(false);
              }
            : undefined
        }
        className={cn(
          "group relative flex items-start gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-150",
          isCurrent
            ? "border-border/70 bg-muted/45"
            : "border-border/60 bg-background/70 hover:bg-muted/40 cursor-pointer"
        )}
      >
        <ProjectAvatar id={p.id} title={projectTitle} />
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(p.id);
                if (e.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => commitRename(p.id)}
              className="text-foreground border-border/60 w-full border-b bg-transparent pb-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <>
              <p className="text-foreground truncate text-sm font-medium">
                {projectTitle}
              </p>
              {!isRenaming && !isConfirming ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isCurrent ? <CurrentBadge /> : null}
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
                      isSyncing
                        ? "bg-muted text-foreground/75"
                        : hasConflict
                          ? "bg-destructive/10 text-destructive/80"
                          : hasPendingChanges
                            ? "bg-muted text-foreground/75"
                            : hasSyncFailure
                              ? "bg-destructive/10 text-destructive/80"
                              : isSynced
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground/75"
                    )}
                  >
                    {syncLabel}
                  </span>
                </div>
              ) : isCurrent ? (
                <div className="mt-1">
                  <CurrentBadge />
                </div>
              ) : null}
            </>
          )}
          <p
            className={cn(
              "mt-1 text-[11px]",
              hasSyncFailure ? "text-destructive/80" : "text-muted-foreground"
            )}
          >
            {metaLine}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {isRenaming ? (
            <button
              onClick={() => commitRename(p.id)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
              title={t("projectManager.device.actions.confirmRenameTitle")}
            >
              <Check className="size-3.5" />
            </button>
          ) : (
            <>
              {onSyncProject && !isConfirming && !isMobile ? (
                <DesktopActionTooltip
                  label={
                    hasConflict
                      ? t("projectManager.device.sync.resolveVersionConflict")
                      : hasSyncFailure
                        ? t("projectManager.device.sync.retry")
                        : isSynced || hasPendingChanges
                          ? t("projectManager.device.sync.updateAccountCopy")
                          : t("projectManager.device.sync.syncToAccount")
                  }
                >
                  <button
                    type="button"
                    aria-label={
                      hasConflict
                        ? t(
                            "projectManager.device.aria.resolveVersionConflictFor",
                            {
                              title: projectTitle,
                            }
                          )
                        : hasSyncFailure
                          ? t("projectManager.device.aria.retrySyncFor", {
                              title: projectTitle,
                            })
                          : isSynced || hasPendingChanges
                            ? t(
                                "projectManager.device.aria.updateAccountCopyFor",
                                {
                                  title: projectTitle,
                                }
                              )
                            : t(
                                "projectManager.device.aria.syncProjectToAccount",
                                {
                                  title: projectTitle,
                                }
                              )
                    }
                    onClick={() => {
                      if (hasConflict) {
                        onResolveConflict?.(p.id);
                        onOpenChange(false);
                      } else {
                        onSyncProject(p.id);
                      }
                    }}
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                      !isMobile &&
                        "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    )}
                  >
                    {isSyncing ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : isSynced && !hasConflict && !hasSyncFailure ? (
                      <Cloud className="size-3.5" />
                    ) : (
                      <CloudUpload className="size-3.5" />
                    )}
                  </button>
                </DesktopActionTooltip>
              ) : null}
              {onExportProject && !isConfirming && !isMobile ? (
                <DesktopActionTooltip
                  label={t("projectManager.device.export.json")}
                >
                  <button
                    type="button"
                    aria-label={t(
                      "projectManager.device.aria.exportProjectAsJson",
                      {
                        title: projectTitle,
                      }
                    )}
                    onClick={() => onExportProject(p.id)}
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                      !isMobile &&
                        "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    )}
                  >
                    <Download className="size-3.5" />
                  </button>
                </DesktopActionTooltip>
              ) : null}
              {isMobile ? (
                onSyncProject ||
                onExportProject ||
                onRenameProject ||
                (onDeleteProject && !isCurrent) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileActionsId(p.id);
                      setMobileDeleteConfirm(false);
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-10 cursor-pointer items-center justify-center rounded-xl transition-colors"
                    title={t("projectManager.device.actions.more")}
                    aria-label={t("projectManager.device.aria.manageProject", {
                      title: projectTitle,
                    })}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                ) : isCurrent ? (
                  <CurrentBadge
                    label={t("projectManager.device.actions.openBadge")}
                  />
                ) : null
              ) : (
                <>
                  {onRenameProject && (
                    <DesktopActionTooltip label={tCommon("actions.rename")}>
                      <button
                        type="button"
                        aria-label={t(
                          "projectManager.device.aria.renameProject",
                          {
                            title: projectTitle,
                          }
                        )}
                        onClick={() => startRename(p)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-[opacity,colors] group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </DesktopActionTooltip>
                  )}
                  {onDeleteProject && !isCurrent && (
                    <DesktopActionTooltip label={tCommon("actions.delete")}>
                      <button
                        type="button"
                        aria-label={t(
                          "projectManager.device.aria.deleteProject",
                          {
                            title: projectTitle,
                          }
                        )}
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-[opacity,colors] group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </DesktopActionTooltip>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <AnimatePresence>
          {isConfirming && (
            <motion.div
              className="bg-background/97 absolute inset-0 flex items-center justify-between gap-2 rounded-xl px-3 backdrop-blur-sm"
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0 flex-1">
                <p className="text-destructive truncate text-sm font-medium">
                  {t("projectManager.device.delete.localProject")}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {t("projectManager.device.delete.localProjectDescription")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => {
                    onDeleteProject!(p.id);
                    setConfirmDeleteId(null);
                  }}
                  className="bg-destructive/10 hover:bg-destructive/20 text-destructive cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {tCommon("actions.delete")}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors"
                >
                  {tCommon("actions.cancel")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {onOpenNewProject ||
        (onDeleteProjects && deletableOldProjectIds.length > 0) ? (
          <div className="mb-3">
            <div
              className={cn(
                isMobile ? "flex items-center gap-2" : "flex items-center gap-2"
              )}
            >
              {onOpenNewProject ? (
                <button
                  type="button"
                  onClick={handleOpenNewProject}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 text-left transition-colors",
                    isMobile
                      ? "border-border/60 bg-background/70 hover:bg-muted/40 flex-1 rounded-xl border px-3 py-3"
                      : "border-border/60 bg-background/70 hover:bg-muted/35 flex-1 rounded-xl border px-3 py-2.5"
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl",
                      isMobile
                        ? "bg-muted text-foreground size-9"
                        : "bg-muted text-foreground size-8"
                    )}
                  >
                    <FilePlus className={isMobile ? "size-4" : "size-3.5"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block text-sm font-medium">
                      {t("projectManager.device.actions.newProject")}
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground block pt-0.5 text-[11px] leading-relaxed",
                        isMobile && "hidden"
                      )}
                    >
                      {t("projectManager.device.actions.newProjectDescription")}
                    </span>
                  </span>
                </button>
              ) : null}
              {onDeleteProjects && deletableOldProjectIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOldProjects(true)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 text-left transition-colors",
                    isMobile
                      ? "border-border/60 bg-background/70 hover:bg-destructive/10 flex-1 rounded-xl border px-3 py-3"
                      : "border-destructive/20 bg-background/70 hover:bg-destructive/6 flex-1 rounded-xl border px-3 py-2.5"
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl",
                      isMobile
                        ? "bg-destructive/10 text-destructive size-9"
                        : "bg-destructive/10 text-destructive size-8"
                    )}
                  >
                    <Trash2 className={isMobile ? "size-4" : "size-3.5"} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-destructive block text-sm font-medium">
                      {t("projectManager.device.actions.cleanUpLocal")}
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground block pt-0.5 text-[11px] leading-relaxed",
                        isMobile && "hidden"
                      )}
                    >
                      {t(
                        "projectManager.device.actions.cleanUpLocalDescription"
                      )}
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            {onDeleteProjects &&
            deletableOldProjectIds.length > 0 &&
            showDeleteOldProjectsConfirm ? (
              <motion.div
                className="border-border/60 bg-background/80 mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-[12px] font-medium">
                    {t(
                      "projectManager.device.delete.removeLocalProjectsTitle",
                      {
                        count: deletableOldProjectIds.length,
                      }
                    )}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                    {t(
                      "projectManager.device.delete.accountSyncedCopiesStayAvailable"
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteOldProjects(false)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg px-2.5 py-1.5 text-xs transition-colors"
                  >
                    {tCommon("actions.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProjects(deletableOldProjectIds);
                      setConfirmDeleteOldProjects(false);
                    }}
                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    {tCommon("actions.remove")}
                  </button>
                </div>
              </motion.div>
            ) : null}
          </div>
        ) : null}
        {sorted.length > 0 ? (
          showProjectGroups ? (
            <>
              <div className="space-y-1.5">
                <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-[0.12em] uppercase">
                  {t("projectManager.device.groups.localCopiesLinkedToAccount")}
                </p>
                {accountLinkedLocalCopies.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
              <div className="space-y-1.5 pt-2">
                <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-[0.12em] uppercase">
                  {t("projectManager.device.groups.onlyOnThisDevice")}
                </p>
                {deviceOnlyProjects.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            </>
          ) : (
            sorted.map((p) => <ProjectCard key={p.id} p={p} />)
          )
        ) : (
          <EmptyState
            icon={<FolderOpen className="size-6" />}
            title={t("projectManager.device.empty.noProjects")}
            description={t("projectManager.device.empty.noProjectsDescription")}
          />
        )}
      </div>

      {isMobile ? (
        <Drawer
          open={Boolean(mobileActionProject)}
          onOpenChange={(next) => !next && closeMobileActions()}
        >
          <DrawerContent className="border-border/70 bg-background data-[vaul-drawer-direction=bottom]:max-h-[78dvh]">
            {mobileActionProject ? (
              <div className="pb-5">
                <MobileDrawerHeader
                  title={getDisplayTitle(
                    mobileActionProject.title,
                    t("projectManager.device.fallback.untitled")
                  )}
                  subtitle={t(
                    "projectManager.device.meta.onThisDeviceSubtitle",
                    {
                      itemLabel: itemLabel(mobileActionProject.shapeCount, t),
                    }
                  )}
                  className="bg-background"
                />
                <div className="space-y-2 px-4 pt-4">
                  {onSyncProject ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (mobileActionHasConflict) {
                          onResolveConflict?.(mobileActionProject.id);
                          onOpenChange(false);
                        } else {
                          onSyncProject(mobileActionProject.id);
                        }
                        closeMobileActions();
                      }}
                      className="border-border/60 hover:bg-muted flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        {mobileActionHasConflict ||
                        mobileActionHasSyncFailure ||
                        !mobileActionIsSynced ? (
                          <CloudUpload className="size-4" />
                        ) : (
                          <Cloud className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block text-sm font-medium">
                          {mobileActionSyncTitle}
                        </span>
                        <span className="text-muted-foreground block pt-0.5 text-[11px] leading-relaxed">
                          {mobileActionSyncDescription}
                        </span>
                      </span>
                    </button>
                  ) : null}
                  {onExportProject ? (
                    <button
                      type="button"
                      onClick={() => {
                        onExportProject(mobileActionProject.id);
                        closeMobileActions();
                      }}
                      className="border-border/60 hover:bg-muted flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Download className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block text-sm font-medium">
                          {t("projectManager.device.export.json")}
                        </span>
                        <span className="text-muted-foreground block pt-0.5 text-[11px] leading-relaxed">
                          {t("projectManager.device.export.jsonDescription")}
                        </span>
                      </span>
                    </button>
                  ) : null}
                  {onRenameProject ? (
                    <button
                      type="button"
                      onClick={() => {
                        startRename(mobileActionProject);
                        closeMobileActions();
                      }}
                      className="border-border/60 hover:bg-muted flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Pencil className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block text-sm font-medium">
                          {tCommon("actions.rename")}
                        </span>
                        <span className="text-muted-foreground block pt-0.5 text-[11px] leading-relaxed">
                          {t("projectManager.device.actions.renameDescription")}
                        </span>
                      </span>
                    </button>
                  ) : null}
                </div>
                {onDeleteProject &&
                mobileActionProject.id !== activeDesignId ? (
                  <div className="border-border/50 mx-4 mt-4 border-t pt-4">
                    {mobileDeleteConfirm ? (
                      <div className="border-destructive/20 bg-destructive/6 rounded-2xl border px-3 py-3">
                        <p className="text-destructive text-sm font-medium">
                          {t("projectManager.device.delete.permanently")}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                          {t(
                            "projectManager.device.delete.permanentlyDescription"
                          )}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteProject(mobileActionProject.id);
                              closeMobileActions();
                            }}
                            className="bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                          >
                            {tCommon("actions.delete")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileDeleteConfirm(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-3 py-2 text-xs transition-colors"
                          >
                            {tCommon("actions.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMobileDeleteConfirm(true)}
                        className="text-destructive hover:bg-destructive/10 flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
                      >
                        <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-xl">
                          <Trash2 className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {tCommon("actions.delete")}
                          </span>
                          <span className="text-destructive/75 block pt-0.5 text-[11px] leading-relaxed">
                            {t(
                              "projectManager.device.delete.localProjectActionDescription"
                            )}
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </DrawerContent>
        </Drawer>
      ) : null}
    </>
  );
}
