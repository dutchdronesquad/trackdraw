// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import KeyboardShortcutsDialog from "@/components/dialogs/KeyboardShortcutsDialog";

const mobileState = vi.hoisted(() => ({
  isMobile: false,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mobileState.isMobile,
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

describe("KeyboardShortcutsDialog", () => {
  afterEach(() => {
    cleanup();
    mobileState.isMobile = false;
  });

  it("opens as a searchable desktop dialog with essential shortcuts", () => {
    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "Keyboard Shortcuts" })
    ).toBeTruthy();
    expect(
      screen.getByRole("searchbox", { name: "Search keyboard shortcuts" })
    ).toBeTruthy();
    expect(screen.getAllByText("Essentials").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Undo").length).toBeGreaterThan(0);
  });

  it("filters shortcuts by action, description, or key", async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search keyboard shortcuts" }),
      "barrier"
    );

    expect(screen.getByText("Barrier")).toBeTruthy();
    expect(screen.getByText("Activate the Barrier tool")).toBeTruthy();
  });

  it("switches between shortcut categories", async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Project/ }));

    expect(screen.getByText("Save snapshot")).toBeTruthy();
    expect(screen.getAllByText("Open command palette").length).toBeGreaterThan(
      0
    );
  });

  it("uses the mobile drawer shell on small screens", () => {
    mobileState.isMobile = true;

    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Keyboard Shortcuts" })
    ).toBeTruthy();
  });
});
