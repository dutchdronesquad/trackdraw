"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { FieldSpec, Shape, TrackDesign } from "@/lib/types";

export type EditorTool =
  | "select"
  | "grab"
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline"
  | "startfinish"
  | "checkpoint"
  | "ladder"
  | "divegate";

interface EditorState {
  design: TrackDesign;
  selection: string[];
  activeTool: EditorTool;
  zoom: number;
  panOffset: { x: number; y: number };
  hoveredWaypoint: { shapeId: string; idx: number } | null;

  addShape: (s: Omit<Shape, "id">) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  setSelection: (ids: string[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
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

const now = () => new Date().toISOString();

function defaultDesign(): TrackDesign {
  return {
    id: nanoid(),
    version: 1,
    title: "New Track",
    description: "",
    tags: [],
    authorName: "",
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

export const useEditor = create<EditorState>()(
  temporal(
    immer<EditorState>((set) => ({
      design: defaultDesign(),
      selection: [],
      activeTool: "select",
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      hoveredWaypoint: null,

      addShape: (s) => {
        const id = nanoid();
        set((draft) => {
          draft.design.shapes.push({ ...s, id } as Shape);
          draft.design.updatedAt = now();
        });
        return id;
      },

      updateShape: (id, patch) =>
        set((draft) => {
          const idx = draft.design.shapes.findIndex((sh) => sh.id === id);
          if (idx !== -1) {
            Object.assign(draft.design.shapes[idx], patch);
            draft.design.updatedAt = now();
          }
        }),

      removeShapes: (ids) =>
        set((draft) => {
          draft.design.shapes = draft.design.shapes.filter(
            (sh) => !ids.includes(sh.id)
          );
          draft.selection = draft.selection.filter((x) => !ids.includes(x));
          draft.design.updatedAt = now();
        }),

      nudgeShapes: (ids, dx, dy) =>
        set((draft) => {
          for (const id of ids) {
            const idx = draft.design.shapes.findIndex((s) => s.id === id);
            if (idx !== -1 && !draft.design.shapes[idx].locked) {
              draft.design.shapes[idx].x += dx;
              draft.design.shapes[idx].y += dy;
            }
          }
          draft.design.updatedAt = now();
        }),

      duplicateShapes: (ids) =>
        set((draft) => {
          const toDuplicate = draft.design.shapes.filter((sh) =>
            ids.includes(sh.id)
          );
          const newShapes = toDuplicate.map((sh) => ({
            ...sh,
            id: nanoid(),
            x: sh.x + 1,
            y: sh.y + 1,
            name: sh.name ? `${sh.name} copy` : undefined,
          }));
          draft.design.shapes.push(...(newShapes as Shape[]));
          draft.selection = newShapes.map((s) => s.id);
          draft.design.updatedAt = now();
        }),

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
          draft.design.updatedAt = now();
        }),

      updateDesignMeta: (patch) =>
        set((draft) => {
          Object.assign(draft.design, patch);
          draft.design.updatedAt = now();
        }),

      replaceDesign: (design) =>
        set((draft) => {
          draft.design = {
            ...design,
            shapes: design.shapes.map((shape) => {
              if (shape.kind === "polyline") {
                return { ...shape, smooth: shape.smooth ?? true };
              }
              return shape;
            }) as Shape[],
          };
          draft.selection = [];
          draft.activeTool = "select";
        }),

      setHoveredWaypoint: (w) =>
        set((draft) => {
          draft.hoveredWaypoint = w;
        }),

      newProject: () =>
        set((draft) => {
          draft.design = defaultDesign();
          draft.selection = [];
          draft.activeTool = "select";
          draft.zoom = 1;
          draft.panOffset = { x: 0, y: 0 };
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
      limit: 100,
    }
  )
);
