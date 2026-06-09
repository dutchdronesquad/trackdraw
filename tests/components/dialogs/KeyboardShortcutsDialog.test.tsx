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

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
    }) => <div {...props}>{children}</div>,
  },
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

  it("opens with tools shortcuts and expands another section on desktop", async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeTruthy();
    expect(screen.getByText("Gate")).toBeTruthy();
    expect(screen.getByText("G")).toBeTruthy();
    expect(screen.getByText("Tower")).toBeTruthy();
    expect(screen.getByText("T")).toBeTruthy();
    expect(screen.queryByText("Save snapshot")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Project" }));

    expect(screen.getByText("Save snapshot")).toBeTruthy();
    expect(screen.getByText("Ctrl/Cmd")).toBeTruthy();
    expect(screen.getByText("S")).toBeTruthy();
  });

  it("collapses the open shortcuts section when clicked again", async () => {
    const user = userEvent.setup();

    render(<KeyboardShortcutsDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Select")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Tools" }));

    expect(screen.queryByText("Select")).toBeNull();
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
