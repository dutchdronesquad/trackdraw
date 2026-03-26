"use client";

import { useEditor } from "@/store/editor";
import VersionTag from "@/components/VersionTag";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";

const toolLabel: Record<string, string> = {
  select: "Select",
  grab: "Grab",
  gate: "Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Path",
};

interface StatusBarProps {
  cursorPos?: { x: number; y: number } | null;
  snapActive?: boolean;
}

export default function StatusBar({ cursorPos, snapActive }: StatusBarProps) {
  const { enabled, toggle } = useDeveloperMode();
  const activeTool = useEditor((state) => state.transient.activeTool);
  const field = useEditor((state) => state.design.field);
  const selectionCount = useEditor((state) => state.selection.length);
  const zoom = useEditor((state) => state.transient.zoom);

  return (
    <div role="status" aria-live="polite" className="border-border bg-sidebar text-muted-foreground hidden items-center gap-3 border-t px-3 py-1.5 font-mono text-xs select-none lg:flex">
      <span className="text-foreground/80 shrink-0">
        {toolLabel[activeTool] ?? activeTool}
      </span>
      <span className="text-muted-foreground/45">·</span>

      {/* Zoom */}
      <span>{Math.round(zoom * 100)}%</span>

      {/* Grid step — desktop only */}
      <span className="hidden lg:contents">
        <span className="text-muted-foreground/45">·</span>
        <span>{field.gridStep}m</span>
        <span className="text-muted-foreground/45">·</span>
      </span>

      {/* Cursor position — desktop only */}
      <span className="hidden lg:contents">
        {cursorPos ? (
          <span>
            {cursorPos.x.toFixed(1)}, {cursorPos.y.toFixed(1)} m
          </span>
        ) : (
          <span className="text-muted-foreground/45">— m</span>
        )}
      </span>

      {/* Snap indicator — desktop only */}
      {snapActive && (
        <span className="hidden lg:contents">
          <span className="text-muted-foreground/45">·</span>
          <span className="text-green-500/70">● snap</span>
        </span>
      )}

      <div className="flex-1" />

      {/* Selection count */}
      {selectionCount > 0 && (
        <>
          <span className="text-foreground/75">{selectionCount} selected</span>
          <span className="text-muted-foreground/45">·</span>
        </>
      )}

      {/* Field size — desktop only */}
      <span className="hidden lg:contents">
        <span>
          {field.width}×{field.height} m
        </span>
        <span className="text-muted-foreground/45">·</span>
      </span>

      {process.env.NODE_ENV !== "production" && (
        <>
          <button
            type="button"
            onClick={toggle}
            className="text-muted-foreground/65 hover:text-foreground hover:bg-muted pointer-events-auto inline-flex h-5 items-center rounded px-1.5 text-[11px] transition-colors"
          >
            {enabled ? "Dev On" : "Dev"}
          </button>
          <span className="text-muted-foreground/45">·</span>
        </>
      )}

      <VersionTag className="text-muted-foreground/50 hover:text-muted-foreground border-0 bg-transparent p-0 text-[11px]" />
    </div>
  );
}
