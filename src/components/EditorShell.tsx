"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { EditorMobilePanels } from "@/components/editor/EditorMobilePanels";
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import Inspector from "@/components/Inspector";
import StatusBar from "@/components/StatusBar";
import { ContextOverlayCard } from "@/components/ContextOverlayCard";
import ShareDialog from "@/components/ShareDialog";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import PerformanceHud from "@/components/PerformanceHud";
import ProjectManagerDialog from "@/components/ProjectManagerDialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import TrackCanvas, { type TrackCanvasHandle } from "@/components/TrackCanvas";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/TrackPreview3D";
import { createDefaultDesign, parseDesign } from "@/lib/design";
import { shapeKindLabels } from "@/lib/editor-tools";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import { recordPerfSample } from "@/lib/perf";
import { useEditor } from "@/store/editor";
import {
  selectDesignShapes,
  selectHasPath,
  selectHasSelectedPolyline,
  selectSelectionLocked,
  selectShapeRecordMap,
} from "@/store/selectors";
import { Box, ChevronRight, Route, X } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

const HINT_STORAGE_KEYS = {
  gate: "trackdraw-hint-gate-dismissed",
  path: "trackdraw-hint-path-dismissed",
  preview: "trackdraw-hint-preview-dismissed",
  review3d: "trackdraw-hint-review3d-dismissed",
  postPath: "trackdraw-hint-post-path-dismissed",
} as const;

function shouldShowStarterForDesign(params: {
  title: string;
  shapeCount: number;
}) {
  const title = params.title.trim();
  return params.shapeCount === 0 && (!title || title === "New Track");
}

function createFirstUseBlankDesign() {
  const design = createDefaultDesign();
  return {
    ...design,
    title: "",
    description: "",
  };
}

const STARTER_STEPS = [
  {
    id: "01",
    title: "Place a few gates and obstacles",
    description: "Start small so the course structure appears quickly.",
  },
  {
    id: "02",
    title: "Draw the race path through them",
    description:
      "The path usually makes the layout click faster than obstacle tweaking alone.",
  },
  {
    id: "03",
    title: "Check 3D, then export or share",
    description:
      "Review the route early and send a read-only link when it is ready.",
  },
] as const;

