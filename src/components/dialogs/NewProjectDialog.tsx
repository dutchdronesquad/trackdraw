"use client";

import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { starterLayouts } from "@/lib/planning/starter-layouts";
import { Box, ChevronRight, Download, FilePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dialogs");
  const isMobile = useIsMobile();

  const actionRowClass =
    "border-border/60 hover:bg-muted/35 flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors";

  const newProjectBlock = (
    <div className="space-y-2.5">
      {hasContent ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            {t("newProject.saveWarningTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {t("newProject.saveWarningBody")}
          </p>
        </div>
      ) : null}

      <button type="button" onClick={onNewProject} className={actionRowClass}>
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FilePlus className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">
            {t("newProject.startFreshTitle")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {t("newProject.startFreshBody")}
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
            <p className="text-foreground text-sm font-medium">
              {t("newProject.exportFirstTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t("newProject.exportFirstBody")}
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
        title={t("newProject.title")}
        subtitle={t("newProject.subtitle")}
        bodyClassName="space-y-5 pt-4 pb-4"
      >
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
            {t("newProject.blankCanvasLabel")}
          </p>
          {newProjectBlock}
        </div>
        {starterBlock ? (
          <div className="space-y-2.5">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
              {t("newProject.starterLayoutsLabel")}
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
      title={t("newProject.title")}
      headerless
      maxWidth="max-w-3xl"
      panelClassName="flex flex-col overflow-hidden rounded-4xl p-0"
    >
      <div className="shrink-0 px-8 pt-8 pb-5">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
              {t("newProject.studioLabel")}
            </p>
            <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
              {t("newProject.title")}
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {t("newProject.desktopSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground/75 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
            aria-label={t("newProject.closeAriaLabel")}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-border/30 grid min-h-0 grid-cols-2 overflow-hidden border-t">
        <div className="border-border/30 overflow-y-auto border-r px-6 py-6">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            {t("newProject.blankCanvasLabel")}
          </p>
          {newProjectBlock}
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
            {t("newProject.starterLayoutsLabel")}
          </p>
          {starterBlock}
        </div>
      </div>

      <div className="shrink-0 pb-2" />
    </DesktopModal>
  );
}
