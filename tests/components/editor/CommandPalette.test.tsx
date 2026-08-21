// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import CommandPalette from "@/components/editor/CommandPalette";

function renderPalette(
  overrides: Partial<ComponentProps<typeof CommandPalette>> = {}
) {
  const props: ComponentProps<typeof CommandPalette> = {
    open: true,
    onOpenChange: vi.fn(),
    activeView: "2d",
    hasPath: false,
    onOpenProjects: vi.fn(),
    onOpenAccountSettings: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onSwitchView: vi.fn(),
    onStartFlyThrough: vi.fn(),
    onShare: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onFeedback: vi.fn(),
    ...overrides,
  };

  render(<CommandPalette {...props} />);
  return props;
}

describe("CommandPalette", () => {
  afterEach(() => {
    cleanup();
  });

  it("filters actions by labels, descriptions and keywords", async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.type(
      screen.getByRole("combobox", { name: "Search commands" }),
      "pdf"
    );

    expect(screen.getByRole("option", { name: /Export/ })).toBeTruthy();
    expect(
      screen.queryByRole("option", { name: /Project Manager/ })
    ).toBeNull();
  });

  it("explains unavailable contextual actions and does not run them", async () => {
    const user = userEvent.setup();
    const onStartFlyThrough = vi.fn();
    renderPalette({ onStartFlyThrough });

    const flyThrough = screen.getByRole("option", {
      name: /Start fly-through Draw a path first to enable fly-through/,
    });
    expect(flyThrough.getAttribute("aria-disabled")).toBe("true");

    await user.click(flyThrough);
    expect(onStartFlyThrough).not.toHaveBeenCalled();
  });

  it("closes before running the selected existing action", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onExport = vi.fn();
    renderPalette({ onOpenChange, onExport });

    await user.click(screen.getByRole("option", { name: /Export/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await vi.waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
  });

  it("runs a searched action with the keyboard", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    renderPalette({ onExport });

    const search = screen.getByRole("combobox", { name: "Search commands" });
    await user.type(search, "pdf{Enter}");

    await vi.waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
  });

  it("opens with Cmd or Ctrl K and keeps the browser shortcut suppressed", () => {
    const onOpenChange = vi.fn();
    renderPalette({ open: false, onOpenChange });

    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      cancelable: true,
    });
    fireEvent(window, event);

    expect(event.defaultPrevented).toBe(true);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
