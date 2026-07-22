"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import type { RestorePointMeta } from "@/lib/projects";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";
import {
  CurrentBadge,
  EmptyState,
  formatRelativeTime,
  getDisplayTitle,
  itemLabel,
} from "./shared";

interface ProjectManagerRestoreTabProps {
  restorePoints: RestorePointMeta[];
  activeRestorePointId?: string;
  onRestorePoint?: (id: string) => void;
  onDeleteRestorePoint?: (id: string) => void;
  onOpenChange: (open: boolean) => void;
}

export function ProjectManagerRestoreTab({
  restorePoints,
  activeRestorePointId,
  onRestorePoint,
  onDeleteRestorePoint,
  onOpenChange,
}: ProjectManagerRestoreTabProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (restorePoints.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-6" />}
        title={t("projectManager.restore.empty.noSnapshots")}
        description={
          isMobile ? (
            t("projectManager.restore.empty.description")
          ) : (
            <>
              {t.rich("projectManager.restore.empty.desktopDescription", {
                kbdMeta: (chunks) => <Kbd>{chunks}</Kbd>,
                kbdCtrl: (chunks) => <Kbd>{chunks}</Kbd>,
              })}
            </>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {restorePoints.map((r) => {
        const isActive = r.id === activeRestorePointId;
        const snapshotTitle = getDisplayTitle(
          r.designTitle,
          t("projectManager.restore.fallback.untitled")
        );
        return (
          <div
            key={r.id}
            className={cn(
              "relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all duration-150",
              isActive
                ? "border-border/70 bg-muted/45"
                : "border-border/60 bg-background/70"
            )}
          >
            <div className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Clock className="text-muted-foreground/60 size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-foreground truncate text-sm font-medium">
                  {snapshotTitle}
                </p>
                {isActive && (
                  <CurrentBadge
                    label={t("projectManager.restore.status.active")}
                  />
                )}
              </div>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {itemLabel(r.shapeCount, t)} ·{" "}
                {formatRelativeTime(r.savedAt, t)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {onRestorePoint && (
                <button
                  type="button"
                  aria-label={t("projectManager.restore.aria.restoreSnapshot", {
                    title: snapshotTitle,
                  })}
                  onClick={() => setConfirmRestoreId(r.id)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                  title={t("projectManager.restore.actions.restoreTitle")}
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              {onDeleteRestorePoint && (
                <button
                  type="button"
                  aria-label={t("projectManager.restore.aria.deleteSnapshot", {
                    title: snapshotTitle,
                  })}
                  onClick={() => onDeleteRestorePoint(r.id)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors"
                  title={t("projectManager.restore.actions.deleteTitle")}
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
                    {t("projectManager.restore.confirm.restoreSnapshot")}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        onRestorePoint!(r.id);
                        setConfirmRestoreId(null);
                        onOpenChange(false);
                      }}
                      className="bg-foreground text-background hover:bg-foreground/90 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      {t("projectManager.restore.actions.restore")}
                    </button>
                    <button
                      onClick={() => setConfirmRestoreId(null)}
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
      })}
    </div>
  );
}
