"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  CloudAlert,
  CloudUpload,
  Clock,
  FolderOpen,
  Pencil,
  RotateCcw,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Kbd } from "@/components/ui/kbd";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";
import { SidebarDialog } from "@/components/SidebarDialog";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCurrentContent: boolean;
  onOpenProject?: (id: string) => void;
  onOpenAccountProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onRenameProject?: (id: string, title: string) => void;
  onSyncCurrentProject?: () => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  projects?: ProjectMeta[];
  accountProjects?: Array<{
    id: string;
    title: string;
    updatedAt: string;
    shapeCount: number;
  }>;
  accountProjectsLoading?: boolean;
  accountProjectsError?: string | null;
  currentProjectInAccount?: boolean;
  syncingCurrentProject?: boolean;
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
    <span className="bg-primary/10 text-primary/80 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProjectManagerDialog({
  open,
  onOpenChange,
  hasCurrentContent,
  onOpenProject,
  onOpenAccountProject,
  onDeleteProject,
  onRenameProject,
  onSyncCurrentProject,
  onRestorePoint,
  onDeleteRestorePoint,
  projects = [],
  accountProjects = [],
  accountProjectsLoading = false,
  accountProjectsError = null,
  currentProjectInAccount = false,
  syncingCurrentProject = false,
  restorePoints = [],
  activeDesignId,
  activeRestorePointId,
}: ProjectManagerDialogProps) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<View>("device");

  const sortedProjects = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
  const sortedAccountProjects = [...accountProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const hasAccountSection = !!onSyncCurrentProject;

  function startRename(p: ProjectMeta) {
    setRenamingId(p.id);
    setRenameValue(p.title || "");
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameProject) onRenameProject(id, trimmed);
    setRenamingId(null);
  }

  // ─── Local project card ──────────────────────────────────────────────────

  function LocalProjectCard({ p }: { p: ProjectMeta }) {
    const isCurrent = p.id === activeDesignId;
    const isRenaming = renamingId === p.id;
    const isConfirming = confirmDeleteId === p.id;

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
          "group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-150",
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
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="text-foreground truncate text-sm font-medium">
                {p.title || "Untitled"}
              </p>
              {isCurrent && <CurrentBadge />}
            </div>
          )}
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {itemLabel(p.shapeCount)} · {formatRelativeTime(p.updatedAt)}
          </p>
        </div>
        {/* Action buttons */}
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
              {onRenameProject && (
                <button
                  onClick={() => startRename(p)}
                  className={cn(
                    "text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                    !isMobile &&
                      "opacity-0 transition-opacity group-hover:opacity-100"
                  )}
                  title="Rename"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {onDeleteProject && !isCurrent && (
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className={cn(
                    "text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors",
                    !isMobile &&
                      "opacity-0 transition-opacity group-hover:opacity-100"
                  )}
                  title="Delete"
                >
                  <Trash2 className="size-3.5" />
                </button>
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
      {/* Sync action */}
      {hasCurrentContent && onSyncCurrentProject && (
        <button
          type="button"
          onClick={onSyncCurrentProject}
          disabled={syncingCurrentProject}
          className={cn(
            "border-border/60 hover:bg-muted/40 bg-background/80 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
            syncingCurrentProject && "cursor-default opacity-60"
          )}
        >
          <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
            {accountProjectsError ? (
              <CloudAlert className="text-primary size-4" />
            ) : (
              <CloudUpload className="text-primary size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">
              {currentProjectInAccount
                ? "Update account copy"
                : "Sync current project"}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {currentProjectInAccount
                ? "Push the latest version to your account."
                : "Make this project available on all your devices."}
            </p>
          </div>
        </button>
      )}
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
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150",
                  isCurrent
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/60 bg-background/70 hover:bg-muted/40 cursor-pointer"
                )}
              >
                <ProjectAvatar id={proj.id} title={proj.title || "?"} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="text-foreground truncate text-sm font-medium">
                      {proj.title || "Untitled"}
                    </p>
                    {isCurrent && <CurrentBadge />}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {itemLabel(proj.shapeCount)} ·{" "}
                    {formatRelativeTime(proj.updatedAt)}
                  </p>
                </div>
                <Cloud className="text-muted-foreground/40 size-3.5 shrink-0" />
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
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150",
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
                    onClick={() => {
                      onRestorePoint(r.id);
                      onOpenChange(false);
                    }}
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
        "Projects saved in this browser. Open, rename, or delete them here.",
      content: deviceContent,
    },
    account: {
      label: "Account projects",
      description:
        "Projects synced to your account, available on all your signed-in devices.",
      content: accountContent,
    },
    restore: {
      label: "Snapshots",
      description:
        "Earlier saved states of the current project. Restore any point to roll back changes.",
      content: restoreContent,
    },
  };

  const current = viewMeta[view];

  return (
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
      activeItem={view}
      onItemChange={(id) => setView(id as View)}
      contentTitle={current.label}
      contentDescription={current.description}
    >
      {current.content}
    </SidebarDialog>
  );
}
