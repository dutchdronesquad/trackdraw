// @vitest-environment happy-dom

import type React from "react";
import { useState } from "react";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountApiKeysView } from "@/components/dialogs/AccountDialog/ApiKeysView";
import { ApiKeyActions } from "@/components/dialogs/AccountDialog/ApiKeyActions";
import type { AccountApiKey } from "@/components/dialogs/AccountDialog/types";

const noop = vi.fn();
const key: AccountApiKey = {
  id: "key-1",
  name: "RotorHazard",
  start: "td_live",
  createdAt: "2026-04-20T10:00:00.000Z",
  expiresAt: "2026-05-20T10:00:00.000Z",
  enabled: true,
  lastRequest: null,
  permissions: { tracks: ["read"] },
  projectAccess: { mode: "all" },
};
function renderView(
  overrides: Partial<React.ComponentProps<typeof AccountApiKeysView>> = {},
  initialDraft = true
) {
  function Harness() {
    const [access, setAccess] = useState<ApiKeyProjectAccess>({ mode: "all" });
    const [draft, setDraft] = useState(initialDraft);
    const [editDraft, setEditDraft] =
      useState<React.ComponentProps<typeof AccountApiKeysView>["editDraft"]>(
        null
      );
    return (
      <AccountApiKeysView
        editDraft={editDraft}
        onEditDraftChange={setEditDraft}
        updatingApiKey={false}
        projectAccess={access}
        onProjectAccessChange={setAccess}
        draftOpen={draft}
        onDraftOpenChange={setDraft}
        apiKeyExpiryDays="90"
        apiKeyName=""
        apiKeys={[key]}
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
        onCreateApiKey={vi.fn(async () => true)}
        onDeleteApiKey={noop}
        onRefreshApiKeys={noop}
        onUpdateApiKeyAccess={vi.fn(async () => true)}
        user={{ id: "user-1" }}
        {...overrides}
      />
    );
  }
  return render(<Harness />);
}
function stubProjects() {
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
  return fetchMock;
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("compact API key settings", () => {
  it("shows aligned key metadata without exposing key prefixes or permission controls", () => {
    renderView({}, false);
    expect(
      screen.getByRole("columnheader", { name: "Project access" })
    ).toBeTruthy();
    expect(screen.getByText("RotorHazard")).toBeTruthy();
    expect(screen.getByText(/^Last used /)).toBeTruthy();
    expect(screen.queryByText("td_live")).toBeNull();
    expect(screen.queryByText(/tracks:read/i)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Actions for RotorHazard" })
    ).toBeTruthy();
  });

  it("keeps API docs and refresh as quiet header actions", async () => {
    const refresh = vi.fn();
    render(<ApiKeyActions loading={false} onRefresh={refresh} />);
    expect(
      screen.getByRole("link", { name: "API docs" }).getAttribute("href")
    ).toBe("/api/docs");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh API keys" }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "requires explicit confirmation to revoke a key (mobile=%s)",
    async (isMobile) => {
      const remove = vi.fn();
      renderView({ isMobile, onDeleteApiKey: remove }, false);
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", { name: "Actions for RotorHazard" })
      );
      await user.click(
        screen.getByRole("menuitem", { name: "Revoke RotorHazard" })
      );
      expect(remove).not.toHaveBeenCalled();
      expect(
        screen.getByRole("alertdialog", { name: "Revoke API key?" })
      ).toBeTruthy();
      expect(
        screen.getByText("Integrations using this key lose access.")
      ).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Revoke" }));
      expect(remove).toHaveBeenCalledWith("key-1");
    }
  );

  it("cancels and reopens a fresh draft", async () => {
    const name = vi.fn();
    renderView({ apiKeyName: "Draft", onApiKeyNameChange: name });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(name).toHaveBeenCalledWith("");
    expect(screen.queryByRole("textbox", { name: "Key name" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "New API key" }));
    expect(screen.getByRole("textbox", { name: "Key name" })).toBeTruthy();
  });

  it("keeps a failed submission editable, then closes the draft after success", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderView({ apiKeyName: "Integration", onCreateApiKey: create });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create key" }));
    expect(screen.getByRole("textbox", { name: "Key name" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create key" }));
    expect(
      await screen.findByRole("button", { name: "New API key" })
    ).toBeTruthy();
    expect(create).toHaveBeenLastCalledWith({ mode: "all" }, false);
  });

  it("keeps write access off until explicitly selected", async () => {
    const create = vi.fn(async () => false);
    renderView({ apiKeyName: "Integration", onCreateApiKey: create });
    const user = userEvent.setup();
    const writes = screen.getByRole("switch", {
      name: /Allow project changes/,
    });
    expect(writes.getAttribute("aria-checked")).toBe("false");
    await user.click(writes);
    await user.click(screen.getByRole("button", { name: "Create key" }));
    expect(create).toHaveBeenCalledWith({ mode: "all" }, true);
  });

  it("keeps the one-time secret visible and copyable after creation", async () => {
    const copy = vi.fn();
    renderView({
      createdApiKey: { ...key, key: "td_once_only" },
      onCopyApiKey: copy,
    });
    expect(
      screen.getByText(
        "This secret is shown once. Store it before closing this dialog."
      )
    ).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Copy" }));
    expect(copy).toHaveBeenCalledWith("td_once_only");
  });

  it("disables fields and duplicate submissions while a key is being created", () => {
    renderView({ apiKeyName: "Pending", creatingApiKey: true });
    expect(
      screen
        .getByRole("button", { name: "Create key" })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Project access" })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen.getByRole("textbox", { name: "Key name" }).hasAttribute("disabled")
    ).toBe(true);
  });
});

describe("project access popover", () => {
  it.each([false, true])(
    "searches projects without fetching until needed, and submits the selection (mobile=%s)",
    async (isMobile) => {
      const fetchMock = stubProjects();
      const create = vi.fn(async () => false);
      renderView({
        apiKeyName: "Integration",
        isMobile,
        onCreateApiKey: create,
      });
      const user = userEvent.setup();
      expect(fetchMock).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Project access" }));
      await user.click(screen.getByRole("tab", { name: "Selected" }));
      expect(
        screen
          .getByRole("button", { name: "Create key" })
          .hasAttribute("disabled")
      ).toBe(true);
      await screen.findByRole("checkbox", { name: "Race night" });
      await user.type(
        screen.getByRole("textbox", { name: "Search projects" }),
        "Race"
      );
      expect(screen.queryByRole("checkbox", { name: "Practice" })).toBeNull();
      await user.click(screen.getByRole("checkbox", { name: "Race night" }));
      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("textbox", { name: "Search projects" })
      ).toBeNull();
      await user.click(screen.getByRole("button", { name: "Create key" }));
      expect(create).toHaveBeenCalledWith(
        {
          mode: "selected",
          projectIds: ["race"],
        },
        false
      );
      await user.click(screen.getByRole("button", { name: "Project access" }));
      await user.click(screen.getByRole("tab", { name: "All projects" }));
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: "Create key" }));
      expect(create).toHaveBeenLastCalledWith({ mode: "all" }, false);
    }
  );

  it("shows no matches without losing selected projects", async () => {
    stubProjects();
    renderView();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Project access" }));
    await user.click(screen.getByRole("tab", { name: "Selected" }));
    await user.click(
      await screen.findByRole("checkbox", { name: "Race night" })
    );
    await user.type(
      screen.getByRole("textbox", { name: "Search projects" }),
      "absent"
    );
    expect(screen.getByText("No matching projects.")).toBeTruthy();
    await user.clear(screen.getByRole("textbox", { name: "Search projects" }));
    expect(
      (screen.getByRole("checkbox", { name: "Race night" }) as HTMLInputElement)
        .checked
    ).toBe(true);
  });

  it("shows the owner label and keeps a selection when Done closes the picker", async () => {
    stubProjects();
    const create = vi.fn(async () => false);
    renderView({ apiKeyName: "Integration", onCreateApiKey: create });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Project access" }));
    expect(
      screen.getByRole("combobox", { name: "Project owner" })
    ).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Selected" }));
    await user.click(
      await screen.findByRole("checkbox", { name: "Race night" })
    );
    expect(screen.getByText("1 selected project")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(
      screen.queryByRole("combobox", { name: "Project owner" })
    ).toBeNull();
    expect(create).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Project access" }));
    expect(
      (
        (await screen.findByRole("checkbox", {
          name: "Race night",
        })) as HTMLInputElement
      ).checked
    ).toBe(true);
  });

  it("offers retry after a failed project request", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, projects: [] }),
      });
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      url === "/api/teams"
        ? Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, teams: [] }),
          })
        : fetchMock(url, init)
    );
    renderView();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Project access" }));
    await user.click(screen.getByRole("tab", { name: "Selected" }));
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(
      await screen.findByText("No cloud projects available.")
    ).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

