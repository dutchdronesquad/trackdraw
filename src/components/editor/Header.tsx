"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Undo2,
  Redo2,
  Share2,
  Eye,
  Download,
  Keyboard,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";

const INSPECTOR_WIDTH = "21.25rem";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (t: "2d" | "3d") => void;
  onShare: () => void;
  onExport?: () => void;
  onSaveSnapshot?: () => void;
  readOnly?: boolean;
  hideTabsOnMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  title?: string;
  studioHref?: string;
  lastSavedLabel?: string;
  statusLabel?: string;
  selectionLabel?: string;
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
      { label: "Rotate selected items left", keys: ["Q / [", "15°"] },
      { label: "Rotate selected items right", keys: ["E / ]", "15°"] },
      { label: "Mouse rotate snap", keys: ["Drag", "5°"] },
      { label: "Fine mouse rotate", keys: ["Alt", "1°"] },
      { label: "Fine key rotate", keys: ["Alt", "1°"] },
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
      { label: "Delete selected path point", keys: ["Backspace/Delete"] },
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
  {
    title: "Project",
    items: [{ label: "Save snapshot", keys: ["Ctrl/Cmd", "S"] }],
  },
];

export default function Header({
  tab,
  onTabChange,
  onShare,
  onExport,
  onSaveSnapshot,
  readOnly = false,
  collapsed,
  onToggleCollapsed,
  title = "Untitled",
  studioHref = "/studio",
  lastSavedLabel,
}: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const theme = useTheme();
  const [openShortcutSection, setOpenShortcutSection] = useState("Tools");

  const viewToggle = (
    <div className="border-border/70 flex items-center overflow-hidden rounded-md border text-[11px] font-medium">
      <button
        onClick={() => onTabChange("2d")}
        className={cn(
          "px-2.5 py-1 transition-colors",
          tab === "2d"
            ? "bg-muted/80 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        2D
      </button>
      <div className="bg-border/60 h-full w-px self-stretch" />
      <button
        onClick={() => onTabChange("3d")}
        className={cn(
          "px-2.5 py-1 transition-colors",
          tab === "3d"
            ? "bg-muted/80 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        3D
      </button>
    </div>
  );

  const mobileTabToggle = (
    <button
      onClick={() => onTabChange(tab === "2d" ? "3d" : "2d")}
      className="text-foreground inline-flex h-8 min-w-11 items-center justify-center px-2 text-[11px] font-medium"
      aria-label={`Switch to ${tab === "2d" ? "3D" : "2D"} view`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="inline-block"
        >
          {tab.toUpperCase()}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <header className="border-border bg-sidebar relative z-20 flex h-12 shrink-0 items-center gap-2 border-b px-3 select-none lg:h-11">
      <div className="flex min-w-0 flex-1 shrink-0 items-center gap-2">
        {readOnly && (
          <Link
            href="/"
            aria-label="Go to homepage"
            className="hidden shrink-0 items-center rounded-xs opacity-90 transition-opacity hover:opacity-100 lg:flex"
          >
            <span className="relative block h-7 w-37">
              <Image
                src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
                alt="TrackDraw"
                fill
                unoptimized
                className="object-contain"
                draggable={false}
              />
            </span>
          </Link>
        )}
        {!readOnly && onToggleCollapsed && (
          <Tooltip>
            <TooltipTrigger
              onClick={() => onToggleCollapsed()}
              className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 shrink-0 items-center justify-center rounded-md transition-colors lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-3.5" />
              ) : (
                <PanelLeftClose className="size-3.5" />
              )}
            </TooltipTrigger>
            <TooltipContent>
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex items-center gap-2 lg:hidden">
          {mobileTabToggle}
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:hidden">
        <Link
          href="/"
          aria-label="Go to homepage"
          className="flex items-center rounded-xs opacity-90 transition-opacity hover:opacity-100"
        >
          <span className="relative block h-9 w-40">
            <Image
              src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
              alt="TrackDraw"
              fill
              unoptimized
              className="object-contain"
              draggable={false}
            />
          </span>
        </Link>
      </div>

      {!readOnly && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden items-center justify-center lg:flex"
          style={{ right: INSPECTOR_WIDTH }}
        >
          <div className="flex max-w-md items-center gap-2 px-6">
            <span className="text-foreground/70 truncate text-center text-sm">
              {title}
            </span>
            <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 text-amber-500">
              <span className="inline-flex h-3 items-center text-[9px] leading-none font-semibold tracking-[0.12em] uppercase">
                Beta
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="ml-auto flex h-full shrink-0 items-center gap-1">
        <div className="mr-1 hidden lg:flex">{viewToggle}</div>

        <div className="bg-border/80 mx-1 hidden h-4 w-px lg:block" />

        {readOnly && (
          <>
            <span className="hidden shrink-0 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 sm:flex">
              <Eye className="size-3" />
              View only
            </span>
            <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
            <Link
              href={studioHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden h-8 gap-1.5 px-2 text-xs sm:inline-flex sm:h-7 sm:px-2.5"
              )}
            >
              Open Studio
            </Link>
            <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
          </>
        )}

        {/* Undo/Redo — hidden on mobile */}
        {!readOnly && (
          <div className="hidden items-center gap-1 sm:flex">
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "text-muted-foreground flex size-7 items-center justify-center rounded-md transition-colors",
                  canUndo
                    ? "hover:text-foreground hover:bg-muted"
                    : "pointer-events-none opacity-25"
                )}
                onClick={() => undo()}
                aria-label="Undo"
              >
                <Undo2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                Undo{" "}
                <span className="ml-1 font-mono text-[10px] opacity-50">
                  ⌃Z
                </span>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "text-muted-foreground flex size-7 items-center justify-center rounded-md transition-colors",
                  canRedo
                    ? "hover:text-foreground hover:bg-muted"
                    : "pointer-events-none opacity-25"
                )}
                onClick={() => redo()}
                aria-label="Redo"
              >
                <Redo2 className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>
                Redo{" "}
                <span className="ml-1 font-mono text-[10px] opacity-50">
                  ⌃Y
                </span>
              </TooltipContent>
            </Tooltip>
            {onSaveSnapshot && (
              <Tooltip>
                <TooltipTrigger
                  className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 cursor-pointer items-center justify-center rounded-md transition-colors lg:flex"
                  onClick={onSaveSnapshot}
                  aria-label="Save snapshot"
                >
                  <Save className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent className="flex flex-col gap-0.5">
                  <span>
                    Save snapshot{" "}
                    <span className="font-mono text-[10px] opacity-50">⌘S</span>
                  </span>
                  {lastSavedLabel && (
                    <span className="opacity-60">{lastSavedLabel}</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
            <Dialog>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DialogTrigger
                      className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 items-center justify-center rounded-md transition-colors lg:flex"
                      aria-label="Keyboard shortcuts"
                    />
                  }
                >
                  <Keyboard className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts</TooltipContent>
              </Tooltip>
              <DialogContent
                size="auto"
                className="hidden max-w-none gap-3 lg:grid lg:w-135"
              >
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
                      className="group border-border/70 bg-muted/15 overflow-hidden rounded-lg border"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenShortcutSection((current) =>
                            current === section.title ? "" : section.title
                          )
                        }
                        className="bg-muted/40 hover:bg-muted/60 flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors"
                        aria-expanded={openShortcutSection === section.title}
                      >
                        <span className="text-muted-foreground/80 text-[11px] font-semibold tracking-[0.16em] uppercase">
                          {section.title}
                        </span>
                        <motion.div
                          animate={{
                            rotate:
                              openShortcutSection === section.title ? 180 : 0,
                          }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          <ChevronDown className="text-muted-foreground size-3.5" />
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
                            <div className="divide-border/60 divide-y">
                              {section.items.map((item) => (
                                <div
                                  key={`${section.title}-${item.label}-${item.keys.join("-")}`}
                                  className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5"
                                >
                                  <span className="text-foreground/80 pr-3 text-[13px] leading-5">
                                    {item.label}
                                  </span>
                                  <KbdGroup className="shrink-0 flex-wrap justify-end">
                                    {item.keys.map((key) => (
                                      <Kbd key={`${item.label}-${key}`}>
                                        {key}
                                      </Kbd>
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
            <div className="bg-border/80 mx-1 hidden h-4 w-px sm:block" />
          </>
        )}

        {!readOnly && onExport && (
          <button
            onClick={onExport}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden h-8 gap-1.5 px-2 text-xs sm:inline-flex sm:h-7 sm:px-2.5"
            )}
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        <button
          onClick={onShare}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 gap-1.5 px-2 text-xs sm:h-7 sm:px-2.5"
          )}
        >
          <Share2 className="size-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="bg-border/80 mx-1 h-5 w-px sm:h-4" />
        <ThemeToggle />
      </div>
    </header>
  );
}
