"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";
import { nanoid } from "nanoid";
import type {
  FieldSpec,
  PolylineShape,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";
import { createDefaultDesign, normalizeDesign, nowIso } from "@/lib/design";
import type { EditorTool } from "@/lib/editor-tools";

export type { EditorTool } from "@/lib/editor-tools";

interface EditorState {
  design: TrackDesign;
  selection: string[];
  activeTool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  hoveredShapeId: string | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;

  addShape: (s: ShapeDraft) => string;
  addShapes: (shapes: ShapeDraft[]) => string[];
  updateShape: (id: string, patch: Partial<Shape>) => void;
  rotateShapes: (ids: string[], delta: number) => void;
  removeShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  joinPolylines: (ids: string[]) => string | null;
  closePolyline: (id: string) => boolean;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  setSelection: (ids: string[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  setHoveredWaypoint: (w: { shapeId: string; idx: number } | null) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (
    patch: Partial<
      Pick<TrackDesign, "title" | "description" | "authorName" | "tags">
    >
  ) => void;
  replaceDesign: (design: TrackDesign) => void;
  newProject: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
}

function reversePolyline(path: PolylineShape): PolylineShape {
  return {
    ...path,
    points: [...path.points].reverse(),
  };
}

function endpointDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getPolylineAnchor(path: PolylineShape) {
  if (!path.points.length) {
    return { x: path.x, y: path.y };
  }

  const totals = path.points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: totals.x / path.points.length,
    y: totals.y / path.points.length,
  };
}

function joinPolylineShapes(paths: PolylineShape[]): PolylineShape | null {
  const openPaths = paths
    .filter((path) => !path.closed && path.points.length >= 2)
    .map((path) => ({
      ...path,
      x: 0,
      y: 0,
      points: path.points.map((point) => ({
        ...point,
        x: point.x + path.x,
        y: point.y + path.y,
      })),
    }));

  if (openPaths.length < 2) return null;

  const remaining = [...openPaths];
  let merged = remaining.shift()!;

  while (remaining.length) {
    const mergedStart = merged.points[0];
    const mergedEnd = merged.points.at(-1)!;
    let bestIndex = 0;
    let bestCandidate = remaining[0];
    let bestOrientation: "append" | "prepend" = "append";
    let bestReverse = false;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const candidateStart = candidate.points[0];
      const candidateEnd = candidate.points.at(-1)!;
      const options = [
        {
          distance: endpointDistance(mergedEnd, candidateStart),
          orientation: "append" as const,
          reverse: false,
        },
        {
          distance: endpointDistance(mergedEnd, candidateEnd),
          orientation: "append" as const,
          reverse: true,
        },
        {
          distance: endpointDistance(mergedStart, candidateEnd),
          orientation: "prepend" as const,
          reverse: false,
        },
        {
          distance: endpointDistance(mergedStart, candidateStart),
          orientation: "prepend" as const,
          reverse: true,
        },
      ];

      for (const option of options) {
        if (option.distance < bestDistance) {
          bestDistance = option.distance;
          bestIndex = index;
          bestCandidate = candidate;
          bestOrientation = option.orientation;
          bestReverse = option.reverse;
        }
      }
    });

    const nextPath = bestReverse
      ? reversePolyline(bestCandidate)
      : bestCandidate;
    const nextPoints =
      bestOrientation === "append"
        ? [...merged.points, ...nextPath.points]
        : [...nextPath.points, ...merged.points];

    const dedupedPoints = nextPoints.filter(
      (point, index, all) =>
        index === 0 ||
        endpointDistance(point, all[index - 1]) > 0.001 ||
        Math.abs((point.z ?? 0) - (all[index - 1].z ?? 0)) > 0.001
    );

    merged = {
      ...merged,
      points: dedupedPoints,
      x: 0,
      y: 0,
      showArrows: merged.showArrows || nextPath.showArrows,
      arrowSpacing: Math.min(
        merged.arrowSpacing ?? 15,
        nextPath.arrowSpacing ?? 15
      ),
      strokeWidth: Math.max(
        merged.strokeWidth ?? 0.26,
        nextPath.strokeWidth ?? 0.26
      ),
      closed: false,
      locked: false,
    };

    remaining.splice(bestIndex, 1);
  }

  return merged;
}

