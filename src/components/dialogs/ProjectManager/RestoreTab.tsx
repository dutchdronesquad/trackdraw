"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import type { RestorePointMeta } from "@/lib/projects";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CurrentBadge,
  EmptyState,
  formatRelativeTime,
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
  const isMobile = useIsMobile();
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  if (restorePoints.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-6" />}
        title="No snapshots yet"
        description={
          isMobile ? (
            "Snapshots are created automatically when you open or replace a project."
          ) : (
            <>
              Press <Kbd>⌘S</Kbd> / <Kbd>Ctrl S</Kbd> or use the save button in
              the header.
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
      })}
    </div>
  );
}
