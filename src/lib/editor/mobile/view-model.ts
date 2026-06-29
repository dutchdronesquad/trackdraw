import {
  getToolMobileLabel,
  type EditorTool,
  type Translate,
} from "@/lib/editor/tool-registry";

export function getEditorMobilePanelsViewModel(options: {
  activePresetLabel?: string | null;
  activeTool: EditorTool;
  draftPathActive: boolean;
  mobileMultiSelectEnabled: boolean;
  pathBuilderPinnedOpen: boolean;
  readOnly: boolean;
  selectedCount: number;
  t: Translate;
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
    t,
    tab,
  } = options;

  return {
    mobileStatusTitle: mobileMultiSelectEnabled
      ? t("mobileStatus.multiSelect")
      : t("mobileStatus.tool"),
    mobileStatusValue:
      selectedCount > 0
        ? t("mobileStatus.itemsCount", { count: selectedCount })
        : activeTool === "preset" && activePresetLabel
          ? activePresetLabel
          : getToolMobileLabel(activeTool, t),
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
