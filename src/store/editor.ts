"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type {
  FieldSpec,
  PolylinePoint,
  PolylineShape,
  SerializedTrackDesign,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";
import {
  createDefaultDesign,
  getDesignShapeById,
  normalizeDesign,
  nowIso,
  serializeDesign,
} from "@/lib/track/design";
import {
  appendPolylinePoint,
  applyShapePatch,
  closePolyline,
  duplicateShapes,
  insertPolylinePoint,
  joinPolylineShapes,
  nudgeShapes,
  removePolylinePoint,
  reversePolylinePoints,
  rotateShapes,
  setPolylinePoints,
  updatePolylinePoint,
} from "@/lib/editor/shape-mutations";
import {
  createDefaultEditorSessionState,
  createDefaultEditorTransientState,
  resetEditorTransientState,
  sanitizeEditorTransientState,
} from "@/lib/editor/store-state";
import type {
  EditorSessionState,
  EditorTransientState,
} from "@/lib/editor/store-types";
import type { EditorTool } from "@/lib/editor-tools";
import {
  expandGroupedSelection,
  getShapeGroupId,
} from "@/lib/track/shape-groups";
import type { DraftPoint, RectLike } from "@/lib/canvas/shared";

export type { EditorTool } from "@/lib/editor-tools";

interface EditorState extends EditorSessionState {
  design: TrackDesign;
  selection: string[];
  transient: EditorTransientState;

