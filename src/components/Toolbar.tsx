"use client";

import { useState } from "react";
import { useEditor, type EditorTool } from "@/store/editor";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MousePointer2,
  Flag,
  Triangle,
  Type,
  Spline,
  FolderOpen,
  Download,
  Trophy,
  FilePlus,
} from "lucide-react";

function GateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <line x1="2.5" y1="13" x2="2.5" y2="2.5" />
      <line x1="11.5" y1="13" x2="11.5" y2="2.5" />
      <line x1="2.5" y1="2.5" x2="11.5" y2="2.5" />
    </svg>
  );
}

function LadderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="2.5,7 2.5,1.5 11.5,1.5 11.5,7" />
      <polyline points="2.5,12.5 2.5,7 11.5,7 11.5,12.5" />
    </svg>
  );
}

function DiveGateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="10" height="10" rx="0.5" />
    </svg>
  );
}

type ToolEntry = { id: EditorTool; label: string; shortcut: string; icon: React.ReactNode };
type ToolGroup = { title: string; tools: ToolEntry[] };

const toolGroups: ToolGroup[] = [
  {
    title: "",
    tools: [
      { id: "select", label: "Select", shortcut: "V", icon: <MousePointer2 className="size-[14px]" /> },
    ],
  },
  {
    title: "Gates",
    tools: [
      { id: "gate",        label: "Gate",       shortcut: "G", icon: <GateIcon className="size-[14px]" /> },
      { id: "ladder",      label: "Ladder",     shortcut: "R", icon: <LadderIcon className="size-[14px]" /> },
      { id: "divegate",    label: "Dive Gate",  shortcut: "D", icon: <DiveGateIcon className="size-[14px]" /> },
      { id: "startfinish", label: "Start Pads", shortcut: "S", icon: <Trophy className="size-[14px]" /> },
    ],
  },
  {
    title: "Markers",
    tools: [
      { id: "flag",  label: "Flag",  shortcut: "F", icon: <Flag className="size-[14px]" /> },
      { id: "cone",  label: "Cone",  shortcut: "C", icon: <Triangle className="size-[14px]" /> },
      { id: "label", label: "Label", shortcut: "L", icon: <Type className="size-[14px]" /> },
    ],
  },
  {
    title: "Draw",
    tools: [
      { id: "polyline", label: "Path", shortcut: "P", icon: <Spline className="size-[14px]" /> },
    ],
  },
];

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
}

export default function Toolbar({ onImport, onExport }: ToolbarProps) {
  const { activeTool, setActiveTool, setSelection, newProject } = useEditor();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex w-36 flex-col border-r border-border bg-sidebar shrink-0">
        {/* Tool groups */}
        <div className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-1">
          {toolGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && group.title && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 px-2 pt-3 pb-1 select-none">
                  {group.title}
                </p>
              )}
              {gi > 0 && !group.title && <div className="h-1" />}
              {group.tools.map((tool) => {
                const active = tool.id === activeTool;
                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger
                      onClick={() => { setSelection([]); setActiveTool(tool.id); }}
                      aria-label={tool.label}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-all cursor-pointer border",
                        active
                          ? "bg-brand-primary/20 text-foreground border-brand-primary/40"
                          : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/60 hover:border-border/70"
                      )}
                    >
                      <span className={cn(
                        "shrink-0 flex items-center justify-center w-5 h-5 rounded",
                        active ? "text-brand-primary" : "text-muted-foreground"
                      )}>
                        {tool.icon}
                      </span>
                      <span className="text-[13px] font-medium leading-none flex-1">{tool.label}</span>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      <span className="font-medium">{tool.label}</span>
                      <span className="ml-2 text-[10px] font-mono opacity-70">{tool.shortcut}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="border-t border-border/60 px-2 py-2 flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/70 transition-all cursor-pointer"
              onClick={() => setConfirmOpen(true)}
              aria-label="New project"
            >
              <FilePlus className="size-[14px] shrink-0" />
              <span className="text-[13px] font-medium">New</span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>New project</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/70 transition-all cursor-pointer"
              onClick={() => onImport()}
              aria-label="Open"
            >
              <FolderOpen className="size-[14px] shrink-0" />
              <span className="text-[13px] font-medium">Open</span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Open project</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/70 transition-all cursor-pointer"
              onClick={() => onExport()}
              aria-label="Export"
            >
              <Download className="size-[14px] shrink-0" />
              <span className="text-[13px] font-medium">Export</span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Export track</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* New project confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xs" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              This will clear your current track. Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="flex-1" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { newProject(); setConfirmOpen(false); }}
            >
              Start New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
