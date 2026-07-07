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
import { useEditor } from "@/store/editor";
import { gateDraft, resetEditorStore } from "../../helpers/editor-store";

vi.mock("@/components/inspector/ElevationChart", () => ({
  default: () => <div data-testid="elevation-chart" />,
}));

vi.mock("@/components/editor/SaveAsPresetDialog", () => ({
  SaveAsPresetDialog: () => null,
}));

describe("Inspector tab switching", () => {
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

    render(<Inspector mobileInline />);

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
});
