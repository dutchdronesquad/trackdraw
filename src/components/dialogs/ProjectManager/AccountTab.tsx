"use client";

import { useTranslations } from "next-intl";
import { Cloud, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";
import {
  CurrentBadge,
  EmptyState,
  formatRelativeTime,
  getDisplayTitle,
  itemLabel,
  ProjectAvatar,
  ProjectIdCopyRow,
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
  onResolveConflict?: (id: string) => void;
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
  onResolveConflict,
  onOpenChange,
}: ProjectManagerAccountTabProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const sorted = [...accountProjects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  if (loading) {
    return (
      <div
        className="space-y-1.5"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <p className="text-muted-foreground px-1 pb-1 text-[11px]">
          {t("projectManager.account.status.loadingProjects")}
        </p>
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
          {t("projectManager.account.messages.loadFailed")}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t("projectManager.account.messages.loadFailedDescription")}
        </p>
        <p className="text-muted-foreground/70 mt-2 text-[11px] leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Cloud className="size-6" />}
        title={t("projectManager.account.empty.noProjects")}
        description={t("projectManager.account.empty.description")}
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
        const projectTitle = getDisplayTitle(
          proj.title,
          t("projectManager.account.fallback.untitled")
        );
        const fallbackLine = syncMeta?.fallbackSavedAt
          ? t("projectManager.account.messages.localCopySavedAfterFailure", {
              relativeTime: formatRelativeTime(syncMeta.fallbackSavedAt, t),
            })
          : null;
        const metaLine = hasConflict
          ? (syncMeta?.error ??
            t("projectManager.account.messages.conflictWarning"))
          : hasSyncFailure
            ? (fallbackLine ??
              syncMeta?.error ??
              t("projectManager.account.messages.syncError"))
            : hasPendingChanges
              ? t("projectManager.account.meta.accountCopyWaitingToSync", {
                  itemLabel: itemLabel(proj.shapeCount, t),
                })
              : t("projectManager.account.meta.accountCopySynced", {
                  itemLabel: itemLabel(proj.shapeCount, t),
                  relativeTime: formatRelativeTime(lastSyncedAt, t),
                });

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
                ? "border-border/70 bg-muted/45"
                : "border-border/60 bg-background/70 hover:bg-muted/40 cursor-pointer"
            )}
          >
            <ProjectAvatar id={proj.id} title={projectTitle} />
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm font-medium">
                {projectTitle}
              </p>
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
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {isSyncing
                    ? t("projectManager.account.status.syncing")
                    : hasConflict
                      ? t("projectManager.account.status.reviewNeeded")
                      : hasPendingChanges
                        ? tCommon("status.pending")
                        : hasSyncFailure
                          ? t("projectManager.account.status.failed")
                          : t("projectManager.account.status.synced")}
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
              {isCurrent ? <ProjectIdCopyRow projectId={proj.id} /> : null}
            </div>
            <div
              className="flex shrink-0 items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {onSyncProject &&
              isCurrent &&
              (hasConflict || hasSyncFailure || hasPendingChanges) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (hasConflict) {
                      onResolveConflict?.(proj.id);
                      onOpenChange(false);
                    } else {
                      onSyncProject(proj.id);
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                  aria-label={
                    hasConflict
                      ? t(
                          "projectManager.account.aria.resolveVersionConflictFor",
                          {
                            title: projectTitle,
                          }
                        )
                      : hasSyncFailure
                        ? t("projectManager.account.aria.retrySyncFor", {
                            title: projectTitle,
                          })
                        : t(
                            "projectManager.account.aria.syncPendingChangesFor",
                            {
                              title: projectTitle,
                            }
                          )
                  }
                  title={
                    hasConflict
                      ? t(
                          "projectManager.account.messages.resolveConflictFirst"
                        )
                      : hasSyncFailure
                        ? t("projectManager.account.actions.retrySync")
                        : t("projectManager.account.actions.syncPendingChanges")
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
