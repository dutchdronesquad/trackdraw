"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, type EditorTool } from "@/store/editor";
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import Inspector from "@/components/Inspector";
import StatusBar from "@/components/StatusBar";
import ShareDialog from "@/components/ShareDialog";
import ExportDialog from "@/components/ExportDialog";
import ImportDialog from "@/components/ImportDialog";
import TrackCanvas, { type TrackCanvasHandle } from "@/components/TrackCanvas";
import type { TrackPreview3DHandle } from "@/components/TrackPreview3D";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Monitor, Share2, LayoutGrid,
  MousePointer2, Hand, Flag, Triangle, Type, Spline, Target,
  FolderOpen, Download, FilePlus,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TrackPreview3D = dynamic(() => import("@/components/TrackPreview3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40">
      Loading 3D…
    </div>
  ),
});

function GateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <line x1="2.5" y1="13" x2="2.5" y2="2.5" />
      <line x1="11.5" y1="13" x2="11.5" y2="2.5" />
      <line x1="2.5" y1="2.5" x2="11.5" y2="2.5" />
    </svg>
  );
}
function DiveGateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="10" height="10" rx="0.5" />
    </svg>
  );
}
function LadderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="2.5,7 2.5,1.5 11.5,1.5 11.5,7" />
      <polyline points="2.5,12.5 2.5,7 11.5,7 11.5,12.5" />
    </svg>
  );
}

const mobileTools: { id: EditorTool; icon: React.ReactNode; label: string }[] = [
  { id: "select",      icon: <MousePointer2 className="size-5" />, label: "Select" },
  { id: "grab",        icon: <Hand className="size-5" />,          label: "Grab" },
  { id: "gate",        icon: <GateIcon className="size-5" />,      label: "Gate" },
  { id: "ladder",      icon: <LadderIcon className="size-5" />,    label: "Ladder" },
  { id: "divegate",    icon: <DiveGateIcon className="size-5" />,  label: "Dive Gate" },
  { id: "startfinish", icon: <Target className="size-5" />, label: "Start Pads" },
  { id: "flag",        icon: <Flag className="size-5" />,          label: "Flag" },
  { id: "cone",        icon: <Triangle className="size-5" />,      label: "Cone" },
  { id: "label",       icon: <Type className="size-5" />,          label: "Label" },
  { id: "polyline",    icon: <Spline className="size-5" />,        label: "Path" },
];

