import type { EditorTool } from "@/lib/editor-tools";

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
    gate: "Gate",
    flag: "Flag",
    cone: "Cone",
    label: "Label",
    polyline: "Path",
    ladder: "Ladder",
    startfinish: "Start",
    divegate: "Dive",
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
