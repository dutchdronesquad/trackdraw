// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileAppMenu from "@/components/editor/MobileAppMenu";

const sessionMock = vi.hoisted(() => ({
  data: null as {
    user?: {
      email?: string | null;
      name?: string | null;
      role?: string | null;
    } | null;
  } | null,
}));

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

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(),
    useSession: () => sessionMock,
  },
}));

vi.mock("@/components/dialogs/AccountDialog", () => ({
  default: () => <div data-testid="account-dialog" />,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme toggle</button>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div>{children}</div> : null),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
  DrawerDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <header>{children}</header>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

function renderMenu() {
  const props: React.ComponentProps<typeof MobileAppMenu> = {
    defaultOpen: true,
    onExport: vi.fn(),
    onImport: vi.fn(),
    onOpenProjects: vi.fn(),
    onShare: vi.fn(),
  };

  render(<MobileAppMenu {...props} />);
  return props;
}

describe("MobileAppMenu", () => {
  afterEach(() => {
    cleanup();
    sessionMock.data = null;
  });

  it("uses larger mobile touch targets for core actions", () => {
    renderMenu();

    for (const name of [
      /Projects.*Open and manage saved projects/,
      /Share.*Publish a read-only link/,
      /Import.*Bring in a JSON project file/,
      /Export.*Download PNG, PDF, SVG or JSON/,
    ]) {
      expect(screen.getByRole("button", { name }).className).toContain(
        "min-h-14"
      );
    }

    expect(screen.getByRole("link", { name: /Sign in/ }).className).toContain(
      "min-h-14"
    );
  });

  it("keeps account actions at the same mobile target size", () => {
    sessionMock.data = {
      user: {
        email: "race@example.com",
        name: "Race Admin",
        role: "admin",
      },
    };

    renderMenu();

    expect(
      screen.getByRole("button", { name: /Race Admin/ }).className
    ).toContain("min-h-14");
    expect(screen.getByRole("link", { name: /Dashboard/ }).className).toContain(
      "min-h-14"
    );
    expect(
      screen.getByRole("button", { name: /Sign out/ }).className
    ).toContain("min-h-11");
  });

  it("opens from the trigger and runs core workflow actions", async () => {
    const user = userEvent.setup();
    const props = {
      onExport: vi.fn(),
      onImport: vi.fn(),
      onMenuOpenChange: vi.fn(),
      onOpenProjects: vi.fn(),
      onShare: vi.fn(),
    };

    render(<MobileAppMenu {...props} onOpenProjects={props.onOpenProjects} />);

    await user.click(screen.getByRole("button", { name: "Open app menu" }));
    expect(props.onMenuOpenChange).toHaveBeenCalledWith(true);
    cleanup();
    props.onMenuOpenChange.mockClear();

    for (const [name, callback] of [
      [/Projects.*Open and manage saved projects/, props.onOpenProjects],
      [/Share.*Publish a read-only link/, props.onShare],
      [/Import.*Bring in a JSON project file/, props.onImport],
      [/Export.*Download PNG, PDF, SVG or JSON/, props.onExport],
    ] as const) {
      render(<MobileAppMenu {...props} defaultOpen />);
      await user.click(screen.getByRole("button", { name }));
      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
      expect(props.onMenuOpenChange).toHaveBeenCalledWith(false);
      callback.mockClear();
      props.onMenuOpenChange.mockClear();
      cleanup();
    }
  });
});
