// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardGalleryManager from "@/components/dashboard/GalleryManager";
import type { DashboardGalleryEntry } from "@/lib/server/gallery";

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

const entry: DashboardGalleryEntry = {
  id: "entry-1",
  shareToken: "share-token",
  ownerUserId: "owner-1",
  galleryState: "listed",
  galleryTitle: "Track One",
  galleryDescription: "A public description for Track One.",
  galleryPreviewImage: "gallery/previews/entry-1.webp",
  galleryPublishedAt: "2026-04-20T10:00:00.000Z",
  moderationHiddenAt: null,
  createdAt: "2026-04-20T09:00:00.000Z",
  updatedAt: "2026-04-20T10:00:00.000Z",
  ownerName: "Owner One",
  ownerEmail: "owner@trackdraw.local",
  shareTitle: "Track One share",
  shareExpiresAt: null,
  shareRevokedAt: null,
  shareType: "published" as const,
  shareCreatedAt: "2026-01-01T00:00:00.000Z",
  sharePublishedAt: "2026-01-01T00:00:00.000Z",
  projectId: null,
  fieldWidth: 30,
  fieldHeight: 18,
  shapeCount: 12,
};

describe("DashboardGalleryManager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "DELETE") {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            entry: { ...entry, galleryState: "featured" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("features a listed gallery entry with a PATCH request", async () => {
    const user = userEvent.setup();
    render(
      <DashboardGalleryManager
        currentUserRole="moderator"
        initialEntries={[entry]}
      />
    );

    await user.click(screen.getByLabelText("Feature Track One"));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/dashboard/gallery/share-token", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "feature" }),
    });
  });

  it("opens read-only inspect context for a gallery entry", async () => {
    const user = userEvent.setup();
    render(
      <DashboardGalleryManager
        currentUserRole="moderator"
        initialEntries={[entry]}
      />
    );

    await user.click(screen.getByLabelText("Inspect Track One"));

    expect(screen.getByText("Ready for public review")).toBeTruthy();
    expect(screen.getByText("30 x 18 m")).toBeTruthy();
    expect(screen.getByText("12 elements")).toBeTruthy();
    expect(screen.getByText("Share token")).toBeTruthy();
    expect(screen.getByText("share-token")).toBeTruthy();
    expect(screen.getByText("Preview file")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Open share/i }).getAttribute("href")
    ).toBe("/share/share-token");
  });

  it("confirms before deleting a gallery entry", async () => {
    const user = userEvent.setup();
    render(
      <DashboardGalleryManager
        currentUserRole="admin"
        initialEntries={[entry]}
      />
    );

    await user.click(screen.getByLabelText("Delete Track One"));
    expect(screen.getByText("Delete gallery entry?")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith("/api/dashboard/gallery/share-token", {
      method: "DELETE",
    });
  });
});
