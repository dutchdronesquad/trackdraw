"use client";

import { useCallback, useEffect, useState } from "react";
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
  RotateCcw,
  RotateCw,
  Scan,
  Share2,
  SlidersHorizontal,
  SquareMousePointer,
  Trash2,
  Unlock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Inspector from "@/components/inspector/Inspector";
import { MultiSelectOverlay } from "@/components/editor/mobile/MultiSelectOverlay";
import { PathBuilderOverlay } from "@/components/editor/mobile/PathBuilderOverlay";
import { ToolsControls } from "@/components/editor/mobile/ToolsControls";
import { ViewControls } from "@/components/editor/mobile/ViewControls";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import type { EditorTool, Translate } from "@/lib/editor/tool-registry";
import { getEditorMobilePanelsViewModel } from "@/lib/editor/mobile/view-model";
import type { TrackElementCatalogId } from "@/lib/track/elements/catalog";
import { formatMeasurement } from "@/lib/track/units";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  activePlacementElementId: Partial<Record<EditorTool, TrackElementCatalogId>>;
  activePresetLabel?: string | null;
  draftPathActive: boolean;
  draftPathClosed: boolean;
  draftPathLength: number;
  draftPathPointCount: number;
  hasPath: boolean;
  pathBuilderPinnedOpen: boolean;
  mobileInspectorOpen: boolean;
  mobileMultiSelectEnabled: boolean;
  snapEnabled: boolean;
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
  selectionHasLockedShapes: boolean;
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
  onResumeSelectedPath: (shapeId?: string) => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSetMobileObstacleNumbersEnabled: (enabled: boolean) => void;
  onToggleSnapEnabled: () => void;
  onSelectPlacementElement: (
    tool: EditorTool,
    entryId: TrackElementCatalogId
  ) => void;
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
  selectionHasLockedShapes,
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
  selectionHasLockedShapes: boolean;
  singleSelectedShapeLabel: string | null;
  canAddWaypoint?: boolean;
  canDeleteWaypoint?: boolean;
  singleSelectionCanNudge: boolean;
  singleSelectionCanRotate: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("editor.mobilePanels.editorPanels");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
            {expanded ? t("quickActions.adjustTitle") : t("quickActions.title")}
          </p>
          <p className="truncate text-[11px] text-white/70">
            {canAddWaypoint
              ? t("quickActions.hints.addPoint")
              : canDeleteWaypoint
                ? t("quickActions.hints.deleteWaypoint")
                : canResumePathEditing
                  ? t("quickActions.hints.resume")
                  : t("quickActions.hints.selectionStep", {
                      label:
                        singleSelectedShapeLabel ??
                        t("quickActions.hints.selectionFallback"),
                      step: mobilePrecisionStepLabel,
                    })}
          </p>
        </div>
      </div>

      {!expanded ? (
        <div className="grid grid-cols-4 gap-1.5">
          {canAddWaypoint ? (
            <button
              type="button"
              onClick={onAddWaypoint}
              disabled={selectionHasLockedShapes}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
            >
              <Plus className="size-4" />
              <span className="max-w-full truncate">
                {t("quickActions.actions.addPoint")}
              </span>
            </button>
          ) : canResumePathEditing ? (
            <button
              type="button"
              onClick={() => onResumeSelectedPath?.()}
              disabled={selectionHasLockedShapes}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
            >
              <PencilLine className="size-4" />
              <span className="max-w-full truncate">
                {t("quickActions.actions.editPath")}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onDuplicateSelection}
              disabled={selectionHasLockedShapes}
              className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
            >
              <Copy className="size-4" />
              <span className="max-w-full truncate">
                {t("quickActions.actions.duplicate")}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSelectionLock}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            {selectionLocked ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
            <span className="max-w-full truncate">
              {selectionLocked
                ? t("quickActions.actions.unlock")
                : t("quickActions.actions.lock")}
            </span>
          </button>
          <button
            type="button"
            onClick={canDeleteWaypoint ? onDeleteWaypoint : onDeleteSelection}
            disabled={selectionHasLockedShapes}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200 disabled:text-white/35"
          >
            <Trash2 className="size-4" />
            <span className="max-w-full truncate">
              {canDeleteWaypoint
                ? t("quickActions.actions.deletePoint")
                : t("quickActions.actions.delete")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            disabled={selectionHasLockedShapes}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <SlidersHorizontal className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.actions.adjust")}
            </span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/62 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.actions.back")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRotateSelection(-15)}
            disabled={!singleSelectionCanRotate}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <RotateCcw className="size-4" />
            <span className="max-w-full truncate">-15°</span>
          </button>
          <button
            type="button"
            onClick={() => onRotateSelection(15)}
            disabled={!singleSelectionCanRotate}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <RotateCw className="size-4" />
            <span className="max-w-full truncate">+15°</span>
          </button>
          <div className="flex items-center justify-center text-[9px] font-medium tracking-[0.08em] text-white/35 uppercase">
            {t("quickActions.adjust.step")}
          </div>
          <button
            type="button"
            onClick={() => onNudgeSelection(-mobilePrecisionStep, 0)}
            disabled={!singleSelectionCanNudge}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowLeft className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.adjust.left")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNudgeSelection(0, -mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowUp className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.adjust.up")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNudgeSelection(0, mobilePrecisionStep)}
            disabled={!singleSelectionCanNudge}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowDown className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.adjust.down")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNudgeSelection(mobilePrecisionStep, 0)}
            disabled={!singleSelectionCanNudge}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
          >
            <ArrowRight className="size-4" />
            <span className="max-w-full truncate">
              {t("quickActions.adjust.right")}
            </span>
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function EditorMobilePanels({
  activeTool,
  activePlacementElementId,
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
  snapEnabled,
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
  selectionHasLockedShapes,
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
  onToggleSnapEnabled,
  onSelectPlacementElement,
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
  const t = useTranslations("editor.mobilePanels.editorPanels");
  const tStatusBar = useTranslations("editor.statusBar");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const { unitSystem } = useMeasurementUnitSystem();
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

  const resumeSelectedPathFromInspector = useCallback(
    (shapeId: string) => {
      onCloseInspector();
      onResumeSelectedPath(shapeId);
    },
    [onCloseInspector, onResumeSelectedPath]
  );

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
    t: tShapes,
    tab,
  });
  const inspectorHint =
    selectedCount > 0
      ? tStatusBar("selected", { count: selectedCount })
      : t("inspector.designSettingsHint");
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
              type="button"
              onClick={handleMobileSelectButton}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5",
                activeTool === "select" && !mobileMultiSelectEnabled
                  ? "bg-white text-slate-950"
                  : "text-white/72 hover:bg-white/10 hover:text-white"
              )}
            >
              <SquareMousePointer className="size-3.5" />
              <span className="max-w-full truncate">
                {mobileMultiSelectEnabled ? t("nav.exit") : t("nav.select")}
              </span>
            </button>
            <button
              type="button"
              onClick={openToolsDrawer}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <LayoutGrid className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.tools")}</span>
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
              type="button"
              onClick={openInspectorDrawer}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.inspect")}</span>
            </button>
            <button
              type="button"
              onClick={openViewDrawer}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white landscape:gap-0.5 landscape:px-1.5 landscape:py-1.5"
            >
              <Scan className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.view")}</span>
            </button>
          </motion.div>
        </div>
      )}

      {readOnly && !mobileFlyModeActive && (
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
              type="button"
              onClick={openReadOnlyDrawer}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Scan className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.review")}</span>
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Share2 className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.share")}</span>
            </button>
            <Link
              href={studioHref}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="size-3.5" />
              <span className="max-w-full truncate">{t("nav.editCopy")}</span>
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
            selectionHasLockedShapes={selectionHasLockedShapes}
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
            draftPathLengthLabel={formatMeasurement(
              draftPathLength,
              unitSystem,
              { precision: 1 }
            )}
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
            hasLockedSelection={selectionHasLockedShapes}
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
          title={t("inspector.title")}
          subtitle={
            selectedCount === 0
              ? t("inspector.subtitles.empty")
              : t("inspector.subtitles.selected")
          }
          contentClassName="h-[82dvh] max-h-[92dvh] min-h-[72dvh] overscroll-contain"
          bodyClassName="bg-card min-h-0 touch-pan-y overscroll-y-contain [-webkit-overflow-scrolling:touch] p-0"
          repositionInputs
        >
          <Inspector
            mobileInline
            onResumeSelectedPath={resumeSelectedPathFromInspector}
          />
        </MobileDrawer>
      )}

      {!readOnly && (
        <MobileDrawer
          open={mobileToolsOpen}
          onOpenChange={onSetMobileToolsOpen}
          title={t("tools.title")}
          subtitle={
            tab === "3d"
              ? t("tools.subtitles.preview3d")
              : t("tools.subtitles.canvas2d")
          }
          bodyClassName="space-y-4 pt-3 pb-4"
        >
          <ToolsControls
            activeTool={activeTool}
            activePlacementElementId={activePlacementElementId}
            canRedo={canRedo}
            canUndo={canUndo}
            tab={tab}
            onRedo={onRedo}
            onSelectPlacementElement={onSelectPlacementElement}
            onSelectTool={onSelectTool}
            onUndo={onUndo}
          />
        </MobileDrawer>
      )}

      {!readOnly && (
        <MobileDrawer
          open={mobileViewOpen}
          onOpenChange={onSetMobileViewOpen}
          title={t("view.title")}
          subtitle={t("view.subtitle")}
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
            snapEnabled={snapEnabled}
            onToggleSnapEnabled={onToggleSnapEnabled}
            closePanel={() => onSetMobileViewOpen(false)}
            tab={tab}
          />
        </MobileDrawer>
      )}

      {readOnly && (
        <MobileDrawer
          open={readOnlyMenuOpen}
          onOpenChange={onSetReadOnlyMenuOpen}
          title={t("view.title")}
          subtitle={t("view.subtitle")}
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
