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
    renderMultiSelectOverlay({ selectionLocked: true });

    expect(
      screen.getByText("Locked selection. Unlock before moving or resizing.")
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Unlock" }) as HTMLButtonElement).type
    ).toBe("button");
  });

  it("keeps multi-select actions large enough for mobile taps", () => {
    renderMultiSelectOverlay();

    for (const label of ["Duplicate", "Group", "Lock", "Delete"]) {
      expect(screen.getByRole("button", { name: label }).className).toContain(
        "min-h-14"
      );
    }
  });
});
