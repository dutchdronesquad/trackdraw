"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  FilePlus,
  FolderOpen,
  LayoutGrid,
  Monitor,
  Share2,
} from "lucide-react";
import Inspector from "@/components/Inspector";
import { mobileToolEntries } from "@/components/editor/tool-icons";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EditorTool } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";

export type EditorViewportTab = "2d" | "3d";

interface EditorMobilePanelsProps {
  activeTool: EditorTool;
  mobileInspectorOpen: boolean;
  mobileToolsOpen: boolean;
  mobileOverrideDismissed: boolean;
  readOnly: boolean;
  readOnlyMenuOpen: boolean;
  tab: EditorViewportTab;
  onCloseInspector: () => void;
  onDismissMobileOverride: () => void;
  onOpenReadOnlyMenu: () => void;
  onOpenTools: () => void;
  onSelectTool: (tool: EditorTool) => void;
  onSetMobileToolsOpen: (open: boolean) => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  onShare: () => void;
  onStartNewProject: () => void;
  onImport: () => void;
  onExport: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
}

export function EditorMobilePanels({
  activeTool,
  mobileInspectorOpen,
  mobileToolsOpen,
  mobileOverrideDismissed,
  readOnly,
  readOnlyMenuOpen,
  tab,
  onCloseInspector,
  onDismissMobileOverride,
  onOpenReadOnlyMenu,
  onOpenTools,
  onSelectTool,
  onSetMobileToolsOpen,
  onSetReadOnlyMenuOpen,
  onShare,
  onStartNewProject,
  onImport,
  onExport,
  onTabChange,
}: EditorMobilePanelsProps) {
  return (
    <>
      {readOnly && (
        <div className="absolute right-4 bottom-10 z-30 lg:hidden">
          <motion.button
            onClick={onOpenReadOnlyMenu}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-sidebar border-border text-foreground hover:bg-muted flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium shadow-lg transition-colors"
          >
            <span className="tracking-wide uppercase">{tab}</span>
            <LayoutGrid className="text-muted-foreground size-3.5" />
          </motion.button>
        </div>
      )}

      {!readOnly && mobileOverrideDismissed && (
        <div className="absolute right-4 bottom-10 z-30 lg:hidden">
          <motion.button
            onClick={onOpenTools}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-sidebar border-border text-foreground hover:bg-muted flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium shadow-lg transition-colors"
            aria-label="Open tools"
          >
            <span className="tracking-wide capitalize">{activeTool}</span>
            <LayoutGrid className="text-muted-foreground size-3.5" />
          </motion.button>
        </div>
      )}

      {!readOnly && !mobileOverrideDismissed && (
        <div className="bg-background fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 px-8 text-center lg:hidden">
          <div className="border-border/60 bg-card rounded-2xl border p-5">
            <Monitor className="text-muted-foreground/50 size-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Open on a larger screen</h2>
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              TrackDraw Studio is designed for desktop and tablet. Editing on a
              phone is not fully supported.
            </p>
          </div>
          <button
            onClick={onDismissMobileOverride}
            className="text-muted-foreground/50 hover:text-muted-foreground mt-2 text-xs underline underline-offset-2 transition-colors"
          >
            Continue anyway
          </button>
        </div>
      )}

      {!readOnly && (
        <AnimatePresence>
          {mobileInspectorOpen && (
            <>
              <motion.div
                key="inspector-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                onClick={onCloseInspector}
              />
              <motion.div
                key="inspector-panel"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="bg-card border-border fixed right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t lg:hidden"
                style={{ maxHeight: "75dvh" }}
              >
                <button
                  type="button"
                  onClick={onCloseInspector}
                  className="flex shrink-0 cursor-grab items-center justify-center pt-2 pb-1 active:cursor-grabbing"
                  aria-label="Close inspector"
                >
                  <div className="bg-muted-foreground/30 h-1 w-8 rounded-full" />
                </button>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <Inspector />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {!readOnly && (
        <Sheet open={mobileToolsOpen} onOpenChange={onSetMobileToolsOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[85dvh] gap-0 rounded-t-2xl px-0 lg:hidden"
          >
            <button
              type="button"
              onClick={() => onSetMobileToolsOpen(false)}
              className="flex shrink-0 cursor-grab items-center justify-center pt-2.5 pb-1 active:cursor-grabbing"
              aria-label="Close tools"
            >
              <div className="bg-muted-foreground/25 h-1 w-8 rounded-full" />
            </button>
            <SheetHeader className="shrink-0 px-4 py-2">
              <SheetTitle className="text-sm">Tools</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  Drawing tools
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {mobileToolEntries.map((tool, index) => {
                    const active = activeTool === tool.id;
                    return (
                      <motion.button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{
                          duration: 0.16,
                          ease: "easeOut",
                          delay: 0.015 * index,
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all",
                          active
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {tool.icon}
                        <span className="text-[11px] leading-none font-medium">
                          {tool.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  View
                </p>
                <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-0.5">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetMobileToolsOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-md py-2 text-xs font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {nextTab === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
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
                      onClick={actionItem.action}
                      className="bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all"
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
          </SheetContent>
        </Sheet>
      )}

      {readOnly && (
        <Sheet open={readOnlyMenuOpen} onOpenChange={onSetReadOnlyMenuOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[60dvh] gap-0 rounded-t-2xl px-0 lg:hidden"
          >
            <button
              type="button"
              onClick={() => onSetReadOnlyMenuOpen(false)}
              className="flex shrink-0 cursor-grab items-center justify-center pt-2.5 pb-1 active:cursor-grabbing"
              aria-label="Close menu"
            >
              <div className="bg-muted-foreground/25 h-1 w-8 rounded-full" />
            </button>
            <SheetHeader className="shrink-0 px-4 py-2">
              <SheetTitle className="text-sm">View</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  View mode
                </p>
                <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-0.5">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetReadOnlyMenuOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-md py-2.5 text-sm font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {nextTab === "2d" ? "2D View" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  Share
                </p>
                <button
                  onClick={onShare}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-10 w-full gap-2"
                  )}
                >
                  <Share2 className="size-4" />
                  Share track
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
