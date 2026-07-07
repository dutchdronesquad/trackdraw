// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToolsControls } from "@/components/editor/mobile/ToolsControls";
import { ViewControls } from "@/components/editor/mobile/ViewControls";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const toolProps: React.ComponentProps<typeof ToolsControls> = {
  activePlacementElementId: {},
  activeTool: "gate",
  canRedo: false,
  canUndo: true,
  onRedo: vi.fn(),
  onSelectPlacementElement: vi.fn(),
  onSelectTool: vi.fn(),
  onUndo: vi.fn(),
  tab: "2d",
};

const viewProps: React.ComponentProps<typeof ViewControls> = {
  hasPath: true,
  inspectorHint: "1 selected",
  mobileGizmoEnabled: false,
  mobileObstacleNumbersEnabled: true,
  mobileRulersEnabled: false,
  onFitView: vi.fn(),
  onSetMobileGizmoEnabled: vi.fn(),
  onSetMobileObstacleNumbersEnabled: vi.fn(),
  onSetMobileRulersEnabled: vi.fn(),
  onStartFlyThrough: vi.fn(),
  onTabChange: vi.fn(),
  onToggleSnapEnabled: vi.fn(),
  saveStatusLabel: "Saved",
  snapEnabled: true,
  tab: "2d",
};

describe("mobile editor controls", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps tool drawer controls large enough for mobile taps", () => {
    render(<ToolsControls {...toolProps} />);

    expect(screen.getByRole("button", { name: "Undo" }).className).toContain(
      "min-h-12"
    );
    expect(screen.getByRole("button", { name: "Redo" }).className).toContain(
      "min-h-12"
    );
    expect(
      screen
        .getAllByRole("button", { name: /Gate/ })
        .some((button) => button.className.includes("min-h-14"))
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Path" }).className).toContain(
      "min-h-16"
    );
    expect(
      screen.getByRole("button", { name: "Path" }).querySelector("span")
        ?.className
    ).toContain("truncate");
  });

  it("keeps view drawer actions and toggles at mobile target size", () => {
    render(<ViewControls {...viewProps} />);

    for (const name of ["Fit to field", "Snap", "Rulers", "Obstacle numbers"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(name) }).className
      ).toContain("min-h-12");
    }
  });

  it("keeps read-only share actions compact but touch-friendly", () => {
    render(
      <ViewControls
        {...viewProps}
        onShare={vi.fn()}
        readOnly
        showShareActions
        studioHref="/studio?from=share"
      />
    );

    expect(
      screen.getByRole("link", { name: "Editable copy" }).className
    ).toContain("min-h-12");
    expect(screen.getByRole("button", { name: "Share" }).className).toContain(
      "min-h-12"
    );
  });
});
