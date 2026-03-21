"use client";

import { useEffect, useRef } from "react";
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
  addShapes: (shapes: ShapeDraft[]) => string[];
  cancelDraftPath: () => void;
  designFieldGridStep: number;
  shapeById: Record<string, Shape>;
  draftPath: DraftPoint[];
  duplicateShapes: (ids: string[]) => void;
  effectiveVertexSel: { shapeId: string; idx: number } | null;
  finalizePath: () => void;
  fitFieldToViewport: () => void;
  beginInteraction: () => void;
  nudgeShapes: (ids: string[], dx: number, dy: number) => void;
  pauseHistory: () => void;
  removeShapes: (ids: string[]) => void;
  removePolylinePoint: (id: string, index: number) => void;
  resumeHistory: () => void;
  rotateShapes: (ids: string[], delta: number) => void;
  selection: string[];
  setActiveTool: (tool: EditorTool) => void;
  setDraftPath: (
    value: DraftPoint[] | ((previous: DraftPoint[]) => DraftPoint[])
  ) => void;
  setManualView: (value: boolean) => void;
  setSelection: (ids: string[]) => void;
  setVertexSel: (
    value:
      | { shapeId: string; idx: number }
      | null
      | ((
          previous: { shapeId: string; idx: number } | null
        ) => { shapeId: string; idx: number } | null)
  ) => void;
  endInteraction: () => void;
}

function canRotateShape(shape: Shape) {
  return shape.kind !== "polyline" && shape.kind !== "cone" && !shape.locked;
}

export function useTrackCanvasShortcuts({
  activeTool,
  addShapes,
  cancelDraftPath,
  designFieldGridStep,
  shapeById,
  draftPath,
  duplicateShapes,
  effectiveVertexSel,
  finalizePath,
  fitFieldToViewport,
  beginInteraction,
  nudgeShapes,
  pauseHistory,
  removeShapes,
  removePolylinePoint,
  resumeHistory,
  rotateShapes,
  selection,
  setActiveTool,
  setDraftPath,
  setManualView,
  setSelection,
  setVertexSel,
  endInteraction,
}: TrackCanvasShortcutsParams) {
  const keyboardBatchTimeoutRef = useRef<number | null>(null);
  const keyboardBatchActiveRef = useRef(false);

  useEffect(() => {
    const beginKeyboardBatch = () => {
      if (!keyboardBatchActiveRef.current) {
        keyboardBatchActiveRef.current = true;
        beginInteraction();
        pauseHistory();
      }

      if (keyboardBatchTimeoutRef.current !== null) {
        window.clearTimeout(keyboardBatchTimeoutRef.current);
      }

      keyboardBatchTimeoutRef.current = window.setTimeout(() => {
        keyboardBatchTimeoutRef.current = null;
        if (!keyboardBatchActiveRef.current) return;
        keyboardBatchActiveRef.current = false;
        resumeHistory();
        endInteraction();
      }, 220);
    };

    const rotateSelection = (delta: number) => {
      beginKeyboardBatch();
      const rotatableIds = selection.filter((id) => {
        const shape = shapeById[id];
        return Boolean(shape && canRotateShape(shape));
      });
      if (rotatableIds.length) {
        rotateShapes(rotatableIds, delta);
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
          ...selection
            .map((id) => shapeById[id])
            .filter((shape): shape is Shape => Boolean(shape))
        );
        return;
      }

      if (meta && event.key === "v") {
        event.preventDefault();
        if (!clipboard.length) return;
        const duplicatedShapes: ShapeDraft[] = clipboard.map((shape) => {
          const { id: _id, ...rest } = shape;
          return {
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
        });
        const newIds = addShapes(duplicatedShapes);
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
        beginKeyboardBatch();
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
          const shape = shapeById[effectiveVertexSel.shapeId];
          if (shape && isPolylineShape(shape)) {
            removePolylinePoint(shape.id, effectiveVertexSel.idx);
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
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (keyboardBatchTimeoutRef.current !== null) {
        window.clearTimeout(keyboardBatchTimeoutRef.current);
        keyboardBatchTimeoutRef.current = null;
      }
      if (keyboardBatchActiveRef.current) {
        keyboardBatchActiveRef.current = false;
        resumeHistory();
        endInteraction();
      }
    };
  }, [
    activeTool,
    addShapes,
    beginInteraction,
    cancelDraftPath,
    designFieldGridStep,
    shapeById,
    draftPath,
    duplicateShapes,
    endInteraction,
    effectiveVertexSel,
    finalizePath,
    fitFieldToViewport,
    nudgeShapes,
    pauseHistory,
    removeShapes,
    removePolylinePoint,
    resumeHistory,
    rotateShapes,
    selection,
    setActiveTool,
    setDraftPath,
    setManualView,
    setSelection,
    setVertexSel,
  ]);
}
