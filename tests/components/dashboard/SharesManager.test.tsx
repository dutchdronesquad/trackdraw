// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardSharesManager from "@/components/dashboard/SharesManager";
import type { DashboardShare } from "@/lib/server/shares";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    render,
    children,
  }: {
    render?: React.ReactElement;
    children?: React.ReactNode;
  }) => render ?? <>{children}</>,
  TooltipContent: () => null,
}));

vi.mock("@/components/AppTooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
  }: {
    asChild?: boolean;
    children?: React.ReactNode;
  }) => <>{children}</>,
  TooltipContent: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  DialogClose: ({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactNode;
  }) => (asChild ? <>{children}</> : <button type="button">{children}</button>),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

const activeShare: DashboardShare = {
  token: "share-token",
  title: "Track One",
  createdAt: "2026-04-20T10:00:00.000Z",
  expiresAt: null,
  revokedAt: null,
  shareType: "published",
  ownerUserId: "owner-1",
  ownerName: "Owner One",
  ownerEmail: "owner@trackdraw.local",
  galleryState: "listed",
};

const revokedShare: DashboardShare = {
  ...activeShare,
  token: "revoked-token",
  title: "Revoked Track",
  revokedAt: "2026-04-21T10:00:00.000Z",
  galleryState: null,
};

describe("DashboardSharesManager", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    const clipboardNavigator = { clipboard: { writeText } };
    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: clipboardNavigator,
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: clipboardNavigator,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ok: true,
        })
      )
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("copies active share links with an accessible action label", async () => {
    render(
      <DashboardSharesManager
        currentUserRole="moderator"
        initialShares={[activeShare]}
      />
    );

    await userEvent.click(screen.getByLabelText("Copy link Track One"));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/share/share-token"
      )
    );
    expect(
      screen.getByLabelText("Open share Track One").getAttribute("href")
    ).toBe("/share/share-token");
  });

  it("revokes active shares with a PATCH request", async () => {
    const user = userEvent.setup();
    render(
      <DashboardSharesManager
        currentUserRole="moderator"
        initialShares={[activeShare]}
      />
    );

    await user.click(screen.getByLabelText("Revoke Track One"));
    expect(screen.getByText("Revoke share?")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Revoke share" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/dashboard/shares/share-token", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke" }),
    });
  });

  it("purges revoked shares for admins only", async () => {
    const user = userEvent.setup();
    render(
      <DashboardSharesManager
        currentUserRole="admin"
        initialShares={[revokedShare]}
      />
    );

    await user.click(screen.getByLabelText("Delete permanently Revoked Track"));
    expect(screen.getByText("Delete share permanently?")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Delete permanently" })
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/dashboard/shares/revoked-token", {
      method: "DELETE",
    });
  });

  it("disables purge actions for moderators", () => {
    render(
      <DashboardSharesManager
        currentUserRole="moderator"
        initialShares={[revokedShare]}
      />
    );

    expect(
      (
        screen.getByLabelText(
          "Delete permanently Revoked Track"
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});
