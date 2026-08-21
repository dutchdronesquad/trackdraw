// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Inspector from "@/components/inspector/Inspector";
import { TooltipProvider } from "@/components/AppTooltip";
import { useEditor } from "@/store/editor";
import {
  flagDraft,
  gateDraft,
  polylineDraft,
  resetEditorStore,
} from "../../helpers/editor-store";

vi.mock("@/components/inspector/ElevationChart", () => ({
  default: () => <div data-testid="elevation-chart" />,
}));

vi.mock("@/components/editor/SaveAsPresetDialog", () => ({
  SaveAsPresetDialog: () => null,
}));

describe("Inspector tab switching", () => {
  const renderInspector = () =>
    render(
      <TooltipProvider delayDuration={0}>
        <Inspector mobileInline />
      </TooltipProvider>
    );

  beforeEach(() => {
    resetEditorStore();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns to the selection tab when a selected track item is clicked again", () => {
    const gateId = useEditor.getState().addShape(gateDraft());
    act(() => {
      useEditor.getState().setSelection([gateId]);
    });

    renderInspector();

    fireEvent.click(screen.getByRole("tab", { name: "Layout" }));
    expect(
      screen.getByRole("tab", { name: "Layout" }).getAttribute("aria-selected")
    ).toBe("true");

    act(() => {
      useEditor.getState().setSelection([gateId]);
    });

    expect(
      screen
        .getByRole("tab", { name: "Selection" })
        .getAttribute("aria-selected")
    ).toBe("true");
  });

  it("moves between available tabs with arrow keys", () => {
    const gateId = useEditor.getState().addShape(gateDraft());
    act(() => {
      useEditor.getState().setSelection([gateId]);
    });
    renderInspector();

    const layoutTab = screen.getByRole("tab", { name: "Layout" });
    const selectionTab = screen.getByRole("tab", { name: "Selection" });

    selectionTab.focus();
    fireEvent.keyDown(selectionTab, { key: "ArrowLeft" });

    expect(layoutTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(layoutTab);
    expect(layoutTab.tabIndex).toBe(0);
    expect(selectionTab.tabIndex).toBe(-1);
  });

  it("exposes arrange actions for compatible multi-selections", () => {
    const firstId = useEditor.getState().addShape(gateDraft({ x: 1 }));
    const secondId = useEditor.getState().addShape(flagDraft({ x: 5 }));
    act(() => useEditor.getState().setSelection([firstId, secondId]));

    renderInspector();

    fireEvent.click(
      screen.getByRole("button", { name: "Align horizontal centers" })
    );
    expect(useEditor.getState().track.design.shapeById[firstId]?.x).toBe(3);
    expect(useEditor.getState().track.design.shapeById[secondId]?.x).toBe(3);
    expect(
      screen.getByRole("button", { name: "Space evenly horizontally" })
    ).toHaveProperty("disabled", true);
  });

  it("does not expose arrange actions for path-only selections", () => {
    const firstId = useEditor.getState().addShape(polylineDraft());
    const secondId = useEditor.getState().addShape(
      polylineDraft({
        points: [
          { x: 2, y: 0 },
          { x: 6, y: 0 },
        ],
      })
    );
    act(() => useEditor.getState().setSelection([firstId, secondId]));

    renderInspector();

    expect(
      screen.queryByRole("button", { name: "Align horizontal centers" })
    ).toBeNull();
  });
});
