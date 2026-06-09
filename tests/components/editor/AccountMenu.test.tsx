// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountMenu from "@/components/editor/AccountMenu";
import { authClient } from "@/lib/auth-client";

const sessionState = vi.hoisted(() => ({
  session: {
    data: null as {
      user?: {
        email?: string | null;
        name?: string | null;
        role?: string | null;
      } | null;
    } | null,
    isPending: false,
  },
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
    useSession: () => sessionState.session,
    signOut: vi.fn(async () => undefined),
  },
}));

vi.mock("@/components/dialogs/AccountDialog", () => ({
  default: ({
    open,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (open ? <div data-testid="account-dialog" /> : null),
}));

vi.mock("@/components/UserAvatar", () => ({
  default: ({
    email,
    name,
  }: {
    email?: string | null;
    name?: string | null;
  }) => <span>{name ?? email ?? "avatar"}</span>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe("AccountMenu", () => {
  afterEach(() => {
    cleanup();
    sessionState.session = { data: null, isPending: false };
    vi.clearAllMocks();
  });

  it("shows pending and signed-out states", () => {
    sessionState.session = { data: null, isPending: true };
    const { rerender } = render(<AccountMenu />);

    expect(screen.getByText("Checking auth…")).toBeTruthy();

    sessionState.session = { data: null, isPending: false };
    rerender(<AccountMenu />);

    expect(
      screen.getByRole("link", { name: /Sign in/ }).getAttribute("href")
    ).toBe("/login");
  });

  it("shows account metadata and dashboard access for moderators and admins only", () => {
    sessionState.session = {
      isPending: false,
      data: {
        user: {
          email: "pilot@example.com",
          name: "",
          role: "moderator",
        },
      },
    };

    const { rerender } = render(<AccountMenu />);

    expect(screen.getAllByText("pilot@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("No display name set")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Dashboard/ }).getAttribute("href")
    ).toBe("/dashboard");

    sessionState.session = {
      isPending: false,
      data: {
        user: {
          email: "pilot@example.com",
          name: "Race Pilot",
          role: "user",
        },
      },
    };
    rerender(<AccountMenu />);

    expect(screen.queryByRole("link", { name: /Dashboard/ })).toBeNull();
    expect(screen.getAllByText("Race Pilot").length).toBeGreaterThan(0);
    expect(screen.getByText("TrackDraw account")).toBeTruthy();
  });

  it("opens profile after closing the popover and signs out", async () => {
    const user = userEvent.setup();
    sessionState.session = {
      isPending: false,
      data: {
        user: {
          email: "pilot@example.com",
          name: "Race Pilot",
          role: "admin",
        },
      },
    };

    render(<AccountMenu />);

    await user.click(screen.getByRole("button", { name: "Profile" }));

    await waitFor(() => {
      expect(screen.getByTestId("account-dialog")).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(authClient.signOut).toHaveBeenCalledWith({
      fetchOptions: {
        onSuccess: expect.any(Function),
      },
    });
  });
});
