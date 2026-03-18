"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  LayoutGrid,
  Lock,
  Monitor,
  Scan,
  Share2,
  SlidersHorizontal,
  SquareMousePointer,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import Inspector from "@/components/Inspector";
import { mobileToolEntries } from "@/components/editor/tool-icons";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { buttonVariants } from "@/components/ui/button";
import type { EditorTool } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  mobileInspectorOpen: boolean;
  mobileMultiSelectEnabled: boolean;
  mobileRulersEnabled: boolean;
  mobileToolsOpen: boolean;
  mobileOverrideDismissed: boolean;
  readOnly: boolean;
  readOnlyMenuOpen: boolean;
  selectionLocked: boolean;
  selectedCount: number;
  tab: EditorViewportTab;
  onCloseInspector: () => void;
  onDismissMobileOverride: () => void;
  onFitView: () => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onExitMobileMultiSelect: () => void;
  onToggleSelectionLock: () => void;
  onOpenInspector: () => void;
  onOpenReadOnlyMenu: () => void;
  onOpenTools: () => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onSelectTool: (tool: EditorTool) => void;
  onSetMobileToolsOpen: (open: boolean) => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  onShare: () => void;
  onStartNewProject: () => void;
  onImport: () => void;
  onExport: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
}

export function EditorMobilePanels({
  activeTool,
  mobileInspectorOpen,
  mobileMultiSelectEnabled,
  mobileRulersEnabled,
  mobileToolsOpen,
  mobileOverrideDismissed,
  readOnly,
  readOnlyMenuOpen,
  selectionLocked,
  selectedCount,
  tab,
  onCloseInspector,
  onDismissMobileOverride,
  onDeleteSelection,
  onDuplicateSelection,
  onExitMobileMultiSelect,
  onToggleSelectionLock,
  onFitView,
  onOpenInspector,
  onOpenReadOnlyMenu,
  onOpenTools,
  onSetMobileRulersEnabled,
  onSelectTool,
  onSetMobileToolsOpen,
  onSetReadOnlyMenuOpen,
  onShare,
  onStartNewProject,
  onImport,
  onExport,
  onTabChange,
}: EditorMobilePanelsProps) {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(max-width: 1023px) and (orientation: landscape)"
    );

    const updateLandscapeMobile = () => {
      setIsLandscapeMobile(mediaQuery.matches);
    };

    updateLandscapeMobile();
    mediaQuery.addEventListener("change", updateLandscapeMobile);
    return () =>
      mediaQuery.removeEventListener("change", updateLandscapeMobile);
  }, []);

  const toolDisplayName: Record<string, string> = {
    select: "Select",
    grab: "Grab",
    gate: "Gate",
    flag: "Flag",
    cone: "Cone",
    label: "Label",
    polyline: "Path",
    ladder: "Ladder",
    startfinish: "Start",
    divegate: "Dive",
  };

  const canOpenInspector = selectedCount === 1 && !mobileMultiSelectEnabled;
  const mobileStatusTitle = mobileMultiSelectEnabled ? "Multi" : "Tool";
  const mobileStatusValue =
    selectedCount > 0
      ? `${selectedCount} items`
      : (toolDisplayName[activeTool] ?? activeTool);
  const mobileDrawerHeader = (
    title: string,
    subtitle?: string,
    tone: "default" | "brand" = "default"
  ) => (
    <div className="border-border/50 bg-background/96 shrink-0 border-b backdrop-blur-sm">
      <div className="flex items-center justify-center pt-2.5 pb-2">
        <div
          className={cn(
            "h-1 rounded-full",
            tone === "brand"
              ? "bg-brand-primary/18 w-10"
              : "bg-muted-foreground/18 w-8"
          )}
        />
      </div>
      <DrawerHeader className="px-4 pt-0 pb-3 text-left">
        <div className="min-w-0">
          <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
            {title}
          </DrawerTitle>
          {subtitle ? (
            <DrawerDescription className="text-muted-foreground/70 pt-0.5 text-[10px] leading-relaxed">
              {subtitle}
            </DrawerDescription>
          ) : null}
        </div>
      </DrawerHeader>
    </div>
  );

  return (
    <>
      {readOnly && (
        <div className="absolute right-4 bottom-10 z-30 lg:hidden">
          <motion.button
            onClick={onOpenReadOnlyMenu}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-sidebar border-border text-foreground hover:bg-muted flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium shadow-lg transition-colors"
          >
            <span className="tracking-wide uppercase">{tab}</span>
            <LayoutGrid className="text-muted-foreground size-3.5" />
          </motion.button>
        </div>
      )}

      {!readOnly && !mobileOverrideDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-3 top-[3.6rem] z-40 lg:hidden landscape:inset-x-auto landscape:left-3 landscape:max-w-[19rem]"
        >
          <div className="border-border/70 bg-background/97 rounded-[1.4rem] border px-3.5 py-3 shadow-[0_18px_38px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="border-border/60 bg-card mt-0.5 rounded-2xl border p-2.5">
                <Monitor className="text-muted-foreground/50 size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-[12px] font-semibold tracking-[0.04em]">
                  Mobile canvas
                </p>
                <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                  Tap to select, drag items directly to move them, and use empty
                  space or two fingers to navigate the canvas.
                </p>
              </div>
              <button
                onClick={onDismissMobileOverride}
                className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 rounded-full p-1 transition-colors"
                aria-label="Dismiss mobile hint"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {!readOnly && tab === "2d" && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
          style={{
            bottom: isLandscapeMobile
              ? "calc(0.35rem + env(safe-area-inset-bottom))"
              : "calc(0.55rem + env(safe-area-inset-bottom))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-1 rounded-[1.35rem] border border-white/10 bg-slate-950/86 p-1.5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur landscape:max-w-[16.5rem] landscape:gap-0.5 landscape:px-1 landscape:py-1"
          >
            <button
              onClick={() => onSelectTool("select")}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                activeTool === "select"
                  ? "bg-white text-slate-950"
                  : "text-white/72 hover:bg-white/10 hover:text-white"
              )}
            >
              <SquareMousePointer className="size-3.5" />
              <span className="landscape:sr-only">Select</span>
            </button>
            <button
              onClick={onOpenTools}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <LayoutGrid className="size-3.5" />
              <span className="landscape:sr-only">Tools</span>
            </button>
            <div className="min-w-0 flex-[1.1] landscape:hidden">
              <div className="mx-auto flex max-w-[7rem] flex-col items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/8 px-1.5 py-1 text-center">
                <p className="text-[8px] font-medium tracking-[0.08em] text-white/52 uppercase">
                  {mobileStatusTitle}
                </p>
                <p className="max-w-full text-[10px] leading-tight font-semibold text-white">
                  {mobileStatusValue}
                </p>
              </div>
            </div>
            <button
              onClick={onFitView}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <Scan className="size-3.5" />
              <span className="landscape:sr-only">Fit</span>
            </button>
            <button
              onClick={onOpenInspector}
              disabled={!canOpenInspector}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                canOpenInspector
                  ? "text-white/72 hover:bg-white/10 hover:text-white"
                  : "text-white/30"
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="landscape:sr-only">Edit</span>
            </button>
          </motion.div>
        </div>
      )}

      {!readOnly && tab === "2d" && mobileMultiSelectEnabled && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
          style={{
            bottom: isLandscapeMobile
              ? "calc(4.7rem + env(safe-area-inset-bottom))"
              : "calc(5.15rem + env(safe-area-inset-bottom))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto w-full max-w-sm rounded-[1.2rem] border border-white/10 bg-slate-950/88 p-2 text-white shadow-[0_16px_34px_rgba(15,23,42,0.34)] backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : "Multi-select"}
                </p>
                <p className="truncate text-[10px] text-white/55">
                  Tap items to add or remove them
                </p>
              </div>
              <button
                onClick={onExitMobileMultiSelect}
                className="rounded-full border border-white/12 px-3 py-1.5 text-[10px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Done
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={onDuplicateSelection}
                disabled={selectedCount === 0}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <Copy className="size-4" />
                <span>Duplicate</span>
              </button>
              <button
                onClick={onToggleSelectionLock}
                disabled={selectedCount === 0}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                {selectionLocked ? (
                  <Unlock className="size-4" />
                ) : (
                  <Lock className="size-4" />
                )}
                <span>{selectionLocked ? "Unlock" : "Lock"}</span>
              </button>
              <button
                onClick={onDeleteSelection}
                disabled={selectedCount === 0}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200 disabled:text-white/25"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {!readOnly && (
        <Drawer
          open={mobileInspectorOpen}
          direction="bottom"
          modal
          onOpenChange={(open) => {
            if (!open) onCloseInspector();
          }}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[72dvh] gap-0 overflow-hidden [overscroll-behavior:contain] rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader("Inspector", "Selection properties", "brand")}
            <div className="min-h-0 flex-1 overflow-hidden [overscroll-behavior:contain]">
              <Inspector />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {!readOnly && (
        <Drawer
          open={mobileToolsOpen}
          direction="bottom"
          modal
          onOpenChange={onSetMobileToolsOpen}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              "Tools",
              "Drawing, view and project actions",
              "brand"
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  Drawing tools
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {mobileToolEntries
                    .filter(
                      (tool) => tool.id !== "select" && tool.id !== "grab"
                    )
                    .map((tool) => {
                      const active = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => onSelectTool(tool.id)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all",
                            active
                              ? "border-border/80 bg-muted/55 text-foreground"
                              : "border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                          )}
                        >
                          {tool.icon}
                          <span className="text-[11px] leading-none font-medium">
                            {tool.label}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  View
                </p>
                <div className="border-border/50 bg-muted/18 flex items-center gap-1.5 rounded-[1rem] border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetMobileToolsOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                      )}
                    >
                      {nextTab === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onSetMobileRulersEnabled(!mobileRulersEnabled)}
                  className={cn(
                    "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-[1rem] border px-3 py-2.5 text-left transition-colors",
                    mobileRulersEnabled
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div>
                    <p className="text-[11px] font-medium">Rulers</p>
                    <p className="text-muted-foreground/75 pt-0.5 text-[10px]">
                      Show top and left guides on mobile
                    </p>
                  </div>
                  <div
                    className={cn(
                      "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
                      mobileRulersEnabled
                        ? "bg-foreground/90 justify-end"
                        : "bg-border/80 justify-start"
                    )}
                  >
                    <span className="bg-background block size-5 rounded-full shadow-sm" />
                  </div>
                </button>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  Project
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "New",
                      action: onStartNewProject,
                    },
                    {
                      label: "Open",
                      action: onImport,
                    },
                    {
                      label: "Export",
                      action: onExport,
                    },
                  ].map((actionItem, index) => (
                    <button
                      key={actionItem.label}
                      onClick={actionItem.action}
                      className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex flex-col items-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all"
                    >
                      {index === 0 ? <FilePlus className="size-5" /> : null}
                      {index === 1 ? <FolderOpen className="size-5" /> : null}
                      {index === 2 ? <Download className="size-5" /> : null}
                      <span className="text-[11px] leading-none font-medium">
                        {actionItem.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {readOnly && (
        <Drawer
          open={readOnlyMenuOpen}
          direction="bottom"
          modal
          onOpenChange={onSetReadOnlyMenuOpen}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[60dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader("View", "Switch mode or share this track")}
            <div className="space-y-5 px-4 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  View mode
                </p>
                <div className="border-border/50 bg-muted/18 flex items-center gap-1.5 rounded-[1rem] border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetReadOnlyMenuOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] py-2.5 text-sm font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                      )}
                    >
                      {nextTab === "2d" ? "2D View" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  Share
                </p>
                <button
                  onClick={onShare}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "border-border/60 bg-muted/12 hover:bg-muted/24 h-10 w-full gap-2"
                  )}
                >
                  <Share2 className="size-4" />
                  Share track
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
