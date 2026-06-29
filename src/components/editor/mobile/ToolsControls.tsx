"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Redo2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { getMobileToolEntries } from "@/components/editor/tool-icons";
import type { TrackElementCatalogId } from "@/lib/track/elements/catalog";
import {
  catalogPlacementByTool,
  catalogPlacementToolIds,
} from "@/lib/editor/placement-catalog";
import type { EditorTool, Translate } from "@/lib/editor/tool-registry";
import { cn } from "@/lib/utils";
import type { EditorViewportTab } from "./Panels";

const catalogToolIdSet = new Set<EditorTool>(catalogPlacementToolIds);

interface ToolsControlsProps {
  activeTool: EditorTool;
  activePlacementElementId: Partial<Record<EditorTool, TrackElementCatalogId>>;
  canRedo: boolean;
  canUndo: boolean;
  tab: EditorViewportTab;
  onRedo: () => void;
  onSelectPlacementElement: (
    tool: EditorTool,
    id: TrackElementCatalogId
  ) => void;
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
  activePlacementElementId,
  canRedo,
  canUndo,
  tab,
  onRedo,
  onSelectPlacementElement,
  onSelectTool,
  onUndo,
}: ToolsControlsProps) {
  const t = useTranslations("editor");
  const tCommon = useTranslations("common");
  const tCatalog = useTranslations("inspector.catalog");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const mobileToolEntries = getMobileToolEntries(tShapes);
  const catalogToolIds = mobileToolEntries
    .map((tool) => tool.id)
    .filter((toolId) => catalogToolIdSet.has(toolId));

  return (
    <>
      {/* Undo / redo */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => runAction(onUndo)}
          disabled={!canUndo}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="size-3.5" />
          {tCommon("actions.undo")}
        </button>
        <button
          onClick={() => runAction(onRedo)}
          disabled={!canRedo}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 className="size-3.5" />
          {t("header.redo")}
        </button>
      </div>

      {tab === "2d" && (
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            {t("mobilePanels.editorPanels.nav.tools")}
          </p>

          {/* Catalog tools — active one auto-expands with type list */}
          <div className="mb-2 space-y-2">
            {catalogToolIds.map((toolId) => {
              const placementViewModel = catalogPlacementByTool[toolId];
              const entries = placementViewModel?.entries ?? [];
              const toolEntry = mobileToolEntries.find((t) => t.id === toolId);
              const activeId =
                activePlacementElementId[toolId] ??
                placementViewModel?.defaultEntryId;
              const activeEntry =
                entries.find((e) => e.id === activeId) ?? entries[0];
              const isActiveTool = activeTool === toolId;
              const toolLabel = toolEntry?.label ?? toolId;

              return (
                <div
                  key={toolId}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-all duration-200",
                    isActiveTool
                      ? "border-brand-primary/25 bg-brand-primary/5"
                      : "border-border/50 bg-muted/14"
                  )}
                >
                  {/* Tool header — always visible */}
                  <button
                    type="button"
                    onClick={() => runAction(() => onSelectTool(toolId))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-all",
                        isActiveTool
                          ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                          : "border-border/45 bg-background/50 text-muted-foreground"
                      )}
                    >
                      {toolEntry?.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm leading-tight font-semibold",
                          isActiveTool
                            ? "text-foreground"
                            : "text-foreground/75"
                        )}
                      >
                        {toolLabel}
                      </p>
                      <p className="text-muted-foreground/60 mt-0.5 truncate text-[11px]">
                        {activeEntry?.name ?? "—"}
                        {activeEntry?.official
                          ? ` · ${tCatalog("officialBadge")}`
                          : ""}
                      </p>
                    </div>
                  </button>

                  {/* Type list — only visible when this tool is active */}
                  <AnimatePresence initial={false}>
                    {isActiveTool && (
                      <motion.div
                        key="type-list"
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          variants={{
                            hidden: {},
                            visible: {
                              transition: {
                                staggerChildren: 0.045,
                                delayChildren: 0.06,
                              },
                            },
                          }}
                          className="border-brand-primary/20 space-y-0.5 border-t px-2 pt-1.5 pb-2"
                        >
                          {entries.map((entry) => {
                            const isActiveType = activeEntry?.id === entry.id;
                            return (
                              <motion.button
                                key={entry.id}
                                type="button"
                                variants={{
                                  hidden: { opacity: 0, y: -6 },
                                  visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      duration: 0.18,
                                      ease: [0.16, 1, 0.3, 1],
                                    },
                                  },
                                }}
                                onClick={() =>
                                  runAction(() =>
                                    onSelectPlacementElement(toolId, entry.id)
                                  )
                                }
                                className={cn(
                                  "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                                  isActiveType
                                    ? "bg-brand-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                                )}
                              >
                                <div
                                  className={cn(
                                    "size-4 shrink-0 rounded-full border-2 transition-all",
                                    isActiveType
                                      ? "border-brand-primary bg-brand-primary"
                                      : "border-border/50"
                                  )}
                                >
                                  {isActiveType && (
                                    <Check className="text-background size-full p-0.5" />
                                  )}
                                </div>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-[13px] leading-tight font-semibold",
                                      isActiveType
                                        ? "text-foreground"
                                        : "text-foreground/80"
                                    )}
                                  >
                                    {entry.name}
                                  </span>
                                  <span className="text-muted-foreground/60 mt-0.5 flex items-center gap-1.5 text-[11px]">
                                    <span className="truncate">
                                      {entry.dimensions.display.label}
                                    </span>
                                    {entry.official ? (
                                      <span className="bg-brand-primary/12 text-brand-primary shrink-0 rounded-full px-1.5 py-0.5 text-[9px] leading-none font-semibold tracking-widest uppercase">
                                        {tCatalog("officialBadge")}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Remaining tools — compact 3-col grid */}
          <div className="grid grid-cols-3 gap-2">
            {mobileToolEntries
              .filter(
                (tool) =>
                  tool.id !== "grab" &&
                  tool.id !== "preset" &&
                  !catalogToolIds.includes(tool.id as EditorTool)
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
                        ? "border-brand-primary/25 bg-brand-primary/8 text-brand-primary"
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
