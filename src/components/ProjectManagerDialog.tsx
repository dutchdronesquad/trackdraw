"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FilePlus, Download, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProjectManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewProject: () => void;
  onBackupProject?: () => void;
  hasContent: boolean;
}

export default function ProjectManagerDialog({
  open,
  onOpenChange,
  onNewProject,
  onBackupProject,
  hasContent,
}: ProjectManagerDialogProps) {
  const isMobile = useIsMobile();

  const title = "New Project";
  const description = hasContent
    ? "This clears the current track and starts from an empty field."
    : "Start from an empty field.";
  const infoCard = (
    <div className="border-border/60 bg-muted/20 rounded-xl border px-4 py-3.5">
      <p className="text-foreground text-sm font-medium">
        Start from an empty field
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Importing and exporting stay available in the toolbar and mobile tools
        drawer. This flow only resets the current editor state.
      </p>
    </div>
  );
  const mobileInfoText = (
    <div>
      <p className="text-foreground text-sm font-medium">
        Start from an empty field
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Importing and exporting stay available in the toolbar and mobile tools
        drawer. This flow only resets the current editor state.
      </p>
    </div>
  );
  const warningCard = hasContent ? (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
      <p className="text-foreground text-sm font-medium">
        Current track will be replaced
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Use Export first if you want a manual JSON backup before starting over.
      </p>
    </div>
  ) : null;
  const actionRowClass =
    "border-border/60 hover:bg-muted/35 flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors";
  const actionRows = (
    <>
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
    </>
  );

  const actions = isMobile ? (
    <div className="space-y-2.5">{actionRows}</div>
  ) : (
    <div className="space-y-2.5">
      {actionRows}
      <button
        onClick={() => onOpenChange(false)}
        className="text-muted-foreground hover:text-foreground w-full pt-1 text-sm transition-colors"
      >
        Cancel
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} direction="bottom" modal onOpenChange={onOpenChange}>
        <DrawerContent className="border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] [&>div:first-child]:hidden">
          <div className="border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-sm">
            <div className="flex items-center justify-center pt-2.5 pb-1.5">
              <div className="bg-primary/20 h-1 w-10 rounded-full" />
            </div>
            <DrawerHeader className="px-4 pt-0 pb-3 text-left">
              <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
                {title}
              </DrawerTitle>
              <DrawerDescription className="text-muted-foreground/80 pt-0.5 text-[10px] leading-relaxed">
                {description}
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pt-3 pb-4">
            {mobileInfoText}
            {warningCard}
            {actions}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5">
          {infoCard}
          {warningCard}
          {actions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
