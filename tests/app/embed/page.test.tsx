// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackDesign } from "@/lib/types";

vi.mock("@/lib/server/shares", () => ({
  resolveStoredShare: vi.fn(),
}));

vi.mock("@/app/embed/EmbedViewer", () => ({
  default: ({
    design,
    initialTab,
  }: {
    design: TrackDesign;
    initialTab: "2d" | "3d";
  }) => (
    <div data-testid="embed-viewer" data-initial-tab={initialTab}>
      {design.title}
    </div>
  ),
}));

vi.mock("@/app/embed/EmbedUnavailable", () => ({
  default: ({ reason, shareHref }: { reason: string; shareHref?: string }) => (
    <div data-testid="embed-unavailable" data-reason={reason}>
      {shareHref ? <a href={shareHref}>Open share link</a> : null}
    </div>
  ),
}));

import EmbedTokenPage from "@/app/embed/[token]/page";
import { resolveStoredShare } from "@/lib/server/shares";
import { createDefaultDesign } from "@/lib/track/design";
import type { StoredShare } from "@/lib/server/shares";

function createShare(overrides: Partial<StoredShare> = {}): StoredShare {
  const design = createDefaultDesign();
  design.title = "Embed Test Track";

  return {
    id: "share-id",
    token: "share-token",
    design,
    title: design.title,
    description: "Read-only TrackDraw plan.",
    shapeCount: 0,
    fieldWidth: design.field.width,
    fieldHeight: design.field.height,
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt: "2026-04-20T10:00:00.000Z",
    publishedAt: "2026-04-20T10:00:00.000Z",
    expiresAt: null,
    revokedAt: null,
    ownerUserId: "user-1",
    projectId: "project-1",
    shareType: "published",
    ...overrides,
  };
}

function pageProps(view?: string) {
  return {
    params: Promise.resolve({ token: "share-token" }),
    searchParams: Promise.resolve(view ? { view } : {}),
  };
}

describe("embed token page", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders a published share for anonymous viewers with the requested initial view", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share: createShare(),
    });

    render(await EmbedTokenPage(pageProps("3d")));

    expect(
      screen.getByTestId("embed-viewer").getAttribute("data-initial-tab")
    ).toBe("3d");
    expect(screen.queryByTestId("embed-unavailable")).toBeNull();
  });

  it("blocks temporary shares from rendering track data in embed context", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share: createShare({
        ownerUserId: null,
        projectId: null,
        shareType: "temporary",
        expiresAt: "2026-05-20T10:00:00.000Z",
      }),
    });

    render(await EmbedTokenPage(pageProps("2d")));

    expect(screen.queryByTestId("embed-viewer")).toBeNull();
    expect(
      screen.getByTestId("embed-unavailable").getAttribute("data-reason")
    ).toBe("temporary");
    expect(
      screen.getByRole("link", { name: "Open share link" }).getAttribute("href")
    ).toBe("/share/share-token");
  });

  it.each([
    ["expired", "expired"],
    ["revoked", "revoked"],
    ["missing", "missing"],
  ] as const)("renders %s embeds as unavailable", async (status, reason) => {
    vi.mocked(resolveStoredShare).mockResolvedValue(
      status === "missing" ? { status } : { status, share: createShare() }
    );

    render(await EmbedTokenPage(pageProps()));

    expect(screen.queryByTestId("embed-viewer")).toBeNull();
    expect(
      screen.getByTestId("embed-unavailable").getAttribute("data-reason")
    ).toBe(reason);
  });
});
