import type { EditorTool } from "@/lib/editor/tool-registry";
import { getTrackItemToolConfigs } from "@/lib/track/items/registry";

export function getEditorMobilePanelsViewModel(options: {
  activePresetLabel?: string | null;
  activeTool: EditorTool;
  draftPathActive: boolean;
  mobileMultiSelectEnabled: boolean;
  pathBuilderPinnedOpen: boolean;
  readOnly: boolean;
  selectedCount: number;
  tab: "2d" | "3d";
}) {
  const {
    activePresetLabel,
    activeTool,
    draftPathActive,
    mobileMultiSelectEnabled,
    pathBuilderPinnedOpen,
    readOnly,
    selectedCount,
    tab,
  } = options;

  const toolDisplayName: Record<string, string> = {
    select: "Select",
    grab: "Grab",
    preset: "Presets",
    ...Object.fromEntries(
      getTrackItemToolConfigs().map((tool) => [
        tool.id,
        tool.mobileLabel ?? tool.label,
      ])
    ),
  };

  return {
    mobileStatusTitle: mobileMultiSelectEnabled ? "Multi" : "Tool",
    mobileStatusValue:
      selectedCount > 0
        ? `${selectedCount} items`
        : activeTool === "preset" && activePresetLabel
          ? activePresetLabel
          : (toolDisplayName[activeTool] ?? activeTool),
    showPathBuilderOverlay:
      !readOnly &&
      tab === "2d" &&
      activeTool === "polyline" &&
      (pathBuilderPinnedOpen || draftPathActive),
    showQuickAdjustOverlay:
      !readOnly &&
      tab === "2d" &&
      selectedCount === 1 &&
      !mobileMultiSelectEnabled &&
      !(
        activeTool === "polyline" &&
        (pathBuilderPinnedOpen || draftPathActive)
      ),
  };
}
