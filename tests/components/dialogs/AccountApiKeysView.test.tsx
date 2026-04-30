// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/AppTooltip";
import { AccountApiKeysView } from "@/components/dialogs/AccountDialog/ApiKeysView";
import type { AccountApiKey } from "@/components/dialogs/AccountDialog/types";

const noop = vi.fn();

function renderApiKeysView(
  apiKeys: AccountApiKey[] = [],
  overrides: Partial<React.ComponentProps<typeof AccountApiKeysView>> = {}
) {
  return render(
    <TooltipProvider>
      <AccountApiKeysView
        apiKeyExpiryDays="90"
        apiKeyName=""
        apiKeys={apiKeys}
        apiKeysLoading={false}
        createdApiKey={null}
        creatingApiKey={false}
        deletingApiKeyId={null}
        error={null}
        isMobile={false}
        isPending={false}
        onApiKeyExpiryDaysChange={noop}
        onApiKeyNameChange={noop}
        onCopyApiKey={noop}
        onCreateApiKey={noop}
        onDeleteApiKey={noop}
        onRefreshApiKeys={noop}
        user={{ id: "user-1" }}
        {...overrides}
      />
    </TooltipProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AccountApiKeysView", () => {
  it("keeps API key setup copy minimal and links to API docs", () => {
    renderApiKeysView();

    expect(
      screen.getByText(/Read-only keys for trusted integrations/i)
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /API docs/i }).getAttribute("href")
    ).toBe("/api/docs");
    expect(
      screen.getByRole("button", { name: "Refresh API keys" })
    ).toBeTruthy();
    expect(
      screen.getByText(/trusted integration needs read-only access/i)
    ).toBeTruthy();
  });

  it("gives the mobile create action more room below expiry selection", () => {
    renderApiKeysView([], { apiKeyName: "RotorHazard", isMobile: true });

    const createButton = screen.getByRole("button", { name: "Create" });

    expect(createButton.className).toContain("mt-1");
    expect(createButton.className).toContain("w-full");
  });

  it("keeps revoke action visible and uses compact key metadata", () => {
    renderApiKeysView([
      {
        id: "key-1",
        name: "RotorHazard",
        start: "td_live",
        createdAt: "2026-04-20T10:00:00.000Z",
        expiresAt: "2026-05-20T10:00:00.000Z",
        enabled: true,
        lastRequest: null,
        permissions: { tracks: ["read"] },
      },
    ]);

    const revokeButton = screen.getByRole("button", {
      name: "Revoke RotorHazard",
    });

    expect(revokeButton.className).toContain("opacity-100");
    expect(revokeButton.className).not.toContain("opacity-0");
    expect(screen.getByText("Expires May 20, 2026")).toBeTruthy();
    expect(screen.getByText("Last used Never")).toBeTruthy();
    expect(screen.queryByText("td_live")).toBeNull();
    expect(screen.queryByText(/Tracks: read/i)).toBeNull();
  });

  it("explains that revoking an API key stops integration access", async () => {
    const user = userEvent.setup();

    renderApiKeysView([
      {
        id: "key-1",
        name: "RotorHazard",
        start: "td_live",
        createdAt: "2026-04-20T10:00:00.000Z",
        expiresAt: "2026-05-20T10:00:00.000Z",
        enabled: true,
        lastRequest: null,
        permissions: { tracks: ["read"] },
      },
    ]);

    await user.click(
      screen.getByRole("button", {
        name: "Revoke RotorHazard",
      })
    );

    expect(screen.getByText("Revoke API key?")).toBeTruthy();
    expect(
      screen.getByText("Integrations using this key lose read-only access.")
    ).toBeTruthy();
  });

  it("uses shorter revoke confirmation copy on mobile", async () => {
    const user = userEvent.setup();

    renderApiKeysView(
      [
        {
          id: "key-1",
          name: "RotorHazard",
          start: "td_live",
          createdAt: "2026-04-20T10:00:00.000Z",
          expiresAt: "2026-05-20T10:00:00.000Z",
          enabled: true,
          lastRequest: null,
          permissions: { tracks: ["read"] },
        },
      ],
      { isMobile: true }
    );

    await user.click(
      screen.getByRole("button", {
        name: "Revoke RotorHazard",
      })
    );

    expect(screen.getByText("This key stops working.")).toBeTruthy();
    expect(
      screen.queryByText("Integrations using this key lose read-only access.")
    ).toBeNull();
  });
});