export default function EditorShell({ readOnly = false }: { readOnly?: boolean }) {
  const { selection, design, replaceDesign, activeTool, setActiveTool, setSelection, newProject } = useEditor();
  const canvasRef = useRef<TrackCanvasHandle>(null);
  const preview3DRef = useRef<TrackPreview3DHandle>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"2d" | "3d">("2d");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
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
        const parsed = JSON.parse(saved);
        if (parsed?.shapes && parsed?.field) replaceDesign(parsed);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save design to localStorage on every change
  useEffect(() => {
    if (readOnly) return;
    try {
      localStorage.setItem("trackdraw-design", JSON.stringify(design));
    } catch { /* ignore */ }
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
      <div className="relative h-[100dvh] flex overflow-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 hidden h-11 items-center justify-center lg:flex">
          <span className="max-w-[28rem] truncate px-6 text-center text-sm text-foreground/70">
            {design.title || "Untitled"}
          </span>
        </div>

        {/* ── Sidebar (full height) ───────────────────────────── */}
        {!readOnly && (
          <Toolbar
            onImport={() => setImportOpen(true)}
            onExport={() => setExportOpen(true)}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
          />
        )}

        {/* ── Main column ────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header */}
          <Header
            tab={tab}
            onTabChange={setTab}
            onShare={() => setShareOpen(true)}
            onExport={() => setExportOpen(true)}
            readOnly={readOnly}
            hideTabsOnMobile
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed(c => !c)}
          />

          {/* ── Body ─────────────────────────────────────────── */}
          <div className="relative flex flex-1 min-h-0 overflow-hidden">
            {/* Canvas area */}
            <div className="flex-1 relative min-h-0">
              <div className="relative h-full overflow-hidden bg-canvas">
                {/* 2D: always mounted so export always works; hidden visually when not active */}
                <div className="absolute inset-0" style={{ visibility: tab === "2d" ? "visible" : "hidden", pointerEvents: tab === "2d" ? "auto" : "none" }}>
                  <TrackCanvas ref={canvasRef} onCursorChange={setCursorPos} onSnapChange={setSnapActive} readOnly={readOnly} />
                </div>
                <div className="absolute inset-0" style={{ display: tab === "3d" ? "block" : "none" }}>
                  <TrackPreview3D ref={preview3DRef} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <StatusBar cursorPos={cursorPos} snapActive={snapActive} />
                </div>
              </div>
            </div>

            {/* Desktop Inspector */}
            {!readOnly && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.aside
                  key={selection.length === 0 ? "empty" : selection.length === 1 ? selection[0] : "multi"}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.10, ease: "easeOut" }}
                  className="hidden lg:flex w-[300px] shrink-0 border-l border-border/80 flex-col min-h-0 overflow-hidden bg-card/95 backdrop-blur"
                >
                  <Inspector />
                </motion.aside>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── Read-only FAB ────────────────────────────────────── */}
        {readOnly && (
          <div className="lg:hidden absolute bottom-10 right-4 z-30">
            <motion.button
              onClick={() => setReadOnlyMenuOpen(true)}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-10 px-4 rounded-full bg-sidebar border border-border shadow-lg flex items-center gap-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <span className="uppercase tracking-wide">{tab}</span>
              <LayoutGrid className="size-3.5 text-muted-foreground" />
            </motion.button>
          </div>
        )}

        {/* ── Edit-mode FAB ────────────────────────────────────── */}
        {!readOnly && mobileOverrideDismissed && (
          <div className="lg:hidden absolute bottom-10 right-4 z-30">
            <motion.button
              onClick={() => setMobileToolsOpen(true)}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-10 px-4 rounded-full bg-sidebar border border-border shadow-lg flex items-center gap-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              aria-label="Open tools"
            >
              <span className="capitalize tracking-wide">{activeTool}</span>
              <LayoutGrid className="size-3.5 text-muted-foreground" />
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Editor desktop-only overlay ──────────────────────── */}
      {!readOnly && !mobileOverrideDismissed && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-background px-8 text-center lg:hidden">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <Monitor className="size-10 text-muted-foreground/50" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Open on a larger screen</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              TrackDraw Studio is designed for desktop and tablet. Editing on a phone is not fully supported.
            </p>
          </div>
          <button
            onClick={() => setMobileOverrideDismissed(true)}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors mt-2"
          >
            Continue anyway
          </button>
        </div>
      )}

      {/* ── Mobile Inspector bottom sheet ────────────────────── */}
      {!readOnly && (
        <AnimatePresence>
          {mobileInspectorOpen && (
            <>
              <motion.div
                key="inspector-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={() => setMobileInspectorOpen(false)}
              />
              <motion.div
                key="inspector-panel"
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden flex flex-col bg-card border-t border-border rounded-t-2xl overflow-hidden"
                style={{ maxHeight: "75dvh" }}
              >
                <button
                  type="button"
                  onClick={() => setMobileInspectorOpen(false)}
                  className="flex items-center justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                  aria-label="Close inspector"
                >
                  <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
                </button>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Inspector />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Mobile tools Sheet ───────────────────────────────── */}
      {!readOnly && (
        <Sheet open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="lg:hidden max-h-[85dvh] rounded-t-2xl px-0 gap-0">
            {/* Drawer handle */}
            <button
              type="button"
              onClick={() => setMobileToolsOpen(false)}
              className="flex items-center justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
              aria-label="Close tools"
            >
              <div className="w-8 h-1 rounded-full bg-muted-foreground/25" />
            </button>
            <SheetHeader className="px-4 py-2 shrink-0">
              <SheetTitle className="text-sm">Tools</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {/* Tool grid */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Drawing tools</p>
                <div className="grid grid-cols-3 gap-2">
                  {mobileTools.map((tool) => {
                    const active = activeTool === tool.id;
                    return (
                      <motion.button
                        key={tool.id}
                        onClick={() => { setSelection([]); setActiveTool(tool.id); setMobileToolsOpen(false); }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.16, ease: "easeOut", delay: 0.015 * mobileTools.indexOf(tool) }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border transition-all",
                          active
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {tool.icon}
                        <span className="text-[11px] font-medium leading-none">{tool.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 2D / 3D view switcher */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">View</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-0.5">
                  {(["2d", "3d"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setMobileToolsOpen(false); }}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-md transition-colors uppercase tracking-wide",
                        tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>

              {/* File actions */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Project</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <FilePlus className="size-5" />, label: "New", action: () => { if (confirm("Start a new project? Unsaved changes will be lost.")) { newProject(); setMobileToolsOpen(false); } } },
                    { icon: <FolderOpen className="size-5" />, label: "Open", action: () => { setImportOpen(true); setMobileToolsOpen(false); } },
                    { icon: <Download className="size-5" />, label: "Export", action: () => { setExportOpen(true); setMobileToolsOpen(false); } },
                  ].map(({ icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 border bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                    >
                      {icon}
                      <span className="text-[11px] font-medium leading-none">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Read-only menu Sheet ─────────────────────────────── */}
      {readOnly && (
        <Sheet open={readOnlyMenuOpen} onOpenChange={setReadOnlyMenuOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="lg:hidden max-h-[60dvh] rounded-t-2xl px-0 gap-0">
            <button
              type="button"
              onClick={() => setReadOnlyMenuOpen(false)}
              className="flex items-center justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
              aria-label="Close menu"
            >
              <div className="w-8 h-1 rounded-full bg-muted-foreground/25" />
            </button>
            <SheetHeader className="px-4 py-2 shrink-0">
              <SheetTitle className="text-sm">View</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4 space-y-4">
              {/* 2D / 3D toggle */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">View mode</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-0.5">
                  {(["2d", "3d"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setReadOnlyMenuOpen(false); }}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium rounded-md transition-colors uppercase tracking-wide",
                        tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t === "2d" ? "2D View" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Share */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2">Share</p>
                <button
                  onClick={() => { setShareOpen(true); setReadOnlyMenuOpen(false); }}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full gap-2 h-10")}
                >
                  <Share2 className="size-4" />
                  Share track
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} canvasRef={canvasRef} preview3DRef={preview3DRef} />
    </>
  );
}
