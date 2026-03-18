"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEditor, type EditorTool } from "@/store/editor";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  MousePointer2, Hand, Flag, Triangle, Type, Spline,
  FolderOpen, Download, FilePlus, Target,
} from "lucide-react";
import { useState } from "react";

function GateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <line x1="2.5" y1="13" x2="2.5" y2="2.5" />
      <line x1="11.5" y1="13" x2="11.5" y2="2.5" />
      <line x1="2.5" y1="2.5" x2="11.5" y2="2.5" />
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
function DiveGateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="10" height="10" rx="0.5" />
    </svg>
  );
}

function TrackDrawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M69.1143 154.352C71.111 164.983 66.655 174.763 61 180C52.2997 188.056 38 200 38 200H113.167C125.739 189.061 129.7 170.101 123.485 154.352C118.093 140.688 122.123 130.029 134.216 125.911C135.157 125.591 137 125.319 137 125.319L137 108C132.179 109.165 137 108 123.078 111.35C120.173 112.049 93.8158 118.051 80.5256 127.04C72.0136 132.798 67.1177 143.72 69.1143 154.352Z" fill="currentColor"/>
      <path d="M143 48C156.807 48 168 59.1929 168 73V149C168 151.209 166.209 153 164 153H147C144.791 153 143 151.209 143 149V89C143 80.1634 135.837 73 127 73H74C65.1634 73 58 80.1634 58 89V149C58 151.209 56.2091 153 54 153H37C34.7909 153 33 151.209 33 149V73C33 59.1929 44.1929 48 58 48H143Z" fill="currentColor"/>
      <rect x="4" y="4" width="192" height="192" rx="31" stroke="currentColor" strokeWidth="8"/>
    </svg>
  );
}

type ToolEntry = { id: EditorTool; label: string; shortcut: string; icon: React.ReactNode };
type ToolGroup = { title: string; tools: ToolEntry[] };

const toolGroups: ToolGroup[] = [
  {
    title: "",
    tools: [
      { id: "select", label: "Select", shortcut: "V", icon: <MousePointer2 className="size-[14px]" /> },
      { id: "grab", label: "Grab", shortcut: "H", icon: <Hand className="size-[14px]" /> },
    ],
  },
  {
    title: "Track",
    tools: [
      { id: "gate",     label: "Gate",      shortcut: "G", icon: <GateIcon className="size-[14px]" /> },
      { id: "ladder",   label: "Ladder",    shortcut: "R", icon: <LadderIcon className="size-[14px]" /> },
      { id: "divegate", label: "Dive Gate", shortcut: "D", icon: <DiveGateIcon className="size-[14px]" /> },
      { id: "flag",     label: "Flag",      shortcut: "F", icon: <Flag className="size-[14px]" /> },
      { id: "cone",     label: "Cone",      shortcut: "C", icon: <Triangle className="size-[14px]" /> },
    ],
  },
  {
    title: "Extra",
    tools: [
      { id: "startfinish", label: "Start Pads", shortcut: "S", icon: <Target className="size-[14px]" /> },
      { id: "label",       label: "Label",      shortcut: "L", icon: <Type className="size-[14px]" /> },
      { id: "polyline",    label: "Path",       shortcut: "P", icon: <Spline className="size-[14px]" /> },
    ],
  },
];

