// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/AppTooltip";
import { AccountApiKeysView } from "@/components/dialogs/AccountDialog/ApiKeysView";
import type { AccountApiKey } from "@/components/dialogs/AccountDialog/types";

const noop = vi.fn();

function renderApiKeysView(apiKeys: AccountApiKey[] = []) {
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
      />
    </TooltipProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AccountApiKeysView", () => {
  it("explains that API keys are read-only project integration credentials", () => {
    renderApiKeysView();

    expect(
      screen.getByText(/external tools read your account projects/i)
    ).toBeTruthy();
    expect(screen.getByText(/Keys cannot edit tracks/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /API docs/i }).getAttribute("href")
    ).toBe("/api/docs");
    expect(
      screen.getByText(/trusted integration needs read-only access/i)
    ).toBeTruthy();
  });

  it("keeps the desktop revoke action visible when keyboard-focused", () => {
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

    expect(revokeButton.className).toContain("opacity-0");
    expect(revokeButton.className).toContain("group-hover:opacity-100");
    expect(revokeButton.className).toContain("focus-visible:opacity-100");
  });
});
