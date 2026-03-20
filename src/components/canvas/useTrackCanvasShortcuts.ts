"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { isPolylineShape } from "@/lib/shape-utils";
import type { EditorTool } from "@/lib/editor-tools";
import type { Shape, ShapeDraft } from "@/lib/types";
import {
  clipboard,
  isTypingInInput,
  type DraftPoint,
} from "@/components/canvas/shared";

interface TrackCanvasShortcutsParams {
  activeTool: EditorTool;
  addShape: (shape: ShapeDraft) => string;
  cancelDraftPath: () => void;
  designFieldGridStep: number;
  designShapes: Shape[];
  draftPath: DraftPoint[];
  duplicateShapes: (ids: string[]) => void;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  finalizePath: () => void;
  fitFieldToViewport: () => void;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  removeShapes: (ids: string[]) => void;
  selection: string[];
  setActiveTool: (tool: EditorTool) => void;
  setDraftPath: Dispatch<SetStateAction<DraftPoint[]>>;
  setManualView: (value: boolean) => void;
  setSelection: (ids: string[]) => void;
  setVertexSel: Dispatch<
    SetStateAction<{ shapeId: string; idx: number } | null>
  >;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function canRotateShape(shape: Shape) {
  return shape.kind !== "polyline" && shape.kind !== "cone" && !shape.locked;
}

export function useTrackCanvasShortcuts({
  activeTool,
  addShape,
  cancelDraftPath,
  designFieldGridStep,
  designShapes,
  draftPath,
  duplicateShapes,
  effectiveVertexSel,
  finalizePath,
  fitFieldToViewport,
  nudgeShapes,
  removeShapes,
  selection,
  setActiveTool,
  setDraftPath,
  setManualView,
  setSelection,
  setVertexSel,
  updateShape,
}: TrackCanvasShortcutsParams) {
  useEffect(() => {
    const rotateSelection = (delta: number) => {
      for (const id of selection) {
        const shape = designShapes.find((candidate) => candidate.id === id);
        if (!shape || !canRotateShape(shape)) continue;
        updateShape(id, {
          rotation: normalizeRotation((shape.rotation ?? 0) + delta),
        });
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (isTypingInInput(target)) return;

      const meta = event.ctrlKey || event.metaKey;

      if (meta && event.key === "d") {
        event.preventDefault();
        if (selection.length) duplicateShapes(selection);
        return;
      }

      if (meta && event.key === "c") {
        event.preventDefault();
        clipboard.splice(
          0,
          clipboard.length,
          ...designShapes.filter((shape) => selection.includes(shape.id))
        );
        return;
      }

      if (meta && event.key === "v") {
        event.preventDefault();
        if (!clipboard.length) return;
        const newIds: string[] = [];
        clipboard.forEach((shape) => {
          const { id: _id, ...rest } = shape;
          const duplicatedShape: ShapeDraft = {
            ...rest,
            x: shape.kind === "polyline" ? 0 : shape.x + 1,
            y: shape.kind === "polyline" ? 0 : shape.y + 1,
            ...(shape.kind === "polyline"
              ? {
                  points: shape.points.map((point) => ({
                    ...point,
                    x: point.x + 1,
                    y: point.y + 1,
                  })),
                }
              : {}),
          };
          newIds.push(addShape(duplicatedShape));
        });
        setSelection(newIds);
        return;
      }

      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          event.key
        ) &&
        selection.length > 0 &&
        activeTool === "select"
      ) {
        event.preventDefault();
        const step = event.altKey ? 0.1 : designFieldGridStep;
        const dx =
          event.key === "ArrowLeft"
            ? -step
            : event.key === "ArrowRight"
              ? step
              : 0;
        const dy =
          event.key === "ArrowUp"
            ? -step
            : event.key === "ArrowDown"
              ? step
              : 0;
        nudgeShapes(selection, dx, dy);
        return;
      }

      if (
        ["[", "]", "q", "e", "Q", "E"].includes(event.key) &&
        selection.length > 0 &&
        activeTool === "select"
      ) {
        event.preventDefault();
        const step = event.altKey ? 1 : event.shiftKey ? 5 : 15;
        const delta =
          event.key === "[" || event.key.toLowerCase() === "q" ? -step : step;
        rotateSelection(delta);
        return;
      }
      if (event.key === "0" && !meta) {
        event.preventDefault();
        setManualView(false);
        fitFieldToViewport();
        return;
      }

      const key = event.key;
      if (key === "Escape") {
        if (draftPath.length) cancelDraftPath();
        else {
          setSelection([]);
          setVertexSel(null);
          setActiveTool("select");
        }
      }

      if (key === "Enter" && draftPath.length >= 2) finalizePath();

      if (key === "Backspace" || key === "Delete") {
        if (draftPath.length && activeTool === "polyline") {
          setDraftPath((previous) =>
            previous.slice(0, Math.max(0, previous.length - 1))
          );
          return;
        }

        if (effectiveVertexSel) {
          const shape = designShapes.find(
            (candidate) => candidate.id === effectiveVertexSel.shapeId
          );
          if (shape && isPolylineShape(shape)) {
            const points = [...shape.points];
            if (points.length > 2) {
              points.splice(effectiveVertexSel.idx, 1);
              updateShape(shape.id, { points });
            }
          }
          setVertexSel(null);
          return;
        }

        if (selection.length) removeShapes(selection);
      }

      switch (key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "h":
          setActiveTool("grab");
          break;
        case "g":
          setActiveTool("gate");
          break;
        case "f":
          setActiveTool("flag");
          break;
        case "c":
          if (!meta) setActiveTool("cone");
          break;
        case "l":
          setActiveTool("label");
          break;
        case "p":
          setActiveTool("polyline");
          break;
        case "s":
          if (!meta) setActiveTool("startfinish");
          break;
        case "r":
          setActiveTool("ladder");
          break;
        case "d":
          if (!meta) setActiveTool("divegate");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTool,
    addShape,
    cancelDraftPath,
    designFieldGridStep,
    designShapes,
    draftPath,
    duplicateShapes,
    effectiveVertexSel,
    finalizePath,
    fitFieldToViewport,
    nudgeShapes,
    removeShapes,
    selection,
    setActiveTool,
    setDraftPath,
    setManualView,
    setSelection,
    setVertexSel,
    updateShape,
  ]);
}