  addShape: (s: ShapeDraft) => string;
  addShapes: (shapes: ShapeDraft[]) => string[];
  updateShape: (id: string, patch: Partial<Shape>) => void;
  updateShapes: (ids: string[], patch: Partial<Shape>) => void;
  setShapesLocked: (ids: string[], locked: boolean) => void;
  setPolylinePoints: (id: string, points: PolylinePoint[]) => void;
  updatePolylinePoint: (
    id: string,
    index: number,
    patch: Partial<PolylinePoint>
  ) => void;
  insertPolylinePoint: (
    id: string,
    index: number,
    point: PolylinePoint
  ) => void;
  removePolylinePoint: (id: string, index: number) => void;
  appendPolylinePoint: (id: string, point: PolylinePoint) => void;
  reversePolylinePoints: (id: string) => void;
  rotateShapes: (ids: string[], delta: number) => void;
  removeShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  groupSelection: (ids: string[]) => string | null;
  setGroupName: (ids: string[], name: string) => void;
  ungroupSelection: (ids: string[]) => void;
  joinPolylines: (ids: string[]) => string | null;
  closePolyline: (id: string) => boolean;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  setSelection: (ids: string[]) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActivePresetId: (presetId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setHoveredShapeId: (shapeId: string | null) => void;
  setHoveredWaypoint: (w: { shapeId: string; idx: number } | null) => void;
  setSegmentSelection: (
    value:
      | {
          shapeId: string;
          segmentIndex: number;
          point: { x: number; y: number };
        }
      | null
      | ((
          previous: {
            shapeId: string;
            segmentIndex: number;
            point: { x: number; y: number };
          } | null
        ) => {
          shapeId: string;
          segmentIndex: number;
          point: { x: number; y: number };
        } | null)
  ) => void;
  setVertexSelection: (
    value:
      | { shapeId: string; idx: number }
      | null
      | ((
          previous: { shapeId: string; idx: number } | null
        ) => { shapeId: string; idx: number } | null)
  ) => void;
  setDraftPath: (
    value: DraftPoint[] | ((previous: DraftPoint[]) => DraftPoint[])
  ) => void;
  setDraftForceClosed: (
    value: boolean | ((previous: boolean) => boolean)
  ) => void;
  setDraftSourceShapeId: (
    value: string | null | ((previous: string | null) => string | null)
  ) => void;
  setMarqueeRect: (
    value: RectLike | null | ((previous: RectLike | null) => RectLike | null)
  ) => void;
  setRotationSession: (
    value:
      | {
          center: { x: number; y: number };
          shapeId: string;
          startAngle: number;
          startRotation: number;
          previewRotation: number;
        }
      | null
      | ((
          previous: {
            center: { x: number; y: number };
            shapeId: string;
            startAngle: number;
            startRotation: number;
            previewRotation: number;
          } | null
        ) => {
          center: { x: number; y: number };
          shapeId: string;
          startAngle: number;
          startRotation: number;
          previewRotation: number;
        } | null)
  ) => void;
  setGroupDragPreview: (
    value:
      | {
          ids: string[];
          origin: { x: number; y: number };
          dx: number;
          dy: number;
        }
      | null
      | ((
          previous: {
            ids: string[];
            origin: { x: number; y: number };
            dx: number;
            dy: number;
          } | null
        ) => {
          ids: string[];
          origin: { x: number; y: number };
          dx: number;
          dy: number;
        } | null)
  ) => void;
  setLiveShapePatch: (id: string, patch: Partial<Shape>) => void;
  clearLiveShapePatch: (id: string) => void;
  updateField: (patch: Partial<FieldSpec>) => void;
  updateDesignMeta: (
    patch: Partial<
      Pick<
        TrackDesign,
        "title" | "description" | "authorName" | "tags" | "inventory"
      >
    >
  ) => void;
  replaceDesign: (design: TrackDesign | SerializedTrackDesign) => void;
  newProject: () => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  pauseHistory: () => void;
  resumeHistory: () => void;
  clearHistory: () => void;
  beginInteraction: () => void;
  endInteraction: () => void;
  sanitizeHistoryState: () => void;
}

function addShapeRecord(design: TrackDesign, shape: Shape) {
  design.shapeOrder.push(shape.id);
  design.shapeById[shape.id] = shape;
}

function findShapeOrderIndex(design: TrackDesign, id: string) {
  return design.shapeOrder.indexOf(id);
}

function removeShapeRecord(design: TrackDesign, id: string) {
  delete design.shapeById[id];
  design.shapeOrder = design.shapeOrder.filter((shapeId) => shapeId !== id);
}

function pauseTemporalHistory() {
  useEditor.temporal.getState().pause();
}

function resumeTemporalHistory() {
  useEditor.temporal.getState().resume();
}

function clearTemporalHistory() {
  useEditor.temporal.getState().clear();
}

export const useEditor = create<EditorState>()(
  temporal(
    immer<EditorState>((set) => ({
      design: createDefaultDesign(),
      selection: [],
      transient: createDefaultEditorTransientState(),
      ...createDefaultEditorSessionState(),

      addShape: (s) => {
        const id = nanoid();
        set((draft) => {
          const nextShape: Shape = { ...s, id };
          addShapeRecord(draft.design, nextShape);
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
          nextShapes.forEach((shape) => addShapeRecord(draft.design, shape));
          draft.design.updatedAt = nowIso();
        });
        return ids;
      },

      updateShape: (id, patch) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape) return;
          applyShapePatch(shape, patch);
          draft.design.updatedAt = nowIso();
        }),

      updateShapes: (ids, patch) =>
        set((draft) => {
          let changed = false;

          for (const id of ids) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;
            applyShapePatch(shape, patch);
            changed = true;
          }

          if (changed) {
            draft.design.updatedAt = nowIso();
          }
        }),

      setShapesLocked: (ids, locked) =>
        set((draft) => {
          let changed = false;

          for (const id of ids) {
            const shape = draft.design.shapeById[id];
            if (!shape || shape.locked === locked) continue;
            shape.locked = locked;
            changed = true;
          }

          if (changed) {
            draft.design.updatedAt = nowIso();
          }
        }),

      setPolylinePoints: (id, points) =>
        set((draft) => {
          if (!setPolylinePoints(draft.design.shapeById[id], points)) return;
          draft.design.updatedAt = nowIso();
        }),

      updatePolylinePoint: (id, index, patch) =>
        set((draft) => {
          if (!updatePolylinePoint(draft.design.shapeById[id], index, patch))
            return;
          draft.design.updatedAt = nowIso();
        }),

      insertPolylinePoint: (id, index, point) =>
        set((draft) => {
          if (!insertPolylinePoint(draft.design.shapeById[id], index, point))
            return;
          draft.transient.segmentSelection = null;
          draft.design.updatedAt = nowIso();
        }),

      removePolylinePoint: (id, index) =>
        set((draft) => {
          if (!removePolylinePoint(draft.design.shapeById[id], index)) return;
          draft.transient.segmentSelection = null;
          draft.design.updatedAt = nowIso();
        }),

      appendPolylinePoint: (id, point) =>
        set((draft) => {
          if (!appendPolylinePoint(draft.design.shapeById[id], point)) return;
          draft.design.updatedAt = nowIso();
        }),

      reversePolylinePoints: (id) =>
        set((draft) => {
          if (!reversePolylinePoints(draft.design.shapeById[id])) return;
          draft.design.updatedAt = nowIso();
        }),

      rotateShapes: (ids, delta) =>
        set((draft) => {
          const changed = rotateShapes(draft.design.shapeById, ids, delta);
          if (changed) {
            draft.design.updatedAt = nowIso();
          }
        }),

      removeShapes: (ids) =>
        set((draft) => {
          const idSet = new Set(ids);
          ids.forEach((id) => removeShapeRecord(draft.design, id));
          draft.selection = draft.selection.filter((id) => !idSet.has(id));
          draft.design.updatedAt = nowIso();
        }),

      nudgeShapes: (ids, dx, dy) =>
        set((draft) => {
          if (!nudgeShapes(draft.design.shapeById, ids, dx, dy)) return;
          draft.design.updatedAt = nowIso();
        }),

      duplicateShapes: (ids) =>
        set((draft) => {
          const newShapes = duplicateShapes(draft.design, ids);
          newShapes.forEach((shape) => addShapeRecord(draft.design, shape));
          draft.selection = newShapes.map((s) => s.id);
          draft.design.updatedAt = nowIso();
        }),

      groupSelection: (ids) => {
        const nextGroupId = nanoid();
        let grouped = false;

        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.design, ids);
          if (expandedIds.length < 2) return;

          for (const id of expandedIds) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;
            shape.meta = {
              ...shape.meta,
              groupId: nextGroupId,
            };
          }

