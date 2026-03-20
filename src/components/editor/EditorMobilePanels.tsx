"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  LayoutGrid,
  Lock,
  Monitor,
  PencilLine,
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
import { ContextOverlayCard } from "@/components/ContextOverlayCard";
import type { EditorTool } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  draftPathActive: boolean;
  draftPathCanClose: boolean;
  draftPathLength: number;
  draftPathPointCount: number;
  hasSelectedPolyline: boolean;
  pathBuilderPinnedOpen: boolean;
  mobileInspectorOpen: boolean;
  mobileMultiSelectEnabled: boolean;
  mobileGizmoEnabled: boolean;
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
  onCancelPath: () => void;
  onDuplicateSelection: () => void;
  onExitMobileMultiSelect: () => void;
  onFinishPath: () => void;
  onToggleSelectionLock: () => void;
  onOpenInspector: () => void;
  onOpenReadOnlyMenu: () => void;
  onOpenTools: () => void;
  onResumeSelectedPath: () => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSelectTool: (tool: EditorTool) => void;
  onSetMobileToolsOpen: (open: boolean) => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  onShare: () => void;
  onStartNewProject: () => void;
  onUndoPathPoint: () => void;
  onImport: () => void;
  onExport: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
}

export function EditorMobilePanels({
  activeTool,
  draftPathActive,
  draftPathCanClose,
  draftPathLength,
  draftPathPointCount,
  hasSelectedPolyline,
  pathBuilderPinnedOpen,
  mobileInspectorOpen,
  mobileMultiSelectEnabled,
  mobileGizmoEnabled,
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
  onCancelPath,
  onDuplicateSelection,
  onExitMobileMultiSelect,
  onFinishPath,
  onToggleSelectionLock,
  onFitView,
  onOpenInspector,
  onOpenReadOnlyMenu,
  onOpenTools,
  onResumeSelectedPath,
  onSetMobileRulersEnabled,
  onSetMobileGizmoEnabled,
  onSelectTool,
  onSetMobileToolsOpen,
  onSetReadOnlyMenuOpen,
  onShare,
  onStartNewProject,
  onUndoPathPoint,
  onImport,
  onExport,
  onTabChange,
}: EditorMobilePanelsProps) {
  const mobileOverlaySurfaceClassName =
    "pointer-events-auto w-full max-w-sm rounded-[1.35rem] border border-white/10 bg-slate-950/86 p-2 text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur";
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  const blurActiveControl = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  };

  const openInspectorDrawer = () => {
    blurActiveControl();
    onOpenInspector();
  };

  const openToolsDrawer = () => {
    blurActiveControl();
    onOpenTools();
  };

  const openReadOnlyDrawer = () => {
    blurActiveControl();
    onOpenReadOnlyMenu();
  };

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

  useEffect(() => {
    if (readOnly || mobileOverrideDismissed) return;
    const timeoutId = window.setTimeout(() => {
      onDismissMobileOverride();
    }, 8000);
    return () => window.clearTimeout(timeoutId);
  }, [mobileOverrideDismissed, onDismissMobileOverride, readOnly]);

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

  const canOpenInspector = selectedCount <= 1 && !mobileMultiSelectEnabled;
  const showPathBuilderOverlay =
    !readOnly && tab === "2d" && (pathBuilderPinnedOpen || draftPathActive);
  const showResumePathButton =
    !readOnly &&
    tab === "2d" &&
    hasSelectedPolyline &&
    !showPathBuilderOverlay &&
    !mobileMultiSelectEnabled;
  const mobileStatusTitle = mobileMultiSelectEnabled ? "Multi" : "Tool";
  const mobileStatusValue =
    selectedCount > 0
      ? `${selectedCount} items`
      : (toolDisplayName[activeTool] ?? activeTool);
  const handleMobileSelectButton = () => {
    if (mobileMultiSelectEnabled) {
      onExitMobileMultiSelect();
      return;
    }
    onSelectTool("select");
  };
  const mobileDrawerHeader = (
    title: string,
    subtitle?: string,
    tone: "default" | "brand" = "default"
  ) => (
    <div className="border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-sm">
      <div className="flex items-center justify-center pt-2.5 pb-1.5">
        <div
          className={cn(
            "h-1 rounded-full",
            tone === "brand" ? "bg-primary/20 w-10" : "bg-border w-8"
          )}
        />
      </div>
      <DrawerHeader className="px-4 pt-0 pb-3 text-left">
        <div className="min-w-0">
          <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
            {title}
          </DrawerTitle>
          {subtitle ? (
            <DrawerDescription className="text-muted-foreground/80 pt-0.5 text-[10px] leading-relaxed">
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
        <div
          className="absolute right-4 z-30 lg:hidden"
          style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
        >
          <motion.button
            onClick={openReadOnlyDrawer}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-sidebar/96 border-border text-foreground hover:bg-muted flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-colors"
            aria-label="Open shared view options"
          >
            <LayoutGrid className="text-muted-foreground size-4" />
          </motion.button>
        </div>
      )}

      {!readOnly && !mobileOverrideDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-x-3 top-[3.6rem] z-40 lg:hidden landscape:inset-x-auto landscape:left-3 landscape:max-w-[19rem]"
        >
          <ContextOverlayCard
            icon={<Monitor className="size-3.5" />}
            title="Mobile canvas"
            description="Tap to select, drag items directly to move them, and use two fingers to pan or zoom the canvas."
            dismissLabel="Dismiss mobile hint"
            onDismiss={onDismissMobileOverride}
          />
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
              onClick={handleMobileSelectButton}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                activeTool === "select" && !mobileMultiSelectEnabled
                  ? "bg-white text-slate-950"
                  : "text-white/72 hover:bg-white/10 hover:text-white"
              )}
            >
              <SquareMousePointer className="size-3.5" />
              <span className="landscape:sr-only">
                {mobileMultiSelectEnabled ? "Exit" : "Select"}
              </span>
            </button>
            <button
              onClick={openToolsDrawer}
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
              onClick={openInspectorDrawer}
              disabled={!canOpenInspector}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                canOpenInspector
                  ? "text-white/72 hover:bg-white/10 hover:text-white"
                  : "text-white/30"
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="landscape:sr-only">
                {selectedCount === 0 ? "Settings" : "Edit"}
              </span>
            </button>
          </motion.div>
        </div>
      )}

      {showResumePathButton && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
          style={{
            bottom: isLandscapeMobile
              ? "calc(4.55rem + env(safe-area-inset-bottom))"
              : "calc(5.05rem + env(safe-area-inset-bottom))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <button
              onClick={onResumeSelectedPath}
              className="flex w-full items-center justify-between rounded-[1.15rem] border border-white/10 bg-slate-950/86 px-3 py-2.5 text-left text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur transition-colors hover:bg-white/10"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/8">
                  <PencilLine className="size-4 text-white/85" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
                    Path
                  </p>
                  <p className="truncate text-[11px] text-white/62">
                    Continue editing selected line
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-medium text-white/72">
                Edit
              </span>
            </button>
          </motion.div>
        </div>
      )}

      {showPathBuilderOverlay && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
          style={{
            bottom: isLandscapeMobile
              ? "calc(4.55rem + env(safe-area-inset-bottom))"
              : "calc(5.05rem + env(safe-area-inset-bottom))",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={mobileOverlaySurfaceClassName}
          >
            <div className="flex items-start justify-between gap-3 px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
                  Path builder
                </p>
                <p className="truncate text-[10px] text-white/55">
                  {draftPathPointCount > 0
                    ? `${draftPathPointCount} points · ${draftPathLength.toFixed(1)} m`
                    : "Tap the canvas to place the first point"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={onUndoPathPoint}
                disabled={draftPathPointCount === 0}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <ArrowRight className="size-4 rotate-180" />
                <span>Undo</span>
              </button>
              <button
                onClick={onFinishPath}
                disabled={draftPathPointCount < 2}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <PencilLine className="size-4" />
                <span>{draftPathCanClose ? "Close" : "Finish"}</span>
              </button>
              <button
                onClick={onCancelPath}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200"
              >
                <X className="size-4" />
                <span>Cancel</span>
              </button>
            </div>
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
            className={mobileOverlaySurfaceClassName}
          >
            <div className="flex items-start justify-between gap-3 px-1 pb-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : "Multi-select"}
                </p>
                <p className="truncate text-[10px] text-white/55">
                  Tap items to add or remove them.
                </p>
              </div>
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

      {!readOnly && tab === "3d" && (
        <div
          className="absolute right-4 z-30 lg:hidden"
          style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
        >
          <motion.button
            onClick={openToolsDrawer}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-sidebar/96 border-border text-foreground hover:bg-muted flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-colors"
            aria-label="Open 3D view options"
          >
            <LayoutGrid className="text-muted-foreground size-4" />
          </motion.button>
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
          <DrawerContent className="border-border/50 bg-card max-h-[92dvh] min-h-[72dvh] gap-0 overflow-hidden [overscroll-behavior:contain] rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              selectedCount === 0 ? "Design" : "Inspector",
              selectedCount === 0
                ? "Project and canvas settings"
                : "Selection properties",
              "brand"
            )}
            <div className="bg-card flex min-h-0 flex-1 flex-col overflow-hidden">
              <Inspector
                onResumeSelectedPath={() => {
                  onCloseInspector();
                  onResumeSelectedPath();
                }}
              />
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
          <DrawerContent className="border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              tab === "3d" ? "View" : "Tools",
              tab === "3d"
                ? "3D preview controls and project actions"
                : "Drawing, view and project actions",
              "brand"
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
              {tab === "2d" && (
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
              )}

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  View
                </p>
                <div className="border-border/50 bg-muted/28 flex items-center gap-1.5 rounded-[1rem] border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetMobileToolsOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] border py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "border-primary/30 bg-primary/12 text-primary shadow-sm"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-transparent"
                      )}
                    >
                      {nextTab === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
                {tab === "2d" && (
                  <button
                    onClick={() =>
                      onSetMobileRulersEnabled(!mobileRulersEnabled)
                    }
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
                )}
                {tab === "3d" && (
                  <button
                    onClick={() => onSetMobileGizmoEnabled(!mobileGizmoEnabled)}
                    className={cn(
                      "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-[1rem] border px-3 py-2.5 text-left transition-colors",
                      mobileGizmoEnabled
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div>
                      <p className="text-[11px] font-medium">Gizmo</p>
                      <p className="text-muted-foreground/75 pt-0.5 text-[10px]">
                        Show the axis helper in 3D preview
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
                        mobileGizmoEnabled
                          ? "bg-foreground/90 justify-end"
                          : "bg-border/80 justify-start"
                      )}
                    >
                      <span className="bg-background block size-5 rounded-full shadow-sm" />
                    </div>
                  </button>
                )}
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
          <DrawerContent className="border-border/60 bg-background max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              "View",
              "Switch mode or share this track",
              "brand"
            )}
            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
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
                        onSetReadOnlyMenuOpen(false);
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
                {tab === "2d" && (
                  <button
                    onClick={() =>
                      onSetMobileRulersEnabled(!mobileRulersEnabled)
                    }
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
                )}
                {tab === "3d" && (
                  <button
                    onClick={() => onSetMobileGizmoEnabled(!mobileGizmoEnabled)}
                    className={cn(
                      "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-[1rem] border px-3 py-2.5 text-left transition-colors",
                      mobileGizmoEnabled
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div>
                      <p className="text-[11px] font-medium">Gizmo</p>
                      <p className="text-muted-foreground/75 pt-0.5 text-[10px]">
                        Show the axis helper in 3D preview
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
                        mobileGizmoEnabled
                          ? "bg-foreground/90 justify-end"
                          : "bg-border/80 justify-start"
                      )}
                    >
                      <span className="bg-background block size-5 rounded-full shadow-sm" />
                    </div>
                  </button>
                )}
              </div>
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  Share
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/studio"
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all"
                  >
                    <ArrowRight className="size-4" />
                    <span className="text-[11px] leading-none font-medium">
                      Open Studio
                    </span>
                  </Link>
                  <button
                    onClick={onShare}
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all"
                  >
                    <Share2 className="size-4" />
                    <span className="text-[11px] leading-none font-medium">
                      Share
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