const bottomActions = [
  { label: "New",    tooltip: "New project",  icon: <FilePlus   className="size-[14px]" />, action: "new"    as const },
  { label: "Open",   tooltip: "Open project", icon: <FolderOpen className="size-[14px]" />, action: "import" as const },
  { label: "Export", tooltip: "Export track", icon: <Download   className="size-[14px]" />, action: "export" as const },
];

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Toolbar({ onImport, onExport, collapsed }: ToolbarProps) {
  const { activeTool, setActiveTool, setSelection, newProject } = useEditor();
  const theme = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleAction(action: "new" | "import" | "export") {
    if (action === "new") setConfirmOpen(true);
    else if (action === "import") onImport();
    else onExport();
  }

  return (
    <>
      <SidebarProvider
        className="hidden lg:flex shrink-0 h-full !min-h-0 !w-auto"
        style={{ "--sidebar-width": collapsed ? "3.5rem" : "11.5rem" } as React.CSSProperties}
      >
        <Sidebar
          collapsible="none"
          className="border-r border-border h-full transition-[width] duration-200 ease-in-out overflow-hidden"
        >
          {/* Logo header */}
          <SidebarHeader className="px-3 py-2 border-b border-border/60 flex items-center justify-center">
            <Link
              href="/"
              className="flex items-center justify-center rounded-md transition-opacity hover:opacity-100 opacity-90"
              aria-label="Go to homepage"
            >
              {collapsed ? (
                <TrackDrawIcon className="size-6 text-foreground/80" />
              ) : (
                <Image
                  src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
                  alt="TrackDraw"
                  width={120}
                  height={26}
                  className="h-[26px] w-auto select-none"
                  draggable={false}
                />
              )}
            </Link>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {toolGroups.map((group, gi) => (
              <SidebarGroup key={gi} className="py-0 px-2">
                {gi > 0 && (
                  collapsed
                    ? <SidebarSeparator className="my-2" />
                    : group.title
                      ? <SidebarGroupLabel className="h-7 text-[10px] tracking-widest uppercase text-sidebar-foreground/35">{group.title}</SidebarGroupLabel>
                      : <div className="h-2" />
                )}
                <SidebarMenu className="space-y-1">
                  {group.tools.map((tool) => {
                    const active = tool.id === activeTool;
                    const btn = (
                      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} transition={{ duration: 0.16, ease: "easeOut" }}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => { setSelection([]); setActiveTool(tool.id); }}
                          className={cn(
                            "relative h-8 overflow-hidden rounded-lg border transition-all duration-150",
                            collapsed ? "justify-center px-0" : "gap-2.5",
                            active
                              ? "border-brand-primary/30 bg-brand-primary/14 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                              : "border-transparent text-sidebar-foreground/75 hover:border-border/80 hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="toolbar-active-pill"
                              className="absolute inset-0 rounded-lg bg-brand-primary/12"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          )}
                          <span className={cn("shrink-0 flex items-center justify-center size-4 transition-colors", active ? "text-brand-primary" : "text-sidebar-foreground/70 group-hover/menu-button:text-foreground")}>
                            {tool.icon}
                          </span>
                          {!collapsed && <span className="flex-1 text-[13px] truncate">{tool.label}</span>}
                          {!collapsed && (
                            <Kbd className={cn("h-4 min-w-4 px-1 text-[9px] font-mono leading-none shadow-none", active ? "bg-brand-primary/10 text-foreground/55" : "bg-muted/80 text-muted-foreground/55")}>
                              {tool.shortcut}
                            </Kbd>
                          )}
                        </SidebarMenuButton>
                      </motion.div>
                    );
                    return (
                      <SidebarMenuItem key={tool.id}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger
                              onClick={() => { setSelection([]); setActiveTool(tool.id); }}
                              className={cn(
                                "w-full flex items-center justify-center h-8 rounded-lg border transition-colors duration-150",
                                active
                                  ? "border-brand-primary/30 bg-brand-primary/14 text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                                  : "border-transparent text-sidebar-foreground/65 hover:border-border/80 hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {tool.icon}
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                              <span>{tool.label}</span>
                              <span className="ml-2 inline-flex"><Kbd className="h-4 min-w-4 px-1 text-[9px] font-mono shadow-none">{tool.shortcut}</Kbd></span>
                            </TooltipContent>
                          </Tooltip>
                        ) : btn}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-2 gap-0 border-t border-border/60">
            <SidebarMenu className="space-y-1">
              {bottomActions.map(({ label, tooltip, icon, action }) => {
                const btn = (
                  <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    <SidebarMenuButton
                    onClick={() => handleAction(action)}
                    className={cn(
                      "h-8 rounded-lg border border-transparent text-sidebar-foreground/75 transition-all duration-200 hover:border-border/80 hover:bg-muted hover:text-foreground",
                      collapsed ? "justify-center px-0" : "gap-2.5"
                    )}
                  >
                    <span className="shrink-0 flex items-center justify-center size-4">{icon}</span>
                    {!collapsed && <span className="text-[13px]">{label}</span>}
                    </SidebarMenuButton>
                  </motion.div>
                );
                return (
                  <SidebarMenuItem key={label}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() => handleAction(action)}
                          className="w-full flex items-center justify-center h-8 rounded-lg border border-transparent text-sidebar-foreground/65 hover:border-border/80 hover:bg-muted hover:text-foreground transition-colors"
                        >
                          {icon}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>{tooltip}</TooltipContent>
                      </Tooltip>
                    ) : btn}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </SidebarProvider>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xs" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              This will clear your current track. Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="flex-1" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { newProject(); setConfirmOpen(false); }}
            >
              Start New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
