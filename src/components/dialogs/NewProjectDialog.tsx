"use client";

import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { starterLayouts } from "@/lib/planning/starter-layouts";
import { Box, ChevronRight, Download, FilePlus, X } from "lucide-react";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
  onStartStarterLayout?: (layoutId: string) => void;
  onBackupProject?: () => void;
  hasContent: boolean;
}

export default function NewProjectDialog({
  open,
  onOpenChange,
  onNewProject,
  onStartStarterLayout,
  onBackupProject,
  hasContent,
}: NewProjectDialogProps) {
  const isMobile = useIsMobile();

  const actionRowClass =
    "border-border/60 hover:bg-muted/35 flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors";

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

      <button type="button" onClick={onNewProject} className={actionRowClass}>
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FilePlus className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">Start fresh</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            An empty field where you place your first gate and build from there.
          </p>
        </div>
        <ChevronRight className="text-muted-foreground/40 mt-0.5 size-4 shrink-0" />
      </button>

      {hasContent && onBackupProject ? (
        <button
          type="button"
          onClick={onBackupProject}
          className={actionRowClass}
        >
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

  const starterBlock = onStartStarterLayout ? (
    <div className="space-y-2.5">
      {starterLayouts.map((layout) => (
        <button
          key={layout.id}
          type="button"
          onClick={() => onStartStarterLayout(layout.id)}
          className={actionRowClass}
        >
          <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Box className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">{layout.name}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {layout.description}
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/40 mt-0.5 size-4 shrink-0" />
        </button>
      ))}
    </div>
  ) : null;

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="New project"
        subtitle="Start from a blank field or use a starter layout."
        bodyClassName="space-y-5 pt-4 pb-4"
      >
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
            Blank canvas
          </p>
          {newProjectBlock}
        </div>
        {starterBlock ? (
          <div className="space-y-2.5">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
              Starter layouts
            </p>
            {starterBlock}
          </div>
        ) : null}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      headerless
      maxWidth="max-w-3xl"
      panelClassName="flex flex-col overflow-hidden rounded-4xl p-0"
    >
      <div className="shrink-0 px-8 pt-8 pb-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
              Studio
            </p>
            <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
              New project
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Start from a blank field or open one of TrackDraw&apos;s starter
              layouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground/75 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-border/30 grid min-h-0 grid-cols-2 overflow-hidden border-t">
        <div className="border-border/30 overflow-y-auto border-r px-6 py-6">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            Blank canvas
          </p>
          {newProjectBlock}
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            Starter layouts
          </p>
          {starterBlock}
        </div>
      </div>

      <div className="shrink-0 pb-2" />
    </DesktopModal>
  );
}
