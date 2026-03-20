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
  const [readOnlyMenuOpen, setReadOnlyMenuOpen] = useState(false);
  const [mobileOverrideDismissed, setMobileOverrideDismissed] = useState(false);
  const [mobileRulersEnabled, setMobileRulersEnabled] = useState(false);
  const [mobileGizmoEnabled, setMobileGizmoEnabled] = useState(true);
  const [mobileMultiSelectEnabled, setMobileMultiSelectEnabled] =
    useState(false);
  const [mobileDraftPathState, setMobileDraftPathState] = useState({
    active: false,
    canClose: false,
    length: 0,
    pointCount: 0,
  });
  const [mobilePathBuilderPinnedOpen, setMobilePathBuilderPinnedOpen] =
    useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        if (parsed) replaceDesign(parsed);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save design to localStorage on every change
  useEffect(() => {
    if (readOnly) return;
    try {
      localStorage.setItem("trackdraw-design", JSON.stringify(design));
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

  return (
    <>
      <div className="bg-background text-foreground relative flex h-[100dvh] overflow-hidden">
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-30 hidden h-11 items-center justify-center lg:flex">
          <div className="flex max-w-[28rem] items-center gap-2 px-6">
            <span className="text-foreground/70 truncate text-center text-sm">
              {design.title || "Untitled"}
            </span>
            <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 text-amber-500">
              <span className="inline-flex h-3 items-center text-[9px] leading-none font-semibold tracking-[0.12em] uppercase">
                Beta
              </span>
            </span>
          </div>
        </div>

        {/* ── Sidebar (full height) ───────────────────────────── */}
        {!readOnly && (
          <Toolbar
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
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
                  />
                </div>
                <div className="absolute right-0 bottom-0 left-0 z-20">
                  <StatusBar cursorPos={cursorPos} snapActive={snapActive} />
                </div>
              </div>
            </div>

            {/* Desktop Inspector */}
            {!readOnly && (
              <aside className="border-border/80 bg-card/95 hidden min-h-0 w-[300px] shrink-0 flex-col overflow-hidden border-l backdrop-blur lg:flex">
                <Inspector />
              </aside>
            )}
          </div>
        </div>

        <EditorMobilePanels
          activeTool={activeTool}
          draftPathActive={mobileDraftPathState.active}
          draftPathCanClose={mobileDraftPathState.canClose}
          draftPathLength={mobileDraftPathState.length}
          draftPathPointCount={mobileDraftPathState.pointCount}
          hasSelectedPolyline={
            selection.length === 1 &&
            design.shapes.some(
              (shape) => shape.id === selection[0] && shape.kind === "polyline"
            )
          }
          pathBuilderPinnedOpen={mobilePathBuilderPinnedOpen}
          mobileInspectorOpen={mobileInspectorOpen}
          mobileToolsOpen={mobileToolsOpen}
          mobileMultiSelectEnabled={mobileMultiSelectEnabled}
          mobileGizmoEnabled={mobileGizmoEnabled}
          mobileOverrideDismissed={mobileOverrideDismissed}
          mobileRulersEnabled={mobileRulersEnabled}
          readOnly={readOnly}
          readOnlyMenuOpen={readOnlyMenuOpen}
          selectionLocked={selectionLocked}
          selectedCount={selection.length}
          tab={tab}
          onCloseInspector={() => setMobileInspectorOpen(false)}
          onDismissMobileOverride={() => setMobileOverrideDismissed(true)}
          onFitView={() => canvasRef.current?.fitToWindow()}
          onCancelPath={() => {
            canvasRef.current?.cancelDraftPath();
            setMobilePathBuilderPinnedOpen(false);
            setActiveTool("select");
          }}
          onFinishPath={() => {
            canvasRef.current?.finishDraftPath();
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
            setMobileToolsOpen(true);
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
          onSetReadOnlyMenuOpen={setReadOnlyMenuOpen}
          onShare={() => {
            setShareOpen(true);
            setReadOnlyMenuOpen(false);
          }}
          onStartNewProject={() => {
            if (confirm("Start a new project? Unsaved changes will be lost.")) {
              newProject();
              setMobileToolsOpen(false);
            }
          }}
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
            setReadOnlyMenuOpen(false);
          }}
        />
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        canvasRef={canvasRef}
        preview3DRef={preview3DRef}
      />
    </>
  );
}