          draft.selection = expandedIds;
          draft.design.updatedAt = nowIso();
          grouped = true;
        });

        return grouped ? nextGroupId : null;
      },

      setGroupName: (ids, name) =>
        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.design, ids);
          const selectedGroupIds = new Set<string>();
          let changed = false;

          for (const id of expandedIds) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;

            const groupId = getShapeGroupId(shape);
            if (groupId) {
              selectedGroupIds.add(groupId);
            }
          }

          if (selectedGroupIds.size === 0) return;

          for (const id of draft.design.shapeOrder) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;

            const groupId = getShapeGroupId(shape);
            if (!groupId || !selectedGroupIds.has(groupId)) continue;

            const nextMeta = { ...(shape.meta ?? {}) };
            if (name.trim().length > 0) {
              nextMeta.groupName = name;
            } else {
              delete nextMeta.groupName;
            }

            shape.meta =
              Object.keys(nextMeta).length > 0 ? nextMeta : undefined;
            changed = true;
          }

          if (changed) {
            draft.design.updatedAt = nowIso();
          }
        }),

      ungroupSelection: (ids) =>
        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.design, ids);
          let changed = false;

          for (const id of expandedIds) {
            const shape = draft.design.shapeById[id];
            if (!shape || !shape.meta || !("groupId" in shape.meta)) continue;

            const {
              groupId: _groupId,
              groupName: _groupName,
              ...restMeta
            } = shape.meta;
            shape.meta =
              Object.keys(restMeta).length > 0 ? restMeta : undefined;
            changed = true;
          }

          if (changed) {
            draft.selection = expandedIds;
            draft.design.updatedAt = nowIso();
          }
        }),

      joinPolylines: (ids) => {
        const nextId = nanoid();
        let created = false;

        set((draft) => {
          const idSet = new Set(ids);
          const polylineShapes = draft.design.shapeOrder
            .filter((id) => idSet.has(id))
            .map((id) => draft.design.shapeById[id])
            .filter(
              (shape): shape is PolylineShape =>
                Boolean(shape) && shape.kind === "polyline"
            );
          const merged = joinPolylineShapes(polylineShapes);
          if (!merged) return;

          ids.forEach((id) => removeShapeRecord(draft.design, id));
          addShapeRecord(draft.design, {
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
          const shape = getDesignShapeById(draft.design, id);
          if (!closePolyline(shape ?? undefined)) return;
          draft.selection = [id];
          draft.design.updatedAt = nowIso();
          closed = true;
        });

        return closed;
      },

      setSelection: (ids) =>
        set((draft) => {
          draft.selection = expandGroupedSelection(draft.design, ids);
          draft.transient.segmentSelection = null;
          if (draft.selection.length !== 1) {
            draft.transient.vertexSelection = null;
          }
        }),

      setActiveTool: (tool) =>
        set((draft) => {
          draft.transient.activeTool = tool;
        }),

      setActivePresetId: (presetId) =>
        set((draft) => {
          draft.transient.activePresetId = presetId;
        }),

      setZoom: (zoom) =>
        set((draft) => {
          draft.transient.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      setPanOffset: (offset) =>
        set((draft) => {
          draft.transient.panOffset = offset;
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

      replaceDesign: (design) => {
        set((draft) => {
          draft.design = normalizeDesign(design);
          draft.selection = [];
          draft.transient = resetEditorTransientState(draft.transient);
          Object.assign(draft, createDefaultEditorSessionState());
        });
        clearTemporalHistory();
      },

      setHoveredShapeId: (shapeId) =>
        set((draft) => {
          draft.transient.hoveredShapeId = shapeId;
        }),

      setHoveredWaypoint: (w) =>
        set((draft) => {
          draft.transient.hoveredWaypoint = w;
        }),

      setSegmentSelection: (value) =>
        set((draft) => {
          draft.transient.segmentSelection =
            typeof value === "function"
              ? value(draft.transient.segmentSelection)
              : value;
          if (draft.transient.segmentSelection) {
            draft.transient.vertexSelection = null;
          }
        }),

      setVertexSelection: (value) =>
        set((draft) => {
          draft.transient.vertexSelection =
            typeof value === "function"
              ? value(draft.transient.vertexSelection)
              : value;
          if (draft.transient.vertexSelection) {
            draft.transient.segmentSelection = null;
          }
        }),

      setDraftPath: (value) =>
        set((draft) => {
          draft.transient.draftPath =
            typeof value === "function"
              ? value(draft.transient.draftPath)
              : value;
        }),

      setDraftForceClosed: (value) =>
        set((draft) => {
          draft.transient.draftForceClosed =
            typeof value === "function"
              ? value(draft.transient.draftForceClosed)
              : value;
        }),

      setDraftSourceShapeId: (value) =>
        set((draft) => {
          draft.transient.draftSourceShapeId =
            typeof value === "function"
              ? value(draft.transient.draftSourceShapeId)
              : value;
        }),

      setMarqueeRect: (value) =>
        set((draft) => {
          draft.transient.marqueeRect =
            typeof value === "function"
              ? value(draft.transient.marqueeRect)
              : value;
        }),

      setRotationSession: (value) =>
        set((draft) => {
          draft.transient.rotationSession =
            typeof value === "function"
              ? value(draft.transient.rotationSession)
              : value;
        }),

      setGroupDragPreview: (value) =>
        set((draft) => {
          draft.transient.groupDragPreview =
            typeof value === "function"
              ? value(draft.transient.groupDragPreview)
              : value;
        }),

      setLiveShapePatch: (id, patch) =>
        set((draft) => {
          draft.transient.liveShapePatches[id] = patch;
        }),

      clearLiveShapePatch: (id) =>
        set((draft) => {
          delete draft.transient.liveShapePatches[id];
        }),

      newProject: () => {
        set((draft) => {
          draft.design = createDefaultDesign();
          draft.selection = [];
          draft.transient = resetEditorTransientState(draft.transient, {
            zoom: 1,
            panOffset: { x: 0, y: 0 },
          });
          Object.assign(draft, createDefaultEditorSessionState());
        });
        clearTemporalHistory();
      },

      bringForward: (id) =>
        set((draft) => {
          const idx = findShapeOrderIndex(draft.design, id);
          if (idx < draft.design.shapeOrder.length - 1) {
            const [shapeId] = draft.design.shapeOrder.splice(idx, 1);
            draft.design.shapeOrder.splice(idx + 1, 0, shapeId);
            draft.design.updatedAt = nowIso();
          }
        }),

      sendBackward: (id) =>
        set((draft) => {
          const idx = findShapeOrderIndex(draft.design, id);
          if (idx > 0) {
            const [shapeId] = draft.design.shapeOrder.splice(idx, 1);
            draft.design.shapeOrder.splice(idx - 1, 0, shapeId);
            draft.design.updatedAt = nowIso();
          }
        }),

      pauseHistory: () => {
        set((draft) => {
          draft.historySessionDepth += 1;
          if (draft.historySessionDepth === 1) {
            pauseTemporalHistory();
            draft.historyPaused = true;
          }
        });
      },

      resumeHistory: () => {
        set((draft) => {
          draft.historySessionDepth = Math.max(
            0,
            draft.historySessionDepth - 1
          );
          if (draft.historySessionDepth === 0) {
            resumeTemporalHistory();
            draft.historyPaused = false;
          }
        });
      },

      clearHistory: () => {
        clearTemporalHistory();
        set((draft) => {
          draft.historyPaused = false;
          draft.historySessionDepth = 0;
        });
      },

      beginInteraction: () => {
        set((draft) => {
          draft.interactionSessionDepth += 1;
        });
      },

      endInteraction: () => {
        set((draft) => {
          draft.interactionSessionDepth = Math.max(
            0,
            draft.interactionSessionDepth - 1
          );
        });
      },

      sanitizeHistoryState: () => {
        set((draft) => {
          draft.design = normalizeDesign(draft.design);
          draft.transient = sanitizeEditorTransientState(draft.transient);
          Object.assign(draft, createDefaultEditorSessionState());
        });
      },
    })),
    {
      partialize: (state) => ({
        design: normalizeDesign(serializeDesign(state.design)),
      }),
      equality: (past, current) =>
        past.design.id === current.design.id &&
        past.design.updatedAt === current.design.updatedAt,
      limit: 100,
    }
  )
);
