"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";
import {
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
  createDefaultEditorTrackState,
  createDefaultEditorUiState,
  resetEditorUiState,
  sanitizeEditorUiState,
} from "@/lib/editor/store-state";
import type {
  EditorSessionState,
  EditorSessionActions,
  EditorTrackActions,
  EditorTrackState,
  EditorUiActions,
  EditorUiState,
} from "@/lib/editor/store-types";
import {
  expandGroupedSelection,
  getShapeGroupId,
} from "@/lib/track/shape-groups";

export type { EditorTool } from "@/lib/editor-tools";

interface EditorState {
  track: EditorTrackState;
  session: EditorSessionState;
  ui: EditorUiState;

  addShape: EditorTrackActions["addShape"];
  addShapes: EditorTrackActions["addShapes"];
  updateShape: EditorTrackActions["updateShape"];
  updateShapes: EditorTrackActions["updateShapes"];
  setShapesLocked: EditorTrackActions["setShapesLocked"];
  setPolylinePoints: EditorTrackActions["setPolylinePoints"];
  updatePolylinePoint: EditorTrackActions["updatePolylinePoint"];
  insertPolylinePoint: EditorTrackActions["insertPolylinePoint"];
  removePolylinePoint: EditorTrackActions["removePolylinePoint"];
  appendPolylinePoint: EditorTrackActions["appendPolylinePoint"];
  reversePolylinePoints: EditorTrackActions["reversePolylinePoints"];
  rotateShapes: EditorTrackActions["rotateShapes"];
  removeShapes: EditorTrackActions["removeShapes"];
  duplicateShapes: EditorTrackActions["duplicateShapes"];
  groupSelection: EditorTrackActions["groupSelection"];
  setGroupName: EditorTrackActions["setGroupName"];
  ungroupSelection: EditorTrackActions["ungroupSelection"];
  joinPolylines: EditorTrackActions["joinPolylines"];
  closePolyline: EditorTrackActions["closePolyline"];
  nudgeShapes: EditorTrackActions["nudgeShapes"];
  updateField: EditorTrackActions["updateField"];
  updateDesignMeta: EditorTrackActions["updateDesignMeta"];
  replaceDesign: EditorTrackActions["replaceDesign"];
  newProject: EditorTrackActions["newProject"];
  bringForward: EditorTrackActions["bringForward"];
  sendBackward: EditorTrackActions["sendBackward"];
  setSelection: EditorSessionActions["setSelection"];
  pauseHistory: EditorSessionActions["pauseHistory"];
  resumeHistory: EditorSessionActions["resumeHistory"];
  clearHistory: EditorSessionActions["clearHistory"];
  beginInteraction: EditorSessionActions["beginInteraction"];
  endInteraction: EditorSessionActions["endInteraction"];
  sanitizeHistoryState: EditorSessionActions["sanitizeHistoryState"];
  setActiveTool: EditorUiActions["setActiveTool"];
  setActivePresetId: EditorUiActions["setActivePresetId"];
  setZoom: EditorUiActions["setZoom"];
  setPanOffset: EditorUiActions["setPanOffset"];
  setHoveredShapeId: EditorUiActions["setHoveredShapeId"];
  setHoveredWaypoint: EditorUiActions["setHoveredWaypoint"];
  setSegmentSelection: EditorUiActions["setSegmentSelection"];
  setVertexSelection: EditorUiActions["setVertexSelection"];
  setDraftPath: EditorUiActions["setDraftPath"];
  setDraftForceClosed: EditorUiActions["setDraftForceClosed"];
  setDraftSourceShapeId: EditorUiActions["setDraftSourceShapeId"];
  setMarqueeRect: EditorUiActions["setMarqueeRect"];
  setRotationSession: EditorUiActions["setRotationSession"];
  setGroupDragPreview: EditorUiActions["setGroupDragPreview"];
  setLiveShapePatch: EditorUiActions["setLiveShapePatch"];
  clearLiveShapePatch: EditorUiActions["clearLiveShapePatch"];
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

function touchTrackDesign(state: EditorState) {
  state.track.design.updatedAt = nowIso();
}

export const useEditor = create<EditorState>()(
  temporal(
    immer<EditorState>((set) => ({
      track: createDefaultEditorTrackState(),
      session: createDefaultEditorSessionState(),
      ui: createDefaultEditorUiState(),

      addShape: (s) => {
        const id = nanoid();
        set((draft) => {
          const nextShape: Shape = { ...s, id };
          addShapeRecord(draft.track.design, nextShape);
          touchTrackDesign(draft);
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
          nextShapes.forEach((shape) =>
            addShapeRecord(draft.track.design, shape)
          );
          touchTrackDesign(draft);
        });
        return ids;
      },

      updateShape: (id, patch) =>
        set((draft) => {
          const shape = draft.track.design.shapeById[id];
          if (!shape) return;
          applyShapePatch(shape, patch);
          touchTrackDesign(draft);
        }),

      updateShapes: (ids, patch) =>
        set((draft) => {
          let changed = false;

          for (const id of ids) {
            const shape = draft.track.design.shapeById[id];
            if (!shape) continue;
            applyShapePatch(shape, patch);
            changed = true;
          }

          if (changed) {
            touchTrackDesign(draft);
          }
        }),

      setShapesLocked: (ids, locked) =>
        set((draft) => {
          let changed = false;

          for (const id of ids) {
            const shape = draft.track.design.shapeById[id];
            if (!shape || shape.locked === locked) continue;
            shape.locked = locked;
            changed = true;
          }

          if (changed) {
            touchTrackDesign(draft);
          }
        }),

      setPolylinePoints: (id, points) =>
        set((draft) => {
          if (!setPolylinePoints(draft.track.design.shapeById[id], points)) {
            return;
          }
          touchTrackDesign(draft);
        }),

      updatePolylinePoint: (id, index, patch) =>
        set((draft) => {
          if (
            !updatePolylinePoint(draft.track.design.shapeById[id], index, patch)
          ) {
            return;
          }
          touchTrackDesign(draft);
        }),

      insertPolylinePoint: (id, index, point) =>
        set((draft) => {
          if (
            !insertPolylinePoint(draft.track.design.shapeById[id], index, point)
          ) {
            return;
          }
          draft.ui.segmentSelection = null;
          touchTrackDesign(draft);
        }),

      removePolylinePoint: (id, index) =>
        set((draft) => {
          if (!removePolylinePoint(draft.track.design.shapeById[id], index)) {
            return;
          }
          draft.ui.segmentSelection = null;
          touchTrackDesign(draft);
        }),

      appendPolylinePoint: (id, point) =>
        set((draft) => {
          if (!appendPolylinePoint(draft.track.design.shapeById[id], point)) {
            return;
          }
          touchTrackDesign(draft);
        }),

      reversePolylinePoints: (id) =>
        set((draft) => {
          if (!reversePolylinePoints(draft.track.design.shapeById[id])) return;
          touchTrackDesign(draft);
        }),

      rotateShapes: (ids, delta) =>
        set((draft) => {
          const changed = rotateShapes(
            draft.track.design.shapeById,
            ids,
            delta
          );
          if (changed) {
            touchTrackDesign(draft);
          }
        }),

      removeShapes: (ids) =>
        set((draft) => {
          const idSet = new Set(ids);
          ids.forEach((id) => removeShapeRecord(draft.track.design, id));
          draft.session.selection = draft.session.selection.filter(
            (id) => !idSet.has(id)
          );
          touchTrackDesign(draft);
        }),

      nudgeShapes: (ids, dx, dy) =>
        set((draft) => {
          if (!nudgeShapes(draft.track.design.shapeById, ids, dx, dy)) return;
          touchTrackDesign(draft);
        }),

      duplicateShapes: (ids) =>
        set((draft) => {
          const newShapes = duplicateShapes(draft.track.design, ids);
          newShapes.forEach((shape) =>
            addShapeRecord(draft.track.design, shape)
          );
          draft.session.selection = newShapes.map((s) => s.id);
          touchTrackDesign(draft);
        }),

      groupSelection: (ids) => {
        const nextGroupId = nanoid();
        let grouped = false;

        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.track.design, ids);
          if (expandedIds.length < 2) return;

          for (const id of expandedIds) {
            const shape = draft.track.design.shapeById[id];
            if (!shape) continue;
            shape.meta = {
              ...shape.meta,
              groupId: nextGroupId,
            };
          }

          draft.session.selection = expandedIds;
          touchTrackDesign(draft);
          grouped = true;
        });

        return grouped ? nextGroupId : null;
      },

      setGroupName: (ids, name) =>
        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.track.design, ids);
          const selectedGroupIds = new Set<string>();
          let changed = false;

          for (const id of expandedIds) {
            const shape = draft.track.design.shapeById[id];
            if (!shape) continue;

            const groupId = getShapeGroupId(shape);
            if (groupId) {
              selectedGroupIds.add(groupId);
            }
          }

          if (selectedGroupIds.size === 0) return;

          for (const id of draft.track.design.shapeOrder) {
            const shape = draft.track.design.shapeById[id];
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
            touchTrackDesign(draft);
          }
        }),

      ungroupSelection: (ids) =>
        set((draft) => {
          const expandedIds = expandGroupedSelection(draft.track.design, ids);
          let changed = false;

          for (const id of expandedIds) {
            const shape = draft.track.design.shapeById[id];
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
            draft.session.selection = expandedIds;
            touchTrackDesign(draft);
          }
        }),

      joinPolylines: (ids) => {
        const nextId = nanoid();
        let created = false;

        set((draft) => {
          const idSet = new Set(ids);
          const polylineShapes = draft.track.design.shapeOrder
            .filter((id) => idSet.has(id))
            .map((id) => draft.track.design.shapeById[id])
            .filter(
              (shape): shape is PolylineShape =>
                Boolean(shape) && shape.kind === "polyline"
            );
          const merged = joinPolylineShapes(polylineShapes);
          if (!merged) return;

          ids.forEach((id) => removeShapeRecord(draft.track.design, id));
          addShapeRecord(draft.track.design, {
            ...merged,
            id: nextId,
            name:
              polylineShapes.length === 2
                ? "Joined path"
                : `Joined ${polylineShapes.length} paths`,
          });
          draft.session.selection = [nextId];
          touchTrackDesign(draft);
          created = true;
        });

        return created ? nextId : null;
      },

      closePolyline: (id) => {
        let closed = false;

        set((draft) => {
          const shape = getDesignShapeById(draft.track.design, id);
          if (!closePolyline(shape ?? undefined)) return;
          draft.session.selection = [id];
          touchTrackDesign(draft);
          closed = true;
        });

        return closed;
      },

      setSelection: (ids) =>
        set((draft) => {
          draft.session.selection = expandGroupedSelection(
            draft.track.design,
            ids
          );
          draft.ui.segmentSelection = null;
          if (draft.session.selection.length !== 1) {
            draft.ui.vertexSelection = null;
          }
        }),

      setActiveTool: (tool) =>
        set((draft) => {
          draft.ui.activeTool = tool;
        }),

      setActivePresetId: (presetId) =>
        set((draft) => {
          draft.ui.activePresetId = presetId;
        }),

      setZoom: (zoom) =>
        set((draft) => {
          draft.ui.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      setPanOffset: (offset) =>
        set((draft) => {
          draft.ui.panOffset = offset;
        }),

      updateField: (patch) =>
        set((draft) => {
          Object.assign(draft.track.design.field, patch);
          touchTrackDesign(draft);
        }),

      updateDesignMeta: (patch) =>
        set((draft) => {
          Object.assign(draft.track.design, patch);
          touchTrackDesign(draft);
        }),

      replaceDesign: (design) => {
        set((draft) => {
          draft.track.design = normalizeDesign(design);
          draft.session = createDefaultEditorSessionState();
          draft.ui = resetEditorUiState(draft.ui);
        });
        clearTemporalHistory();
      },

      setHoveredShapeId: (shapeId) =>
        set((draft) => {
          draft.ui.hoveredShapeId = shapeId;
        }),

      setHoveredWaypoint: (w) =>
        set((draft) => {
          draft.ui.hoveredWaypoint = w;
        }),

      setSegmentSelection: (value) =>
        set((draft) => {
          draft.ui.segmentSelection =
            typeof value === "function"
              ? value(draft.ui.segmentSelection)
              : value;
          if (draft.ui.segmentSelection) {
            draft.ui.vertexSelection = null;
          }
        }),

      setVertexSelection: (value) =>
        set((draft) => {
          draft.ui.vertexSelection =
            typeof value === "function"
              ? value(draft.ui.vertexSelection)
              : value;
          if (draft.ui.vertexSelection) {
            draft.ui.segmentSelection = null;
          }
        }),

      setDraftPath: (value) =>
        set((draft) => {
          draft.ui.draftPath =
            typeof value === "function" ? value(draft.ui.draftPath) : value;
        }),

      setDraftForceClosed: (value) =>
        set((draft) => {
          draft.ui.draftForceClosed =
            typeof value === "function"
              ? value(draft.ui.draftForceClosed)
              : value;
        }),

      setDraftSourceShapeId: (value) =>
        set((draft) => {
          draft.ui.draftSourceShapeId =
            typeof value === "function"
              ? value(draft.ui.draftSourceShapeId)
              : value;
        }),

      setMarqueeRect: (value) =>
        set((draft) => {
          draft.ui.marqueeRect =
            typeof value === "function" ? value(draft.ui.marqueeRect) : value;
        }),

      setRotationSession: (value) =>
        set((draft) => {
          draft.ui.rotationSession =
            typeof value === "function"
              ? value(draft.ui.rotationSession)
              : value;
        }),

      setGroupDragPreview: (value) =>
        set((draft) => {
          draft.ui.groupDragPreview =
            typeof value === "function"
              ? value(draft.ui.groupDragPreview)
              : value;
        }),

      setLiveShapePatch: (id, patch) =>
        set((draft) => {
          draft.ui.liveShapePatches[id] = patch;
        }),

      clearLiveShapePatch: (id) =>
        set((draft) => {
          delete draft.ui.liveShapePatches[id];
        }),

      newProject: () => {
        set((draft) => {
          draft.track = createDefaultEditorTrackState();
          draft.session = createDefaultEditorSessionState();
          draft.ui = resetEditorUiState(draft.ui, {
            zoom: 1,
            panOffset: { x: 0, y: 0 },
          });
        });
        clearTemporalHistory();
      },

      bringForward: (id) =>
        set((draft) => {
          const idx = findShapeOrderIndex(draft.track.design, id);
          if (idx < draft.track.design.shapeOrder.length - 1) {
            const [shapeId] = draft.track.design.shapeOrder.splice(idx, 1);
            draft.track.design.shapeOrder.splice(idx + 1, 0, shapeId);
            touchTrackDesign(draft);
          }
        }),

      sendBackward: (id) =>
        set((draft) => {
          const idx = findShapeOrderIndex(draft.track.design, id);
          if (idx > 0) {
            const [shapeId] = draft.track.design.shapeOrder.splice(idx, 1);
            draft.track.design.shapeOrder.splice(idx - 1, 0, shapeId);
            touchTrackDesign(draft);
          }
        }),

      pauseHistory: () => {
        set((draft) => {
          draft.session.historySessionDepth += 1;
          if (draft.session.historySessionDepth === 1) {
            pauseTemporalHistory();
            draft.session.historyPaused = true;
          }
        });
      },

      resumeHistory: () => {
        set((draft) => {
          draft.session.historySessionDepth = Math.max(
            0,
            draft.session.historySessionDepth - 1
          );
          if (draft.session.historySessionDepth === 0) {
            resumeTemporalHistory();
            draft.session.historyPaused = false;
          }
        });
      },

      clearHistory: () => {
        clearTemporalHistory();
        set((draft) => {
          draft.session.historyPaused = false;
          draft.session.historySessionDepth = 0;
        });
      },

      beginInteraction: () => {
        set((draft) => {
          draft.session.interactionSessionDepth += 1;
        });
      },

      endInteraction: () => {
        set((draft) => {
          draft.session.interactionSessionDepth = Math.max(
            0,
            draft.session.interactionSessionDepth - 1
          );
        });
      },

      sanitizeHistoryState: () => {
        set((draft) => {
          draft.track.design = normalizeDesign(draft.track.design);
          draft.session = createDefaultEditorSessionState();
          draft.ui = sanitizeEditorUiState(draft.ui);
        });
      },
    })),
    {
      partialize: (state) => ({
        track: {
          design: normalizeDesign(serializeDesign(state.track.design)),
        },
      }),
      equality: (past, current) =>
        past.track.design.id === current.track.design.id &&
        past.track.design.updatedAt === current.track.design.updatedAt,
      limit: 100,
    }
  )
);
