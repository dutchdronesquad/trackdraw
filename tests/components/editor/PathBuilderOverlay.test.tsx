// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathBuilderOverlay } from "@/components/editor/mobile/PathBuilderOverlay";

function renderPathBuilderOverlay(
  overrides: Partial<React.ComponentProps<typeof PathBuilderOverlay>> = {}
) {
  const props: React.ComponentProps<typeof PathBuilderOverlay> = {
    className: "",
    draftPathClosed: false,
    draftPathLength: 12.34,
    draftPathPointCount: 2,
    onCancelPath: vi.fn(),
    onCloseLoop: vi.fn(),
    onFinishPath: vi.fn(),
    onUndoPathPoint: vi.fn(),
    ...overrides,
  };

  render(<PathBuilderOverlay {...props} />);
  return props;
}

describe("PathBuilderOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows path length while building", () => {
    renderPathBuilderOverlay();

    expect(screen.getByText("2 points · 12.3 m")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Finish" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it("explains when the mobile path loop is already connected", () => {
    renderPathBuilderOverlay({
      draftPathClosed: true,
      draftPathLength: 18,
      draftPathPointCount: 4,
    });

    expect(screen.getByText("Loop connected · 4 points · 18.0 m")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Connect ends",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it("keeps path actions large enough for mobile taps", () => {
    renderPathBuilderOverlay();

    for (const label of ["Undo", "Connect ends", "Finish", "Cancel"]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.className).toContain("min-h-14");
      expect(button.className).toContain("min-w-0");
      expect(button.querySelector("span")?.className).toContain("truncate");
    }
  });
});
