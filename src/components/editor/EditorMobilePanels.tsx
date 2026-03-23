"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  LayoutGrid,
  Lock,
  PencilLine,
  Play,
  Redo2,
  RotateCcw,
  RotateCw,
  Scan,
  Share2,
  SlidersHorizontal,
  SquareMousePointer,
  Trash2,
  Unlock,
  Undo2,
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
import type { EditorTool } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  draftPathActive: boolean;
  draftPathClosed: boolean;
  draftPathLength: number;
  draftPathPointCount: number;
  hasPath: boolean;
  hasSelectedPolyline: boolean;
  pathBuilderPinnedOpen: boolean;
  mobileInspectorOpen: boolean;
  mobileMultiSelectEnabled: boolean;
  mobileGizmoEnabled: boolean;
  mobileRulersEnabled: boolean;
  mobileFlyModeActive: boolean;
  mobilePrecisionStep: number;
  mobilePrecisionStepLabel: string;
  mobileToolsOpen: boolean;
  mobileViewOpen: boolean;
  readOnly: boolean;
  readOnlyMenuOpen: boolean;
  singleSelectedShapeLabel: string | null;
  singleSelectionCanNudge: boolean;
  singleSelectionCanQuickAdjust: boolean;
  singleSelectionCanRotate: boolean;
  selectionLocked: boolean;
  selectedCount: number;
  saveStatusLabel: string;
  tab: EditorViewportTab;
  onCloseInspector: () => void;
  onFitView: () => void;
  onDeleteSelection: () => void;
  onCancelPath: () => void;
  onCloseLoop: () => void;
  onDuplicateSelection: () => void;
  onExitMobileMultiSelect: () => void;
  onFinishPath: () => void;
  onRedo: () => void;
  onToggleSelectionLock: () => void;
  onNudgeSelection: (dx: number, dy: number) => void;
  onOpenInspector: () => void;
  onOpenReadOnlyMenu: () => void;
  onOpenTools: () => void;
  onOpenView: () => void;
  onRotateSelection: (delta: number) => void;
  onResumeSelectedPath: () => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSelectTool: (tool: EditorTool) => void;
  onSetMobileToolsOpen: (open: boolean) => void;
  onSetMobileViewOpen: (open: boolean) => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  onShare: () => void;
  onStartFlyThrough: () => void;
  onStartNewProject: () => void;
  onUndo: () => void;
  onUndoPathPoint: () => void;
  onImport: () => void;
  onExport: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
  canRedo: boolean;
  canUndo: boolean;
}

