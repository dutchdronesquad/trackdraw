"use client";

import { useEditor } from "@/store/editor";

const toolLabel: Record<string, string> = {
  select: "Select",
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
  const { design, zoom, selection, activeTool } = useEditor();

  return (
    <div className="flex items-center gap-3 border-t border-border bg-sidebar px-3 py-1.5 text-[11px] text-muted-foreground font-mono select-none">
      {/* Active tool */}
      <span className="text-foreground/70">{toolLabel[activeTool] ?? activeTool}</span>
      <span className="text-muted-foreground/25">·</span>

      {/* Zoom */}
      <span>{Math.round(zoom * 100)}%</span>
      <span className="text-muted-foreground/25">·</span>

      {/* Grid step */}
      <span>{design.field.gridStep}m</span>
      <span className="text-muted-foreground/25">·</span>

      {/* Cursor position */}
      {cursorPos ? (
        <span>{cursorPos.x.toFixed(1)}, {cursorPos.y.toFixed(1)} m</span>
      ) : (
        <span className="text-muted-foreground/25">— m</span>
      )}

      {/* Snap indicator */}
      {snapActive && (
        <>
          <span className="text-muted-foreground/25">·</span>
          <span className="text-green-500/70">● snap</span>
        </>
      )}

      <div className="flex-1" />

      {/* Selection count */}
      {selection.length > 0 && (
        <>
          <span className="text-foreground/60">{selection.length} selected</span>
          <span className="text-muted-foreground/25">·</span>
        </>
      )}

      {/* Field size */}
      <span>{design.field.width}×{design.field.height} m</span>
    </div>
  );
}