it("keeps the key list primary and opens creation as a separate view", async () => {
  renderView({}, false);
  const user = userEvent.setup();
  expect(screen.getByRole("table", { name: "Active API keys" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Key name" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "New API key" }));
  expect(screen.getByRole("textbox", { name: "Key name" })).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByRole("table", { name: "Active API keys" })).toBeTruthy();
});

it("edits an existing key scope, retains failed drafts and saves without creating a key", async () => {
  stubProjects();
  const update = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const create = vi.fn();
  renderView({ onUpdateApiKeyAccess: update, onCreateApiKey: create }, false);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Actions for RotorHazard" })
  );
  await user.click(
    screen.getByRole("menuitem", { name: "Edit project access" })
  );
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("heading", { name: "Edit project access" })
  );
  await user.click(screen.getByRole("tab", { name: "Selected" }));
  await user.click(await screen.findByRole("checkbox", { name: "Race night" }));
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  expect(update).toHaveBeenLastCalledWith("key-1", {
    mode: "selected",
    projectIds: ["race"],
  });
  expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull()
  );
  expect(create).not.toHaveBeenCalled();
});

it("cancels scope edits without saving and returns focus to the key list", async () => {
  stubProjects();
  const update = vi.fn(async () => true);
  renderView({ onUpdateApiKeyAccess: update }, false);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "Actions for RotorHazard" })
  );
  await user.click(
    screen.getByRole("menuitem", { name: "Edit project access" })
  );
  await user.click(screen.getByRole("tab", { name: "Selected" }));
  await user.click(await screen.findByRole("checkbox", { name: "Race night" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(update).not.toHaveBeenCalled();
  expect(screen.getByRole("table", { name: "Active API keys" })).toBeTruthy();
  expect(document.activeElement).toBe(
    screen.getByRole("heading", { name: "Active API keys" })
  );
});
