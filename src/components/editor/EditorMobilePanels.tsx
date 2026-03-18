"use client";

import { motion } from "framer-motion";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  const mobileDrawerHeader = (
    title: string,
    subtitle?: string,
    tone: "default" | "brand" = "default"
  ) => (
    <div className="border-border/50 bg-background/96 shrink-0 border-b backdrop-blur-sm">
      <div className="flex items-center justify-center pt-2.5 pb-2">
        <div
          className={cn(
            "h-1 rounded-full",
            tone === "brand"
              ? "bg-brand-primary/18 w-10"
              : "bg-muted-foreground/18 w-8"
          )}
        />
      </div>
      <DrawerHeader className="px-4 pt-0 pb-3 text-left">
        <div className="min-w-0">
          <DrawerTitle className="text-foreground/88 text-[13px] font-medium tracking-[0.01em]">
            {title}
          </DrawerTitle>
          {subtitle ? (
            <p className="text-muted-foreground/70 pt-0.5 text-[10px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </DrawerHeader>
    </div>
  );

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
        <Drawer
          open={mobileInspectorOpen}
          direction="bottom"
          modal
          onOpenChange={(open) => {
            if (!open) onCloseInspector();
          }}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[72dvh] gap-0 overflow-hidden [overscroll-behavior:contain] rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader("Inspector", "Selection properties", "brand")}
            <div className="min-h-0 flex-1 overflow-hidden [overscroll-behavior:contain]">
              <Inspector />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {!readOnly && (
        <Drawer
          open={mobileToolsOpen}
          direction="bottom"
          modal
          onOpenChange={onSetMobileToolsOpen}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[85dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader(
              "Tools",
              "Drawing, view and project actions",
              "brand"
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  Drawing tools
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {mobileToolEntries.map((tool) => {
                    const active = activeTool === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all",
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

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
                  View
                </p>
                <div className="border-border/50 bg-muted/18 flex items-center gap-1.5 rounded-[1rem] border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetMobileToolsOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                      )}
                    >
                      {nextTab === "2d" ? "Canvas" : "3D Preview"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground/60 mb-2.5 text-[10px] font-semibold tracking-widest uppercase">
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
                      className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex flex-col items-center gap-1.5 rounded-[1rem] border px-2 py-3 transition-all"
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
          </DrawerContent>
        </Drawer>
      )}

      {readOnly && (
        <Drawer
          open={readOnlyMenuOpen}
          direction="bottom"
          modal
          onOpenChange={onSetReadOnlyMenuOpen}
        >
          <DrawerContent className="border-border/60 bg-background max-h-[60dvh] gap-0 overflow-hidden rounded-t-[1.35rem] border shadow-[0_-18px_40px_rgba(0,0,0,0.18)] lg:hidden [&>div:first-child]:hidden">
            {mobileDrawerHeader("View", "Switch mode or share this track")}
            <div className="space-y-5 px-4 pb-4">
              <div>
                <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-widest uppercase">
                  View mode
                </p>
                <div className="border-border/50 bg-muted/18 flex items-center gap-1.5 rounded-[1rem] border p-1">
                  {(["2d", "3d"] as const).map((nextTab) => (
                    <button
                      key={nextTab}
                      onClick={() => {
                        onTabChange(nextTab);
                        onSetReadOnlyMenuOpen(false);
                      }}
                      className={cn(
                        "flex-1 rounded-[0.8rem] py-2.5 text-sm font-medium tracking-wide uppercase transition-colors",
                        tab === nextTab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
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
                    "border-border/60 bg-muted/12 hover:bg-muted/24 h-10 w-full gap-2"
                  )}
                >
                  <Share2 className="size-4" />
                  Share track
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
