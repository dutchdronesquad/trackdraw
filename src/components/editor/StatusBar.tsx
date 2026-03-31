"use client";

import { useEditor } from "@/store/editor";
import { selectShapeRecordMap } from "@/store/selectors";
import VersionTag from "@/components/VersionTag";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { getLayoutPresetById } from "@/lib/layout-presets";
import { getShapeGroupId, getShapeGroupName } from "@/lib/shape-groups";

const toolLabel: Record<string, string> = {
  select: "Select",
  grab: "Grab",
  gate: "Gate",
  ladder: "Ladder",
  divegate: "Dive Gate",
  flag: "Flag",
  cone: "Cone",
  label: "Label",
  polyline: "Path",
  startfinish: "Start / Finish",
  preset: "Presets",
};

interface StatusBarProps {
  cursorPos?: { x: number; y: number } | null;
  snapActive?: boolean;
}

export default function StatusBar({ cursorPos, snapActive }: StatusBarProps) {
  const { enabled, toggle } = useDeveloperMode();
  const activeTool = useEditor((state) => state.transient.activeTool);
  const activePresetId = useEditor((state) => state.transient.activePresetId);
  const field = useEditor((state) => state.design.field);
  const selection = useEditor((state) => state.selection);
  const selectionCount = selection.length;
  const shapeById = useEditor(selectShapeRecordMap);
  const zoom = useEditor((state) => state.transient.zoom);
  const activePreset = getLayoutPresetById(activePresetId);
  const selectedShapes = selection.map((id) => shapeById[id]).filter(Boolean);
  const selectedGroupIds = Array.from(
    new Set(
      selectedShapes
        .map((shape) => getShapeGroupId(shape))
        .filter((value): value is string => Boolean(value))
    )
  );
  const selectedGroupLabel =
    selectedGroupIds.length === 1
      ? (() => {
          const namedShape = selectedShapes.find(
            (shape) => getShapeGroupId(shape) === selectedGroupIds[0]
          );
          const groupName = namedShape ? getShapeGroupName(namedShape) : null;
          return groupName ? `Group: ${groupName}` : "Grouped";
        })()
      : selectedGroupIds.length > 1
        ? `${selectedGroupIds.length} groups`
        : null;
  const activeToolLabel =
    activeTool === "preset" && activePreset
      ? `${toolLabel[activeTool]}: ${activePreset.name}`
      : (toolLabel[activeTool] ?? activeTool);

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-sidebar text-muted-foreground hidden items-center gap-3 border-t px-3 py-1.5 font-mono text-xs select-none lg:flex"
    >
      <span className="text-foreground/80 shrink-0">{activeToolLabel}</span>
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
          {selectedGroupLabel && (
            <>
              <span className="text-muted-foreground/45">·</span>
              <span className="text-sky-600 dark:text-sky-300">
                {selectedGroupLabel}
              </span>
            </>
          )}
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
