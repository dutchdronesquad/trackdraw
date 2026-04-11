"use client";

import { motion } from "framer-motion";
import { ArrowRight, Link2, PencilLine, X } from "lucide-react";

interface EditorMobilePathBuilderOverlayProps {
  className: string;
  draftPathClosed: boolean;
  draftPathLength: number;
  draftPathPointCount: number;
  onCancelPath: () => void;
  onCloseLoop: () => void;
  onFinishPath: () => void;
  onUndoPathPoint: () => void;
}

export function PathBuilderOverlay({
  className,
  draftPathClosed,
  draftPathLength,
  draftPathPointCount,
  onCancelPath,
  onCloseLoop,
  onFinishPath,
  onUndoPathPoint,
}: EditorMobilePathBuilderOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
            Path builder
          </p>
          <p className="truncate text-[11px] text-white/70">
            {draftPathPointCount > 0
              ? `${draftPathPointCount} points · ${draftPathLength.toFixed(1)} m`
              : "Tap the canvas to place the first point"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={onUndoPathPoint}
          disabled={draftPathPointCount === 0}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          <ArrowRight className="size-4 rotate-180" />
          <span>Undo</span>
        </button>
        <button
          onClick={onCloseLoop}
          disabled={draftPathPointCount < 3 || draftPathClosed}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          <Link2 className="size-4" />
          <span>Connect ends</span>
        </button>
        <button
          onClick={onFinishPath}
          disabled={draftPathPointCount < 2}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          <PencilLine className="size-4" />
          <span>Finish</span>
        </button>
        <button
          onClick={onCancelPath}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200"
        >
          <X className="size-4" />
          <span>Cancel</span>
        </button>
      </div>
    </motion.div>
  );
}
