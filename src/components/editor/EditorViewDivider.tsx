"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { useEditorSplitView } from "@/hooks/editor/useEditorSplitView";

const CENTER_SNAP_PX = 10;

export function EditorViewDivider({
  canvasAreaRef,
  split,
}: {
  canvasAreaRef: RefObject<HTMLDivElement | null>;
  split: ReturnType<typeof useEditorSplitView>[1];
}) {
  const t = useTranslations("editor.viewModeSwitch");
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    offset: number;
    left: number;
    width: number;
    startRatio: number;
    ratio: number;
  } | null>(null);

  const frame = useRef<number | null>(null);
  const cancelFrame = () => {
    if (frame.current === null) return;
    window.cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  useEffect(
    () => () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    },
    []
  );

  const getPointerRatio = (clientX: number) => {
    const currentDrag = drag.current;
    if (!currentDrag) return split.ratio;
    const x = clientX - currentDrag.left - currentDrag.offset;
    return Math.abs(x - currentDrag.width / 2) <= CENTER_SNAP_PX
      ? 50
      : (x / currentDrag.width) * 100;
  };

  const hintId = useId();
  const resizeHint = t("splitResizeHint");

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={t("splitDivider")}
      aria-orientation="vertical"
      aria-controls="editor-canvas-2d"
      aria-describedby={hintId}
      aria-valuemin={split.minRatio}
      aria-valuemax={split.maxRatio}
      aria-valuenow={split.ratio}
      aria-valuetext={t("splitRatio", { ratio: split.ratio })}
      data-dragging={dragging}
      className="group absolute inset-y-0 z-10 flex w-6 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center outline-none select-none"
      style={{ left: "var(--editor-split-ratio, 50%)" }}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return;
        const canvas = canvasAreaRef.current;
        if (!canvas) return;
        const handle = event.currentTarget;
        const bounds = handle.getBoundingClientRect();
        const canvasBounds = canvas.getBoundingClientRect();
        drag.current = {
          pointerId: event.pointerId,
          offset: event.clientX - (bounds.left + bounds.width / 2),
          left: canvasBounds.left,
          width: canvasBounds.width,
          startRatio: split.ratio,
          ratio: split.ratio,
        };
        handle.focus({ preventScroll: true });
        handle.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const currentDrag = drag.current;
        if (currentDrag?.pointerId !== event.pointerId) return;
        currentDrag.ratio = getPointerRatio(event.clientX);
        if (frame.current !== null) return;
        frame.current = window.requestAnimationFrame(() => {
          frame.current = null;
          if (drag.current) {
            drag.current.ratio = split.resize(drag.current.ratio);
          }
        });
      }}
      onPointerUp={(event) => {
        const currentDrag = drag.current;
        if (currentDrag?.pointerId !== event.pointerId) return;
        cancelFrame();
        // Use the last move, including a pending frame. Release coordinates
        // must not introduce another position after the user stops dragging.
        const finalRatio = split.resize(currentDrag.ratio);
        drag.current = null;
        setDragging(false);
        split.commit(finalRatio);
      }}
      onPointerCancel={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        cancelFrame();
        split.resize(drag.current.startRatio);
        drag.current = null;
        setDragging(false);
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        cancelFrame();
        const finalRatio = split.resize(drag.current.ratio);
        drag.current = null;
        setDragging(false);
        split.commit(finalRatio);
      }}
      onDoubleClick={split.reset}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 5 : 1;
        let next: number;
        switch (event.key) {
          case "ArrowLeft":
            next = split.ratio - step;
            break;
          case "ArrowRight":
            next = split.ratio + step;
            break;
          case "Home":
            next = split.minRatio;
            break;
          case "End":
            next = split.maxRatio;
            break;
          case "Enter":
            event.preventDefault();
            event.stopPropagation();
            split.reset();
            return;
          default:
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        split.commit(next);
      }}
    >
      <span id={hintId} hidden>
        {resizeHint}
      </span>
      <span
        aria-hidden="true"
        className="bg-border group-hover:bg-brand-primary group-focus-visible:bg-brand-primary group-data-[dragging=true]:bg-brand-primary pointer-events-none absolute inset-y-0 w-0.5"
      />
      <span
        aria-hidden="true"
        className="border-border bg-sidebar text-muted-foreground group-hover:border-brand-primary group-hover:text-foreground group-focus-visible:border-brand-primary group-focus-visible:ring-ring group-data-[dragging=true]:border-brand-primary group-data-[dragging=true]:text-foreground pointer-events-none relative flex h-9 w-5 items-center justify-center rounded-md border shadow-sm group-focus-visible:ring-2"
      >
        <GripVertical className="size-4" />
      </span>
    </div>
  );
}
