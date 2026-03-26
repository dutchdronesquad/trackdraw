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
  Undo2,
  Redo2,
  Share2,
  Eye,
  Download,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const INSPECTOR_WIDTH = "21.25rem";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (t: "2d" | "3d") => void;
  onShare: () => void;
  onExport?: () => void;
  onSaveSnapshot?: () => void;
  onOpenShortcuts?: () => void;
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

export default function Header({
  tab,
  onTabChange,
  onShare,
  onExport,
  onSaveSnapshot,
  onOpenShortcuts,
  readOnly = false,
  collapsed,
  onToggleCollapsed,
  title = "Untitled",
  studioHref = "/studio",
  lastSavedLabel,
}: HeaderProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const theme = useTheme();

  const viewToggle = (
    <div className="border-border/70 flex items-center overflow-hidden rounded-md border text-[11px] font-medium">
      <button
        onClick={() => onTabChange("2d")}
        aria-label="Switch to 2D view"
        aria-pressed={tab === "2d"}
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
        aria-label="Switch to 3D view"
        aria-pressed={tab === "3d"}
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
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
            <span className="hidden shrink-0 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-medium text-sky-400 sm:flex">
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
                    : "pointer-events-none opacity-40"
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
                    : "pointer-events-none opacity-40"
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
            {onOpenShortcuts && (
              <Tooltip>
                <TooltipTrigger
                  onClick={onOpenShortcuts}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted hidden size-7 items-center justify-center rounded-md transition-colors sm:flex"
                  aria-label="Keyboard shortcuts"
                >
                  <Keyboard className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts</TooltipContent>
              </Tooltip>
            )}
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
            aria-label="Export"
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
          aria-label="Share"
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
