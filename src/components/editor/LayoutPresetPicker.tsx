"use client";

import { memo } from "react";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { X } from "lucide-react";
import {
  getLayoutPresetBounds,
  getLayoutPresetById,
  getLayoutPresetKindCounts,
  getLayoutPresetShapeCount,
  layoutPresets,
  type LayoutPreset,
} from "@/lib/planning/layout-presets";
import { shapeKindLabels } from "@/lib/editor-tools";
import { cn } from "@/lib/utils";

const preparedPresets = layoutPresets.map((preset) => {
  const counts = getLayoutPresetKindCounts(preset);

  return {
    preset,
    countSummary: Array.from(counts.entries())
      .map(([kind, count]) => `${count} ${shapeKindLabels[kind]}`)
      .join(" · "),
    itemCount: getLayoutPresetShapeCount(preset),
  };
});

const PresetPreview = memo(function PresetPreview({
  preset,
}: {
  preset: LayoutPreset;
}) {
  const bounds = getLayoutPresetBounds(preset);

  return (
    <svg
      viewBox={`0 0 ${bounds.width + 12} ${bounds.height + 12}`}
      className="h-18 w-full rounded-xl border border-white/8 bg-slate-950/90"
      role="presentation"
    >
      <rect
        x="0"
        y="0"
        width={bounds.width + 12}
        height={bounds.height + 12}
        rx="12"
        fill="rgba(15,23,42,0.92)"
      />
      {preset.shapes.map((shape, index) => {
        const x = shape.x - bounds.minX + 6;
        const y = shape.y - bounds.minY + 6;

        if (shape.kind === "flag" || shape.kind === "cone") {
          return (
            <circle
              key={`${preset.id}-${index}`}
              cx={x}
              cy={y}
              r={0.75}
              fill={shape.color ?? "#cbd5e1"}
              opacity="0.95"
            />
          );
        }

        if (shape.kind === "startfinish") {
          return (
            <rect
              key={`${preset.id}-${index}`}
              x={x - 1.4}
              y={y - 0.45}
              width="2.8"
              height="0.9"
              rx="0.3"
              fill={shape.color ?? "#f59e0b"}
              opacity="0.95"
            />
          );
        }

        if (shape.kind === "ladder") {
          return (
            <rect
              key={`${preset.id}-${index}`}
              x={x - 1}
              y={y - 2.4}
              width="2"
              height="4.8"
              rx="0.35"
              fill={shape.color ?? "#14b8a6"}
              opacity="0.95"
            />
          );
        }

        if (shape.kind === "divegate") {
          return (
            <rect
              key={`${preset.id}-${index}`}
              x={x - 1.2}
              y={y - 1.2}
              width="2.4"
              height="2.4"
              rx="0.3"
              fill="none"
              stroke={shape.color ?? "#f97316"}
              strokeWidth="0.35"
              opacity="0.95"
            />
          );
        }

        return (
          <rect
            key={`${preset.id}-${index}`}
            x={x - 1}
            y={y - 1}
            width="2"
            height="2"
            rx="0.25"
            fill={shape.color ?? "#3b82f6"}
            opacity="0.95"
          />
        );
      })}
    </svg>
  );
});

function LayoutPresetPickerBody({
  selectedPresetId,
  onSelectPreset,
}: {
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {preparedPresets.map(({ preset, countSummary, itemCount }) => {
        const selected = preset.id === selectedPresetId;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            className={cn(
              "border-border/60 bg-card hover:border-border hover:bg-muted/35 flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 text-left transition-colors",
              selected && "border-primary/25 bg-primary/4"
            )}
          >
            <PresetPreview preset={preset} />
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{preset.name}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <span className="bg-muted text-muted-foreground inline-flex shrink-0 self-start rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap uppercase">
                  {itemCount} items
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {countSummary}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface LayoutPresetPickerProps {
  mobile?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}

export function LayoutPresetPicker({
  mobile = false,
  open,
  onOpenChange,
  selectedPresetId,
  onSelectPreset,
}: LayoutPresetPickerProps) {
  const selectedPreset = getLayoutPresetById(selectedPresetId);
  const subtitle =
    "Choose a curated multi-shape preset. Place it once on the canvas, then edit the inserted shapes normally.";
  const selectedSummary = selectedPreset
    ? `Current preset: ${selectedPreset.name}`
    : "Choose a preset";
  const selectedDescription = selectedPreset
    ? selectedPreset.description
    : "Pick a preset first, then place it once on the canvas.";

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Presets"
        subtitle="Choose a preset, then tap once on the canvas to place the full section."
        pinnedContent={
          <>
            <div className="border-border/30 shrink-0 border-b px-4 pt-3 pb-4">
              <div className="border-border/50 bg-muted/18 rounded-xl border px-4 py-3">
                <p className="text-foreground text-sm font-medium">
                  {selectedSummary}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {selectedDescription}
                </p>
              </div>
            </div>
            <div className="border-border/30 shrink-0 border-b px-4 pt-3 pb-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                Place flow
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                Select a preset here, then tap the canvas. The result expands
                immediately into ordinary editable shapes.
              </p>
            </div>
          </>
        }
        bodyClassName="pt-4 pb-4"
      >
        <LayoutPresetPickerBody
          selectedPresetId={selectedPresetId}
          onSelectPreset={onSelectPreset}
        />
      </MobileDrawer>
    );
  }

  if (!open) return null;

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Layout presets"
      headerless
      maxWidth="max-w-4xl"
      panelClassName="flex flex-col overflow-hidden rounded-4xl p-0"
      subtitle={undefined}
    >
      <div className="flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-8 pb-5">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
                Studio
              </p>
              <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
                Layout presets
              </p>
              <p className="text-muted-foreground mt-2 max-w-none text-sm leading-relaxed">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground/75 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="border-border/30 grid min-h-0 grid-cols-[19rem_minmax(0,1fr)] border-t">
          <div className="border-border/30 border-r px-6 py-6">
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-widest uppercase">
              Placement
            </p>
            <div className="space-y-2.5">
              <div className="border-border/60 bg-muted/18 rounded-xl border px-4 py-3">
                <p className="text-foreground text-sm font-medium">
                  {selectedSummary}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {selectedDescription}
                </p>
              </div>
              <div className="border-border/40 rounded-xl border border-dashed px-4 py-3">
                <p className="text-foreground text-xs font-medium">
                  How it works
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                  Select a preset, click once on the canvas, then continue
                  editing the inserted shapes exactly like any other TrackDraw
                  content.
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="shrink-0 px-8 pt-5">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                Curated presets
              </p>
            </div>
            <div className="max-h-[58vh] min-h-0 overflow-y-auto px-8 py-4">
              <LayoutPresetPickerBody
                selectedPresetId={selectedPresetId}
                onSelectPreset={onSelectPreset}
              />
            </div>
          </div>
        </div>
        <div className="shrink-0 pb-2" />
      </div>
    </DesktopModal>
  );
}
