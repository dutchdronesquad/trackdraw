// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
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
  afterEach(cleanup);

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
});
