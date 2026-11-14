"use client";

import { useRef, type RefObject } from "react";
import { useTranslations } from "next-intl";
import type { useEditorSplitView } from "@/hooks/editor/useEditorSplitView";

export function EditorViewDivider({
  canvasAreaRef,
  split,
}: {
  canvasAreaRef: RefObject<HTMLDivElement | null>;
  split: ReturnType<typeof useEditorSplitView>[1];
}) {
  const t = useTranslations("editor.viewModeSwitch");
  const drag = useRef<{
    pointerId: number;
    offset: number;
    ratio?: number;
  } | null>(null);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={t("splitDivider")}
      aria-orientation="vertical"
      aria-controls="editor-canvas-2d"
      aria-valuemin={split.minRatio}
      aria-valuemax={split.maxRatio}
      aria-valuenow={split.ratio}
      aria-valuetext={t("splitRatio", { ratio: split.ratio })}
      className="group absolute inset-y-0 z-10 flex w-3 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center outline-none select-none"
      style={{ left: `${split.ratio}%` }}
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return;
        const handle = event.currentTarget;
        const bounds = handle.getBoundingClientRect();
        drag.current = {
          pointerId: event.pointerId,
          offset: event.clientX - (bounds.left + bounds.width / 2),
        };
        handle.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const canvas = canvasAreaRef.current;
        const currentDrag = drag.current;
        if (!canvas || currentDrag?.pointerId !== event.pointerId) return;

        const bounds = canvas.getBoundingClientRect();
        const next = Math.round(
          ((event.clientX - bounds.left - currentDrag.offset) / bounds.width) *
            100
        );
        if (next !== split.ratio) currentDrag.ratio = split.resize(next);
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        const { ratio } = drag.current;
        drag.current = null;
        if (ratio !== undefined) split.commit(ratio);
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
          default:
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        split.commit(next);
      }}
    >
      <span className="bg-border group-hover:bg-brand-primary group-active:bg-brand-primary group-focus-visible:bg-brand-primary absolute inset-y-0 w-0.5" />
      <span className="border-border bg-sidebar text-muted-foreground group-focus-visible:border-brand-primary group-hover:border-brand-primary z-10 flex h-9 w-3 items-center justify-center gap-0.5 rounded-sm border shadow-sm">
        <span className="h-3 w-px bg-current" />
        <span className="h-3 w-px bg-current" />
      </span>
    </div>
  );
}
