"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { EditorMobilePanels } from "@/components/editor/EditorMobilePanels";
import Header from "./Header";
import Toolbar from "./Toolbar";
import Inspector from "@/components/inspector/Inspector";
import StatusBar from "./StatusBar";
import { ContextOverlayCard } from "./ContextOverlayCard";
import ShareDialog from "@/components/dialogs/ShareDialog";
import ExportDialog from "@/components/dialogs/ExportDialog";
import ImportDialog from "@/components/dialogs/ImportDialog";
import KeyboardShortcutsDialog from "@/components/dialogs/KeyboardShortcutsDialog";
import PerformanceHud from "./PerformanceHud";
import ProjectManagerDialog from "@/components/dialogs/ProjectManagerDialog";
import { Button } from "@/components/ui/button";
import { MobileDrawer } from "@/components/MobileDrawer";
import TrackCanvas, {
  type TrackCanvasHandle,
} from "@/components/canvas/TrackCanvas";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/TrackPreview3D";
import { createDefaultDesign } from "@/lib/design";
import { shapeKindLabels } from "@/lib/editor-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { useEditorProjects } from "@/hooks/useEditorProjects";
import { useEditorHints } from "@/hooks/useEditorHints";
import {
  StarterSteps,
  StarterActions,
  shouldShowStarterForDesign,
} from "@/components/editor/StarterFlow";
import type { EditorView } from "@/lib/view";
import { useEditor } from "@/store/editor";
import {
  selectDesignShapes,
  selectHasPath,
  selectHasSelectedPolyline,
  selectSelectionLocked,
  selectShapeRecordMap,
} from "@/store/selectors";
import { Box, Route, X } from "lucide-react";

function createFirstUseBlankDesign() {
  const design = createDefaultDesign();
  return {
    ...design,
    title: "",
    description: "",
  };
}

const TrackPreview3D = dynamic<TrackPreview3DProps>(
  () => import("@/components/canvas/TrackPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground/40 flex h-full items-center justify-center text-xs">
        Loading 3D…
      </div>
    ),
  }
) as ForwardRefExoticComponent<
  TrackPreview3DProps & RefAttributes<TrackPreview3DHandle>
>;

