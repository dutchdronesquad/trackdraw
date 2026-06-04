"use client";

import { useState } from "react";
import { Check, ChevronDown, Redo2, Undo2 } from "lucide-react";
import { mobileToolEntries } from "@/components/editor/tool-icons";
import {
  getCatalogEntriesByKind,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import type { EditorTool } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";
import type { EditorViewportTab } from "./Panels";

const gateCatalogEntries = getCatalogEntriesByKind("gate");
const mobileGateToolEntry = mobileToolEntries.find((t) => t.id === "gate");

interface ToolsControlsProps {
  activeTool: EditorTool;
  activeGateElementId: TrackElementCatalogId | null;
  canRedo: boolean;
  canUndo: boolean;
  tab: EditorViewportTab;
  onRedo: () => void;
  onSelectGateElement: (id: TrackElementCatalogId) => void;
  onSelectTool: (tool: EditorTool) => void;
  onUndo: () => void;
}

function runAction(action: () => void) {
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
  action();
}

export function ToolsControls({
  activeTool,
  activeGateElementId,
  canRedo,
  canUndo,
  tab,
  onRedo,
  onSelectGateElement,
  onSelectTool,
  onUndo,
}: ToolsControlsProps) {
  const [gateTypesOpen, setGateTypesOpen] = useState(false);

  const activeGateEntry =
    gateCatalogEntries.find((e) => e.id === activeGateElementId) ??
    gateCatalogEntries[0];

  return (
    <>
      {/* Compact undo / redo — no section header */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => runAction(onUndo)}
          disabled={!canUndo}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="size-3.5" />
          Undo
        </button>
        <button
          onClick={() => runAction(onRedo)}
          disabled={!canRedo}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 className="size-3.5" />
          Redo
        </button>
      </div>

      {tab === "2d" && (
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Tools
          </p>

          {/* Gate — full-width card with inline type picker */}
          <div className="border-border/50 bg-muted/14 mb-2 overflow-hidden rounded-2xl border">
            <button
              type="button"
              onClick={() => runAction(() => onSelectTool("gate"))}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-all",
                activeTool === "gate"
                  ? "bg-muted/55 text-foreground"
                  : "text-muted-foreground hover:bg-muted/28 hover:text-foreground"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="border-border/45 bg-background/50 flex size-10 shrink-0 items-center justify-center rounded-xl border">
                  {mobileGateToolEntry?.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Gate</p>
                  <p className="truncate pt-0.5 text-[11px] opacity-70">
                    {activeGateEntry
                      ? `${activeGateEntry.name} · ${activeGateEntry.dimensions.display.label}`
                      : "Place a gate"}
                  </p>
                </div>
              </div>
              {activeGateEntry?.official ? (
                <span className="bg-brand-primary/12 text-brand-primary shrink-0 rounded-md px-1.5 py-1 text-[9px] leading-none font-semibold tracking-[0.08em] uppercase">
                  Official
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setGateTypesOpen((c) => !c)}
              className="border-border/25 text-muted-foreground hover:bg-muted/22 hover:text-foreground flex min-h-9 w-full items-center justify-between gap-2 border-t px-4 text-left text-[11px] font-medium transition-colors"
              aria-expanded={gateTypesOpen}
            >
              <span>Change gate type</span>
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  gateTypesOpen && "rotate-180"
                )}
              />
            </button>
            {gateTypesOpen ? (
              <div className="border-border/25 space-y-1 border-t p-1.5">
                {gateCatalogEntries.map((entry) => {
                  const active = activeGateEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() =>
                        runAction(() => onSelectGateElement(entry.id))
                      }
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-muted/60 text-foreground"
                          : "text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium">
                          {entry.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] opacity-75">
                          {entry.dimensions.display.label}
                          {entry.official ? " · Official" : ""}
                        </span>
                      </span>
                      <Check
                        className={cn(
                          "text-brand-primary size-3.5 shrink-0 transition-opacity",
                          active ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Drawing tools grid — preset excluded */}
          <div className="grid grid-cols-3 gap-2">
            {mobileToolEntries
              .filter(
                (tool) =>
                  tool.id !== "grab" &&
                  tool.id !== "gate" &&
                  tool.id !== "preset"
              )
              .map((tool) => {
                const active = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => runAction(() => onSelectTool(tool.id))}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all",
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
      )}
    </>
  );
}
