"use client";

import dynamic from "next/dynamic";
import {
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
import ShareDialog from "@/components/ShareDialog";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import ProjectManagerDialog from "@/components/ProjectManagerDialog";
import TrackCanvas, { type TrackCanvasHandle } from "@/components/TrackCanvas";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/TrackPreview3D";
import { parseDesign } from "@/lib/design";
import { useEditor } from "@/store/editor";

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
  const selection = useEditor((state) => state.selection);
  const design = useEditor((state) => state.design);
  const replaceDesign = useEditor((state) => state.replaceDesign);
  const activeTool = useEditor((state) => state.activeTool);
  const removeShapes = useEditor((state) => state.removeShapes);
  const duplicateShapes = useEditor((state) => state.duplicateShapes);
  const updateShape = useEditor((state) => state.updateShape);
  const setActiveTool = useEditor((state) => state.setActiveTool);
  const setSelection = useEditor((state) => state.setSelection);
  const newProject = useEditor((state) => state.newProject);
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
  const [mobileOverrideDismissed, setMobileOverrideDismissed] = useState(false);
  const [mobileRulersEnabled, setMobileRulersEnabled] = useState(false);
  const [mobileGizmoEnabled, setMobileGizmoEnabled] = useState(true);
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
  const [showStarter, setShowStarter] = useState(false);
  const [saveStatusLabel, setSaveStatusLabel] = useState("Saving locally…");
  const [pendingFlyThroughStart, setPendingFlyThroughStart] = useState(false);
  const [mobileFlyModeActive, setMobileFlyModeActive] = useState(false);
  const selectionLocked =
    selection.length > 0 &&
    selection.every((id) => {
      const shape = design.shapes.find((candidate) => candidate.id === id);
      return Boolean(shape?.locked);
    });
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
      setShowStarter(true);
      setSaveStatusLabel("Fresh local project");
    } catch {
      setShowStarter(true);
      setSaveStatusLabel("Fresh local project");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save design to localStorage on every change
  useEffect(() => {
    if (readOnly) return;
    try {
      localStorage.setItem("trackdraw-design", JSON.stringify(design));
      setSaveStatusLabel(
        `Saved locally at ${new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())}`
      );
    } catch {
      /* ignore */
    }
  }, [design, readOnly]);

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

  return (
    <>
      <div className="bg-background text-foreground relative flex h-[100dvh] overflow-hidden">
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
                    onMobileMultiSelectStart={(shapeId) => {
                      setMobileMultiSelectEnabled(true);
                      setActiveTool("select");
                      setSelection(
                        selection.includes(shapeId)
                          ? selection
                          : [...selection, shapeId]
                      );
                    }}
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
                {!readOnly &&
                showStarter &&
                design.shapes.length === 0 &&
                !design.title.trim() ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
                    <div className="border-border/70 bg-card/96 pointer-events-auto w-full max-w-md rounded-2xl border p-4 shadow-xl backdrop-blur">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-foreground text-sm font-semibold">
                            Start with a clear project action
                          </p>
                          <p className="text-muted-foreground pt-1 text-xs leading-relaxed">
                            Begin with a blank field, open an existing JSON, or
                            keep this empty starter canvas and start placing
                            objects.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStarter(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => {
                            newProject();
                            setShowStarter(false);
                          }}
                          className="border-border/70 hover:bg-muted/40 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                        >
                          Blank project
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImportOpen(true);
                            setShowStarter(false);
                          }}
                          className="border-border/70 hover:bg-muted/40 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
                        >
                          Open JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowStarter(false)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                        >
                          Start drawing
                        </button>
                      </div>
                      <p className="text-muted-foreground/80 mt-3 text-[11px]">
                        Quick tips: `Tools` chooses objects, `Inspect` edits the
                        current selection, and `View` switches between 2D and
                        3D.
                      </p>
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
              <aside className="border-border/80 bg-card/95 hidden min-h-0 w-[340px] shrink-0 flex-col overflow-hidden border-l backdrop-blur lg:flex">
                <Inspector
                  onResumeSelectedPath={(shapeId) => {
                    setTab("2d");
                    canvasRef.current?.resumePolylineEditing(shapeId);
                  }}
                />
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
          hasPath={design.shapes.some(
            (shape) => shape.kind === "polyline" && shape.points.length >= 2
          )}
          hasSelectedPolyline={
            selection.length === 1 &&
            design.shapes.some(
              (shape) => shape.id === selection[0] && shape.kind === "polyline"
            )
          }
          pathBuilderPinnedOpen={mobilePathBuilderPinnedOpen}
          mobileInspectorOpen={mobileInspectorOpen}
          mobileToolsOpen={mobileToolsOpen}
          mobileViewOpen={mobileViewOpen}
          mobileMultiSelectEnabled={mobileMultiSelectEnabled}
          mobileGizmoEnabled={mobileGizmoEnabled}
          mobileOverrideDismissed={mobileOverrideDismissed}
          mobileRulersEnabled={mobileRulersEnabled}
          mobileFlyModeActive={mobileFlyModeActive}
          readOnly={readOnly}
          readOnlyMenuOpen={readOnlyMenuOpen}
          selectionLocked={selectionLocked}
          selectedCount={selection.length}
          saveStatusLabel={saveStatusLabel}
          tab={tab}
          onCloseInspector={() => setMobileInspectorOpen(false)}
          onDismissMobileOverride={() => setMobileOverrideDismissed(true)}
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
              selection.length === 1
                ? design.shapes.find((shape) => shape.id === selection[0])
                : null;
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
          onToggleSelectionLock={() => {
            if (!selection.length) return;
            for (const id of selection) {
              updateShape(id, { locked: !selectionLocked });
            }
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
        />
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
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
        hasContent={Boolean(design.title.trim() || design.shapes.length)}
        onNewProject={() => {
          newProject();
          setProjectManagerOpen(false);
          setMobileToolsOpen(false);
          setShowStarter(false);
        }}
        onBackupProject={() => {
          setProjectManagerOpen(false);
          setExportOpen(true);
        }}
      />
    </>
  );
}