function MobileQuickActionsOverlay({
  className,
  mobilePrecisionStep,
  mobilePrecisionStepLabel,
  onDeleteSelection,
  onDuplicateSelection,
  onNudgeSelection,
  onRotateSelection,
  onToggleSelectionLock,
  selectionLocked,
  singleSelectedShapeLabel,
  singleSelectionCanNudge,
  singleSelectionCanRotate,
}: {
  className: string;
  mobilePrecisionStep: number;
  mobilePrecisionStepLabel: string;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onNudgeSelection: (dx: number, dy: number) => void;
  onRotateSelection: (delta: number) => void;
  onToggleSelectionLock: () => void;
  selectionLocked: boolean;
  singleSelectedShapeLabel: string | null;
  singleSelectionCanNudge: boolean;
  singleSelectionCanRotate: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
            {expanded ? "Adjust" : "Quick actions"}
          </p>
          <p className="truncate text-[10px] text-white/55">
            {singleSelectedShapeLabel ?? "Selection"} ·{" "}
            {mobilePrecisionStepLabel} step
          </p>
        </div>
      </div>

      {!expanded ? (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={onDuplicateSelection}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Copy className="size-4" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={onToggleSelectionLock}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
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
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200"
          >
            <Trash2 className="size-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SlidersHorizontal className="size-4" />
            <span>Adjust</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setExpanded(false)}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/62 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
          <button
            onClick={() => onRotateSelection(-15)}
            disabled={!singleSelectionCanRotate}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <RotateCcw className="size-4" />
            <span>-15°</span>
          </button>
          <button
            onClick={() => onRotateSelection(15)}
            disabled={!singleSelectionCanRotate}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <RotateCw className="size-4" />
            <span>+15°</span>
          </button>
          <div className="flex items-center justify-center text-[9px] font-medium tracking-[0.08em] text-white/35 uppercase">
            Step
          </div>
          <button
            onClick={() => onNudgeSelection(-mobilePrecisionStep, 0)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <ArrowLeft className="size-4" />
            <span>Left</span>
          </button>
          <button
            onClick={() => onNudgeSelection(0, -mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <ArrowUp className="size-4" />
            <span>Up</span>
          </button>
          <button
            onClick={() => onNudgeSelection(0, mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <ArrowDown className="size-4" />
            <span>Down</span>
          </button>
          <button
            onClick={() => onNudgeSelection(mobilePrecisionStep, 0)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
          >
            <ArrowRight className="size-4" />
            <span>Right</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function EditorMobilePanels({
  activeTool,
  draftPathActive,
  draftPathClosed,
  draftPathLength,
  draftPathPointCount,
  hasPath,
  hasSelectedPolyline,
  pathBuilderPinnedOpen,
  mobileInspectorOpen,
  mobileMultiSelectEnabled,
  mobileGizmoEnabled,
  mobileRulersEnabled,
  mobileFlyModeActive,
  mobilePrecisionStep,
  mobilePrecisionStepLabel,
  mobileToolsOpen,
  mobileViewOpen,
  readOnly,
  readOnlyMenuOpen,
  singleSelectedShapeLabel,
  singleSelectionCanNudge,
  singleSelectionCanQuickAdjust,
  singleSelectionCanRotate,
  selectionLocked,
  selectedCount,
  saveStatusLabel,
  tab,
  onCloseInspector,
  onDeleteSelection,
  onCancelPath,
  onCloseLoop,
  onDuplicateSelection,
  onExitMobileMultiSelect,
  onFinishPath,
  onRedo,
  onToggleSelectionLock,
  onFitView,
  onNudgeSelection,
  onOpenInspector,
  onOpenReadOnlyMenu,
  onOpenTools,
  onOpenView,
  onRotateSelection,
  onResumeSelectedPath,
  onSetMobileRulersEnabled,
  onSetMobileGizmoEnabled,
  onSelectTool,
  onSetMobileToolsOpen,
  onSetMobileViewOpen,
  onSetReadOnlyMenuOpen,
  onShare,
  onStartFlyThrough,
  onStartNewProject,
  onUndo,
  onUndoPathPoint,
  onImport,
  onExport,
  onTabChange,
  canRedo,
  canUndo,
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

  const openViewDrawer = () => {
    blurActiveControl();
    onOpenView();
  };

  const runMobileAction = (action: () => void) => {
    blurActiveControl();
    action();
  };

  const runAfterClosingToolsDrawer = (action: () => void) => {
    blurActiveControl();
    onSetMobileToolsOpen(false);
    window.setTimeout(action, 0);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(max-width: 1023px) and (orientation: landscape)"
    );
    const updateLandscapeMobile = () =>
      setIsLandscapeMobile(mediaQuery.matches);
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

  const canOpenInspector = selectedCount <= 1 && !mobileMultiSelectEnabled;
  const showPathBuilderOverlay =
    !readOnly &&
    tab === "2d" &&
    activeTool === "polyline" &&
    (pathBuilderPinnedOpen || draftPathActive);
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
  const inspectorHint = canOpenInspector
    ? selectedCount > 0
      ? `${selectedCount} selected`
      : "Design settings"
    : "Finish multi-select to inspect";
  const handleMobileSelectButton = () => {
    if (mobileMultiSelectEnabled) {
      onExitMobileMultiSelect();
      return;
    }
    onSelectTool("select");
  };
  const showQuickAdjustOverlay =
    !readOnly &&
    tab === "2d" &&
    selectedCount === 1 &&
    singleSelectionCanQuickAdjust &&
    !mobileMultiSelectEnabled &&
    !showPathBuilderOverlay &&
    !showResumePathButton;

  const mobileDrawerHeader = (
    title: string,
    subtitle?: string,
    tone: "default" | "brand" = "default"
  ) => (
    <div className="border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-xs">
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
      {!readOnly && !mobileFlyModeActive && (
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
            className="pointer-events-auto flex w-full max-w-sm items-center gap-1 rounded-[1.35rem] border border-white/10 bg-slate-950/86 p-1.5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur landscape:max-w-66 landscape:gap-0.5 landscape:px-1 landscape:py-1"
          >
            <button
              onClick={handleMobileSelectButton}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                activeTool === "select" && !mobileMultiSelectEnabled
                  ? "bg-white text-slate-950"
                  : "text-white/72 hover:bg-white/10 hover:text-white"
              )}
            >
              <SquareMousePointer className="size-3.5" />
              <span>{mobileMultiSelectEnabled ? "Exit" : "Select"}</span>
            </button>
            <button
              onClick={openToolsDrawer}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <LayoutGrid className="size-3.5" />
              <span>Tools</span>
            </button>
            <div className="min-w-0 flex-[1.25]">
              <div className="mx-auto flex max-w-34 flex-col items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/8 px-1.5 py-1 text-center">
                <p className="text-[8px] font-medium tracking-[0.08em] text-white/52 uppercase">
                  {mobileStatusTitle}
                </p>
                <p className="max-w-full truncate text-[10px] leading-tight font-semibold text-white">
                  {mobileStatusValue}
                </p>
              </div>
            </div>
            <button
              onClick={openInspectorDrawer}
              disabled={!canOpenInspector}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                canOpenInspector
                  ? "text-white/72 hover:bg-white/10 hover:text-white"
                  : "text-white/38"
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Inspect</span>
            </button>
            <button
              onClick={openViewDrawer}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <Scan className="size-3.5" />
              <span>View</span>
            </button>
          </motion.div>
        </div>
      )}

      {readOnly && (
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
            className="pointer-events-auto flex w-full max-w-sm items-center gap-1 rounded-[1.35rem] border border-white/10 bg-slate-950/86 p-1.5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur"
          >
            <Link
              href="/studio"
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="size-3.5" />
              <span>Studio</span>
            </Link>
            <div className="min-w-0 flex-[1.1]">
              <div className="mx-auto flex max-w-32 flex-col items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/8 px-1.5 py-1 text-center">
                <p className="text-[8px] font-medium tracking-[0.08em] text-white/52 uppercase">
                  Mode
                </p>
                <p className="max-w-full truncate text-[10px] leading-tight font-semibold text-white">
                  {tab === "2d" ? "Canvas review" : "3D review"}
                </p>
                <p className="max-w-full truncate text-[9px] text-white/60">
                  Read-only track
                </p>
              </div>
            </div>
            <button
              onClick={onShare}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Share2 className="size-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={openReadOnlyDrawer}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Scan className="size-3.5" />
              <span>View</span>
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

      {showQuickAdjustOverlay && (
        <div
          className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
          style={{
            bottom: isLandscapeMobile
              ? "calc(4.7rem + env(safe-area-inset-bottom))"
              : "calc(5.15rem + env(safe-area-inset-bottom))",
          }}
        >
          <MobileQuickActionsOverlay
            className={mobileOverlaySurfaceClassName}
            mobilePrecisionStep={mobilePrecisionStep}
            mobilePrecisionStepLabel={mobilePrecisionStepLabel}
            onDeleteSelection={onDeleteSelection}
            onDuplicateSelection={onDuplicateSelection}
            onNudgeSelection={onNudgeSelection}
            onRotateSelection={onRotateSelection}
            onToggleSelectionLock={onToggleSelectionLock}
            selectionLocked={selectionLocked}
            singleSelectedShapeLabel={singleSelectedShapeLabel}
            singleSelectionCanNudge={singleSelectionCanNudge}
            singleSelectionCanRotate={singleSelectionCanRotate}
          />
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

            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={onUndoPathPoint}
                disabled={draftPathPointCount === 0}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <ArrowRight className="size-4 rotate-180" />
                <span>Undo</span>
              </button>
              <button
                onClick={onCloseLoop}
                disabled={draftPathPointCount < 3 || draftPathClosed}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <PencilLine className="size-4" />
                <span>Close loop</span>
              </button>
              <button
                onClick={onFinishPath}
                disabled={draftPathPointCount < 2}
                className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[10px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/25"
              >
                <PencilLine className="size-4" />
                <span>Finish</span>
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

      {!readOnly && (
        <Drawer
          open={mobileInspectorOpen}
          direction="bottom"
          modal
          onOpenChange={(open) => {
            if (!open) onCloseInspector();
          }}
        >
          <DrawerContent className="border-border/50 bg-card max-h-[92dvh] min-h-[72dvh] gap-0 overflow-hidden overscroll-contain rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              "Inspector",
              selectedCount === 0
                ? "Design settings and placed items"
                : "Selection properties and editing",
              "brand"
            )}
            <div className="bg-card min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
              <Inspector
                mobileInline
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
              "Tools",
              tab === "3d"
                ? "Project actions for the current 3D session"
                : "Drawing and project actions",
              "brand"
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  History
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => runMobileAction(onUndo)}
                    disabled={!canUndo}
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Undo2 className="size-4" />
                    <span className="text-[11px] leading-none font-medium">
                      Undo
                    </span>
                  </button>
                  <button
                    onClick={() => runMobileAction(onRedo)}
                    disabled={!canRedo}
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Redo2 className="size-4" />
                    <span className="text-[11px] leading-none font-medium">
                      Redo
                    </span>
                  </button>
                </div>
              </div>

              {tab === "2d" && (
                <div>
                  <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                    Drawing tools
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {mobileToolEntries
                      .filter((tool) => tool.id !== "grab")
                      .map((tool) => {
                        const active = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() =>
                              runMobileAction(() => onSelectTool(tool.id))
                            }
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all",
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
                      onClick={() =>
                        runAfterClosingToolsDrawer(actionItem.action)
                      }
                      className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
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

      {!readOnly && (
        <Drawer
          open={mobileViewOpen}
          direction="bottom"
          modal
          onOpenChange={onSetMobileViewOpen}
        >
          <DrawerContent className="border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              "View",
              "Canvas mode, guides and viewport controls",
              "brand"
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  Current mode
                </p>
                <div className="border-border/50 bg-muted/18 rounded-2xl border px-3 py-3">
                  <p className="text-foreground text-sm font-medium">
                    {tab === "2d" ? "2D canvas" : "3D preview"}
                  </p>
                  <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
                    {inspectorHint}. {saveStatusLabel}.
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  View mode
                </p>
                <div className="border-border/50 bg-muted/28 flex items-center gap-1.5 rounded-2xl border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetMobileViewOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] border py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "border-primary/30 bg-primary/12 text-primary shadow-xs"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-transparent"
                      )}
                    >
                      {nextTab === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={onFitView}
                  className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors"
                >
                  <div>
                    <p className="text-[11px] font-medium">Fit to field</p>
                    <p className="text-muted-foreground/75 pt-0.5 text-[10px]">
                      Center the current design in view
                    </p>
                  </div>
                  <Scan className="size-4" />
                </button>
                {tab === "2d" && (
                  <button
                    onClick={() =>
                      onSetMobileRulersEnabled(!mobileRulersEnabled)
                    }
                    className={cn(
                      "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
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
                      <span className="bg-background block size-5 rounded-full shadow-xs" />
                    </div>
                  </button>
                )}
                {tab === "3d" && (
                  <>
                    <button
                      onClick={onStartFlyThrough}
                      disabled={!hasPath}
                      className={cn(
                        "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
                        hasPath
                          ? "text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                          : "text-muted-foreground/45 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <p className="text-[11px] font-medium">Fly-through</p>
                        <p className="text-muted-foreground/75 pt-0.5 text-[10px]">
                          {hasPath
                            ? "Start the race-line preview camera"
                            : "Draw a path in 2D first to enable this"}
                        </p>
                      </div>
                      <Play className="size-4" />
                    </button>
                    <button
                      onClick={() =>
                        onSetMobileGizmoEnabled(!mobileGizmoEnabled)
                      }
                      className={cn(
                        "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
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
                        <span className="bg-background block size-5 rounded-full shadow-xs" />
                      </div>
                    </button>
                  </>
                )}
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
                <div className="border-border/50 bg-muted/18 flex items-center gap-1.5 rounded-2xl border p-1">
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
                          ? "bg-background text-foreground shadow-xs"
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
                      "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
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
                      <span className="bg-background block size-5 rounded-full shadow-xs" />
                    </div>
                  </button>
                )}
                {tab === "3d" && (
                  <button
                    onClick={() => onSetMobileGizmoEnabled(!mobileGizmoEnabled)}
                    className={cn(
                      "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
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
                      <span className="bg-background block size-5 rounded-full shadow-xs" />
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
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
                  >
                    <ArrowRight className="size-4" />
                    <span className="text-[11px] leading-none font-medium">
                      Open Studio
                    </span>
                  </Link>
                  <button
                    onClick={onShare}
                    className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
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
