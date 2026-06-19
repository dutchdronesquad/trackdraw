"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccountProjectSync } from "./useAccountProjectSync";
import { useEditorDialogs } from "./useEditorDialogs";
import { useManualProjectSave } from "./useManualProjectSave";
import { useStarterExperience } from "./useStarterExperience";
import { EditorWorkspace } from "./EditorWorkspace";
import { EditorStarterOverlay } from "./EditorStarterOverlay";
import { EditorDialogsHost } from "./EditorDialogsHost";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";
import type { TrackPreview3DHandle } from "@/components/canvas/editor/TrackPreview3D";
import { getEditorShellSelectionState } from "@/lib/editor/shell-view-model";
import { catalogPlacementToolIds } from "@/lib/editor/placement-catalog";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";
import { type EditorTool } from "@/lib/editor/tool-registry";
import { loadProject } from "@/lib/projects";
import { downloadJsonFile } from "@/lib/export/download-json";
import { findPresetById } from "@/lib/planning/layout-presets";
import { useUserPresets } from "@/store/user-presets";
import type { TrackElementCatalogId } from "@/lib/track/elements/catalog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import {
  useDeveloperMode,
  useDeveloperModeShortcut,
} from "@/hooks/account/useDeveloperMode";
import { useUndoRedo } from "@/hooks/editor/useUndoRedo";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useEditorProjects } from "@/hooks/editor/useEditorProjects";
import { useCompleteProfile } from "@/hooks/account/useCompleteProfile";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import type { EditorView } from "@/lib/editor/view";
import {
  useSessionActions,
  useTrackActions,
  useUiActions,
} from "@/store/actions";
import { useEditor } from "@/store/editor";
import {
  selectDesignShapes,
  selectHasPath,
  selectSelectionLocked,
  selectShapeRecordMap,
} from "@/store/selectors";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  hasLockedSelection,
  showLockedSelectionActionBlockedToast,
} from "@/components/canvas/editor/useTrackCanvasShortcuts";

const Header = dynamic(() => import("./Header"), { ssr: false });
const SharedHeader = dynamic(() => import("./viewer/Header"), { ssr: false });
const Toolbar = dynamic(() => import("./Toolbar"), { ssr: false });
const PerformanceHud = dynamic(() => import("./PerformanceHud"), {
  ssr: false,
});

const EditorMobilePanels = dynamic(
  () =>
    import("@/components/editor/mobile/Panels").then((mod) => ({
      default: mod.Panels,
    })),
  { ssr: false }
);

const SharedMobilePanels = dynamic(
  () => import("@/components/editor/viewer/MobilePanels"),
  { ssr: false }
);

const SIDEBAR_COLLAPSED_STORAGE_KEY = "trackdraw.sidebarCollapsed";

function createFirstUseBlankDesign() {
  const design = createDefaultDesign();
  return {
    ...design,
    title: "",
    description: "",
  };
}