export const useEditor = create<EditorState>()(
  temporal(
    immer<EditorState>((set) => ({
      design: createDefaultDesign(),
      selection: [],
      activeTool: "select",
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      hoveredShapeId: null,
      hoveredWaypoint: null,

      addShape: (s) => {
        const id = nanoid();
        set((draft) => {
          const nextShape: Shape = { ...s, id };
          draft.design.shapes.push(nextShape);
          draft.design.updatedAt = nowIso();
        });
        return id;
      },

      addShapes: (shapes) => {
        const ids = shapes.map(() => nanoid());
        set((draft) => {
          const nextShapes: Shape[] = shapes.map((shape, index) => ({
            ...shape,
            id: ids[index],
          }));
          draft.design.shapes.push(...nextShapes);
          draft.design.updatedAt = nowIso();
        });
        return ids;
      },

      updateShape: (id, patch) =>
        set((draft) => {
          const idx = draft.design.shapes.findIndex((sh) => sh.id === id);
          if (idx !== -1) {
            const shape = draft.design.shapes[idx];
            if (shape.kind === "polyline") {
              const polyline = shape;
              const nextPatch = { ...patch } as Partial<Shape>;
              const currentAnchor = getPolylineAnchor(polyline);
              const nextX =
                typeof nextPatch.x === "number" ? nextPatch.x : currentAnchor.x;
              const nextY =
                typeof nextPatch.y === "number" ? nextPatch.y : currentAnchor.y;

              if (
                typeof nextPatch.x === "number" ||
                typeof nextPatch.y === "number"
              ) {
                const dx = nextX - currentAnchor.x;
                const dy = nextY - currentAnchor.y;
                polyline.points = polyline.points.map((point) => ({
                  ...point,
                  x: point.x + dx,
                  y: point.y + dy,
                }));
                nextPatch.x = 0;
                nextPatch.y = 0;
              }

              Object.assign(polyline, nextPatch);
            } else {
              Object.assign(shape, patch);
            }
            draft.design.updatedAt = nowIso();
          }
        }),

      rotateShapes: (ids, delta) =>
        set((draft) => {
          let changed = false;
          for (const id of ids) {
            const idx = draft.design.shapes.findIndex(
              (shape) => shape.id === id
            );
            if (idx === -1) continue;
            const shape = draft.design.shapes[idx];
            if (
              shape.kind === "polyline" ||
              shape.kind === "cone" ||
              shape.locked
            )
              continue;
            shape.rotation = (((shape.rotation + delta) % 360) + 360) % 360;
            changed = true;
          }
          if (changed) {
            draft.design.updatedAt = nowIso();
          }
        }),

      removeShapes: (ids) =>
        set((draft) => {
          draft.design.shapes = draft.design.shapes.filter(
            (sh) => !ids.includes(sh.id)
          );
          draft.selection = draft.selection.filter((x) => !ids.includes(x));
          draft.design.updatedAt = nowIso();
        }),

      nudgeShapes: (ids, dx, dy) =>
        set((draft) => {
          for (const id of ids) {
            const idx = draft.design.shapes.findIndex((s) => s.id === id);
            if (idx !== -1 && !draft.design.shapes[idx].locked) {
              const shape = draft.design.shapes[idx];
              if (shape.kind === "polyline") {
                shape.points = shape.points.map((point) => ({
                  ...point,
                  x: point.x + dx,
                  y: point.y + dy,
                }));
              } else {
                shape.x += dx;
                shape.y += dy;
              }
            }
          }
          draft.design.updatedAt = nowIso();
        }),

      duplicateShapes: (ids) =>
        set((draft) => {
          const toDuplicate = draft.design.shapes.filter((sh) =>
            ids.includes(sh.id)
          );
          const newShapes = toDuplicate.map((sh) =>
            sh.kind === "polyline"
              ? {
                  ...sh,
                  id: nanoid(),
                  x: 0,
                  y: 0,
                  points: sh.points.map((point) => ({
                    ...point,
                    x: point.x + 1,
                    y: point.y + 1,
                  })),
                  name: sh.name ? `${sh.name} copy` : undefined,
                }
              : {
                  ...sh,
                  id: nanoid(),
                  x: sh.x + 1,
                  y: sh.y + 1,
                  name: sh.name ? `${sh.name} copy` : undefined,
                }
          );
          draft.design.shapes.push(...newShapes);
          draft.selection = newShapes.map((s) => s.id);
          draft.design.updatedAt = nowIso();
        }),

      joinPolylines: (ids) => {
        const nextId = nanoid();
        let created = false;

        set((draft) => {
          const polylineShapes = draft.design.shapes.filter(
            (shape): shape is PolylineShape =>
              ids.includes(shape.id) && shape.kind === "polyline"
          );
          const merged = joinPolylineShapes(polylineShapes);
          if (!merged) return;

          draft.design.shapes = draft.design.shapes.filter(
            (shape) => !ids.includes(shape.id)
          );
          draft.design.shapes.push({
            ...merged,
            id: nextId,
            name:
              polylineShapes.length === 2
                ? "Joined path"
                : `Joined ${polylineShapes.length} paths`,
          });
          draft.selection = [nextId];
          draft.design.updatedAt = nowIso();
          created = true;
        });

        return created ? nextId : null;
      },

      closePolyline: (id) => {
        let closed = false;

        set((draft) => {
          const shape = draft.design.shapes.find(
            (candidate): candidate is PolylineShape =>
              candidate.id === id && candidate.kind === "polyline"
          );

          if (!shape || shape.closed || shape.points.length < 3) return;

          shape.closed = true;
          draft.selection = [id];
          draft.design.updatedAt = nowIso();
          closed = true;
        });

        return closed;
      },

      setSelection: (ids) =>
        set((draft) => {
          draft.selection = ids;
        }),

      setActiveTool: (tool) =>
        set((draft) => {
          draft.activeTool = tool;
        }),

      setZoom: (zoom) =>
        set((draft) => {
          draft.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      setPanOffset: (offset) =>
        set((draft) => {
          draft.panOffset = offset;
        }),

      updateField: (patch) =>
        set((draft) => {
          Object.assign(draft.design.field, patch);
          draft.design.updatedAt = nowIso();
        }),

      updateDesignMeta: (patch) =>
        set((draft) => {
          Object.assign(draft.design, patch);
          draft.design.updatedAt = nowIso();
        }),

      replaceDesign: (design) =>
        set((draft) => {
          draft.design = normalizeDesign(design);
          draft.selection = [];
          draft.activeTool = "select";
          draft.hoveredShapeId = null;
        }),

      setHoveredShapeId: (shapeId) =>
        set((draft) => {
          draft.hoveredShapeId = shapeId;
        }),

      setHoveredWaypoint: (w) =>
        set((draft) => {
          draft.hoveredWaypoint = w;
        }),

      newProject: () =>
        set((draft) => {
          draft.design = createDefaultDesign();
          draft.selection = [];
          draft.activeTool = "select";
          draft.zoom = 1;
          draft.panOffset = { x: 0, y: 0 };
          draft.hoveredShapeId = null;
          draft.hoveredWaypoint = null;
        }),

      bringForward: (id) =>
        set((draft) => {
          const idx = draft.design.shapes.findIndex((s) => s.id === id);
          if (idx < draft.design.shapes.length - 1) {
            const [shape] = draft.design.shapes.splice(idx, 1);
            draft.design.shapes.splice(idx + 1, 0, shape);
          }
        }),

      sendBackward: (id) =>
        set((draft) => {
          const idx = draft.design.shapes.findIndex((s) => s.id === id);
          if (idx > 0) {
            const [shape] = draft.design.shapes.splice(idx, 1);
            draft.design.shapes.splice(idx - 1, 0, shape);
          }
        }),
    })),
    {
      partialize: (state) => ({ design: state.design }),
      equality: shallow,
      limit: 100,
    }
  )
);
