"use client";

import { useState } from "react";
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
  onRenameProject,
  onExportProject,
  onResolveConflict,
  onOpenChange,
}: ProjectManagerDeviceTabProps) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mobileActionsId, setMobileActionsId] = useState<string | null>(null);
  const [mobileDeleteConfirm, setMobileDeleteConfirm] = useState(false);

  const sorted = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  function startRename(p: ProjectMeta) {
    setRenamingId(p.id);
    setRenameValue(p.title || "");
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
    ? "Resolve sync conflict"
    : mobileActionHasSyncFailure
      ? "Retry sync"
      : mobileActionIsSynced || mobileActionHasPendingChanges
        ? "Update account copy"
        : "Sync to account";
  const mobileActionSyncDescription = mobileActionHasConflict
    ? "This project changed on another device. Review the version before continuing."
    : mobileActionHasSyncFailure
      ? "The last sync failed. Try sending the latest local version again."
      : mobileActionHasPendingChanges
        ? "Push the latest local changes to your account."
        : mobileActionIsSynced
          ? "Replace the synced account copy with this device version."
          : "Make this project available on your signed-in devices.";

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
    const syncLabel = isSyncing
      ? "Syncing"
      : hasConflict
        ? "Review needed"
        : hasPendingChanges
          ? "Pending"
          : hasSyncFailure
            ? "Sync failed"
            : isSynced
              ? "Synced"
              : "Local only";
    const syncDetail = hasConflict
      ? (syncMeta?.error ?? "This project changed on another device")
      : hasSyncFailure
        ? (syncMeta?.error ?? "Could not sync this project")
        : hasPendingChanges
          ? "Local changes are waiting to sync"
          : null;
    const metaLine = hasConflict
      ? syncDetail
      : hasSyncFailure
        ? syncDetail
        : hasPendingChanges
          ? `${itemLabel(p.shapeCount)} · waiting to sync`
          : isSynced && syncMeta?.lastSyncedAt
            ? `${itemLabel(p.shapeCount)} · synced ${formatRelativeTime(syncMeta.lastSyncedAt)}`
            : `${itemLabel(p.shapeCount)} · ${formatRelativeTime(p.updatedAt)}`;

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
            ? "border-primary/20 bg-primary/5"
            : "border-border/60 bg-background/70 hover:bg-muted/40 cursor-pointer"
        )}
      >
        <ProjectAvatar id={p.id} title={p.title || "?"} />
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
                {p.title || "Untitled"}
              </p>
              {!isRenaming && !isConfirming ? (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {isCurrent ? <CurrentBadge /> : null}
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
                      isSyncing
                        ? "bg-primary/10 text-primary/80"
                        : hasConflict
                          ? "bg-destructive/10 text-destructive/80"
                          : hasPendingChanges
                            ? "bg-muted text-foreground/75"
                            : hasSyncFailure
                              ? "bg-destructive/10 text-destructive/80"
                              : isSynced
                                ? "bg-primary/10 text-primary/80"
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
              title="Confirm rename"
            >
              <Check className="size-3.5" />
            </button>
          ) : (
            <>
              {onSyncProject && !isConfirming && !isMobile ? (
                <DesktopActionTooltip
                  label={
                    hasConflict
                      ? "Resolve version conflict"
                      : hasSyncFailure
                        ? "Retry sync"
                        : isSynced || hasPendingChanges
                          ? "Update account copy"
                          : "Sync to account"
                  }
                >
                  <button
                    type="button"
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
                        "opacity-0 transition-opacity group-hover:opacity-100"
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
                <DesktopActionTooltip label="Export JSON">
                  <button
                    type="button"
                    onClick={() => onExportProject(p.id)}
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                      !isMobile &&
                        "opacity-0 transition-opacity group-hover:opacity-100"
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
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                    title="More actions"
                    aria-label={`Manage ${p.title || "project"}`}
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                ) : isCurrent ? (
                  <CurrentBadge label="open" />
                ) : null
              ) : (
                <>
                  {onRenameProject && (
                    <DesktopActionTooltip label="Rename">
                      <button
                        onClick={() => startRename(p)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-[opacity,colors] group-hover:opacity-100"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </DesktopActionTooltip>
                  )}
                  {onDeleteProject && !isCurrent && (
                    <DesktopActionTooltip label="Delete">
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-[opacity,colors] group-hover:opacity-100"
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
              <p className="text-destructive truncate text-sm font-medium">
                Delete permanently?
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => {
                    onDeleteProject!(p.id);
                    setConfirmDeleteId(null);
                  }}
                  className="bg-destructive/10 hover:bg-destructive/20 text-destructive cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors"
                >
                  Cancel
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
        {onOpenNewProject ? (
          <button
            type="button"
            onClick={handleOpenNewProject}
            className="border-border/60 text-foreground hover:bg-muted mb-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border text-[13px] font-medium transition-colors"
          >
            <FilePlus className="size-3.5" />
            <span>New project</span>
          </button>
        ) : null}
        {sorted.length > 0 ? (
          sorted.map((p) => <ProjectCard key={p.id} p={p} />)
        ) : (
          <EmptyState
            icon={<FolderOpen className="size-6" />}
            title="No saved projects"
            description="Projects you save will appear here."
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
                  title={mobileActionProject.title || "Untitled"}
                  subtitle={`${itemLabel(mobileActionProject.shapeCount)} on this device`}
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
                      className="border-border/60 hover:bg-muted flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
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
                      className="border-border/60 hover:bg-muted flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Download className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block text-sm font-medium">
                          Export JSON
                        </span>
                        <span className="text-muted-foreground block pt-0.5 text-[11px] leading-relaxed">
                          Download this project as a reusable TrackDraw file.
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
                      className="border-border/60 hover:bg-muted flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors"
                    >
                      <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Pencil className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-foreground block text-sm font-medium">
                          Rename
                        </span>
                        <span className="text-muted-foreground block pt-0.5 text-[11px] leading-relaxed">
                          Give this project a clearer name.
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
                          Delete permanently?
                        </p>
                        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                          This only removes the local project from this browser.
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
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileDeleteConfirm(false)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-3 py-2 text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMobileDeleteConfirm(true)}
                        className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
                      >
                        <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-xl">
                          <Trash2 className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            Delete
                          </span>
                          <span className="text-destructive/75 block pt-0.5 text-[11px] leading-relaxed">
                            Remove this local project from the device.
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
