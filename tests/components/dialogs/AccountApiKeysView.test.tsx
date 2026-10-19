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
  vi.unstubAllGlobals();
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
        projectAccess: { mode: "all" },
      },
    ]);

    const revokeButton = screen.getByRole("button", {
      name: "Revoke RotorHazard",
    });

    expect(revokeButton.className).toContain("opacity-100");
    expect(revokeButton.className).not.toContain("opacity-0");
    expect(screen.getByText(/^Expires /)).toBeTruthy();
    expect(screen.getByText(/^Last used /)).toBeTruthy();
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
        projectAccess: { mode: "all" },
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
          projectAccess: { mode: "all" },
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

it("searches and selects projects on mobile, and submits the restricted selection", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      projects: [
        { id: "race", title: "Race night" },
        { id: "practice", title: "Practice" },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  const create = vi.fn(async () => {});
  renderApiKeysView([], {
    apiKeyName: "Integration",
    isMobile: true,
    onCreateApiKey: create,
  });
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: "Selected projects" }));
  expect(
    screen.getByRole("button", { name: "Create" }).hasAttribute("disabled")
  ).toBe(true);
  await screen.findByRole("checkbox", { name: "Race night" });
  await user.type(
    screen.getByRole("textbox", { name: "Search projects" }),
    "Race"
  );
  expect(screen.queryByRole("checkbox", { name: "Practice" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: "Race night" }));
  await user.click(screen.getByRole("button", { name: "Create" }));
  expect(create).toHaveBeenCalledWith({
    mode: "selected",
    projectIds: ["race"],
  });
  await user.click(screen.getByRole("radio", { name: "All projects" }));
  await user.click(screen.getByRole("button", { name: "Create" }));
  expect(create).toHaveBeenLastCalledWith({ mode: "all" });
});

it("offers retry when loading projects fails", async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, projects: [] }),
    });
  vi.stubGlobal("fetch", fetchMock);
  renderApiKeysView();
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: "Selected projects" }));
  await user.click(await screen.findByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No cloud projects available.")).toBeTruthy();
});
