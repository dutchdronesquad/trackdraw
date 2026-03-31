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
} from "@/lib/design";
import type { EditorTool } from "@/lib/editor-tools";
import { DEFAULT_LAYOUT_PRESET_ID } from "@/lib/layout-presets";
import type { DraftPoint, RectLike } from "@/components/canvas/shared";

export type { EditorTool } from "@/lib/editor-tools";

interface EditorTransientState {
  activeTool: EditorTool;
  activePresetId: string | null;
  zoom: number;
  panOffset: { x: number; y: number };
  hoveredShapeId: string | null;
  hoveredWaypoint: { shapeId: string; idx: number } | null;
  vertexSelection: { shapeId: string; idx: number } | null;
  draftPath: DraftPoint[];
  draftForceClosed: boolean;
  draftSourceShapeId: string | null;
  marqueeRect: RectLike | null;
  rotationSession: {
    center: { x: number; y: number };
    shapeId: string;
    startAngle: number;
    startRotation: number;
    previewRotation: number;
  } | null;
  groupDragPreview: {
    ids: string[];
    origin: { x: number; y: number };
    dx: number;
    dy: number;
  } | null;
}

interface EditorState {
  design: TrackDesign;
  selection: string[];
  transient: EditorTransientState;
  historyPaused: boolean;
  historySessionDepth: number;
  interactionSessionDepth: number;

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

function reversePolyline(path: PolylineShape): PolylineShape {
  return {
    ...path,
    points: [...path.points].reverse(),
  };
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
      transient: {
        activeTool: "select",
        activePresetId: DEFAULT_LAYOUT_PRESET_ID,
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        hoveredShapeId: null,
        hoveredWaypoint: null,
        vertexSelection: null,
        draftPath: [],
        draftForceClosed: false,
        draftSourceShapeId: null,
        marqueeRect: null,
        rotationSession: null,
        groupDragPreview: null,
      },
      historyPaused: false,
      historySessionDepth: 0,
      interactionSessionDepth: 0,

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
        }),

      updateShapes: (ids, patch) =>
        set((draft) => {
          let changed = false;

          for (const id of ids) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;

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
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          shape.points = points;
          draft.design.updatedAt = nowIso();
        }),

      updatePolylinePoint: (id, index, patch) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          if (index < 0 || index >= shape.points.length) return;
          shape.points[index] = {
            ...shape.points[index],
            ...patch,
          };
          draft.design.updatedAt = nowIso();
        }),

      insertPolylinePoint: (id, index, point) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          shape.points.splice(index, 0, point);
          draft.design.updatedAt = nowIso();
        }),

      removePolylinePoint: (id, index) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          if (shape.points.length <= 2) return;
          if (index < 0 || index >= shape.points.length) return;
          shape.points.splice(index, 1);
          draft.design.updatedAt = nowIso();
        }),

      appendPolylinePoint: (id, point) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          shape.points.push(point);
          draft.design.updatedAt = nowIso();
        }),

      reversePolylinePoints: (id) =>
        set((draft) => {
          const shape = draft.design.shapeById[id];
          if (!shape || shape.kind !== "polyline") return;
          shape.points.reverse();
          draft.design.updatedAt = nowIso();
        }),

      rotateShapes: (ids, delta) =>
        set((draft) => {
          let changed = false;
          for (const id of ids) {
            const shape = draft.design.shapeById[id];
            if (!shape) continue;
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
          const idSet = new Set(ids);
          ids.forEach((id) => removeShapeRecord(draft.design, id));
          draft.selection = draft.selection.filter((id) => !idSet.has(id));
          draft.design.updatedAt = nowIso();
        }),

      nudgeShapes: (ids, dx, dy) =>
        set((draft) => {
          for (const id of ids) {
            const shape = draft.design.shapeById[id];
            if (!shape || shape.locked) continue;
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
          draft.design.updatedAt = nowIso();
        }),

      duplicateShapes: (ids) =>
        set((draft) => {
          const idSet = new Set(ids);
          const toDuplicate = draft.design.shapeOrder
            .filter((id) => idSet.has(id))
            .map((id) => draft.design.shapeById[id])
            .filter((shape): shape is Shape => Boolean(shape));
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
          newShapes.forEach((shape) => addShapeRecord(draft.design, shape));
          draft.selection = newShapes.map((s) => s.id);
          draft.design.updatedAt = nowIso();
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

          if (
            !shape ||
            shape.kind !== "polyline" ||
            shape.closed ||
            shape.points.length < 3
          )
            return;

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
          draft.transient.activeTool = "select";
          draft.transient.hoveredShapeId = null;
          draft.transient.hoveredWaypoint = null;
          draft.transient.vertexSelection = null;
          draft.transient.draftPath = [];
          draft.transient.draftForceClosed = false;
          draft.transient.draftSourceShapeId = null;
          draft.transient.marqueeRect = null;
          draft.transient.rotationSession = null;
          draft.transient.groupDragPreview = null;
          draft.historyPaused = false;
          draft.historySessionDepth = 0;
          draft.interactionSessionDepth = 0;
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

      setVertexSelection: (value) =>
        set((draft) => {
          draft.transient.vertexSelection =
            typeof value === "function"
              ? value(draft.transient.vertexSelection)
              : value;
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

      newProject: () => {
        set((draft) => {
          draft.design = createDefaultDesign();
          draft.selection = [];
          draft.transient.activeTool = "select";
          draft.transient.zoom = 1;
          draft.transient.panOffset = { x: 0, y: 0 };
          draft.transient.hoveredShapeId = null;
          draft.transient.hoveredWaypoint = null;
          draft.transient.vertexSelection = null;
          draft.transient.draftPath = [];
          draft.transient.draftForceClosed = false;
          draft.transient.draftSourceShapeId = null;
          draft.transient.marqueeRect = null;
          draft.transient.rotationSession = null;
          draft.transient.groupDragPreview = null;
          draft.historyPaused = false;
          draft.historySessionDepth = 0;
          draft.interactionSessionDepth = 0;
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
          draft.transient.hoveredShapeId = null;
          draft.transient.hoveredWaypoint = null;
          draft.transient.vertexSelection = null;
          draft.transient.marqueeRect = null;
          draft.transient.rotationSession = null;
          draft.transient.groupDragPreview = null;
          draft.historyPaused = false;
          draft.historySessionDepth = 0;
          draft.interactionSessionDepth = 0;
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
