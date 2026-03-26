"use client";

import { useState } from "react";
import { MobileDrawer } from "@/components/MobileDrawer";
import {
  FilePlus,
  Download,
  Pencil,
  RotateCcw,
  Trash2,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Kbd } from "@/components/ui/kbd";
import type { ProjectMeta, RestorePointMeta } from "@/lib/projects";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
  onBackupProject?: () => void;
  onOpenProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onRenameProject?: (id: string, title: string) => void;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  hasContent: boolean;
  projects?: ProjectMeta[];
  restorePoints?: RestorePointMeta[];
  activeDesignId?: string;
  activeRestorePointId?: string;
}

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

type Tab = "projects" | "restore";

export default function ProjectManagerDialog({
  open,
  onOpenChange,
  onNewProject,
  onBackupProject,
  onOpenProject,
  onDeleteProject,
  onRenameProject,
  onRestorePoint,
  onDeleteRestorePoint,
  hasContent,
  projects = [],
  restorePoints = [],
  activeDesignId,
  activeRestorePointId,
}: ProjectManagerDialogProps) {
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("projects");

  const sortedProjects = [...projects].sort((a, b) =>
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

  const actionRowClass =
    "border-border/60 hover:bg-muted/35 flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors";

  // Pinned new-project block
  const newProjectBlock = (
    <div className="space-y-2.5">
      {hasContent ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            Current track will be saved first
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            A snapshot is kept in Saved projects and Restore points before the
            canvas is cleared.
          </p>
        </div>
      ) : null}

      <button onClick={onNewProject} className={actionRowClass}>
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FilePlus className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">
            Start new project
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Clear the current track and continue with an empty field.
          </p>
        </div>
        <ChevronRight className="text-muted-foreground/40 mt-0.5 size-4 shrink-0" />
      </button>

      {hasContent && onBackupProject ? (
        <button onClick={onBackupProject} className={actionRowClass}>
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Download className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">Export first</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Save a JSON backup before replacing the current project.
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/40 mt-0.5 size-4 shrink-0" />
        </button>
      ) : null}
    </div>
  );

  // Tab bar
  const tabBar = (mobile = false) => (
    <div
      className={cn(
        "flex",
        mobile
          ? "border-border/30 gap-4 border-b"
          : "border-border/30 gap-4 border-b"
      )}
    >
      <button
        type="button"
        onClick={() => setTab("projects")}
        className={cn(
          "cursor-pointer pb-2.5 text-[11px] font-semibold tracking-widest uppercase transition-colors",
          tab === "projects"
            ? "text-foreground border-foreground/70 -mb-px border-b-2"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Projects
        {sortedProjects.length > 0 ? (
          <span className="ml-1.5 font-normal tracking-normal normal-case">
            ({sortedProjects.length})
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => setTab("restore")}
        className={cn(
          "cursor-pointer pb-2.5 text-[11px] font-semibold tracking-widest uppercase transition-colors",
          tab === "restore"
            ? "text-foreground border-foreground/70 -mb-px border-b-2"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Snapshots
        {restorePoints.length > 0 ? (
          <span className="ml-1.5 font-normal tracking-normal normal-case">
            ({restorePoints.length})
          </span>
        ) : null}
      </button>
    </div>
  );

  // Projects list
  const projectsList =
    sortedProjects.length > 0 ? (
      <div className="space-y-1.5">
        {sortedProjects.map((p) => {
          const isCurrent = p.id === activeDesignId;
          const isRenaming = renamingId === p.id;
          return (
            <div
              key={p.id}
              onClick={
                onOpenProject && !isCurrent
                  ? () => {
                      onOpenProject(p.id);
                      onOpenChange(false);
                    }
                  : undefined
              }
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                isCurrent
                  ? "border-primary/25 bg-primary/4"
                  : "border-border/60 hover:bg-muted/35 cursor-pointer transition-colors"
              )}
            >
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
                  <div className="flex items-center gap-1.5 truncate">
                    <p className="text-foreground truncate text-sm font-medium">
                      {p.title || "Untitled"}
                    </p>
                    {isCurrent ? (
                      <span className="text-primary/70 bg-primary/8 shrink-0 rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                        current
                      </span>
                    ) : null}
                  </div>
                )}
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {itemLabel(p.shapeCount)} · {formatRelativeTime(p.updatedAt)}
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {isRenaming ? (
                  <button
                    onClick={() => commitRename(p.id)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
                    title="Confirm rename"
                  >
                    <Check className="size-3.5" />
                  </button>
                ) : (
                  <>
                    {onRenameProject ? (
                      <button
                        onClick={() => startRename(p)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
                        title="Rename project"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    ) : null}
                    {onDeleteProject && !isCurrent ? (
                      confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onDeleteProject(p.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg p-1.5 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="text-muted-foreground/50 text-xs">No saved projects yet.</p>
    );

  // Restore points list
  const restoreList =
    restorePoints.length > 0 ? (
      <div className="space-y-1.5">
        {restorePoints.map((r) => {
          const isActive = r.id === activeRestorePointId;
          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                isActive ? "border-primary/25 bg-primary/4" : "border-border/60"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate">
                  <p className="text-foreground truncate text-sm font-medium">
                    {r.designTitle || "Untitled"}
                  </p>
                  {isActive ? (
                    <span className="text-primary/70 bg-primary/8 shrink-0 rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                      active
                    </span>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {itemLabel(r.shapeCount)} · {formatRelativeTime(r.savedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onRestorePoint ? (
                  <button
                    onClick={() => {
                      onRestorePoint(r.id);
                      onOpenChange(false);
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors"
                    title="Restore this snapshot"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                ) : null}
                {onDeleteRestorePoint ? (
                  <button
                    onClick={() => onDeleteRestorePoint(r.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg p-1.5 transition-colors"
                    title="Delete restore point"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="border-border/40 rounded-xl border border-dashed px-4 py-5 text-center">
        <p className="text-muted-foreground text-xs font-medium">
          No snapshots yet
        </p>
        <p className="text-muted-foreground/50 mt-1 text-[11px] leading-relaxed">
          {isMobile ? (
            "Snapshots are created automatically when you open or replace a project."
          ) : (
            <>
              Press <Kbd>⌘S</Kbd> / <Kbd>Ctrl S</Kbd> or use the save button in
              the header.
            </>
          )}
        </p>
      </div>
    );

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Projects"
        subtitle="Switch between saved projects or restore a snapshot."
        pinnedContent={
          <>
            <div className="border-border/30 shrink-0 border-b px-4 pt-3 pb-4">
              {newProjectBlock}
            </div>
            <div className="border-border/30 shrink-0 border-b px-4 pt-3">
              {tabBar(true)}
            </div>
          </>
        }
        bodyClassName="pt-4 pb-4"
      >
        {tab === "projects" ? projectsList : restoreList}
      </MobileDrawer>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/10 px-5 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="border-border/50 bg-card/97 pointer-events-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-4xl border shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-8 pt-8 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
                Studio
              </p>
              <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
                Projects
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                Switch between saved projects, restore a snapshot, or start a
                new track from scratch.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground/75 hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Two-column body */}
        <div className="border-border/30 grid min-h-0 grid-cols-2 border-t">
          {/* Left: new project */}
          <div className="border-border/30 border-r px-6 py-6">
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
              New project
            </p>
            {newProjectBlock}
          </div>

          {/* Right: tabs + lists */}
          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 px-8 pt-5">{tabBar()}</div>
            <div className="max-h-[50vh] min-h-0 overflow-y-auto px-8 py-4">
              {tab === "projects" ? projectsList : restoreList}
            </div>
          </div>
        </div>

        <div className="shrink-0 pb-2" />
      </div>
    </div>
  );
}
