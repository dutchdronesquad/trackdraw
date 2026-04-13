import { describe, expect, it } from "vitest";
import { getEditorMobilePanelsViewModel } from "@/lib/editor/mobile/view-model";

describe("editor mobile view model", () => {
  it("shows selected-count status over tool labels", () => {
    const result = getEditorMobilePanelsViewModel({
      activePresetLabel: "Preset A",
      activeTool: "gate",
      draftPathActive: false,
      mobileMultiSelectEnabled: false,
      pathBuilderPinnedOpen: false,
      readOnly: false,
      selectedCount: 3,
      tab: "2d",
    });

    expect(result.mobileStatusTitle).toBe("Tool");
    expect(result.mobileStatusValue).toBe("3 items");
    expect(result.showPathBuilderOverlay).toBe(false);
    expect(result.showQuickAdjustOverlay).toBe(false);
  });

  it("shows preset labels and path builder overlay when appropriate", () => {
    const result = getEditorMobilePanelsViewModel({
      activePresetLabel: "Open practice",
      activeTool: "preset",
      draftPathActive: true,
      mobileMultiSelectEnabled: false,
      pathBuilderPinnedOpen: false,
      readOnly: false,
      selectedCount: 0,
      tab: "2d",
    });

    expect(result.mobileStatusValue).toBe("Open practice");

    const pathResult = getEditorMobilePanelsViewModel({
      activePresetLabel: null,
      activeTool: "polyline",
      draftPathActive: true,
      mobileMultiSelectEnabled: false,
      pathBuilderPinnedOpen: false,
      readOnly: false,
      selectedCount: 0,
      tab: "2d",
    });

    expect(pathResult.showPathBuilderOverlay).toBe(true);
    expect(pathResult.showQuickAdjustOverlay).toBe(false);
  });

  it("hides editing overlays in read-only, 3d, or multi-select states", () => {
    expect(
      getEditorMobilePanelsViewModel({
        activePresetLabel: null,
        activeTool: "polyline",
        draftPathActive: true,
        mobileMultiSelectEnabled: false,
        pathBuilderPinnedOpen: true,
        readOnly: true,
        selectedCount: 1,
        tab: "2d",
      }).showPathBuilderOverlay
    ).toBe(false);

    expect(
      getEditorMobilePanelsViewModel({
        activePresetLabel: null,
        activeTool: "gate",
        draftPathActive: false,
        mobileMultiSelectEnabled: true,
        pathBuilderPinnedOpen: false,
        readOnly: false,
        selectedCount: 1,
        tab: "2d",
      }).showQuickAdjustOverlay
    ).toBe(false);

    expect(
      getEditorMobilePanelsViewModel({
        activePresetLabel: null,
        activeTool: "gate",
        draftPathActive: false,
        mobileMultiSelectEnabled: false,
        pathBuilderPinnedOpen: false,
        readOnly: false,
        selectedCount: 1,
        tab: "3d",
      }).showQuickAdjustOverlay
    ).toBe(false);
  });
});