function StarterSteps({ mobile = false }: { mobile?: boolean }) {
  return (
    <div>
      <p
        className={
          mobile
            ? "text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase"
            : "text-muted-foreground text-[10px] font-semibold tracking-widest uppercase"
        }
      >
        Good first steps
      </p>
      <ol className={mobile ? "space-y-3" : "mt-3 space-y-3"}>
        {STARTER_STEPS.map((step) => (
          <li
            key={step.id}
            className={
              mobile ? "flex items-start gap-3" : "flex items-start gap-3"
            }
          >
            <span className="text-primary/60 mt-px w-5 shrink-0 text-[11px] font-semibold tabular-nums">
              {step.id}
            </span>
            <div>
              <p
                className={
                  mobile
                    ? "text-foreground text-[13px] font-medium"
                    : "text-foreground text-[13px] font-medium"
                }
              >
                {step.title}
              </p>
              <p
                className={
                  mobile
                    ? "text-muted-foreground mt-0.5 text-[11px] leading-5"
                    : "text-muted-foreground mt-0.5 text-[12px] leading-5"
                }
              >
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StarterActions({
  mobile = false,
  onPath,
  onBlank,
}: {
  mobile?: boolean;
  onPath: () => void;
  onBlank: () => void;
}) {
  if (!mobile) {
    return (
      <>
        <div className="mt-6">
          <button
            type="button"
            onClick={onPath}
            className="border-primary/18 bg-primary/[0.07] text-muted-foreground hover:bg-primary/11 hover:text-foreground flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all"
          >
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Box className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">
                Start by placing gates
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Open an empty field with `Gate` selected so you can block out
                the course first. Draw the path once the first obstacles are
                down.
              </p>
            </div>
            <div className="flex h-full items-center self-stretch">
              <ChevronRight className="text-muted-foreground/45 size-4 shrink-0" />
            </div>
          </button>

          <button
            type="button"
            onClick={onBlank}
            className="text-muted-foreground hover:text-foreground mt-3 w-full text-center text-sm underline-offset-2 transition-colors hover:underline"
          >
            Continue with blank canvas
          </button>
        </div>
        <p className="text-muted-foreground mt-5 hidden flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] sm:flex">
          <Kbd>G</Kbd> places gates
          <span className="text-muted-foreground/40">·</span>
          <Kbd>P</Kbd> starts the route
          <span className="text-muted-foreground/40">·</span>
          <Kbd>Enter</Kbd> finishes the path
        </p>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onPath}
          className="border-primary/18 bg-primary/[0.07] text-muted-foreground hover:bg-primary/11 hover:text-foreground flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
        >
          <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Box className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[13px] font-medium">
              Start by placing gates
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-5">
              Open an empty field with Gate selected. Draw the path once the
              first obstacles are down.
            </p>
          </div>
          <ChevronRight className="text-muted-foreground/45 mt-0.5 size-4 shrink-0" />
        </button>
        <button
          type="button"
          onClick={onBlank}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
        >
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
            <ChevronRight className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[13px] font-medium">
              Continue with blank canvas
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] leading-5">
              Skip the guided start and open the empty studio instead.
            </p>
          </div>
        </button>
      </div>
    </>
  );
}

const TrackPreview3D = dynamic<TrackPreview3DProps>(
  () => import("@/components/TrackPreview3D"),
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
}: {
  readOnly?: boolean;
}) {
  usePerfMetric("render:EditorShell");
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { enabled: developerModeEnabled, toggle: toggleDeveloperMode } =
    useDeveloperMode();
  const selection = useEditor((state) => state.selection);
  const design = useEditor((state) => state.design);
  const activeTool = useEditor((state) => state.transient.activeTool);
  const duplicateShapes = useEditor((state) => state.duplicateShapes);
  const newProject = useEditor((state) => state.newProject);
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
  const canvasRef = useRef<TrackCanvasHandle>(null);
  const preview3DRef = useRef<TrackPreview3DHandle>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"2d" | "3d">("2d");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [snapActive, setSnapActive] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileViewOpen, setMobileViewOpen] = useState(false);
  const [readOnlyMenuOpen, setReadOnlyMenuOpen] = useState(false);
  const [mobileRulersEnabled, setMobileRulersEnabled] = useState(readOnly);
  const [mobileGizmoEnabled, setMobileGizmoEnabled] = useState(!readOnly);
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
  const [saveStatusLabel, setSaveStatusLabel] = useState("Saving locally…");
  const [pendingFlyThroughStart, setPendingFlyThroughStart] = useState(false);
  const [mobileFlyModeActive, setMobileFlyModeActive] = useState(false);
  const [gateHintDismissed, setGateHintDismissed] = useState(false);
  const [desktopPathHintDismissed, setDesktopPathHintDismissed] =
    useState(false);
  const [desktopPreviewHintDismissed, setDesktopPreviewHintDismissed] =
    useState(false);
  const [review3DHintDismissed, setReview3DHintDismissed] = useState(false);
  const [postPathNudgeDismissed, setPostPathNudgeDismissed] = useState(false);
  const [showPostPathNudge, setShowPostPathNudge] = useState(false);
  const prevHasPath = useRef(false);
  // Load persisted design on mount
  useEffect(() => {
    if (readOnly) return;
    try {
      const saved = localStorage.getItem("trackdraw-design");
      if (saved) {
        const parsed = parseDesign(JSON.parse(saved));
        if (parsed) {
          replaceDesign(parsed);
          setSaveStatusLabel("Restored from local autosave");
          return;
        }
      }
      setSaveStatusLabel("Fresh local project");
    } catch {
      setSaveStatusLabel("Fresh local project");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (readOnly) return;

    try {
      setGateHintDismissed(
        localStorage.getItem(HINT_STORAGE_KEYS.gate) === "true"
      );
      setDesktopPathHintDismissed(
        localStorage.getItem(HINT_STORAGE_KEYS.path) === "true"
      );
      setDesktopPreviewHintDismissed(
        localStorage.getItem(HINT_STORAGE_KEYS.preview) === "true"
      );
      setReview3DHintDismissed(
        localStorage.getItem(HINT_STORAGE_KEYS.review3d) === "true"
      );
      setPostPathNudgeDismissed(
        localStorage.getItem(HINT_STORAGE_KEYS.postPath) === "true"
      );
    } catch {
      /* ignore */
    }
  }, [readOnly]);

  // Debounce full-design serialization so interactive edits do not fight local
  // autosave on every intermediate state.
  useEffect(() => {
    if (readOnly) return;
    if (historyPaused || interactionSessionDepth > 0) {
      setSaveStatusLabel("Editing…");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        const startedAt = performance.now();
        localStorage.setItem("trackdraw-design", JSON.stringify(design));
        recordPerfSample(
          "autosave:localStorage",
          performance.now() - startedAt
        );
        setSaveStatusLabel(
          `Saved locally at ${new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())}`
        );
      } catch {
        /* ignore */
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [design, historyPaused, interactionSessionDepth, readOnly]);

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

  // Detect first path completion and show a one-time nudge toward 3D preview.
  useEffect(() => {
    if (readOnly) return;
    if (!prevHasPath.current && hasPath) {
      setShowPostPathNudge(true);
    }
    prevHasPath.current = hasPath;
  }, [hasPath, readOnly]);

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

  const handleResumeSelectedPath = useCallback((shapeId: string) => {
    setTab("2d");
    canvasRef.current?.resumePolylineEditing(shapeId);
  }, []);

  const dismissDesktopPathHint = useCallback(() => {
    setDesktopPathHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.path, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissGateHint = useCallback(() => {
    setGateHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.gate, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissDesktopPreviewHint = useCallback(() => {
    setDesktopPreviewHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.preview, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissReview3DHint = useCallback(() => {
    setReview3DHintDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.review3d, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissPostPathNudge = useCallback(() => {
    setPostPathNudgeDismissed(true);
    try {
      localStorage.setItem(HINT_STORAGE_KEYS.postPath, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const resetGuidedHints = useCallback(() => {
    setGateHintDismissed(false);
    setDesktopPathHintDismissed(false);
    setDesktopPreviewHintDismissed(false);
    setReview3DHintDismissed(false);
    setPostPathNudgeDismissed(false);
    setShowPostPathNudge(false);
    prevHasPath.current = false;

    try {
      localStorage.removeItem(HINT_STORAGE_KEYS.gate);
      localStorage.removeItem(HINT_STORAGE_KEYS.path);
      localStorage.removeItem(HINT_STORAGE_KEYS.preview);
      localStorage.removeItem(HINT_STORAGE_KEYS.review3d);
      localStorage.removeItem(HINT_STORAGE_KEYS.postPath);
    } catch {
      /* ignore */
    }
  }, []);

  const shouldShowStarter =
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
      setTab("2d");

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
    [replaceDesign, resetGuidedHints, setActiveTool]
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
            onTabChange={setTab}
            onShare={() => setShareOpen(true)}
            onExport={() => setExportOpen(true)}
            readOnly={readOnly}
            hideTabsOnMobile
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
            title={design.title || "Untitled track"}
            statusLabel={readOnly ? "Read-only shared view" : saveStatusLabel}
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
            <div className="relative min-h-0 flex-1">
              <div className="bg-canvas relative h-full overflow-hidden">
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
                  />
                </div>
                {shouldShowStarter && isMobile ? (
                  <div>
                    <Drawer
                      open={shouldShowStarter}
                      direction="bottom"
                      modal
                      onOpenChange={(open) => {
                        if (!open) setStarterDismissed(true);
                      }}
                    >
                      <DrawerContent className="border-border/50 bg-card max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-16px_36px_rgba(0,0,0,0.14)] [&>div:first-child]:hidden">
                        <div className="border-border/40 bg-card/96 shrink-0 border-b backdrop-blur-xs">
                          <div className="flex items-center justify-center pt-2.5 pb-1.5">
                            <div className="bg-primary/20 h-1 w-10 rounded-full" />
                          </div>
                          <DrawerHeader className="px-4 pt-0 pb-3 text-left">
                            <div className="min-w-0">
                              <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
                                Welcome to TrackDraw
                              </DrawerTitle>
                              <DrawerDescription className="text-muted-foreground/80 pt-0.5 text-[10px] leading-relaxed">
                                Place a few gates, draw the route, check 3D,
                                then share when the track is ready.
                              </DrawerDescription>
                            </div>
                          </DrawerHeader>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
                          <StarterSteps mobile />
                          <StarterActions
                            mobile
                            onPath={() => applyStarterDesign("gate")}
                            onBlank={() => applyStarterDesign("blank")}
                          />
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>
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
                              setTab("2d");
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
                              setTab("3d");
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
                <div className="absolute right-0 bottom-0 left-0 z-20">
                  <StatusBar cursorPos={cursorPos} snapActive={snapActive} />
                </div>
              </div>
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
          mobileRulersEnabled={mobileRulersEnabled}
          mobileFlyModeActive={mobileFlyModeActive}
          mobilePrecisionStep={mobilePrecisionStep}
          mobilePrecisionStepLabel={mobilePrecisionStepLabel}
          readOnly={readOnly}
          readOnlyMenuOpen={readOnlyMenuOpen}
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
            setTab("3d");
            setMobileViewOpen(false);
            setPendingFlyThroughStart(true);
          }}
          onStartNewProject={() => setProjectManagerOpen(true)}
          onImport={() => {
            setImportOpen(true);
            setMobileToolsOpen(false);
          }}
          onExport={() => {
            setExportOpen(true);
            setMobileToolsOpen(false);
          }}
          onTabChange={(nextTab) => {
            setTab(nextTab);
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
        onRequest3DView={() => setTab("3d")}
      />
      <ProjectManagerDialog
        open={projectManagerOpen}
        onOpenChange={setProjectManagerOpen}
        hasContent={Boolean(design.title.trim() || designShapes.length)}
        onNewProject={() => {
          newProject();
          setProjectManagerOpen(false);
          setMobileToolsOpen(false);
          setStarterDismissed(false);
        }}
        onBackupProject={() => {
          setProjectManagerOpen(false);
          setExportOpen(true);
        }}
      />
      {developerModeEnabled ? <PerformanceHud /> : null}
    </>
  );
}
