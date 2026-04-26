// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobilePanels from "@/components/editor/shared/MobilePanels";

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

vi.mock("@/components/MobileDrawer", () => ({
  MobileDrawer: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) =>
    open ? (
      <section aria-label={title} data-testid="mobile-drawer">
        {children}
      </section>
    ) : null,
}));

function renderMobilePanels(
  overrides: Partial<React.ComponentProps<typeof MobilePanels>> = {}
) {
  const props: React.ComponentProps<typeof MobilePanels> = {
    hasPath: true,
    mobileFlyModeActive: false,
    mobileGizmoEnabled: false,
    mobileObstacleNumbersEnabled: true,
    mobileRulersEnabled: false,
    onFitView: vi.fn(),
    onSetMobileGizmoEnabled: vi.fn(),
    onSetMobileObstacleNumbersEnabled: vi.fn(),
    onSetMobileRulersEnabled: vi.fn(),
    onShare: vi.fn(),
    onStartFlyThrough: vi.fn(),
    onTabChange: vi.fn(),
    onSetReadOnlyMenuOpen: vi.fn(),
    readOnlyMenuOpen: false,
    saveStatusLabel: "Embedded track",
    tab: "2d",
    ...overrides,
  };

  render(<MobilePanels {...props} />);
  return props;
}

describe("shared MobilePanels", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses a compact embed-only view action on mobile embeds", async () => {
    const user = userEvent.setup();
    const onSetReadOnlyMenuOpen = vi.fn();

    renderMobilePanels({
      embedMode: true,
      onSetReadOnlyMenuOpen,
    });

    expect(screen.getByRole("button", { name: "View" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit copy" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onSetReadOnlyMenuOpen).toHaveBeenCalledWith(true);
  });

  it("keeps the full shared-review toolbar outside embed mode", () => {
    renderMobilePanels({
      embedMode: false,
      studioHref: "/studio?fromShare=1",
    });

    expect(screen.getByRole("button", { name: "Review" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Edit copy" }).getAttribute("href")
    ).toBe("/studio?fromShare=1");
    expect(screen.queryByRole("button", { name: "View" })).toBeNull();
  });

  it("hides share actions inside the embed view drawer", () => {
    renderMobilePanels({
      embedMode: true,
      readOnlyMenuOpen: true,
    });

    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
    expect(screen.getByText("Embedded track")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open in Studio" })).toBeNull();
  });
});
