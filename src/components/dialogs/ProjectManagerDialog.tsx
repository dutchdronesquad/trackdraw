"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudUpload,
  Clock,
  Download,
  FilePlus,
  FolderOpen,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";
import { MobileDrawerHeader } from "@/components/MobileDrawer";
import { SidebarDialog } from "@/components/SidebarDialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNewProject?: () => void;
  onOpenProject?: (id: string) => void;
  onOpenAccountProject?: (id: string) => void;
  onSyncProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onRenameProject?: (id: string, title: string) => void;
  onExportProject?: (id: string) => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  onResolveConflict?: (id: string) => void;
  projects?: ProjectMeta[];
  accountProjects?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    shapeCount: number;
  }>;
  accountProjectsLoading?: boolean;
  accountProjectsError?: string | null;
  projectSyncMetaById?: Record<
    string,
    {
      status:
        | "local-only"
        | "pending"
        | "syncing"
        | "synced"
        | "failed"
        | "conflict";
      lastSyncedAt?: string | null;
      error?: string | null;
    }
  >;
  syncingProjectId?: string | null;
  restorePoints?: RestorePointMeta[];
  activeDesignId?: string;
  activeRestorePointId?: string;
}

// Shared view state for both mobile and desktop
type View = "device" | "account" | "restore";

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function itemLabel(count: number): string {
  return count === 1 ? "1 item" : `${count} items`;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-400",
  "bg-violet-500/15 text-violet-400",
  "bg-emerald-500/15 text-emerald-400",
  "bg-amber-500/15 text-amber-400",
  "bg-rose-500/15 text-rose-400",
  "bg-cyan-500/15 text-cyan-400",
];

