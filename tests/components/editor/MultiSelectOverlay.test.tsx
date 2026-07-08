// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiSelectOverlay } from "@/components/editor/mobile/MultiSelectOverlay";

function renderMultiSelectOverlay(
  overrides: Partial<React.ComponentProps<typeof MultiSelectOverlay>> = {}
) {
  const props: React.ComponentProps<typeof MultiSelectOverlay> = {
    canUngroupSelection: false,
    className: "",
    hasLockedSelection: false,
    onDeleteSelection: vi.fn(),
    onDuplicateSelection: vi.fn(),
    onGroupSelection: vi.fn(),
    onToggleSelectionLock: vi.fn(),
    onUngroupSelection: vi.fn(),
    selectedCount: 2,
    selectionLocked: false,
    ...overrides,
  };

  render(<MultiSelectOverlay {...props} />);
  return props;
}

describe("MultiSelectOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the standard multi-select hint for editable selections", () => {
    renderMultiSelectOverlay();

    expect(screen.getByText("2 selected")).toBeTruthy();
    expect(screen.getByText("Tap items to add or remove them.")).toBeTruthy();
  });

  it("explains locked selection limits on mobile", () => {
    renderMultiSelectOverlay({
      hasLockedSelection: true,
      selectionLocked: true,
    });

    expect(
      screen.getByText("Locked selection. Unlock before moving or resizing.")
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Unlock" }) as HTMLButtonElement).type
    ).toBe("button");
    expect(
      (screen.getByRole("button", { name: "Duplicate" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("disables duplicate and destructive actions when any selected item is locked", () => {
    renderMultiSelectOverlay({
      hasLockedSelection: true,
      selectionLocked: false,
    });

    expect(
      (screen.getByRole("button", { name: "Duplicate" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Group" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Lock" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it("keeps multi-select actions large enough for mobile taps", () => {
    renderMultiSelectOverlay();

    for (const label of ["Duplicate", "Group", "Lock", "Delete"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.className).toContain("min-h-14");
      expect(button.className).toContain("min-w-0");
      expect(button.querySelector("span")?.className).toContain("truncate");
    }
  });

  it("keeps grouped selection naming reachable as a mobile touch control", () => {
    renderMultiSelectOverlay({
      canUngroupSelection: true,
      onSetGroupName: vi.fn(),
      selectedGroupName: "Start section",
    });

    const input = screen.getByPlaceholderText("Group name");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("text-[13px]");
  });
});
