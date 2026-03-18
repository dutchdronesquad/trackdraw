"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { EditorMobilePanels } from "@/components/editor/EditorMobilePanels";
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import Inspector from "@/components/Inspector";
import StatusBar from "@/components/StatusBar";
import ShareDialog from "@/components/ShareDialog";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import TrackCanvas, { type TrackCanvasHandle } from "@/components/TrackCanvas";
import type { TrackPreview3DHandle } from "@/components/TrackPreview3D";
import { parseDesign } from "@/lib/design";
import { useEditor } from "@/store/editor";

const TrackPreview3D = dynamic(() => import("@/components/TrackPreview3D"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground/40 flex h-full items-center justify-center text-xs">
      Loading 3D…
    </div>
  ),
});

export default function EditorShell({
  readOnly = false,
}: {
  readOnly?: boolean;
}) {
  const {
    selection,
    design,
    replaceDesign,
    activeTool,
    setActiveTool,
    setSelection,
    newProject,
  } = useEditor();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Auto-open mobile inspector when selection is made on small screens
  useEffect(() => {
    if (selection.length > 0 && window.innerWidth < 1024) {
      setMobileInspectorOpen(true);
    }
    if (selection.length === 0) {
      setMobileInspectorOpen(false);
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
                    onSnapChange={setSnapActive}
                    readOnly={readOnly}
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{ display: tab === "3d" ? "block" : "none" }}
                >
                  <TrackPreview3D ref={preview3DRef} />
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
          mobileInspectorOpen={mobileInspectorOpen}
          mobileToolsOpen={mobileToolsOpen}
          mobileOverrideDismissed={mobileOverrideDismissed}
          readOnly={readOnly}
          readOnlyMenuOpen={readOnlyMenuOpen}
          tab={tab}
          onCloseInspector={() => setMobileInspectorOpen(false)}
          onDismissMobileOverride={() => setMobileOverrideDismissed(true)}
          onOpenReadOnlyMenu={() => setReadOnlyMenuOpen(true)}
          onOpenTools={() => setMobileToolsOpen(true)}
          onSelectTool={(tool) => {
            setSelection([]);
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
          onTabChange={setTab}
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