export default function EditorShell({
  readOnly = false,
  seedToken,
  initialTab = "2d",
  studioHref,
  existingShareMode = false,
}: {
  readOnly?: boolean;
  seedToken?: string;
  initialTab?: EditorView;
  studioHref?: string;
  existingShareMode?: boolean;
}) {
  usePerfMetric("render:EditorShell");
  useDeveloperModeShortcut();

  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { enabled: developerModeEnabled } = useDeveloperMode();
  const { unitSystem } = useMeasurementUnitSystem();
  const selection = useEditor((state) => state.session.selection);
  const design = useEditor((state) => state.track.design);
  const activeTool = useEditor((state) => state.ui.activeTool);
  const activePresetId = useEditor((state) => state.ui.activePresetId);
  const activePlacementElementId = useEditor(
    (state) => state.ui.activePlacementElementId
  );
  const snapEnabled = useEditor((state) => state.ui.snapEnabled);
  const {
    duplicateShapes,
    groupSelection,
    insertPolylinePoint,
    nudgeShapes,
    removeShapes,
    removePolylinePoint,
    replaceDesign,
    rotateShapes,
    setGroupName,
    setShapesLocked,
    ungroupSelection,
  } = useTrackActions();
  const {
    setActiveTool,
    setActivePlacementElementId,
    setActivePresetId,
    setSegmentSelection,
    toggleSnapEnabled,
    setVertexSelection,
  } = useUiActions();
  const { setSelection } = useSessionActions();
  const historyPaused = useEditor((state) => state.session.historyPaused);
  const interactionSessionDepth = useEditor(
    (state) => state.session.interactionSessionDepth
  );
  const designShapes = useEditor(selectDesignShapes);
  const hasPath = useEditor(selectHasPath);
  const shapeById = useEditor(selectShapeRecordMap);
  const selectionLocked = useEditor(selectSelectionLocked);
  const segmentSelection = useEditor((state) => state.ui.segmentSelection);
  const vertexSelection = useEditor((state) => state.ui.vertexSelection);
  const userPresets = useUserPresets((state) => state.userPresets);
  const activePreset = findPresetById(activePresetId, userPresets);
  const {
    activePresetLabel,
    canAddSelectedPolylineWaypoint,
    canDeleteSelectedPolylineWaypoint,
    canUngroupSelection,
    mobilePrecisionStep,
    mobilePrecisionStepLabel,
    selectedGroupName,
    selectedPolylineSegment,
    selectedPolylineVertex,
    singleSelectedShape,
    singleSelectedShapeLabel,
    singleSelectionCanRotate,
  } = getEditorShellSelectionState({
    activePresetName: activePreset?.name ?? null,
    designGridStep: design.field.gridStep,
    segmentSelection,
    selection,
    shapeById,
    unitSystem,
    vertexSelection,
  });
  const isMobile = useIsMobile();
  const { data: authSession } = authClient.useSession();
  const authUser = authSession?.user ?? null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canvasRef = useRef<TrackCanvasHandle>(null);
  const preview3DRef = useRef<TrackPreview3DHandle>(null);
  const [tab, setTab] = useState<EditorView>(initialTab);
  const [hasVisited3D, setHasVisited3D] = useState(initialTab === "3d");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [snapActive, setSnapActive] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileViewOpen, setMobileViewOpen] = useState(false);
  const [readOnlyMenuOpen, setReadOnlyMenuOpen] = useState(false);
  const [mobileRulersEnabled, setMobileRulersEnabled] = useState(false);
  const [mobileGizmoEnabled, setMobileGizmoEnabled] = useState(!readOnly);
  const [showObstacleNumbers, setShowObstacleNumbers] = useState(readOnly);
  const [mobileMultiSelectEnabled, setMobileMultiSelectEnabled] =
    useState(false);
  const [mobileDraftPathState, setMobileDraftPathState] = useState({
    active: false,
    canClose: false,
    closed: false,
    length: 0,
    pointCount: 0,
  });
  const [mobilePathBuilderPinnedOpen, setMobilePathBuilderPinnedOpen] =
    useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentBoolean(
    SIDEBAR_COLLAPSED_STORAGE_KEY
  );
  const [pendingFlyThroughStart, setPendingFlyThroughStart] = useState(false);
  const [mobileFlyModeActive, setMobileFlyModeActive] = useState(false);

  const {
    shareOpen,
    setShareOpen,
    exportOpen,
    setExportOpen,
    importOpen,
    setImportOpen,
    shortcutsOpen,
    setShortcutsOpen,
    newProjectOpen,
    setNewProjectOpen,
    projectManagerOpen,
    setProjectManagerOpen,
    presetPickerOpen,
    setPresetPickerOpen,
    openNewProjectDialog,
  } = useEditorDialogs({
    isMobile,
    setMobileToolsOpen,
  });

  const handleSeedTokenImported = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("token");
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams]);

  const {
    projects,
    setProjects,
    restorePoints,
    setRestorePoints,
    activeRestorePointId,
    setActiveRestorePointId,
    saveStatusLabel,
    lastSnapshotLabel,
    setSaveStatusLabel,
    initialized,
    handleSaveSnapshot,
    handleOpenProject,
    handleDeleteProject,
    handleDeleteProjects,
    handleRenameProject,
    handleRestorePoint,
    handleDeleteRestorePoint,
    snapshotCurrentDesign,
  } = useEditorProjects({
    readOnly,
    seedToken,
    design,
    historyPaused,
    interactionSessionDepth,
    replaceDesign,
    onSeedTokenImported: handleSeedTokenImported,
  });

  // Sync tab when initialTab prop changes (e.g. ShareViewer navigates ?view=3d via Link)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(initialTab);
  }, [initialTab]);

  const {
    accountProjects,
    accountProjectsLoading,
    accountProjectsError,
    cloudProjectsAvailable,
    accountShares,
    accountSharesLoading,
    syncingProjectId,
    projectSyncMetaById,
    headerStatus,
    isAccountProject,
    syncDesignToAccount,
    handleRevokeShare,
    markProjectSyncFailed,
    handleSyncProject,
    handleOpenAccountProject,
    projectVersionConflict,
    handleKeepLocalConflictCopy,
    handleOpenCloudConflictVersion,
    refreshAccountShares,
  } = useAccountProjectSync({
    authUserId: authUser?.id ?? null,
    readOnly,
    design,
    projectManagerOpen,
    historyPaused,
    interactionSessionDepth,
    snapshotCurrentDesign,
    replaceDesign,
    setProjects,
    setRestorePoints,
    setActiveRestorePointId,
    setSaveStatusLabel,
  });

  const currentProjectSyncMeta = projectSyncMetaById[design.id];
  const { handleManualSave } = useManualProjectSave({
    readOnly,
    design,
    isAccountProject,
    currentProjectSyncMeta,
    handleSaveSnapshot,
    syncDesignToAccount,
    markProjectSyncFailed,
    setSaveStatusLabel,
  });

  const {
    completeProfileOpen,
    handleCompleteProfileOpenChange,
    handleCompleteProfileSave,
  } = useCompleteProfile({ readOnly, authUser });

  const handleOpenAccountProjectFromDialog = useCallback(
    async (projectId: string) => {
      const opened = await handleOpenAccountProject(projectId);
      if (opened) {
        setProjectManagerOpen(false);
      }
    },
    [handleOpenAccountProject, setProjectManagerOpen]
  );

  const handleTabChange = useCallback(
    (nextTab: EditorView) => {
      setTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextTab);
      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const setActiveEditorTool = useCallback(
    (tool: string) => {
      setActiveTool(tool as EditorTool);
    },
    [setActiveTool]
  );

  const {
    setStarterDismissed,
    starterMode,
    shouldShowStarter: starterShouldShow,
    gateHintDismissed,
    desktopPathHintDismissed,
    desktopPreviewHintDismissed,
    review3DHintDismissed,
    postPathNudgeDismissed,
    showPostPathNudge,
    dismissGateHint,
    dismissDesktopPathHint,
    dismissDesktopPreviewHint,
    dismissReview3DHint,
    dismissPostPathNudge,
    applyStarterDesign,
    applyStarterLayout,
  } = useStarterExperience({
    readOnly,
    authUserId: authUser?.id ?? null,
    cloudProjectsAvailable,
    design,
    designShapeCount: designShapes.length,
    hasPath,
    syncDesignToAccount,
    markProjectSyncFailed,
    setSaveStatusLabel,
    replaceDesign,
    handleTabChange: (nextTab) => handleTabChange(nextTab),
    resetSelectionState: () => {
      setSelection([]);
      setMobileMultiSelectEnabled(false);
      setMobilePathBuilderPinnedOpen(false);
    },
    setActiveTool: setActiveEditorTool,
    fitCanvas: () => canvasRef.current?.fitToWindow(),
    closeProjectAndToolSurfaces: () => {
      setProjectManagerOpen(false);
      setMobileToolsOpen(false);
    },
    createBlankDesign: createFirstUseBlankDesign,
  });

  const shouldShowStarter = initialized && starterShouldShow;

  // Keep the mobile inspector closed until explicitly opened from the mobile UI.
  useEffect(() => {
    if (selection.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileInspectorOpen(false);
      setMobileMultiSelectEnabled(false);
    }
  }, [selection]);

  useEffect(() => {
    if (activeTool === "polyline" || mobileDraftPathState.active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobilePathBuilderPinnedOpen(false);
  }, [activeTool, mobileDraftPathState.active]);

  const handlePlacementElementSelect = useCallback(
    (tool: EditorTool, entryId: TrackElementCatalogId) => {
      setSelection([]);
      setMobileMultiSelectEnabled(false);
      setMobilePathBuilderPinnedOpen(false);
      setActivePlacementElementId(tool, entryId);
      setActiveTool(tool);
      setMobileToolsOpen(false);
    },
    [
      setActivePlacementElementId,
      setActiveTool,
      setMobileMultiSelectEnabled,
      setMobilePathBuilderPinnedOpen,
      setMobileToolsOpen,
      setSelection,
    ]
  );

  useEffect(() => {
    if (!pendingFlyThroughStart || tab !== "3d") return;

    let frameId = 0;

    const tryStart = () => {
      if (preview3DRef.current) {
        preview3DRef.current.startFlyThrough();
        setPendingFlyThroughStart(false);
        return;
      }
      frameId = window.requestAnimationFrame(tryStart);
    };

    frameId = window.requestAnimationFrame(tryStart);
    return () => window.cancelAnimationFrame(frameId);
  }, [pendingFlyThroughStart, tab]);

  useEffect(() => {
    if (tab === "3d") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasVisited3D(true);
    }
  }, [tab]);

  const handleMobileMultiSelectStart = useCallback(
    (shapeId: string) => {
      setMobileMultiSelectEnabled(true);
      setActiveTool("select");
      setSelection(
        selection.includes(shapeId) ? selection : [...selection, shapeId]
      );
    },
    [selection, setActiveTool, setSelection]
  );

  const handleResumeSelectedPath = useCallback(
    (shapeId: string) => {
      const shape = shapeById[shapeId];
      if (!shape || shape.kind !== "polyline" || shape.locked) return;
      handleTabChange("2d");
      canvasRef.current?.resumePolylineEditing(shapeId);
    },
    [handleTabChange, shapeById]
  );

  const openPresetPicker = useCallback(() => {
    setPresetPickerOpen(true);
  }, [setPresetPickerOpen]);

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      setSelection([]);
      setMobileMultiSelectEnabled(false);
      setMobilePathBuilderPinnedOpen(false);
      setActivePresetId(presetId);
      setActiveTool("preset");
      setMobileToolsOpen(false);
      setPresetPickerOpen(false);
    },
    [setActivePresetId, setActiveTool, setPresetPickerOpen, setSelection]
  );

  const handleExportProject = useCallback(
    (projectId: string) => {
      try {
        const exportDesign =
          projectId === design.id ? design : loadProject(projectId);
        if (!exportDesign) {
          toast.error("Export failed", {
            description:
              "TrackDraw could not load this local project. Open it first or choose another saved project.",
          });
          return;
        }

        const serialized = serializeDesign(exportDesign);
        const baseName = (exportDesign.title.trim() || "track").replace(
          /[^a-z0-9-_]+/gi,
          "_"
        );

        downloadJsonFile(`${baseName}.json`, serialized);
        toast.success("Project JSON exported");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Export failed";
        toast.error("Export failed", { description: message });
      }
    },
    [design]
  );

  return (
    <>
      <div className="bg-background text-foreground relative flex h-dvh overflow-hidden">
        {!readOnly && (
          <Toolbar
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            onOpenProjectManager={() => setProjectManagerOpen(true)}
            onOpenPresets={openPresetPicker}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          />
        )}

        {/* ── Main column ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {readOnly ? (
            <SharedHeader
              tab={tab}
              onTabChange={handleTabChange}
              studioHref={studioHref}
              showObstacleNumbers={showObstacleNumbers}
              onToggleObstacleNumbers={() =>
                setShowObstacleNumbers((current) => !current)
              }
            />
          ) : (
            <Header
              tab={tab}
              onTabChange={handleTabChange}
              onShare={() => setShareOpen(true)}
              onExport={() => setExportOpen(true)}
              onImport={() => setImportOpen(true)}
              onOpenProjectManager={() => setProjectManagerOpen(true)}
              onSaveSnapshot={() => void handleManualSave()}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              readOnly={false}
              hideTabsOnMobile
              collapsed={sidebarCollapsed}
              onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
              title={design.title || "Untitled track"}
              studioHref={studioHref}
              lastSnapshotLabel={lastSnapshotLabel}
              statusLabel={headerStatus?.label}
              statusTone={headerStatus?.tone}
              onRetrySync={
                isAccountProject && currentProjectSyncMeta?.status === "failed"
                  ? () => void handleSyncProject(design.id)
                  : undefined
              }
              showObstacleNumbers={showObstacleNumbers}
              onToggleObstacleNumbers={() =>
                setShowObstacleNumbers((current) => !current)
              }
              selectionLabel={
                selection.length > 0
                  ? `${selection.length} selected`
                  : tab === "3d"
                    ? "3D preview"
                    : "2D canvas"
              }
            />
          )}

          {/* ── Workspace (canvas + inspector) ───────────────── */}
          <EditorWorkspace
            tab={tab}
            readOnly={readOnly}
            isMobile={isMobile}
            canvasRef={canvasRef}
            preview3DRef={preview3DRef}
            hasVisited3D={hasVisited3D}
            mobileRulersEnabled={mobileRulersEnabled}
            mobileMultiSelectEnabled={mobileMultiSelectEnabled}
            showObstacleNumbers={showObstacleNumbers}
            mobileGizmoEnabled={mobileGizmoEnabled}
            cursorPos={cursorPos}
            snapActive={snapActive}
            onCursorChange={setCursorPos}
            onDraftPathStateChange={setMobileDraftPathState}
            onSnapChange={setSnapActive}
            onMobileMultiSelectStart={handleMobileMultiSelectStart}
            onFlyModeChange={setMobileFlyModeActive}
            onResumeSelectedPath={handleResumeSelectedPath}
            overlay={
              <EditorStarterOverlay
                readOnly={readOnly}
                isMobile={isMobile}
                shouldShowStarter={shouldShowStarter}
                onDismissStarter={() => setStarterDismissed(true)}
                starterMode={starterMode}
                tab={tab}
                designShapeCount={designShapes.length}
                activeTool={activeTool}
                hasPath={hasPath}
                gateHintDismissed={gateHintDismissed}
                onDismissGateHint={dismissGateHint}
                desktopPathHintDismissed={desktopPathHintDismissed}
                onDismissDesktopPathHint={dismissDesktopPathHint}
                desktopPreviewHintDismissed={desktopPreviewHintDismissed}
                onDismissDesktopPreviewHint={dismissDesktopPreviewHint}
                review3DHintDismissed={review3DHintDismissed}
                onDismissReview3DHint={dismissReview3DHint}
                showPostPathNudge={showPostPathNudge}
                postPathNudgeDismissed={postPathNudgeDismissed}
                onDismissPostPathNudge={dismissPostPathNudge}
                onApplyStarterDesign={applyStarterDesign}
                onApplyStarterLayout={applyStarterLayout}
                onStartPathTool={() => setActiveTool("polyline")}
                onGoTo2DAndStartPath={() => {
                  handleTabChange("2d");
                  setActiveTool("polyline");
                }}
                onShareAndDismissReview={() => {
                  setShareOpen(true);
                  dismissReview3DHint();
                }}
                onGoTo3DAndDismissNudge={() => {
                  handleTabChange("3d");
                  dismissPostPathNudge();
                }}
              />
            }
          />
        </div>

        {isMobile && !readOnly ? (
          <EditorMobilePanels
            activeTool={activeTool}
            activePlacementElementId={activePlacementElementId}
            activePresetLabel={activePresetLabel}
            draftPathActive={mobileDraftPathState.active}
            draftPathClosed={mobileDraftPathState.closed}
            draftPathLength={mobileDraftPathState.length}
            draftPathPointCount={mobileDraftPathState.pointCount}
            hasPath={hasPath}
            pathBuilderPinnedOpen={mobilePathBuilderPinnedOpen}
            mobileInspectorOpen={mobileInspectorOpen}
            mobileToolsOpen={mobileToolsOpen}
            mobileViewOpen={mobileViewOpen}
            mobileMultiSelectEnabled={mobileMultiSelectEnabled}
            snapEnabled={snapEnabled}
            mobileGizmoEnabled={mobileGizmoEnabled}
            mobileObstacleNumbersEnabled={showObstacleNumbers}
            mobileRulersEnabled={mobileRulersEnabled}
            mobileFlyModeActive={mobileFlyModeActive}
            mobilePrecisionStep={mobilePrecisionStep}
            mobilePrecisionStepLabel={mobilePrecisionStepLabel}
            readOnly={readOnly}
            readOnlyMenuOpen={readOnlyMenuOpen}
            studioHref={studioHref}
            singleSelectedShapeLabel={singleSelectedShapeLabel}
            singleSelectionCanNudge={Boolean(
              singleSelectedShape && !selectionLocked
            )}
            singleSelectionCanQuickAdjust={Boolean(
              singleSelectedShape &&
              (!singleSelectedShape.locked ||
                singleSelectedShape.kind !== "polyline")
            )}
            canAddWaypoint={canAddSelectedPolylineWaypoint}
            canDeleteWaypoint={canDeleteSelectedPolylineWaypoint}
            canResumePathEditing={Boolean(
              singleSelectedShape?.kind === "polyline" &&
              !singleSelectedShape.locked
            )}
            singleSelectionCanRotate={singleSelectionCanRotate}
            selectionLocked={selectionLocked}
            selectionHasLockedShapes={selection.some((id) =>
              Boolean(shapeById[id]?.locked)
            )}
            selectedCount={selection.length}
            selectedGroupName={selectedGroupName}
            saveStatusLabel={saveStatusLabel}
            tab={tab}
            onCloseInspector={() => setMobileInspectorOpen(false)}
            onFitView={() => canvasRef.current?.fitToWindow()}
            onCancelPath={() => {
              canvasRef.current?.cancelDraftPath();
              setMobilePathBuilderPinnedOpen(false);
              setActiveTool("select");
            }}
            onCloseLoop={() => canvasRef.current?.closeDraftLoop()}
            onFinishPath={() => {
              canvasRef.current?.finishDraftPath(false);
              setMobilePathBuilderPinnedOpen(false);
            }}
            onOpenInspector={() => {
              setMobileToolsOpen(false);
              setMobileMultiSelectEnabled(false);
              setMobileInspectorOpen(true);
            }}
            onResumeSelectedPath={() => {
              const selectedShape =
                selection.length === 1 ? shapeById[selection[0]] : null;
              if (!selectedShape || selectedShape.kind !== "polyline") return;
              setMobilePathBuilderPinnedOpen(true);
              canvasRef.current?.resumePolylineEditing(selectedShape.id);
            }}
            onOpenReadOnlyMenu={() => setReadOnlyMenuOpen(true)}
            onOpenTools={() => {
              setMobileInspectorOpen(false);
              setMobileViewOpen(false);
              setMobileToolsOpen(true);
            }}
            onOpenView={() => {
              setMobileInspectorOpen(false);
              setMobileToolsOpen(false);
              setMobileViewOpen(true);
            }}
            onUndoPathPoint={() => canvasRef.current?.undoDraftPoint()}
            onDeleteSelection={() => {
              if (!selection.length) return;
              if (hasLockedSelection(selection, shapeById)) {
                showLockedSelectionActionBlockedToast("delete");
                return;
              }
              removeShapes(selection);
            }}
            onAddWaypoint={() => {
              const shape = singleSelectedShape;
              const target = selectedPolylineSegment;
              if (!shape || shape.kind !== "polyline" || !target) return;
              const start = shape.points[target.segmentIndex];
              const nextIndex =
                target.segmentIndex === shape.points.length - 1
                  ? 0
                  : target.segmentIndex + 1;
              const end = shape.points[nextIndex];
              if (!start || !end) return;

              const insertIndex =
                shape.closed && target.segmentIndex === shape.points.length - 1
                  ? shape.points.length
                  : target.segmentIndex + 1;

              insertPolylinePoint(shape.id, insertIndex, {
                x: +target.point.x.toFixed(2),
                y: +target.point.y.toFixed(2),
                z: +(((start.z ?? 0) + (end.z ?? 0)) / 2).toFixed(2),
              });
              setSegmentSelection(null);
              setVertexSelection({ shapeId: shape.id, idx: insertIndex });
            }}
            onGroupSelection={() => {
              if (selection.length < 2) return;
              groupSelection(selection);
            }}
            onDuplicateSelection={() => {
              if (!selection.length) return;
              if (hasLockedSelection(selection, shapeById)) {
                showLockedSelectionActionBlockedToast("duplicate");
                return;
              }
              duplicateShapes(selection);
            }}
            onDeleteWaypoint={() => {
              const shape = singleSelectedShape;
              const target = selectedPolylineVertex;
              if (!shape || shape.kind !== "polyline" || !target) return;
              removePolylinePoint(shape.id, target.idx);
              setVertexSelection(null);
            }}
            onUndo={undo}
            onRedo={redo}
            onNudgeSelection={(dx, dy) => {
              if (!selection.length) return;
              nudgeShapes(selection, dx, dy);
            }}
            onRotateSelection={(delta) => {
              if (!selection.length) return;
              rotateShapes(selection, delta);
            }}
            onToggleSelectionLock={() => {
              if (!selection.length) return;
              setShapesLocked(selection, !selectionLocked);
            }}
            onSetMobileGizmoEnabled={setMobileGizmoEnabled}
            onSetMobileObstacleNumbersEnabled={setShowObstacleNumbers}
            onSetMobileRulersEnabled={setMobileRulersEnabled}
            onToggleSnapEnabled={toggleSnapEnabled}
            onExitMobileMultiSelect={() => {
              setMobileMultiSelectEnabled(false);
              setSelection([]);
            }}
            onSelectPlacementElement={handlePlacementElementSelect}
            onSelectTool={(tool) => {
              setSelection([]);
              setMobileMultiSelectEnabled(false);
              if (tool === "preset") {
                setMobileToolsOpen(false);
                setPresetPickerOpen(true);
                return;
              }
              setMobilePathBuilderPinnedOpen(tool === "polyline");
              setActiveTool(tool);
              // Keep drawer open for catalog tools so the type list stays visible
              if (!catalogPlacementToolIds.includes(tool)) {
                setMobileToolsOpen(false);
              }
            }}
            onSetMobileToolsOpen={setMobileToolsOpen}
            onSetMobileViewOpen={setMobileViewOpen}
            onSetReadOnlyMenuOpen={setReadOnlyMenuOpen}
            onShare={() => {
              setShareOpen(true);
              setReadOnlyMenuOpen(false);
            }}
            onSetGroupName={(name) => {
              if (!selection.length) return;
              setGroupName(selection, name);
            }}
            onStartFlyThrough={() => {
              handleTabChange("3d");
              setMobileViewOpen(false);
              setPendingFlyThroughStart(true);
            }}
            onUngroupSelection={() => {
              if (!selection.length) return;
              ungroupSelection(selection);
            }}
            onTabChange={(nextTab) => {
              handleTabChange(nextTab);
              if (nextTab !== "2d") {
                setMobilePathBuilderPinnedOpen(false);
              }
              setMobileInspectorOpen(false);
              setMobileToolsOpen(false);
              setMobileViewOpen(false);
              setReadOnlyMenuOpen(false);
            }}
            canUndo={canUndo}
            canRedo={canRedo}
            canUngroupSelection={canUngroupSelection}
          />
        ) : null}

        {isMobile && readOnly ? (
          <SharedMobilePanels
            hasPath={hasPath}
            mobileFlyModeActive={mobileFlyModeActive}
            mobileGizmoEnabled={mobileGizmoEnabled}
            mobileObstacleNumbersEnabled={showObstacleNumbers}
            mobileRulersEnabled={mobileRulersEnabled}
            onFitView={() => canvasRef.current?.fitToWindow()}
            onSetMobileGizmoEnabled={setMobileGizmoEnabled}
            onSetMobileObstacleNumbersEnabled={setShowObstacleNumbers}
            onSetMobileRulersEnabled={setMobileRulersEnabled}
            onShare={() => {
              setShareOpen(true);
              setReadOnlyMenuOpen(false);
            }}
            onStartFlyThrough={() => {
              handleTabChange("3d");
              setPendingFlyThroughStart(true);
            }}
            onTabChange={handleTabChange}
            onSetReadOnlyMenuOpen={setReadOnlyMenuOpen}
            readOnlyMenuOpen={readOnlyMenuOpen}
            saveStatusLabel={saveStatusLabel}
            studioHref={studioHref}
            tab={tab}
          />
        ) : null}

        <EditorDialogsHost
          isMobile={isMobile}
          activeDesignId={design.id}
          shareOpen={shareOpen}
          onShareOpenChange={setShareOpen}
          hasPath={hasPath}
          shareProjectId={isAccountProject ? design.id : null}
          existingShareMode={existingShareMode}
          onRefreshAccountShares={refreshAccountShares}
          onShareExportJson={() => {
            setShareOpen(false);
            setExportOpen(true);
          }}
          importOpen={importOpen}
          onImportOpenChange={setImportOpen}
          onImportBeforeConfirm={snapshotCurrentDesign}
          onImportBackupCurrent={() => {
            setImportOpen(false);
            setExportOpen(true);
          }}
          exportOpen={exportOpen}
          onExportOpenChange={setExportOpen}
          canvasRef={canvasRef}
          preview3DRef={preview3DRef}
          activeTab={tab}
          exportProjectId={isAccountProject ? design.id : null}
          onExportRequest3DView={() => handleTabChange("3d")}
          shortcutsOpen={shortcutsOpen}
          onShortcutsOpenChange={setShortcutsOpen}
          newProjectOpen={newProjectOpen}
          onNewProjectOpenChange={setNewProjectOpen}
          newProjectHasContent={Boolean(
            design.title.trim() || designShapes.length
          )}
          onNewProject={() => {
            snapshotCurrentDesign();
            applyStarterDesign("blank");
            setNewProjectOpen(false);
            setMobileToolsOpen(false);
          }}
          onNewProjectBackup={() => {
            setNewProjectOpen(false);
            setExportOpen(true);
          }}
          onNewProjectStarterLayout={(layoutId) => {
            applyStarterLayout(layoutId);
            setNewProjectOpen(false);
          }}
          projectManagerOpen={projectManagerOpen}
          onProjectManagerOpenChange={setProjectManagerOpen}
          onProjectManagerOpenNewProject={openNewProjectDialog}
          onOpenProject={handleOpenProject}
          onOpenAccountProject={
            authUser && cloudProjectsAvailable
              ? handleOpenAccountProjectFromDialog
              : undefined
          }
          onSyncProject={
            authUser && cloudProjectsAvailable ? handleSyncProject : undefined
          }
          onDeleteProject={handleDeleteProject}
          onDeleteProjects={handleDeleteProjects}
          onRenameProject={handleRenameProject}
          onExportProject={handleExportProject}
          onRestorePoint={handleRestorePoint}
          onDeleteRestorePoint={handleDeleteRestorePoint}
          projects={projects}
          accountProjects={accountProjects}
          accountProjectsLoading={accountProjectsLoading}
          accountProjectsError={accountProjectsError}
          accountShares={accountShares}
          accountSharesLoading={accountSharesLoading}
          onRevokeShare={handleRevokeShare}
          projectSyncMetaById={projectSyncMetaById}
          syncingProjectId={syncingProjectId}
          restorePoints={restorePoints}
          activeRestorePointId={activeRestorePointId ?? undefined}
          presetPickerOpen={presetPickerOpen}
          onPresetPickerOpenChange={setPresetPickerOpen}
          activePresetId={activePresetId}
          onSelectPreset={handlePresetSelect}
          completeProfileOpen={completeProfileOpen}
          onCompleteProfileOpenChange={handleCompleteProfileOpenChange}
          authUser={authUser}
          onCompleteProfileSave={handleCompleteProfileSave}
          projectVersionConflict={projectVersionConflict}
          onOpenCloudConflictVersion={handleOpenCloudConflictVersion}
          onKeepLocalConflictCopy={handleKeepLocalConflictCopy}
        />

        {developerModeEnabled ? <PerformanceHud /> : null}
      </div>
    </>
  );
}
