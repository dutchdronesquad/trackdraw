// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StatusBar from "@/components/editor/StatusBar";
import { useEditor } from "@/store/editor";
import { gateDraft, resetEditorStore } from "../../helpers/editor-store";

const developerModeState = vi.hoisted(() => ({
  enabled: false,
  toggle: vi.fn(),
}));

vi.mock("@/hooks/account/useDeveloperMode", () => ({
  useDeveloperMode: () => developerModeState,
}));

vi.mock("@/hooks/useMeasurementUnitSystem", () => ({
  useMeasurementUnitSystem: () => ({ unitSystem: "metric" }),
}));

vi.mock("@/components/AppTooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/VersionTag", () => ({
  default: () => <span>v-test</span>,
}));

describe("StatusBar", () => {
  beforeEach(() => {
    resetEditorStore();
    developerModeState.enabled = false;
    developerModeState.toggle.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("summarizes active tool, zoom, cursor, field size, and selection", () => {
    const state = useEditor.getState();
    const gateId = state.addShape(gateDraft());
    useEditor.getState().setActiveTool("gate");
    useEditor.getState().setZoom(1.5);
    useEditor.getState().updateField({ width: 42, height: 28, gridStep: 0.5 });
    useEditor.getState().setSelection([gateId]);

    render(<StatusBar cursorPos={{ x: 12.25, y: 6.75 }} snapActive />);

    expect(screen.getByRole("status").textContent).toContain("Gate");
    expect(screen.getByRole("status").textContent).toContain("150%");
    expect(screen.getByRole("status").textContent).toContain("0.5 m");
    expect(screen.getByRole("status").textContent).toContain("12.3 m, 6.8 m");
    expect(screen.getByRole("status").textContent).toContain("1 selected");
    expect(screen.getByRole("status").textContent).toContain("42 x 28 m");
  });

  it("toggles snap from the status bar control", () => {
    useEditor.getState().setSnapEnabled(true);

    render(<StatusBar />);

    const snapButton = screen.getByRole("button", { name: /Snap On/ });
    expect(snapButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(snapButton);

    expect(useEditor.getState().ui.snapEnabled).toBe(false);
    expect(screen.getByRole("button", { name: /Snap Off/ })).toBeTruthy();
  });

  it("toggles developer mode from the development control", () => {
    developerModeState.enabled = true;

    render(<StatusBar />);

    fireEvent.click(screen.getByRole("button", { name: "Dev On" }));

    expect(developerModeState.toggle).toHaveBeenCalledOnce();
  });
});