export default function EditorShell({
  readOnly = false,
  seedToken,
  initialTab = "2d",
  studioHref,
}: {
  readOnly?: boolean;
  seedToken?: string;
  initialTab?: EditorView;
  studioHref?: string;
}) {
  usePerfMetric("render:EditorShell");
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { enabled: developerModeEnabled, toggle: toggleDeveloperMode } =
    useDeveloperMode();
  const selection = useEditor((state) => state.selection);
  const design = useEditor((state) => state.design);
  const activeTool = useEditor((state) => state.transient.activeTool);
  const duplicateShapes = useEditor((state) => state.duplicateShapes);
  const nudgeShapes = useEditor((state) => state.nudgeShapes);
  const removeShapes = useEditor((state) => state.removeShapes);
  const replaceDesign = useEditor((state) => state.replaceDesign);
  const rotateShapes = useEditor((state) => state.rotateShapes);
  const setActiveTool = useEditor((state) => state.setActiveTool);
  const setSelection = useEditor((state) => state.setSelection);
  const setShapesLocked = useEditor((state) => state.setShapesLocked);
  const historyPaused = useEditor((state) => state.historyPaused);
  const interactionSessionDepth = useEditor(
    (state) => state.interactionSessionDepth
  );
  const designShapes = useEditor(selectDesignShapes);
  const hasPath = useEditor(selectHasPath);
  const hasSelectedPolyline = useEditor(selectHasSelectedPolyline);
  const shapeById = useEditor(selectShapeRecordMap);
  const selectionLocked = useEditor(selectSelectionLocked);
  const singleSelectedShape =
    selection.length === 1 ? (shapeById[selection[0]] ?? null) : null;
  const singleSelectedShapeLabel = singleSelectedShape
    ? shapeKindLabels[singleSelectedShape.kind]
    : null;
  const mobilePrecisionStep = Math.min(design.field.gridStep, 0.1);
  const mobilePrecisionStepLabel = `${mobilePrecisionStep.toFixed(
    mobilePrecisionStep < 0.1 ? 2 : 1
  )} m`;
  const singleSelectionCanRotate = Boolean(
    singleSelectedShape &&
    singleSelectedShape.kind !== "polyline" &&
    singleSelectedShape.kind !== "cone" &&
    !singleSelectedShape.locked
  );
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canvasRef = useRef<TrackCanvasHandle>(null);
  const preview3DRef = useRef<TrackPreview3DHandle>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tab, setTab] = useState<"2d" | "3d">(initialTab);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [starterDismissed, setStarterDismissed] = useState(false);
  const [starterMode, setStarterMode] = useState<"guided" | "blank" | null>(
    null
  );
  const [pendingFlyThroughStart, setPendingFlyThroughStart] = useState(false);
  const [mobileFlyModeActive, setMobileFlyModeActive] = useState(false);
  const mobileProjectManagerOpenTimerRef = useRef<number | null>(null);

  const {
    projects,
    restorePoints,
    activeRestorePointId,
    saveStatusLabel,
    initialized,
    handleSaveSnapshot,
    handleOpenProject,
    handleDeleteProject,
    handleRenameProject,
    handleRestorePoint,
    handleDeleteRestorePoint,
    snapshotCurrentDesign,
  } = useEditorProjects({
    readOnly,
    seedToken,
    design,
    designShapesLength: designShapes.length,
    historyPaused,
    interactionSessionDepth,
    replaceDesign,
  });

  const {
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
    resetGuidedHints,
  } = useEditorHints({ readOnly, hasPath });

  // Sync tab when initialTab prop changes (e.g. ShareViewer navigates ?view=3d via Link)
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  const openProjectManager = useCallback(() => {
    if (!isMobile) {
      setProjectManagerOpen(true);
      return;
    }

    setMobileToolsOpen(false);

    if (mobileProjectManagerOpenTimerRef.current !== null) {
      window.clearTimeout(mobileProjectManagerOpenTimerRef.current);
    }

    mobileProjectManagerOpenTimerRef.current = window.setTimeout(() => {
      setProjectManagerOpen(true);
      mobileProjectManagerOpenTimerRef.current = null;
    }, 180);
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (mobileProjectManagerOpenTimerRef.current !== null) {
        window.clearTimeout(mobileProjectManagerOpenTimerRef.current);
      }
    };
  }, []);

  // Keep the mobile inspector closed until explicitly opened from the mobile UI.
  useEffect(() => {
    if (selection.length === 0) {
      setMobileInspectorOpen(false);
      setMobileMultiSelectEnabled(false);
    }
  }, [selection]);

  useEffect(() => {
    if (activeTool === "polyline" || mobileDraftPathState.active) return;
    setMobilePathBuilderPinnedOpen(false);
  }, [activeTool, mobileDraftPathState.active]);

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
    if (process.env.NODE_ENV === "production") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key !== ".") return;

      const target = event.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isInput) return;

      event.preventDefault();
      toggleDeveloperMode();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDeveloperMode]);

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
      handleTabChange("2d");
      canvasRef.current?.resumePolylineEditing(shapeId);
    },
    [handleTabChange]
  );

  const shouldShowStarter =
    initialized &&
    !readOnly &&
    !starterDismissed &&
    shouldShowStarterForDesign({
      title: design.title,
      shapeCount: designShapes.length,
    });

  const applyStarterDesign = useCallback(
    (kind: "blank" | "gate") => {
      replaceDesign(createFirstUseBlankDesign());
      setStarterDismissed(true);
      handleTabChange("2d");

      if (kind === "gate") {
        setStarterMode("guided");
        resetGuidedHints();
        setActiveTool("gate");
      } else {
        setStarterMode("blank");
        setActiveTool("select");
      }

      window.requestAnimationFrame(() => {
        canvasRef.current?.fitToWindow();
      });
    },
    [handleTabChange, replaceDesign, resetGuidedHints, setActiveTool]
  );

  return (
    <>
      <div className="bg-background text-foreground relative flex h-dvh overflow-hidden">
        {!readOnly && (
          <Toolbar
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            onOpenProjectManager={() => setProjectManagerOpen(true)}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          />
        )}

        {/* ── Main column ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header
            tab={tab}
            onTabChange={handleTabChange}
            onShare={() => setShareOpen(true)}
            onExport={() => setExportOpen(true)}
            onSaveSnapshot={readOnly ? undefined : handleSaveSnapshot}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            readOnly={readOnly}
            hideTabsOnMobile
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
            title={design.title || "Untitled track"}
            studioHref={studioHref}
            lastSavedLabel={readOnly ? undefined : saveStatusLabel}
            statusLabel={readOnly ? "Read-only shared view" : saveStatusLabel}
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

          {/* ── Body ─────────────────────────────────────────── */}
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {/* Canvas area */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="bg-canvas relative min-h-0 flex-1 overflow-hidden">
                {/* 2D: always mounted so export always works; hidden visually when not active */}
                <div
                  className="absolute inset-0"
                  style={{
                    visibility: tab === "2d" ? "visible" : "hidden",
                    pointerEvents: tab === "2d" ? "auto" : "none",
                  }}
                >
                  <TrackCanvas
                    ref={canvasRef}
                    onCursorChange={setCursorPos}
                    onDraftPathStateChange={setMobileDraftPathState}
                    onSnapChange={setSnapActive}
                    onMobileMultiSelectStart={handleMobileMultiSelectStart}
                    mobileRulersEnabled={mobileRulersEnabled}
                    mobileMultiSelectEnabled={mobileMultiSelectEnabled}
                    readOnly={readOnly}
                    showObstacleNumbers={showObstacleNumbers}
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ display: tab === "3d" ? "block" : "none" }}
                >
                  <TrackPreview3D
                    ref={preview3DRef}
                    showGizmo={mobileGizmoEnabled}
                    onFlyModeChange={setMobileFlyModeActive}
                    readOnly={readOnly}
                  />
                </div>
                {shouldShowStarter && isMobile ? (
                  <MobileDrawer
                    open={shouldShowStarter}
                    onOpenChange={(open) => {
                      if (!open) setStarterDismissed(true);
                    }}
                    title="Welcome to TrackDraw"
                    subtitle="Place a few gates, draw the route, check 3D, then share when the track is ready."
                    bodyClassName="space-y-5 pt-3 pb-4"
                  >
                    <StarterSteps mobile />
                    <StarterActions
                      mobile
                      onPath={() => applyStarterDesign("gate")}
                      onBlank={() => applyStarterDesign("blank")}
                    />
                  </MobileDrawer>
                ) : null}
                {shouldShowStarter && !isMobile ? (
                  <div className="absolute inset-0 z-20 hidden items-center justify-center bg-slate-950/10 px-5 backdrop-blur-sm lg:flex">
                    <div className="border-border/50 bg-card/97 pointer-events-auto w-full max-w-xl rounded-4xl border px-8 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
                            Studio
                          </p>
                          <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
                            Welcome to TrackDraw
                          </p>
                          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
                            Design the layout in 2D, review elevation in 3D, and
                            share a read-only link when the track is ready.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStarterDismissed(true)}
                          className="text-muted-foreground/75 hover:text-foreground hover:bg-muted rounded-full p-1.5 transition-colors"
                          aria-label="Dismiss starter dialog"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="mt-6">
                        <StarterSteps />
                        <StarterActions
                          onPath={() => applyStarterDesign("gate")}
                          onBlank={() => applyStarterDesign("blank")}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
                {!readOnly &&
                starterMode === "guided" &&
                tab === "2d" &&
                designShapes.length === 0 &&
                activeTool === "gate" &&
                !gateHintDismissed ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
                    <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
                      <ContextOverlayCard
                        icon={<Box className="size-4" />}
                        title="Place your first gate"
                        badge="Guided"
                        description="Tap or click on the canvas to drop the first gate. Add a few gates before switching to Path."
                        action={
                          <Button size="sm" onClick={dismissGateHint}>
                            Got it
                          </Button>
                        }
                        dismissLabel="Dismiss gate placement hint"
                        onDismiss={dismissGateHint}
                      />
                    </div>
                  </div>
                ) : null}
                {!readOnly &&
                starterMode === "guided" &&
                tab === "2d" &&
                !shouldShowStarter &&
                designShapes.length > 0 &&
                !hasPath &&
                !desktopPathHintDismissed ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
                    <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
                      <ContextOverlayCard
                        icon={<Route className="size-4" />}
                        title="Next, draw the route"
                        badge="Guided"
                        description="Place a few gates first, then switch to Path and trace the lap through them. Finish the route before checking 3D."
                        action={
                          <Button
                            size="sm"
                            onClick={() => setActiveTool("polyline")}
                          >
                            Start path
                          </Button>
                        }
                        dismissLabel="Dismiss path onboarding hint"
                        onDismiss={dismissDesktopPathHint}
                      />
                    </div>
                  </div>
                ) : null}
                {!readOnly &&
                starterMode === "guided" &&
                tab === "3d" &&
                !hasPath &&
                !desktopPreviewHintDismissed ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
                    <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
                      <ContextOverlayCard
                        icon={<Box className="size-4" />}
                        title="3D works best after the route"
                        badge="Preview"
                        description="Obstacle placement already previews here, but the route is what makes elevation and fly-through review useful."
                        action={
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleTabChange("2d");
                              setActiveTool("polyline");
                            }}
                          >
                            Draw path in 2D
                          </Button>
                        }
                        dismissLabel="Dismiss 3D preview onboarding hint"
                        onDismiss={dismissDesktopPreviewHint}
                      />
                    </div>
                  </div>
                ) : null}
                {!readOnly &&
                starterMode === "guided" &&
                tab === "3d" &&
                hasPath &&
                !review3DHintDismissed ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
                    <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
                      <ContextOverlayCard
                        icon={<Box className="size-4" />}
                        title="Now review it in 3D"
                        badge="Guided"
                        description="Orbit around the route, check elevation and spacing, then share or export once the layout feels right."
                        action={
                          <Button
                            size="sm"
                            onClick={() => {
                              setShareOpen(true);
                              dismissReview3DHint();
                            }}
                          >
                            Share or export next
                          </Button>
                        }
                        dismissLabel="Dismiss 3D review hint"
                        onDismiss={dismissReview3DHint}
                      />
                    </div>
                  </div>
                ) : null}
                {!readOnly &&
                starterMode === "guided" &&
                tab === "2d" &&
                showPostPathNudge &&
                !postPathNudgeDismissed ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
                    <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
                      <ContextOverlayCard
                        icon={<Box className="size-4" />}
                        title="Route ready — check it in 3D"
                        badge="Next step"
                        description="Switch to the 3D tab now to review the route before refining more obstacle placement."
                        action={
                          <Button
                            size="sm"
                            onClick={() => {
                              handleTabChange("3d");
                              dismissPostPathNudge();
                            }}
                          >
                            Switch to 3D
                          </Button>
                        }
                        dismissLabel="Dismiss post-path 3D nudge"
                        onDismiss={dismissPostPathNudge}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <StatusBar cursorPos={cursorPos} snapActive={snapActive} />
            </div>

            {/* Desktop Inspector */}
            {!readOnly && (
              <aside className="border-border/80 bg-card/95 hidden min-h-0 w-85 shrink-0 flex-col overflow-hidden border-l backdrop-blur lg:flex">
                <Inspector onResumeSelectedPath={handleResumeSelectedPath} />
              </aside>
            )}
          </div>
        </div>

        <EditorMobilePanels
          activeTool={activeTool}
          draftPathActive={mobileDraftPathState.active}
          draftPathClosed={mobileDraftPathState.closed}
          draftPathLength={mobileDraftPathState.length}
          draftPathPointCount={mobileDraftPathState.pointCount}
          hasPath={hasPath}
          hasSelectedPolyline={hasSelectedPolyline}
          pathBuilderPinnedOpen={mobilePathBuilderPinnedOpen}
          mobileInspectorOpen={mobileInspectorOpen}
          mobileToolsOpen={mobileToolsOpen}
          mobileViewOpen={mobileViewOpen}
          mobileMultiSelectEnabled={mobileMultiSelectEnabled}
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
            singleSelectedShape && singleSelectedShape.kind !== "polyline"
          )}
          singleSelectionCanRotate={singleSelectionCanRotate}
          selectionLocked={selectionLocked}
          selectedCount={selection.length}
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
            removeShapes(selection);
          }}
          onDuplicateSelection={() => {
            if (!selection.length) return;
            duplicateShapes(selection);
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
          onExitMobileMultiSelect={() => {
            setMobileMultiSelectEnabled(false);
            setSelection([]);
          }}
          onSelectTool={(tool) => {
            setSelection([]);
            setMobileMultiSelectEnabled(false);
            setMobilePathBuilderPinnedOpen(tool === "polyline");
            setActiveTool(tool);
            setMobileToolsOpen(false);
          }}
          onSetMobileToolsOpen={setMobileToolsOpen}
          onSetMobileViewOpen={setMobileViewOpen}
          onSetReadOnlyMenuOpen={setReadOnlyMenuOpen}
          onShare={() => {
            setShareOpen(true);
            setReadOnlyMenuOpen(false);
          }}
          onStartFlyThrough={() => {
            handleTabChange("3d");
            setMobileViewOpen(false);
            setPendingFlyThroughStart(true);
          }}
          onStartNewProject={openProjectManager}
          onImport={() => {
            setImportOpen(true);
            setMobileToolsOpen(false);
          }}
          onExport={() => {
            setExportOpen(true);
            setMobileToolsOpen(false);
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
        />
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        hasPath={hasPath}
        onExportJson={() => {
          setShareOpen(false);
          setExportOpen(true);
        }}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onBeforeConfirm={() => {
          snapshotCurrentDesign();
        }}
        onBackupCurrent={() => {
          setImportOpen(false);
          setExportOpen(true);
        }}
      />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        canvasRef={canvasRef}
        preview3DRef={preview3DRef}
        activeTab={tab}
        onRequest3DView={() => handleTabChange("3d")}
      />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
      <ProjectManagerDialog
        open={projectManagerOpen}
        onOpenChange={setProjectManagerOpen}
        hasContent={Boolean(design.title.trim() || designShapes.length)}
        onNewProject={() => {
          snapshotCurrentDesign();
          replaceDesign(createFirstUseBlankDesign());
          setProjectManagerOpen(false);
          setMobileToolsOpen(false);
          setStarterDismissed(false);
        }}
        onBackupProject={() => {
          setProjectManagerOpen(false);
          setExportOpen(true);
        }}
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onRestorePoint={handleRestorePoint}
        onDeleteRestorePoint={handleDeleteRestorePoint}
        projects={projects}
        restorePoints={restorePoints}
        activeDesignId={design.id}
        activeRestorePointId={activeRestorePointId ?? undefined}
      />
      {developerModeEnabled ? <PerformanceHud /> : null}
    </>
  );
}
