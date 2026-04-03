"use client";

import { Cloud, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";
import {
  CurrentBadge,
  EmptyState,
  formatRelativeTime,
  itemLabel,
  ProjectAvatar,
  SkeletonCard,
} from "./shared";

type AccountProjectItem = {
  id: string;
  title: string;
  updatedAt: string;
  shapeCount: number;
};

interface ProjectManagerAccountTabProps {
  accountProjects: AccountProjectItem[];
  loading: boolean;
  error: string | null;
  activeDesignId?: string;
  syncingProjectId?: string | null;
  projectSyncMetaById: Record<string, ProjectSyncMeta>;
  onOpenAccountProject?: (id: string) => void;
  onSyncProject?: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function ProjectManagerAccountTab({
  accountProjects,
  loading,
  error,
  activeDesignId,
  syncingProjectId,
  projectSyncMetaById,
  onOpenAccountProject,
  onSyncProject,
  onOpenChange,
}: ProjectManagerAccountTabProps) {
  const sorted = [...accountProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  if (loading) {
    return (
      <div className="space-y-1.5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/20 bg-destructive/8 rounded-xl border px-4 py-3">
        <p className="text-foreground text-sm font-medium">
          Could not load account projects
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Cloud className="size-6" />}
        title="No account projects"
        description="Sync a project to make it available across devices."
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((proj) => {
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
              onClick={(e) => e.stopPropagation()}
            >
              {onSyncProject &&
              isCurrent &&
              (hasConflict || hasSyncFailure || hasPendingChanges) ? (
                <button
                  onClick={() => {
                    if (!hasConflict) onSyncProject(proj.id);
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
  );
}
