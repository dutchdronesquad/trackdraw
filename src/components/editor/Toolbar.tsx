"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  bottomActions,
  toolbarToolGroups,
} from "@/components/editor/tool-icons";
import { useTheme } from "@/hooks/useTheme";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editor";

function TrackDrawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M69.1143 154.352C71.111 164.983 66.655 174.763 61 180C52.2997 188.056 38 200 38 200H113.167C125.739 189.061 129.7 170.101 123.485 154.352C118.093 140.688 122.123 130.029 134.216 125.911C135.157 125.591 137 125.319 137 125.319L137 108C132.179 109.165 137 108 123.078 111.35C120.173 112.049 93.8158 118.051 80.5256 127.04C72.0136 132.798 67.1177 143.72 69.1143 154.352Z"
        fill="currentColor"
      />
      <path
        d="M143 48C156.807 48 168 59.1929 168 73V149C168 151.209 166.209 153 164 153H147C144.791 153 143 151.209 143 149V89C143 80.1634 135.837 73 127 73H74C65.1634 73 58 80.1634 58 89V149C58 151.209 56.2091 153 54 153H37C34.7909 153 33 151.209 33 149V73C33 59.1929 44.1929 48 58 48H143Z"
        fill="currentColor"
      />
      <rect
        x="4"
        y="4"
        width="192"
        height="192"
        rx="31"
        stroke="currentColor"
        strokeWidth="8"
      />
    </svg>
  );
}

interface ToolbarProps {
  onImport: () => void;
  onExport: () => void;
  onOpenProjectManager: () => void;
  onOpenPresets: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Toolbar({
  onImport,
  onExport,
  onOpenProjectManager,
  onOpenPresets,
  collapsed,
}: ToolbarProps) {
  const activeTool = useEditor((state) => state.transient.activeTool);
  const setActiveTool = useEditor((state) => state.setActiveTool);
  const setSelection = useEditor((state) => state.setSelection);
  const theme = useTheme();

  function handleAction(action: "new" | "import" | "export") {
    if (action === "new") onOpenProjectManager();
    else if (action === "import") onImport();
    else onExport();
  }

  function handleToolSelect(
    tool: (typeof toolbarToolGroups)[number]["tools"][number]["id"]
  ) {
    setSelection([]);
    if (tool === "preset") {
      onOpenPresets();
      return;
    }
    setActiveTool(tool);
  }

  return (
    <SidebarProvider
      className="hidden h-full min-h-0! w-auto! shrink-0 lg:flex"
      style={
        {
          "--sidebar-width": collapsed ? "3.5rem" : "11.5rem",
        } as React.CSSProperties
      }
    >
      <Sidebar
        collapsible="none"
        className="border-border h-full overflow-hidden border-r transition-[width] duration-200 ease-in-out"
      >
        {/* Logo header */}
        <SidebarHeader className="border-border/60 flex h-11 items-center justify-center border-b px-3 py-0">
          <Link
            href="/"
            className="flex items-center justify-center rounded-md opacity-90 transition-opacity hover:opacity-100"
            aria-label="Go to homepage"
          >
            {collapsed ? (
              <TrackDrawIcon className="text-foreground/80 size-6" />
            ) : (
              <span className="relative block h-7.5 w-34 select-none">
                <Image
                  src={`/assets/brand/trackdraw-logo-mono-${theme === "dark" ? "darkbg" : "lightbg"}.svg`}
                  alt="TrackDraw"
                  fill
                  unoptimized
                  className="object-contain"
                  draggable={false}
                />
              </span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 py-2">
          {toolbarToolGroups.map((group, gi) => (
            <SidebarGroup key={gi} className="px-2 py-0">
              {gi > 0 &&
                (collapsed ? (
                  <SidebarSeparator className="my-2" />
                ) : group.title ? (
                  <SidebarGroupLabel className="text-sidebar-foreground/35 h-7 text-[11px] tracking-widest uppercase">
                    {group.title}
                  </SidebarGroupLabel>
                ) : (
                  <div className="h-2" />
                ))}
              <SidebarMenu className="space-y-1">
                {group.tools.map((tool) => {
                  const active = tool.id === activeTool;
                  const btn = (
                    <motion.div
                      whileTap={{ scale: 0.985 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => handleToolSelect(tool.id)}
                        className={cn(
                          "relative h-8 overflow-hidden rounded-lg border transition-all duration-150",
                          collapsed ? "justify-center px-0" : "gap-2.5",
                          active
                            ? "border-brand-primary/30 bg-brand-primary/14 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                            : "text-sidebar-foreground/75 hover:border-border/80 hover:bg-muted hover:text-foreground border-transparent"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="toolbar-active-pill"
                            className="bg-brand-primary/12 absolute inset-0 rounded-lg"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                            }}
                          />
                        )}
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center transition-colors",
                            active
                              ? "text-brand-primary"
                              : "text-sidebar-foreground/70 group-hover/menu-button:text-foreground"
                          )}
                        >
                          {tool.icon}
                        </span>
                        {!collapsed && (
                          <span className="flex-1 truncate text-[13px]">
                            {tool.label}
                          </span>
                        )}
                        {!collapsed && tool.shortcut && (
                          <Kbd
                            className={cn(
                              "h-4 min-w-4 px-1 font-mono text-[9px] leading-none shadow-none",
                              active
                                ? "bg-brand-primary/10 text-foreground/55"
                                : "bg-muted/80 text-muted-foreground/55"
                            )}
                          >
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
                            onClick={() => handleToolSelect(tool.id)}
                            className={cn(
                              "flex h-8 w-full items-center justify-center rounded-lg border transition-colors duration-150",
                              active
                                ? "border-brand-primary/30 bg-brand-primary/14 text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                                : "text-sidebar-foreground/65 hover:border-border/80 hover:bg-muted hover:text-foreground border-transparent"
                            )}
                          >
                            {tool.icon}
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            <span>{tool.label}</span>
                            {tool.shortcut ? (
                              <span className="ml-2 inline-flex">
                                <Kbd className="h-4 min-w-4 px-1 font-mono text-[9px] shadow-none">
                                  {tool.shortcut}
                                </Kbd>
                              </span>
                            ) : null}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        btn
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-border/60 gap-0 border-t p-2">
          <SidebarMenu className="space-y-1">
            {bottomActions.map(({ label, tooltip, icon, action }) => {
              const btn = (
                <motion.div
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <SidebarMenuButton
                    onClick={() => handleAction(action)}
                    className={cn(
                      "text-sidebar-foreground/75 hover:border-border/80 hover:bg-muted hover:text-foreground h-8 rounded-lg border border-transparent transition-all duration-200",
                      collapsed ? "justify-center px-0" : "gap-2.5"
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {icon}
                    </span>
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
                        className="text-sidebar-foreground/65 hover:border-border/80 hover:bg-muted hover:text-foreground flex h-8 w-full items-center justify-center rounded-lg border border-transparent transition-colors"
                      >
                        {icon}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    btn
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
