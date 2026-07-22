"use client";

import { type CSSProperties, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTrackElementCatalogDimensionsLabel,
  getTrackElementCatalogName,
} from "@/lib/track/elements/catalog";
import { getToolLabel } from "@/lib/editor/tool-registry";
import { catalogPlacementByTool } from "@/lib/editor/placement-catalog";
import type { Translate } from "@/lib/track/items/registry";
import { cn } from "@/lib/utils";
import { useSessionActions, useUiActions } from "@/store/actions";
import { useEditor } from "@/store/editor";

const allEntries = Object.values(catalogPlacementByTool).flatMap(
  (viewModel) => viewModel?.entries ?? []
);
const controlWidthCh = Math.max(
  28,
  Math.min(42, Math.max(...allEntries.map((e) => e.name.length)) + 8)
);

export function ElementPlacementControl() {
  const t = useTranslations("editor.elementPlacementControl");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const [open, setOpen] = useState(false);
  const activeTool = useEditor((state) => state.ui.activeTool);
  const activePlacementElementId = useEditor(
    (state) => state.ui.activePlacementElementId
  );
  const { setActivePlacementElementId } = useUiActions();
  const { setSelection } = useSessionActions();

  const placementViewModel = catalogPlacementByTool[activeTool];
  const entries = placementViewModel?.entries;
  const visible = !!entries && entries.length > 1;
  const activeId = visible
    ? (activePlacementElementId[activeTool] ??
      placementViewModel?.defaultEntryId)
    : undefined;
  const activeEntry = visible
    ? (entries!.find((e) => e.id === activeId) ?? entries![0])
    : undefined;
  const toolLabel = getToolLabel(activeTool, tShapes);
  const controlWidthStyle = {
    width: visible ? `min(${controlWidthCh}ch, calc(100vw - 2rem))` : "auto",
  } satisfies CSSProperties;

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 lg:block">
      <AnimatePresence>
        {visible && activeEntry && (
          <motion.div
            key="placement-control"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto"
          >
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                style={controlWidthStyle}
                className="group border-border/55 bg-sidebar/96 hover:border-border/80 hover:bg-sidebar grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border px-3 text-left shadow-[0_8px_32px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={activeTool}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="border-border/40 text-muted-foreground rounded-md border px-2 py-1 text-[9px] leading-none font-semibold tracking-widest uppercase"
                  >
                    {toolLabel}
                  </motion.span>
                </AnimatePresence>
                <span className="relative min-w-0 overflow-hidden">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={activeEntry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="block min-w-0"
                    >
                      <span className="text-foreground block truncate text-[13px] leading-none font-semibold">
                        {getTrackElementCatalogName(activeEntry, tShapes)}
                      </span>
                      <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
                        <span className="text-muted-foreground/70 truncate text-[11px] leading-none">
                          {getTrackElementCatalogDimensionsLabel(
                            activeEntry,
                            tShapes
                          )}
                        </span>
                        {activeEntry.official ? (
                          <span className="bg-brand-primary/14 text-brand-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-[0.06em] uppercase">
                            {t("official")}
                          </span>
                        ) : null}
                      </span>
                    </motion.span>
                  </AnimatePresence>
                </span>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground/60 size-4 shrink-0 transition-transform duration-200",
                    open && "rotate-180"
                  )}
                />
              </PopoverTrigger>
              <PopoverContent
                align="center"
                side="top"
                sideOffset={10}
                style={controlWidthStyle}
                className="overflow-hidden rounded-xl p-0 shadow-[0_8px_32px_rgba(15,23,42,0.18)]"
              >
                <div className="px-3 pt-3 pb-1.5">
                  <p className="text-muted-foreground/60 text-[10px] font-semibold tracking-widest uppercase">
                    {t("typeLabel", { tool: toolLabel })}
                  </p>
                </div>
                <div className="max-h-72 space-y-0.5 overflow-y-auto px-1.5 pb-1.5">
                  {entries.map((entry) => {
                    const active = activeId === entry.id;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          setSelection([]);
                          setActivePlacementElementId(activeTool, entry.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                          active
                            ? "bg-brand-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[13px] leading-tight font-semibold",
                              active ? "text-foreground" : "text-foreground/80"
                            )}
                          >
                            {getTrackElementCatalogName(entry, tShapes)}
                          </span>
                          <span className="mt-1 flex min-w-0 items-center gap-1.5">
                            <span className="text-muted-foreground/65 truncate text-[11px] leading-none">
                              {getTrackElementCatalogDimensionsLabel(
                                entry,
                                tShapes
                              )}
                            </span>
                            {entry.official ? (
                              <span className="bg-brand-primary/12 text-brand-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-[0.06em] uppercase">
                                {t("official")}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <div
                          className={cn(
                            "size-4 shrink-0 rounded-full border-2 transition-all",
                            active
                              ? "border-brand-primary bg-brand-primary"
                              : "border-border/50"
                          )}
                        >
                          {active && (
                            <Check className="text-background size-full p-0.75" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
