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
  LayoutGrid,
  Lock,
  PencilLine,
  Plus,
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
import Inspector from "@/components/inspector/Inspector";
import { MultiSelectOverlay } from "@/components/editor/mobile/MultiSelectOverlay";
import { PathBuilderOverlay } from "@/components/editor/mobile/PathBuilderOverlay";
import { ViewControls } from "@/components/editor/mobile/ViewControls";
import { mobileToolEntries } from "@/components/editor/tool-icons";
import { MobileDrawer } from "@/components/MobileDrawer";
import type { EditorTool } from "@/lib/editor-tools";
import { getEditorMobilePanelsViewModel } from "@/lib/editor/mobile/view-model";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  activePresetLabel?: string | null;
  draftPathActive: boolean;
  draftPathClosed: boolean;
  draftPathLength: number;
  draftPathPointCount: number;
  hasPath: boolean;
  pathBuilderPinnedOpen: boolean;
  mobileInspectorOpen: boolean;
  mobileMultiSelectEnabled: boolean;
  mobileGizmoEnabled: boolean;
  mobileObstacleNumbersEnabled: boolean;
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
  canAddWaypoint?: boolean;
  canDeleteWaypoint?: boolean;
  canResumePathEditing?: boolean;
  singleSelectionCanRotate: boolean;
  selectionLocked: boolean;
  selectedCount: number;
  selectedGroupName?: string | null;
  saveStatusLabel: string;
  tab: EditorViewportTab;
  onCloseInspector: () => void;
  onFitView: () => void;
  onDeleteSelection: () => void;
  onAddWaypoint?: () => void;
  onGroupSelection: () => void;
  onCancelPath: () => void;
  onCloseLoop: () => void;
  onDuplicateSelection: () => void;
  onDeleteWaypoint?: () => void;
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
  onSetMobileObstacleNumbersEnabled: (enabled: boolean) => void;
  onSelectTool: (tool: EditorTool) => void;
  onSetMobileToolsOpen: (open: boolean) => void;
  onSetMobileViewOpen: (open: boolean) => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  onShare: () => void;
  onSetGroupName?: (name: string) => void;
  onStartFlyThrough: () => void;
  studioHref?: string;
  onUngroupSelection: () => void;
  onUndo: () => void;
  onUndoPathPoint: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
  canRedo: boolean;
  canUngroupSelection: boolean;
  canUndo: boolean;
}

