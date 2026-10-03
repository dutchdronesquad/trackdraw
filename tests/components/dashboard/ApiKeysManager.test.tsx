// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardApiKeysManager from "@/components/dashboard/ApiKeysManager";
import type { AdminApiKey } from "@/lib/server/api-keys";

function createApiKey(index: number): AdminApiKey {
  return {
    id: `key-${index}`,
    name: `API key ${index}`,
    start: `td_${index}`,
    prefix: "td_",
    enabled: true,
    requestCount: index,
    remaining: null,
    lastRequest: null,
    expiresAt: null,
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    rateLimitEnabled: false,
    rateLimitMax: null,
    rateLimitTimeWindowMs: null,
    permissions: null,
    ownerUserId: `user-${index}`,
    ownerName: `Owner ${index}`,
    ownerEmail: `owner-${index}@trackdraw.local`,
  };
}

describe("DashboardApiKeysManager", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("paginates API keys", async () => {
    const user = userEvent.setup();
    const keys = Array.from({ length: 12 }, (_, index) =>
      createApiKey(index + 1)
    );

    render(<DashboardApiKeysManager initialKeys={keys} />);

    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    expect(screen.queryByText("API key 11")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getByText("API key 11")).toBeTruthy();
  });

  it("filters keys near their rate limit and revokes a key", async () => {
    const user = userEvent.setup();
    const busyKey: AdminApiKey = {
      ...createApiKey(1),
      name: "Timing bridge",
      requestCount: 95,
      lastRequest: new Date().toISOString(),
      rateLimitEnabled: true,
      rateLimitMax: 100,
      rateLimitTimeWindowMs: 60 * 60 * 1000,
    };
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true }, { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardApiKeysManager
        initialKeys={[busyKey, createApiKey(2)]}
        canRevoke
      />
    );

    await user.click(screen.getByRole("button", { name: "Near rate limit 1" }));
    expect(screen.getByText("Timing bridge")).toBeTruthy();
    expect(screen.queryByText("API key 2")).toBeNull();

    await user.click(screen.getByText("Timing bridge"));
    await user.click(screen.getByRole("button", { name: "Revoke" }));
    await user.click(screen.getByRole("button", { name: "Revoke key" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/api-keys/key-1", {
      method: "DELETE",
    });
    expect(
      await screen.findByText("No API keys match the current filters.")
    ).toBeTruthy();
  });
});
