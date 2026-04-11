"use client";

import { Plus, PlusCircle, X } from "lucide-react";
import { ListPanel } from "@/components/inspector/views/list-panel";
import {
  getInsertedWaypointMidpoint,
  getNextAppendedWaypoint,
} from "@/lib/inspector/single/view-model";
import type { PolylinePoint, PolylineShape } from "@/lib/types";

interface PolylineWaypointListProps {
  appendPolylinePoint: (id: string, point: PolylinePoint) => void;
  finishBatch: () => void;
  insertPolylinePoint: (
    id: string,
    index: number,
    point: PolylinePoint
  ) => void;
  removePolylinePoint: (id: string, index: number) => void;
  setHoveredWaypoint: (
    waypoint: { shapeId: string; idx: number } | null
  ) => void;
  shape: PolylineShape;
  startBatch: () => void;
  updatePolylinePoint: (
    id: string,
    index: number,
    patch: Partial<PolylinePoint>
  ) => void;
}

export function PolylineWaypointList({
  appendPolylinePoint,
  finishBatch,
  insertPolylinePoint,
  removePolylinePoint,
  setHoveredWaypoint,
  shape,
  startBatch,
  updatePolylinePoint,
}: PolylineWaypointListProps) {
  return (
    <div className="mt-3">
      <ListPanel
        title="Waypoints"
        subtitle="Adjust each point and its elevation."
        meta={
          <span className="text-muted-foreground/65 text-[11px]">
            {shape.points.length}
          </span>
        }
      >
        <div className="border-border/15 grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b px-3 py-1.5">
          <span className="text-muted-foreground/65 text-[11px] font-medium tracking-[0.08em] uppercase">
            #
          </span>
          <span className="text-muted-foreground/40 text-[9px] font-semibold tracking-wider uppercase">
            x, y
          </span>
          <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
            elev
          </span>
          <span className="text-muted-foreground/40 text-right text-[9px] font-semibold tracking-wider uppercase">
            edit
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {shape.points.map((point, index) => (
            <div
              key={index}
              className="group/row border-border/10 hover:bg-primary/6 relative grid grid-cols-[28px_minmax(0,1fr)_56px_44px] items-center gap-2 border-b py-2 pr-3 pl-3 transition-colors last:border-b-0 lg:py-1.5 lg:pr-2"
              onMouseEnter={() =>
                setHoveredWaypoint({ shapeId: shape.id, idx: index })
              }
              onMouseLeave={() => setHoveredWaypoint(null)}
            >
              <span className="bg-primary/40 absolute top-0 bottom-0 left-0 w-px opacity-0 transition-opacity group-hover/row:opacity-100" />
              <span className="border-border/30 bg-primary/8 text-primary/80 flex h-5 w-5 items-center justify-center rounded-xs border font-mono text-[10px] tabular-nums">
                {index}
              </span>
              <div className="min-w-0">
                <span className="text-foreground/85 block font-mono text-[11px] leading-none tabular-nums">
                  {point.x.toFixed(1)}, {point.y.toFixed(1)}
                </span>
              </div>
              <input
                type="number"
                step={0.5}
                title="Elevation (m)"
                className="text-foreground/90 focus:bg-primary/6 focus:text-foreground hover:border-border/25 focus:border-primary/30 h-7 w-14 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-right font-mono text-[11px] transition-colors focus:outline-hidden"
                value={point.z ?? 0}
                disabled={shape.locked}
                onFocus={startBatch}
                onBlur={finishBatch}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                onChange={(event) => {
                  updatePolylinePoint(shape.id, index, {
                    z: +event.target.value,
                  });
                }}
              />
              <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/row:opacity-100">
                {index < shape.points.length - 1 && (
                  <button
                    title="Insert point after"
                    disabled={shape.locked}
                    className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-35"
                    onClick={() => {
                      insertPolylinePoint(
                        shape.id,
                        index + 1,
                        getInsertedWaypointMidpoint(
                          shape.points[index],
                          shape.points[index + 1]
                        )
                      );
                    }}
                  >
                    <PlusCircle className="size-3" />
                  </button>
                )}
                <button
                  title="Remove point"
                  disabled={shape.locked}
                  className="text-muted-foreground/55 hover:text-primary hover:bg-primary/10 flex size-5 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => {
                    removePolylinePoint(shape.id, index);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className="border-border/15 text-muted-foreground/55 hover:text-foreground hover:bg-muted/6 flex h-10 w-full items-center justify-center gap-1.5 border-t py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-auto lg:text-[11px]"
          disabled={shape.locked}
          onClick={() => {
            appendPolylinePoint(
              shape.id,
              getNextAppendedWaypoint(shape.points[shape.points.length - 1])
            );
          }}
        >
          <Plus className="size-3" /> Add point
        </button>
      </ListPanel>
    </div>
  );
}
