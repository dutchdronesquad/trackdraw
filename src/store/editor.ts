import { create } from "zustand";
import { nanoid } from "nanoid";
import type { FieldSpec, Shape, TrackDesign } from "@/lib/types";

export type EditorTool =
  | "select"
  | "gate"
  | "flag"
  | "cone"
  | "label"
  | "polyline";

interface EditorState {
  design: TrackDesign;
  selection: string[];
  activeTool: EditorTool;
  addShape: (s: Omit<Shape, "id">) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setSelection: (ids: string[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (patch: Partial<Pick<TrackDesign, "title" | "description">>) => void;
  replaceDesign: (design: TrackDesign) => void;
}

const now = () => new Date().toISOString();

export const useEditor = create<EditorState>((set) => ({
  design: {
    id: nanoid(),
    title: "TrackDraw project",
    field: { width: 30, height: 15, origin: "tl", gridStep: 1, ppm: 50 },
    shapes: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  },
  selection: [],
  activeTool: "select",
  addShape: (s) =>
    {
      const id = nanoid();
      set((st) => ({
        design: {
          ...st.design,
          updatedAt: now(),
          shapes: [...st.design.shapes, { ...s, id } as Shape],
        },
      }));
      return id;
    },
  updateShape: (id, patch) =>
    set((st) => ({
      design: {
        ...st.design,
        updatedAt: now(),
        shapes: st.design.shapes.map((sh) =>
          sh.id === id ? ({ ...sh, ...patch } as Shape) : sh
        ),
      },
    })),
  removeShape: (id) =>
    set((st) => ({
      design: {
        ...st.design,
        updatedAt: now(),
        shapes: st.design.shapes.filter((s) => s.id !== id),
      },
      selection: st.selection.filter((x) => x !== id),
    })),
  setSelection: (ids) => set({ selection: ids }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  updateField: (patch) =>
    set((st) => ({
      design: {
        ...st.design,
        updatedAt: now(),
        field: {
          ...st.design.field,
          ...patch,
        },
      },
    })),
  updateDesignMeta: (patch) =>
    set((st) => ({
      design: {
        ...st.design,
        ...patch,
        updatedAt: now(),
      },
    })),
  replaceDesign: (design) =>
    set(() => {
      const normalizedShapes: Shape[] = design.shapes.map((shape) => {
        if (shape.kind === "polyline") {
          return {
            ...shape,
            smooth: shape.smooth ?? true,
          } as Shape;
        }
        return shape;
      });
      return {
        design: {
          ...design,
          shapes: normalizedShapes,
          updatedAt: design.updatedAt ?? now(),
        },
        selection: [],
        activeTool: "select",
      };
    }),
}));