function avatarColor(id: string): string {
  const hash = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function ProjectAvatar({ id, title }: { id: string; title: string }) {
  const letter = (title || "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
        avatarColor(id)
      )}
    >
      {letter}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border-border/40 bg-background/60 flex animate-pulse items-center gap-3 rounded-xl border px-3 py-2.5">
      <div className="bg-muted/70 size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="bg-muted/70 h-3.5 w-28 rounded-md" />
        <div className="bg-muted/50 h-2.5 w-16 rounded-md" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="border-border/40 flex flex-col items-center gap-2.5 rounded-xl border border-dashed px-4 py-8 text-center">
      <div className="text-muted-foreground/35">{icon}</div>
      <div>
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground/60 mt-0.5 text-[11px] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Shared "current" badge ───────────────────────────────────────────────────

function CurrentBadge({ label = "current" }: { label?: string }) {
  return (
    <span className="bg-primary/10 text-primary/80 inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
      {label}
    </span>
  );
}

function DesktopActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectManagerDialog({
  open,
  onOpenChange,
  onOpenNewProject,
  onOpenProject,
  onOpenAccountProject,
  onSyncProject,
  onDeleteProject,
  onRenameProject,
  onExportProject,
  onRestorePoint,
  onDeleteRestorePoint,
  onResolveConflict,
  projects = [],
  accountProjects = [],
  accountProjectsLoading = false,
  accountProjectsError = null,
  projectSyncMetaById = {},
  syncingProjectId = null,
  restorePoints = [],
  activeDesignId,
  activeRestorePointId,
}: ProjectManagerDialogProps) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [mobileActionsId, setMobileActionsId] = useState<string | null>(null);
  const [mobileDeleteConfirm, setMobileDeleteConfirm] = useState(false);
  const [view, setView] = useState<View>("device");

  const sortedProjects = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const sortedAccountProjects = [...accountProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const hasAccountSection = Boolean(onSyncProject);

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

  // ─── Local project card ──────────────────────────────────────────────────

  function LocalProjectCard({ p }: { p: ProjectMeta }) {
    const isCurrent = p.id === activeDesignId;
    const isRenaming = renamingId === p.id;
    const isConfirming = confirmDeleteId === p.id;
    const syncMeta = projectSyncMetaById[p.id];
    const isSynced =
      syncMeta?.status === "synced" ||
      sortedAccountProjects.some((project) => project.id === p.id);
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
        {/* Delete confirmation overlay */}
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

  // ─── View content ─────────────────────────────────────────────────────────

  const deviceContent = (
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
      {sortedProjects.length > 0 ? (
        sortedProjects.map((p) => <LocalProjectCard key={p.id} p={p} />)
      ) : (
        <EmptyState
          icon={<FolderOpen className="size-6" />}
          title="No saved projects"
          description="Projects you save will appear here."
        />
      )}
    </div>
  );

  const accountContent = (
    <div className="space-y-4">
      {/* Account projects list */}
      {accountProjectsLoading ? (
        <div className="space-y-1.5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : accountProjectsError ? (
        <div className="border-destructive/20 bg-destructive/8 rounded-xl border px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            Could not load account projects
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {accountProjectsError}
          </p>
        </div>
      ) : sortedAccountProjects.length > 0 ? (
        <div className="space-y-1.5">
          {sortedAccountProjects.map((proj) => {
            const isCurrent = proj.id === activeDesignId;
            const syncMeta = projectSyncMetaById[proj.id];
            const isSyncing =
              syncingProjectId === proj.id || syncMeta?.status === "syncing";
            const hasConflict = syncMeta?.status === "conflict";
            const hasSyncFailure = syncMeta?.status === "failed";
            const hasPendingChanges = syncMeta?.status === "pending";
            const lastSyncedAt = syncMeta?.lastSyncedAt ?? proj.updatedAt;
            const metaLine = hasConflict
              ? (syncMeta?.error ??
                "This project changed on another device while you were signed out")
              : hasSyncFailure
                ? (syncMeta?.error ?? "Could not sync the latest changes")
                : hasPendingChanges
                  ? `${itemLabel(proj.shapeCount)} · waiting to sync`
                  : `${itemLabel(proj.shapeCount)} · synced ${formatRelativeTime(lastSyncedAt)}`;
            return (
              <div
                key={proj.id}
                onClick={
                  onOpenAccountProject && !isCurrent
                    ? () => {
                        onOpenAccountProject(proj.id);
                        onOpenChange(false);
                      }
                    : undefined
                }
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150",
                  isCurrent
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/60 bg-background/70 hover:bg-muted/40 cursor-pointer"
                )}
              >
                <ProjectAvatar id={proj.id} title={proj.title || "?"} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {proj.title || "Untitled"}
                  </p>
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
                                : "bg-primary/10 text-primary/80"
                      )}
                    >
                      {isSyncing
                        ? "Syncing"
                        : hasConflict
                          ? "Review needed"
                          : hasPendingChanges
                            ? "Pending"
                            : hasSyncFailure
                              ? "Sync failed"
                              : "Synced"}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      hasSyncFailure
                        ? "text-destructive/80"
                        : "text-muted-foreground"
                    )}
                  >
                    {metaLine}
                  </p>
                </div>
                <div
                  className="flex shrink-0 items-center gap-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  {onSyncProject &&
                  isCurrent &&
                  (hasConflict || hasSyncFailure || hasPendingChanges) ? (
                    <button
                      onClick={() => {
                        if (!hasConflict) {
                          onSyncProject(proj.id);
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                      title={
                        hasConflict
                          ? "Resolve the version conflict first"
                          : hasSyncFailure
                            ? "Retry sync"
                            : "Sync pending changes"
                      }
                    >
                      {hasConflict || hasSyncFailure ? (
                        <CloudUpload className="size-3.5" />
                      ) : (
                        <Cloud className="size-3.5" />
                      )}
                    </button>
                  ) : (
                    <Cloud className="text-muted-foreground/40 size-3.5 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Cloud className="size-6" />}
          title="No account projects"
          description="Sync a project to make it available across devices."
        />
      )}
    </div>
  );

  const restoreContent = (
    <div className="space-y-2">
      {restorePoints.length > 0 ? (
        restorePoints.map((r) => {
          const isActive = r.id === activeRestorePointId;
          return (
            <div
              key={r.id}
              className={cn(
                "relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-150",
                isActive
                  ? "border-primary/20 bg-primary/5"
                  : "border-border/60 bg-background/70"
              )}
            >
              <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Clock className="text-muted-foreground/60 size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="text-foreground truncate text-sm font-medium">
                    {r.designTitle || "Untitled"}
                  </p>
                  {isActive && <CurrentBadge label="active" />}
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {itemLabel(r.shapeCount)} · {formatRelativeTime(r.savedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {onRestorePoint && (
                  <button
                    onClick={() => setConfirmRestoreId(r.id)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                    title="Restore this snapshot"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                )}
                {onDeleteRestorePoint && (
                  <button
                    onClick={() => onDeleteRestorePoint(r.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <AnimatePresence>
                {confirmRestoreId === r.id && (
                  <motion.div
                    className="bg-background/97 absolute inset-0 flex items-center justify-between gap-2 rounded-xl px-3 backdrop-blur-sm"
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-foreground truncate text-sm font-medium">
                      Restore this snapshot?
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => {
                          onRestorePoint!(r.id);
                          setConfirmRestoreId(null);
                          onOpenChange(false);
                        }}
                        className="bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
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
        })
      ) : (
        <EmptyState
          icon={<Clock className="size-6" />}
          title="No snapshots yet"
          description={
            isMobile ? (
              "Snapshots are created automatically when you open or replace a project."
            ) : (
              <>
                Press <Kbd>⌘S</Kbd> / <Kbd>Ctrl S</Kbd> or use the save button
                in the header.
              </>
            )
          }
        />
      )}
    </div>
  );

  // ─── Shared nav items (used by both mobile and desktop) ──────────────────

  type NavItem = {
    id: View;
    label: string;
    icon: React.ReactNode;
    count: number;
  };
  const navItems: NavItem[] = [
    {
      id: "device",
      label: "This device",
      icon: <FolderOpen className="size-4" />,
      count: sortedProjects.length,
    },
    ...(hasAccountSection
      ? ([
          {
            id: "account",
            label: "Account",
            icon: <Cloud className="size-4" />,
            count: sortedAccountProjects.length,
          },
        ] as NavItem[])
      : []),
    {
      id: "restore",
      label: "Snapshots",
      icon: <Clock className="size-4" />,
      count: restorePoints.length,
    },
  ];

  // ─── View metadata ────────────────────────────────────────────────────────

  const viewMeta: Record<
    View,
    { label: string; description: string; content: React.ReactNode }
  > = {
    device: {
      label: "On this device",
      description:
        "Projects saved in this browser. Open them here and bring them into account sync when needed.",
      content: deviceContent,
    },
    account: {
      label: "Account projects",
      description:
        "Projects already synced to your account and available on your signed-in devices.",
      content: accountContent,
    },
    restore: {
      label: "Snapshots",
      description:
        "Earlier saved states of the current project. Restore any point to roll back changes.",
      content: restoreContent,
    },
  };

  const activeView = view === "account" && !hasAccountSection ? "device" : view;
  const current = viewMeta[activeView];
  const mobileActionProject =
    mobileActionsId == null
      ? null
      : (sortedProjects.find((project) => project.id === mobileActionsId) ??
        null);
  const mobileActionSyncMeta = mobileActionProject
    ? projectSyncMetaById[mobileActionProject.id]
    : null;
  const mobileActionHasConflict = mobileActionSyncMeta?.status === "conflict";
  const mobileActionHasSyncFailure = mobileActionSyncMeta?.status === "failed";
  const mobileActionHasPendingChanges =
    mobileActionSyncMeta?.status === "pending";
  const mobileActionIsSynced = mobileActionProject
    ? mobileActionSyncMeta?.status === "synced" ||
      sortedAccountProjects.some(
        (project) => project.id === mobileActionProject.id
      )
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

  return (
    <>
      <SidebarDialog
        open={open}
        onOpenChange={onOpenChange}
        eyebrow="Studio"
        title="Projects"
        mobileSubtitle="Open, rename, sync or restore."
        navItems={navItems.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          badge: item.count,
        }))}
        activeItem={activeView}
        onItemChange={(id) => setView(id as View)}
        contentTitle={current.label}
        contentDescription={current.description}
      >
        {current.content}
      </SidebarDialog>

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
