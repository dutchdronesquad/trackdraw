"use client";

import { useEditor } from "@/store/editor";
import { useUiActions } from "@/store/actions";
import { selectShapeRecordMap } from "@/store/selectors";
import VersionTag from "@/components/VersionTag";
import { useDeveloperMode } from "@/hooks/account/useDeveloperMode";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { findPresetById } from "@/lib/planning/layout-presets";
import { useUserPresets } from "@/store/user-presets";
import { formatFieldSize, formatMeasurement } from "@/lib/track/units";
import { getShapeGroupId, getShapeGroupName } from "@/lib/track/shape-groups";
import { toolLabels } from "@/lib/editor/tool-registry";
import { Magnet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { useTranslations } from "next-intl";

interface StatusBarProps {
  cursorPos?: { x: number; y: number } | null;
  snapActive?: boolean;
}

export default function StatusBar({ cursorPos, snapActive }: StatusBarProps) {
  const t = useTranslations("editor");
  const { enabled, toggle } = useDeveloperMode();
  const { unitSystem } = useMeasurementUnitSystem();
  const { toggleSnapEnabled } = useUiActions();
  const activeTool = useEditor((state) => state.ui.activeTool);
  const activePresetId = useEditor((state) => state.ui.activePresetId);
  const snapEnabled = useEditor((state) => state.ui.snapEnabled);
  const field = useEditor((state) => state.track.design.field);
  const selection = useEditor((state) => state.session.selection);
  const selectionCount = selection.length;
  const shapeById = useEditor(selectShapeRecordMap);
  const zoom = useEditor((state) => state.ui.zoom);
  const userPresets = useUserPresets((state) => state.userPresets);
  const activePreset = findPresetById(activePresetId, userPresets);
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
          return groupName
            ? t("statusBar.groupNamed", { name: groupName })
            : t("statusBar.grouped");
        })()
      : selectedGroupIds.length > 1
        ? t("statusBar.groups", { count: selectedGroupIds.length })
        : null;
  const activeToolLabel =
    activeTool === "preset" && activePreset
      ? `${toolLabels[activeTool]}: ${activePreset.name}`
      : (toolLabels[activeTool] ?? activeTool);

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
        <span>
          {formatMeasurement(field.gridStep, unitSystem, { precision: 1 })}
        </span>
        <span className="text-muted-foreground/45">·</span>
      </span>

      {/* Cursor position — desktop only */}
      <span className="hidden lg:contents">
        {cursorPos ? (
          <span>
            {formatMeasurement(cursorPos.x, unitSystem, {
              precision: 1,
            })}
            ,{" "}
            {formatMeasurement(cursorPos.y, unitSystem, {
              precision: 1,
            })}
          </span>
        ) : (
          <span className="text-muted-foreground/45">
            — {unitSystem === "imperial" ? "ft" : "m"}
          </span>
        )}
      </span>

      {/* Snap indicator — desktop only */}
      <span className="text-muted-foreground/45">·</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleSnapEnabled}
            className={cn(
              "pointer-events-auto inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] transition-colors",
              snapEnabled
                ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                : "hover:bg-muted text-amber-500/85 hover:text-amber-400"
            )}
            aria-pressed={snapEnabled}
          >
            <Magnet
              className={cn(
                "size-3",
                snapEnabled && snapActive
                  ? "text-green-500/80"
                  : snapEnabled
                    ? "text-foreground/60"
                    : "text-amber-500/85"
              )}
            />
            <span>
              {snapEnabled
                ? snapActive
                  ? t("statusBar.snapActive")
                  : t("statusBar.snapOn")
                : t("statusBar.snapOff")}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="max-w-64">
          <span className="block font-medium">
            {snapEnabled ? t("statusBar.snapIsOn") : t("statusBar.snapIsOff")}
          </span>
          <span className="mt-1 block opacity-80">
            {snapEnabled
              ? t("statusBar.snapOnDescription")
              : t("statusBar.snapOffDescription")}
          </span>
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Selection count */}
      {selectionCount > 0 && (
        <>
          <span className="text-foreground/75">
            {t("statusBar.selected", { count: selectionCount })}
          </span>
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
        <span>{formatFieldSize(field.width, field.height, unitSystem)}</span>
        <span className="text-muted-foreground/45">·</span>
      </span>

      {process.env.NODE_ENV !== "production" && (
        <>
          <button
            type="button"
            onClick={toggle}
            className="text-muted-foreground/65 hover:text-foreground hover:bg-muted pointer-events-auto inline-flex h-5 items-center rounded px-1.5 text-[11px] transition-colors"
          >
            {enabled ? t("statusBar.devOn") : t("statusBar.dev")}
          </button>
          <span className="text-muted-foreground/45">·</span>
        </>
      )}

      <VersionTag className="text-muted-foreground/50 hover:text-muted-foreground border-0 bg-transparent p-0 text-[11px]" />
    </div>
  );
}
