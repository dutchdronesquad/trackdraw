"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { shapeKindLabels } from "@/lib/editor-tools";
import { getObstacleNumberMap } from "@/lib/obstacleNumbering";
import type { Shape, TrackDesign } from "@/lib/types";
import { X } from "lucide-react";
import { fmt, Section } from "@/components/inspector/shared";
import { MetaPill } from "./layout";

export type DesignMetaPatch = Partial<
  Pick<
    TrackDesign,
    "title" | "description" | "authorName" | "tags" | "inventory"
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

export function ItemOverviewList({
  design,
  shapes,
  setSelection,
  removeShapes,
  setHoveredShapeId,
  grow = false,
}: {
  design: TrackDesign;
  shapes: Shape[];
  setSelection: (ids: string[]) => void;
  removeShapes: (ids: string[]) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  grow?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredShapes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return shapes;
    return shapes.filter((shape, index) => {
      const name =
        shape.name?.trim() || `${shapeKindLabels[shape.kind]} ${index + 1}`;
      const position = `${fmt(shape.x)}, ${fmt(shape.y)}`;
      return (
        name.toLowerCase().includes(normalizedQuery) ||
        shapeKindLabels[shape.kind].toLowerCase().includes(normalizedQuery) ||
        position.includes(normalizedQuery)
      );
    });
  }, [query, shapes]);
  const shapeOrder = useMemo(
    () => new Map(shapes.map((shape, index) => [shape.id, index + 1] as const)),
    [shapes]
  );
  const obstacleNumberMap = useMemo(
    () => getObstacleNumberMap(design),
    [design]
  );

  return (
    <Section
      title="Items"
      className={cn(grow && "flex min-h-0 flex-1 flex-col")}
    >
      <div
        className={cn("space-y-2.5", grow && "flex min-h-0 flex-1 flex-col")}
      >
        <div className="flex shrink-0 items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter items"
            className="bg-background border-border/40 h-8 text-[11px] shadow-none lg:h-7"
          />
          <MetaPill>
            {filteredShapes.length}/{shapes.length}
          </MetaPill>
        </div>
        <ListPanel
          title="Placed items"
          subtitle="Select an item from the list."
          grow={grow}
          meta={
            <span className="text-muted-foreground/65 text-[11px]">
              {shapes.length}
            </span>
          }
        >
          <div className="border-border/15 grid shrink-0 grid-cols-[32px_minmax(0,1fr)_48px_28px] items-center gap-3 border-b px-3 py-1.5">
            <span className="text-muted-foreground/55 text-[10px] font-medium tracking-[0.08em] uppercase">
              Id
            </span>
            <span className="text-muted-foreground/55 text-[10px] font-medium tracking-[0.08em] uppercase">
              Item
            </span>
            <span className="text-muted-foreground/55 text-right text-[10px] font-medium tracking-[0.08em] uppercase">
              Path
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
                filteredShapes.map((shape) => (
                  <div
                    key={shape.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelection([shape.id])}
                    className="group/item hover:bg-primary/8 focus-visible:ring-primary/20 relative grid w-full grid-cols-[32px_minmax(0,1fr)_48px_28px] items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden"
                    onMouseEnter={() => setHoveredShapeId(shape.id)}
                    onMouseLeave={() => setHoveredShapeId(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelection([shape.id]);
                      }
                    }}
                  >
                    <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-full opacity-0 transition-opacity group-hover/item:opacity-100" />
                    <div className="flex min-w-0 items-center">
                      <span className="border-border/30 bg-muted/35 text-muted-foreground/85 flex h-5 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]">
                        {shapeOrder.get(shape.id)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-[11px] font-medium">
                          {shape.name?.trim() || shapeKindLabels[shape.kind]}
                        </p>
                        <p className="text-muted-foreground/60 truncate text-[10px] tracking-[0.06em] uppercase">
                          {shapeKindLabels[shape.kind]}
                        </p>
                      </div>
                    </div>
                    {typeof obstacleNumberMap.get(shape.id) === "number" ? (
                      <span className="border-primary/20 bg-primary/8 text-primary/90 flex h-5 w-12 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]">
                        #{obstacleNumberMap.get(shape.id)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 flex h-5 w-12 shrink-0 items-center justify-center font-mono text-[10px]">
                        –
                      </span>
                    )}
                    <div className="flex items-center justify-end opacity-100 transition-opacity lg:opacity-0 lg:group-hover/item:opacity-100">
                      <button
                        type="button"
                        title="Remove item"
                        className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors"
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
                ))
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-muted-foreground/55 text-[11px]">
                    No items match this filter.
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
