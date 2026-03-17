"use client";

import { useEditor } from "@/store/editor";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { buttonVariants } from "@/components/ui/button";
import { Undo2, Redo2, Share2, Eye, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  tab: "2d" | "3d";
  onTabChange: (t: "2d" | "3d") => void;
  onShare: () => void;
  onExport?: () => void;
  readOnly?: boolean;
  /** Hide the 2D/3D toggle on mobile */
  hideTabsOnMobile?: boolean;
}

export default function Header({ tab, onTabChange, onShare, onExport, readOnly = false, hideTabsOnMobile = false }: HeaderProps) {
  const { design, updateDesignMeta } = useEditor();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const theme = useTheme();

  return (
    <header className="h-11 shrink-0 flex lg:grid lg:grid-cols-[1fr_auto_1fr] items-center px-3 border-b border-border bg-sidebar z-20 select-none">
      {/* Left: logo + title */}
      <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial">
        <a href="/" className="shrink-0 opacity-90 hover:opacity-100 transition-opacity">
          <img
            src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
            alt="TrackDraw"
            className="h-[26px] w-auto select-none"
            draggable={false}
          />
        </a>
        <div className="w-px h-4 bg-border shrink-0" />
        {readOnly ? (
          <>
            <span className="min-w-0 text-sm text-foreground/60 py-0.5 truncate">
              {design.title || "Untitled"}
            </span>
            <span className="hidden sm:flex items-center gap-1 shrink-0 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 select-none">
              <Eye className="size-3" />
              View only
            </span>
          </>
        ) : (
          <input
            type="text"
            value={design.title}
            onChange={(e) => updateDesignMeta({ title: e.target.value })}
            placeholder="Untitled"
            aria-label="Track title"
            className="min-w-0 bg-transparent text-sm text-foreground/60 placeholder:text-muted-foreground/30 outline-none hover:text-foreground focus:text-foreground transition-colors py-0.5"
          />
        )}
      </div>

      {/* Center: 2D / 3D toggle */}
      <div className={cn("flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5", hideTabsOnMobile && "hidden lg:flex")}>
        <button
          onClick={() => onTabChange("2d")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            tab === "2d"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="hidden sm:inline">Canvas</span><span className="sm:hidden">2D</span>
        </button>
        <button
          onClick={() => onTabChange("3d")}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            tab === "3d"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="hidden sm:inline">3D Preview</span><span className="sm:hidden">3D</span>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center justify-end gap-1 shrink-0">
        {/* Undo/Redo — hidden on mobile */}
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
          <div className="w-px h-4 bg-border mx-1" />
        </div>

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

        <div className="w-px h-4 bg-border mx-0.5" />
        <ThemeToggle />
      </div>
    </header>
  );
}
