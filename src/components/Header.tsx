"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Undo2, Redo2, Share2, Eye, Download, Keyboard, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (t: "2d" | "3d") => void;
  onShare: () => void;
  onExport?: () => void;
  readOnly?: boolean;
  hideTabsOnMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const shortcutSections = [
  {
    title: "Tools",
    items: [
      { label: "Select", keys: ["V"] },
      { label: "Grab", keys: ["H"] },
      { label: "Gate", keys: ["G"] },
      { label: "Ladder", keys: ["R"] },
      { label: "Dive Gate", keys: ["D"] },
      { label: "Flag", keys: ["F"] },
      { label: "Cone", keys: ["C"] },
      { label: "Start Pads", keys: ["S"] },
      { label: "Label", keys: ["L"] },
      { label: "Path", keys: ["P"] },
    ],
  },
  {
    title: "Selection",
    items: [
      { label: "Duplicate selected items", keys: ["Ctrl/Cmd", "D"] },
      { label: "Copy selected items", keys: ["Ctrl/Cmd", "C"] },
      { label: "Paste copied items", keys: ["Ctrl/Cmd", "V"] },
      { label: "Delete selected items", keys: ["Backspace/Delete"] },
      { label: "Nudge selected items", keys: ["Arrow Keys"] },
      { label: "Fine nudge", keys: ["Alt", "Arrow Keys"] },
    ],
  },
  {
    title: "Path Editing",
    items: [
      { label: "Finish path", keys: ["Enter"] },
      { label: "Remove last draft point", keys: ["Backspace/Delete"] },
      { label: "Cancel current draft", keys: ["Escape"] },
    ],
  },
  {
    title: "Canvas",
    items: [
      { label: "Fit view to field", keys: ["0"] },
      { label: "Clear selection", keys: ["Escape"] },
      { label: "Pan view", keys: ["Middle Click"] },
      { label: "Free place / free drag", keys: ["Alt"] },
      { label: "Zoom", keys: ["Mouse Wheel"] },
    ],
  },
];

export default function Header({
  tab,
  onTabChange,
  onShare,
  onExport,
  readOnly = false,
  collapsed,
  onToggleCollapsed,
}: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const theme = useTheme();
  const [openShortcutSection, setOpenShortcutSection] = useState("Tools");

  const viewToggle = (
    <div className="flex items-center rounded-md border border-border/70 overflow-hidden text-[11px] font-medium">
      <button
        onClick={() => onTabChange("2d")}
        className={cn(
          "px-2.5 py-1 transition-colors",
          tab === "2d" ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        2D
      </button>
      <div className="w-px h-full bg-border/60 self-stretch" />
      <button
        onClick={() => onTabChange("3d")}
        className={cn(
          "px-2.5 py-1 transition-colors",
          tab === "3d" ? "bg-muted/80 text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        3D
      </button>
    </div>
  );

  const mobileTabToggle = (
    <button
      onClick={() => onTabChange(tab === "2d" ? "3d" : "2d")}
      className="inline-flex h-7 min-w-10 items-center justify-center rounded-md border border-border/70 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
      aria-label={`Switch to ${tab === "2d" ? "3D" : "2D"} view`}
    >
      {tab === "2d" ? "2D" : "3D"}
    </button>
  );

  return (
    <header className="relative h-11 shrink-0 flex items-center px-3 border-b border-border bg-sidebar z-20 select-none gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 shrink-0">
        {!readOnly && onToggleCollapsed && (
          <Tooltip>
            <TooltipTrigger
              onClick={() => onToggleCollapsed()}
              className="hidden lg:flex shrink-0 size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
            </TooltipTrigger>
            <TooltipContent>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>
        )}
        <div className="flex items-center gap-2 lg:hidden">
          {mobileTabToggle}
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:hidden">
        <Image
          src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
          alt="TrackDraw"
          width={102}
          height={22}
          className="h-[18px] w-auto opacity-90"
          draggable={false}
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <div className="hidden lg:flex mr-1">
          {viewToggle}
        </div>

        <div className="hidden lg:block h-4 w-px bg-border/80 mx-1" />

        {readOnly && (
          <>
            <span className="hidden sm:flex items-center gap-1 shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400">
              <Eye className="size-3" />
              View only
            </span>
            <div className="hidden sm:block h-4 w-px bg-border/80 mx-1" />
          </>
        )}

        {/* Undo/Redo — hidden on mobile */}
        {!readOnly && (
          <div className="hidden sm:flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "size-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground",
                  canUndo ? "hover:text-foreground hover:bg-muted" : "opacity-25 pointer-events-none"
                )}
                onClick={() => undo()}
                aria-label="Undo"
              >
                <Undo2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Undo <span className="ml-1 opacity-50 font-mono text-[10px]">⌃Z</span></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "size-7 rounded-md flex items-center justify-center transition-colors text-muted-foreground",
                  canRedo ? "hover:text-foreground hover:bg-muted" : "opacity-25 pointer-events-none"
                )}
                onClick={() => redo()}
                aria-label="Redo"
              >
                <Redo2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Redo <span className="ml-1 opacity-50 font-mono text-[10px]">⌃Y</span></TooltipContent>
            </Tooltip>
            <Dialog>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DialogTrigger
                      className="hidden lg:flex size-7 rounded-md items-center justify-center transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="Keyboard shortcuts"
                    />
                  }
                >
                  <Keyboard className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts</TooltipContent>
              </Tooltip>
              <DialogContent size="auto" className="hidden max-w-none gap-3 lg:grid lg:w-[540px]">
                <DialogHeader>
                  <DialogTitle>Keyboard Shortcuts</DialogTitle>
                  <DialogDescription>
                    Available keyboard and canvas shortcuts in the studio.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                  {shortcutSections.map((section) => (
                    <div
                      key={section.title}
                      className="group overflow-hidden rounded-lg border border-border/70 bg-muted/15"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenShortcutSection((current) => current === section.title ? "" : section.title)}
                        className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                        aria-expanded={openShortcutSection === section.title}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                          {section.title}
                        </span>
                        <motion.div
                          animate={{ rotate: openShortcutSection === section.title ? 180 : 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        </motion.div>
                      </button>
                      <AnimatePresence initial={false}>
                        {openShortcutSection === section.title && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-border/60">
                              {section.items.map((item) => (
                                <div key={`${section.title}-${item.label}-${item.keys.join("-")}`} className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5">
                                  <span className="pr-3 text-[13px] leading-5 text-foreground/80">{item.label}</span>
                                  <KbdGroup className="shrink-0 flex-wrap justify-end">
                                    {item.keys.map((key) => (
                                      <Kbd key={`${item.label}-${key}`}>{key}</Kbd>
                                    ))}
                                  </KbdGroup>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {!readOnly && (
          <>
            <div className="hidden sm:block h-4 w-px bg-border/80 mx-1" />
          </>
        )}

        {!readOnly && onExport && (
          <button
            onClick={onExport}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 sm:px-2.5 text-xs gap-1.5")}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        <button
          onClick={onShare}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 sm:px-2.5 text-xs gap-1.5")}
        >
          <Share2 className="size-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="h-4 w-px bg-border/80 mx-1" />
        <ThemeToggle />
      </div>
    </header>
  );
}