function MobileQuickActionsOverlay({
  className,
  canResumePathEditing = false,
  mobilePrecisionStep,
  mobilePrecisionStepLabel,
  onDeleteSelection,
  onAddWaypoint,
  onResumeSelectedPath,
  onDuplicateSelection,
  onDeleteWaypoint,
  onNudgeSelection,
  onRotateSelection,
  onToggleSelectionLock,
  selectionLocked,
  singleSelectedShapeLabel,
  canAddWaypoint = false,
  canDeleteWaypoint = false,
  singleSelectionCanNudge,
  singleSelectionCanRotate,
}: {
  className: string;
  canResumePathEditing?: boolean;
  mobilePrecisionStep: number;
  mobilePrecisionStepLabel: string;
  onDeleteSelection: () => void;
  onAddWaypoint?: () => void;
  onResumeSelectedPath?: () => void;
  onDuplicateSelection: () => void;
  onDeleteWaypoint?: () => void;
  onNudgeSelection: (dx: number, dy: number) => void;
  onRotateSelection: (delta: number) => void;
  onToggleSelectionLock: () => void;
  selectionLocked: boolean;
  singleSelectedShapeLabel: string | null;
  canAddWaypoint?: boolean;
  canDeleteWaypoint?: boolean;
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
          <p className="truncate text-[11px] text-white/70">
            {canAddWaypoint
              ? "Add point on selected segment"
              : canDeleteWaypoint
                ? "Delete selected waypoint"
                : canResumePathEditing
                  ? "Resume or adjust this path"
                  : `${singleSelectedShapeLabel ?? "Selection"} · ${mobilePrecisionStepLabel} step`}
          </p>
        </div>
      </div>

      {!expanded ? (
        <div className="grid grid-cols-4 gap-1.5">
          {canAddWaypoint ? (
            <button
              onClick={onAddWaypoint}
              className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Plus className="size-4" />
              <span>Add point</span>
            </button>
          ) : canResumePathEditing ? (
            <button
              onClick={onResumeSelectedPath}
              className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <PencilLine className="size-4" />
              <span>Edit path</span>
            </button>
          ) : (
            <button
              onClick={onDuplicateSelection}
              className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Copy className="size-4" />
              <span>Duplicate</span>
            </button>
          )}
          <button
            onClick={onToggleSelectionLock}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            {selectionLocked ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            <span>{selectionLocked ? "Unlock" : "Lock"}</span>
          </button>
          <button
            onClick={canDeleteWaypoint ? onDeleteWaypoint : onDeleteSelection}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200"
          >
            <Trash2 className="size-4" />
            <span>{canDeleteWaypoint ? "Delete point" : "Delete"}</span>
          </button>
          <button
            onClick={() => setExpanded(true)}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <SlidersHorizontal className="size-4" />
            <span>Adjust</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setExpanded(false)}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/62 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </button>
          <button
            onClick={() => onRotateSelection(-15)}
            disabled={!singleSelectionCanRotate}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <RotateCcw className="size-4" />
            <span>-15°</span>
          </button>
          <button
            onClick={() => onRotateSelection(15)}
            disabled={!singleSelectionCanRotate}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
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
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowLeft className="size-4" />
            <span>Left</span>
          </button>
          <button
            onClick={() => onNudgeSelection(0, -mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowUp className="size-4" />
            <span>Up</span>
          </button>
          <button
            onClick={() => onNudgeSelection(0, mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowDown className="size-4" />
            <span>Down</span>
          </button>
          <button
            onClick={() => onNudgeSelection(mobilePrecisionStep, 0)}
            disabled={!singleSelectionCanNudge}
            className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
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
  activePresetLabel,
  canAddWaypoint = false,
  canDeleteWaypoint = false,
  canResumePathEditing = false,
  canRedo,
  canUngroupSelection,
  canUndo,
  draftPathActive,
  draftPathClosed,
  draftPathLength,
  draftPathPointCount,
  hasPath,
  pathBuilderPinnedOpen,
  mobileInspectorOpen,
  mobileMultiSelectEnabled,
  mobileGizmoEnabled,
  mobileObstacleNumbersEnabled,
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
  selectedGroupName,
  saveStatusLabel,
  tab,
  onCloseInspector,
  onAddWaypoint,
  onDeleteSelection,
  onDeleteWaypoint,
  onGroupSelection,
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
  onSetMobileObstacleNumbersEnabled,
  onSelectTool,
  onSetMobileToolsOpen,
  onSetMobileViewOpen,
  onSetReadOnlyMenuOpen,
  onShare,
  onSetGroupName,
  onStartFlyThrough,
  onUngroupSelection,
  onUndo,
  onUndoPathPoint,
  onTabChange,
  studioHref = "/studio",
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

  const canOpenInspector = !mobileMultiSelectEnabled;
  const {
    mobileStatusTitle,
    mobileStatusValue,
    showPathBuilderOverlay,
    showQuickAdjustOverlay,
  } = getEditorMobilePanelsViewModel({
    activePresetLabel,
    activeTool,
    draftPathActive,
    mobileMultiSelectEnabled,
    pathBuilderPinnedOpen,
    readOnly,
    selectedCount,
    tab,
  });
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
  const showQuickAdjustOverlayVisible =
    showQuickAdjustOverlay && singleSelectionCanQuickAdjust;

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
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
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
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <LayoutGrid className="size-3.5" />
              <span>Tools</span>
            </button>
            <div className="min-w-0 flex-[1.25]">
              <div className="mx-auto flex max-w-34 flex-col items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/8 px-1.5 py-1 text-center">
                <p className="text-[8px] font-medium tracking-[0.08em] text-white/52 uppercase">
                  {mobileStatusTitle}
                </p>
                <p className="max-w-full truncate text-[11px] leading-tight font-semibold text-white">
                  {mobileStatusValue}
                </p>
              </div>
            </div>
            <button
              onClick={openInspectorDrawer}
              disabled={!canOpenInspector}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
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
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
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
            <button
              onClick={openReadOnlyDrawer}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Scan className="size-3.5" />
              <span>View</span>
            </button>
            <button
              onClick={onShare}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Share2 className="size-3.5" />
              <span>Share</span>
            </button>
            <Link
              href="/studio"
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="size-3.5" />
              <span>Edit</span>
            </Link>
          </motion.div>
        </div>
      )}

      {showQuickAdjustOverlayVisible && (
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
            canResumePathEditing={canResumePathEditing}
            mobilePrecisionStep={mobilePrecisionStep}
            mobilePrecisionStepLabel={mobilePrecisionStepLabel}
            canAddWaypoint={canAddWaypoint}
            canDeleteWaypoint={canDeleteWaypoint}
            onAddWaypoint={onAddWaypoint}
            onResumeSelectedPath={onResumeSelectedPath}
            onDeleteSelection={onDeleteSelection}
            onDeleteWaypoint={onDeleteWaypoint}
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
          <PathBuilderOverlay
            className={mobileOverlaySurfaceClassName}
            draftPathClosed={draftPathClosed}
            draftPathLength={draftPathLength}
            draftPathPointCount={draftPathPointCount}
            onCancelPath={onCancelPath}
            onCloseLoop={onCloseLoop}
            onFinishPath={onFinishPath}
            onUndoPathPoint={onUndoPathPoint}
          />
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
          <MultiSelectOverlay
            canUngroupSelection={canUngroupSelection}
            className={mobileOverlaySurfaceClassName}
            onDeleteSelection={onDeleteSelection}
            onDuplicateSelection={onDuplicateSelection}
            onGroupSelection={onGroupSelection}
            onSetGroupName={onSetGroupName}
            onToggleSelectionLock={onToggleSelectionLock}
            onUngroupSelection={onUngroupSelection}
            selectedCount={selectedCount}
            selectedGroupName={selectedGroupName}
            selectionLocked={selectionLocked}
          />
        </div>
      )}

      {!readOnly && (
        <MobileDrawer
          open={mobileInspectorOpen}
          onOpenChange={(open) => {
            if (!open) onCloseInspector();
          }}
          title="Inspector"
          subtitle={
            selectedCount === 0
              ? "Design settings and placed items"
              : "Selection properties and editing"
          }
          contentClassName="h-[82dvh] max-h-[92dvh] min-h-[72dvh] overscroll-contain"
          bodyClassName="bg-card min-h-0 touch-pan-y overscroll-y-contain [-webkit-overflow-scrolling:touch] p-0"
        >
          <Inspector
            mobileInline
            onResumeSelectedPath={() => {
              onCloseInspector();
              onResumeSelectedPath();
            }}
          />
        </MobileDrawer>
      )}

      {!readOnly && (
        <MobileDrawer
          open={mobileToolsOpen}
          onOpenChange={onSetMobileToolsOpen}
          title="Tools"
          subtitle={
            tab === "3d"
              ? "Project actions for the current 3D session"
              : "Drawing and project actions"
          }
          bodyClassName="space-y-5 pt-3 pb-4"
        >
          <>
            <div>
              <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
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
                <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
                  Presets
                </p>
                <button
                  onClick={() => runMobileAction(() => onSelectTool("preset"))}
                  className={cn(
                    "border-border/50 flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                    activeTool === "preset"
                      ? "border-border/80 bg-muted/55 text-foreground"
                      : "bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Layout presets</p>
                    <p className="pt-1 text-[11px] leading-relaxed opacity-80">
                      {activePresetLabel
                        ? `Current preset: ${activePresetLabel}`
                        : "Place a curated multi-shape section in one tap."}
                    </p>
                  </div>
                  <LayoutGrid className="size-4 shrink-0" />
                </button>
              </div>
            )}
            {tab === "2d" && (
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
                  Drawing tools
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {mobileToolEntries
                    .filter(
                      (tool) => tool.id !== "grab" && tool.id !== "preset"
                    )
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
          </>
        </MobileDrawer>
      )}

      {!readOnly && (
        <MobileDrawer
          open={mobileViewOpen}
          onOpenChange={onSetMobileViewOpen}
          title="View"
          subtitle="Canvas mode, guides and viewport controls"
          bodyClassName="space-y-5 pt-3 pb-4"
        >
          <ViewControls
            hasPath={hasPath}
            inspectorHint={inspectorHint}
            mobileGizmoEnabled={mobileGizmoEnabled}
            mobileObstacleNumbersEnabled={mobileObstacleNumbersEnabled}
            mobileRulersEnabled={mobileRulersEnabled}
            onFitView={onFitView}
            onSetMobileGizmoEnabled={onSetMobileGizmoEnabled}
            onSetMobileObstacleNumbersEnabled={
              onSetMobileObstacleNumbersEnabled
            }
            onSetMobileRulersEnabled={onSetMobileRulersEnabled}
            onStartFlyThrough={onStartFlyThrough}
            onTabChange={onTabChange}
            saveStatusLabel={saveStatusLabel}
            closePanel={() => onSetMobileViewOpen(false)}
            tab={tab}
          />
        </MobileDrawer>
      )}

      {readOnly && (
        <MobileDrawer
          open={readOnlyMenuOpen}
          onOpenChange={onSetReadOnlyMenuOpen}
          title="View"
          subtitle="Canvas mode, guides and viewport controls"
          bodyClassName="space-y-5 pt-3 pb-4"
        >
          <ViewControls
            hasPath={hasPath}
            inspectorHint=""
            mobileGizmoEnabled={mobileGizmoEnabled}
            mobileObstacleNumbersEnabled={mobileObstacleNumbersEnabled}
            mobileRulersEnabled={mobileRulersEnabled}
            onFitView={onFitView}
            onSetMobileGizmoEnabled={onSetMobileGizmoEnabled}
            onSetMobileObstacleNumbersEnabled={
              onSetMobileObstacleNumbersEnabled
            }
            onSetMobileRulersEnabled={onSetMobileRulersEnabled}
            onShare={onShare}
            onStartFlyThrough={onStartFlyThrough}
            onTabChange={onTabChange}
            saveStatusLabel={saveStatusLabel}
            studioHref={studioHref}
            closePanel={() => onSetReadOnlyMenuOpen(false)}
            readOnly
            tab={tab}
          />
        </MobileDrawer>
      )}
    </>
  );
}
