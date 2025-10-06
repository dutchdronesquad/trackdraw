import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Shape, TrackDesign } from "@/lib/types";

interface EditorState {
  design: TrackDesign;
  selection: string[];
  addShape: (s: Omit<Shape, "id">) => void;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  setSelection: (ids: string[]) => void;
}

const now = () => new Date().toISOString();

export const useEditor = create<EditorState>((set, get) => ({
  design: {
    id: nanoid(),
    title: "Untitled Track",
    field: { width: 30, height: 15, origin: "tl", gridStep: 1, ppm: 50 },
    shapes: [],
    version: 1,
    createdAt: now(),
    updatedAt: now(),
  },
  selection: [],
  addShape: (s) =>
    set((st) => ({
      design: {
        ...st.design,
        updatedAt: now(),
        shapes: [...st.design.shapes, { ...s, id: nanoid() } as Shape],
      },
    })),
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
}));
