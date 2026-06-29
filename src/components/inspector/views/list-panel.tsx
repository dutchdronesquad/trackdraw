"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import {
  getObstacleNumberingReport,
  isNumberedObstacle,
  type ObstacleNumberingReport,
} from "@/lib/track/obstacleNumbering";
import type { Shape, TrackDesign } from "@/lib/types";
import { X } from "lucide-react";
import { fmt, Section } from "@/components/inspector/shared";
import { MetaPill } from "./layout";
import {
  getTrackElementCatalogEntry,
  getTrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";

export type DesignMetaPatch = Partial<
  Pick<
    TrackDesign,
    | "title"
    | "description"
    | "authorName"
    | "tags"
    | "inventory"
    | "mapReference"
  >
>;

export function ListPanel({
  title,
  subtitle,
  meta,
  children,
  grow = false,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border/25 overflow-hidden rounded-lg border",
        grow && "flex min-h-0 flex-1 flex-col"
      )}
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="text-foreground/80 text-[11px] font-medium">
              {title}
            </span>
            {meta ? <div className="shrink-0">{meta}</div> : null}
          </div>
          {subtitle ? (
            <p className="text-muted-foreground/70 mt-1 text-[11px] leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "border-border/15 border-t",
          grow && "flex min-h-0 flex-1 flex-col"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function getShapeDisplayName(shape: Shape, t: Translate): string {
  if (shape.name?.trim()) return shape.name.trim();
  const catalogId = getTrackElementCatalogIdentity(shape.meta)?.elementId;
  const entry = getTrackElementCatalogEntry(catalogId);
  return entry?.name ?? getShapeKindLabel(shape.kind, t);
}

type ViewFilter = "all" | "obstacles";

export function ItemOverviewList({
  design,
  shapes,
  setSelection,
  removeShapes,

  setHoveredShapeId,
  grow = false,
  obstacleNumberingReport,
}: {
  design: TrackDesign;
  shapes: Shape[];
  setSelection: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  grow?: boolean;
  obstacleNumberingReport?: ObstacleNumberingReport;
}) {
  const t = useTranslations("inspector");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const [query, setQuery] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const VIEW_FILTERS: { value: ViewFilter; label: string }[] = [
    { value: "all", label: t("listPanel.filterAll") },
    { value: "obstacles", label: t("listPanel.filterObstacles") },
  ];

  const normalizedQuery = query.trim().toLowerCase();

  const shapeOrder = useMemo(
    () => new Map(shapes.map((shape, index) => [shape.id, index + 1] as const)),
    [shapes]
  );

  const numberingReport = useMemo(
    () => obstacleNumberingReport ?? getObstacleNumberingReport(design),
    [design, obstacleNumberingReport]
  );

  const unmappedObstacleIds = useMemo(
    () =>
      new Set(
        shapes
          .filter(
            (shape) =>
              isNumberedObstacle(shape) &&
              !numberingReport.obstacleNumberMap.has(shape.id) &&
              numberingReport.primaryPolylineId
          )
          .map((shape) => shape.id)
      ),
    [numberingReport, shapes]
  );

  const obstacleCount = useMemo(
    () => shapes.filter(isNumberedObstacle).length,
    [shapes]
  );

  const filteredShapes = useMemo(() => {
    return shapes.filter((shape) => {
      if (viewFilter === "obstacles" && !isNumberedObstacle(shape))
        return false;
      if (!normalizedQuery) return true;
      const displayName = getShapeDisplayName(shape, tShapes);
      const kindLabel = getShapeKindLabel(shape.kind, tShapes);
      const position = `${fmt(shape.x)}, ${fmt(shape.y)}`;
      return (
        displayName.toLowerCase().includes(normalizedQuery) ||
        kindLabel.toLowerCase().includes(normalizedQuery) ||
        position.includes(normalizedQuery)
      );
    });
  }, [shapes, viewFilter, normalizedQuery, tShapes]);

  return (
    <Section
      title={t("listPanel.panelTitle")}
      className={cn(grow && "flex min-h-0 flex-1 flex-col")}
    >
      <div
        className={cn("space-y-2.5", grow && "flex min-h-0 flex-1 flex-col")}
      >
        <div className="flex shrink-0 items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("listPanel.filterPlaceholder")}
            className="bg-background border-border/40 focus-visible:border-border/80 focus-visible:ring-ring/20 h-8 rounded-md px-2.5 text-[11px] shadow-none focus-visible:ring-1 lg:h-7 lg:px-2"
          />
          <MetaPill>
            {filteredShapes.length}/{shapes.length}
          </MetaPill>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {VIEW_FILTERS.map(({ value, label }) => {
            const count = value === "obstacles" ? obstacleCount : shapes.length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setViewFilter(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  viewFilter === value
                    ? "bg-brand-primary/12 text-brand-primary"
                    : "text-muted-foreground/65 hover:text-foreground/80 hover:bg-muted/40"
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded px-1 font-mono text-[10px]",
                    viewFilter === value
                      ? "bg-brand-primary/15 text-brand-primary"
                      : "bg-muted/60 text-muted-foreground/55"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <ListPanel
          title={t("listPanel.placedItemsTitle")}
          subtitle={t("listPanel.placedItemsSubtitle")}
          grow={grow}
          meta={
            <span className="text-muted-foreground/65 text-[11px]">
              {shapes.length}
            </span>
          }
        >
          <div className="border-border/15 grid shrink-0 grid-cols-[32px_minmax(0,1fr)_48px_28px] items-center gap-3 border-b px-3 py-1.5">
            <span className="text-muted-foreground/55 text-[10px] font-medium tracking-[0.08em] uppercase">
              #
            </span>
            <span className="text-muted-foreground/55 text-[10px] font-medium tracking-[0.08em] uppercase">
              {t("listPanel.itemColumn")}
            </span>
            <span className="text-muted-foreground/55 text-right text-[10px] font-medium tracking-[0.08em] uppercase">
              {t("listPanel.pathColumn")}
            </span>
            <span aria-hidden="true" />
          </div>
          <div
            className={cn(
              grow
                ? "min-h-0 flex-1 overflow-y-auto"
                : "max-h-128 overflow-y-auto"
            )}
          >
            <div className="divide-border/15 divide-y">
              {filteredShapes.length ? (
                filteredShapes.map((shape) => {
                  const displayName = getShapeDisplayName(shape, tShapes);
                  const kindLabel = getShapeKindLabel(shape.kind, tShapes);
                  const pathNumber = numberingReport.obstacleNumberMap.get(
                    shape.id
                  );
                  return (
                    <div
                      key={shape.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelection([shape.id])}
                      className="group/item hover:bg-brand-primary/8 focus-visible:ring-brand-primary/20 relative grid w-full grid-cols-[32px_minmax(0,1fr)_48px_28px] items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                      onMouseEnter={() => setHoveredShapeId(shape.id)}
                      onMouseLeave={() => setHoveredShapeId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelection([shape.id]);
                        }
                      }}
                    >
                      <span className="bg-brand-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-full opacity-0 transition-opacity group-hover/item:opacity-100" />
                      <div className="flex min-w-0 items-center">
                        <span className="border-border/30 bg-muted/35 text-muted-foreground/85 flex h-5 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]">
                          {shapeOrder.get(shape.id)}
                        </span>
                      </div>
                      <div className="flex min-w-0 items-center">
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-[11px] font-medium">
                            {displayName}
                          </p>
                          <p className="text-muted-foreground/60 truncate text-[10px] tracking-[0.06em] uppercase">
                            {kindLabel}
                          </p>
                        </div>
                      </div>
                      {typeof pathNumber === "number" ? (
                        <span className="border-brand-primary/20 bg-brand-primary/8 text-brand-primary flex h-5 w-12 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]">
                          #{pathNumber}
                        </span>
                      ) : unmappedObstacleIds.has(shape.id) ? (
                        <span className="flex h-5 w-12 shrink-0 items-center justify-center rounded-md border border-amber-500/25 bg-amber-500/10 font-mono text-[10px] font-medium text-amber-500">
                          off
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30 flex h-5 w-12 shrink-0 items-center justify-center font-mono text-[10px]">
                          –
                        </span>
                      )}
                      <div className="flex items-center justify-end opacity-100 transition-opacity lg:opacity-0 lg:group-hover/item:opacity-100">
                        <button
                          type="button"
                          title={t("actions.removeItem")}
                          className="text-muted-foreground/55 hover:bg-brand-primary/10 hover:text-brand-primary flex size-5 items-center justify-center rounded-md transition-colors"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeShapes([shape.id]);
                            setHoveredShapeId(null);
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-muted-foreground/55 text-[11px]">
                    {t("listPanel.noItemsMatchFilter")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </ListPanel>
      </div>
    </Section>
  );
}
