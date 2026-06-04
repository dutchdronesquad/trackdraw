"use client";

import { type CSSProperties, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getCatalogEntriesByKind,
  TRACKDRAW_GATE_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { cn } from "@/lib/utils";
import { useSessionActions, useUiActions } from "@/store/actions";
import { useEditor } from "@/store/editor";

const gateCatalogEntries = getCatalogEntriesByKind("gate");
const placementControlWidthCh = Math.max(
  22,
  Math.min(
    32,
    Math.max(...gateCatalogEntries.map((entry) => entry.name.length)) + 5
  )
);

export function ElementPlacementControl() {
  const [open, setOpen] = useState(false);
  const activeTool = useEditor((state) => state.ui.activeTool);
  const activeGateElementId =
    useEditor((state) => state.ui.activeGateElementId) ??
    TRACKDRAW_GATE_ELEMENT_ID;
  const { setActiveGateElementId } = useUiActions();
  const { setSelection } = useSessionActions();
  const activeEntry =
    gateCatalogEntries.find((entry) => entry.id === activeGateElementId) ??
    gateCatalogEntries[0];
  const controlWidthStyle = {
    width: `min(${placementControlWidthCh}ch, calc(100vw - 2rem))`,
  } satisfies CSSProperties;

  if (activeTool !== "gate" || !activeEntry) return null;

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 lg:block">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          style={controlWidthStyle}
          className="group border-border/65 bg-sidebar/94 hover:border-border hover:bg-sidebar grid h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md transition-colors"
        >
          <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-1 font-mono text-[9px] leading-none font-semibold tracking-[0.12em] uppercase">
            Gate
          </span>
          <span className="min-w-0">
            <span className="text-foreground block truncate text-xs leading-none font-medium">
              {activeEntry.name}
            </span>
            <span className="mt-1 flex min-w-0 items-center gap-1.5">
              <span className="text-muted-foreground truncate text-[11px] leading-none">
                {activeEntry.dimensions.display.label}
              </span>
              {activeEntry.official ? (
                <span className="bg-brand-primary/12 text-brand-primary shrink-0 rounded-[3px] px-1 py-0.5 text-[9px] leading-none font-semibold tracking-[0.08em] uppercase">
                  Official
                </span>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center">
            <ChevronDown
              className={cn(
                "text-muted-foreground size-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
          </span>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          sideOffset={8}
          style={controlWidthStyle}
          className="overflow-hidden p-0"
        >
          <div className="border-border/70 border-b px-3 py-2">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase">
              Choose gate type
            </p>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-1.5">
            {gateCatalogEntries.map((entry) => {
              const active = activeGateElementId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelection([]);
                    setActiveGateElementId(entry.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                    active
                      ? "bg-brand-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm leading-tight font-medium">
                      {entry.name}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs opacity-75">
                      <span className="truncate">
                        {entry.dimensions.display.label}
                      </span>
                      {entry.official ? (
                        <span className="bg-muted rounded-[3px] px-1 py-0.5 text-[9px] leading-none font-semibold tracking-[0.08em] uppercase">
                          Official
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "text-brand-primary size-4 shrink-0 transition-opacity",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
