// @vitest-environment happy-dom
import React, { type ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

vi.mock("@/components/editor/EditorShell", () => ({
  default: () => <div>Editor content</div>,
}));
vi.mock("@/components/editor/viewer/EditorShell", () => ({
  default: () => <div>Viewer content</div>,
}));
vi.mock("@/components/editor/StudioDialogsProvider", () => ({
  StudioDialogsProvider: ({ children }: { children: ReactNode }) => children,
}));

let Workspace: typeof import("../../experiments/tauri-desktop/renderer/workspace/Workspace.jsx").Workspace;
let workspace: typeof import("../../experiments/tauri-desktop/renderer/workspace/workspace.mjs");
const first = serializeDesign({
  ...createDefaultDesign(),
  title: "Track with a long title for document tabs",
});
const second = serializeDesign({
  ...createDefaultDesign(),
  title: "Second track",
});
const scrollIntoView = vi.fn();
const previousScroll = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView"
);
const previousBridge = Object.getOwnPropertyDescriptor(
  window,
  "trackdrawDesktop"
);

beforeAll(async () => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
  let state = {
    designs: [first, second],
    draft: null as typeof first | null,
    restorePoints: [],
  };
  Object.defineProperty(window, "trackdrawDesktop", {
    configurable: true,
    value: {
      platform: "darwin",
      projects: vi.fn(
        async (name: string, payload?: { design: typeof first }) => {
          if ((name === "save" || name === "save-copy") && payload) {
            state = {
              ...state,
              designs: state.designs.some((d) => d.id === payload.design.id)
                ? state.designs.map((d) =>
                    d.id === payload.design.id ? payload.design : d
                  )
                : [...state.designs, payload.design],
              draft: name === "save" ? payload.design : state.draft,
            };
          }
          return state;
        }
      ),
      onMenuAction: () => () => {},
      onCloseRequested: () => () => {},
    },
  });
  await (
    await import("../../experiments/tauri-desktop/renderer/storage/projects.mjs")
  ).ready;
  workspace =
    await import("../../experiments/tauri-desktop/renderer/workspace/workspace.mjs");
  ({ Workspace } =
    await import("../../experiments/tauri-desktop/renderer/workspace/Workspace.jsx"));
});
afterEach(cleanup);
afterAll(() => {
  if (previousScroll)
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      previousScroll
    );
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  if (previousBridge)
    Object.defineProperty(window, "trackdrawDesktop", previousBridge);
  else Reflect.deleteProperty(window, "trackdrawDesktop");
});
function showWorkspace() {
  return render(
    <Workspace
      onNew={vi.fn()}
      onImport={vi.fn()}
      onSave={vi.fn()}
      onSample={vi.fn()}
      run={(task: () => unknown) => task()}
    />
  );
}

it("uses the shared project menu with keyboard navigation, Escape and focus return", async () => {
  showWorkspace();
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", {
    name: `Actions for ${first.title}`,
  });
  trigger.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("menu")).toBeTruthy();
  expect(screen.getByRole("menuitem", { name: "Rename project" })).toBeTruthy();
  await user.keyboard("{ArrowDown}{Escape}");
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it("keeps Home outside the scrolling tabs and reveals an activated document with its full title", async () => {
  await act(async () => {
    await workspace.openDocument(first.id);
    await workspace.openDocument(second.id);
  });
  showWorkspace();
  const firstTab = screen.getByRole("tab", { name: first.title });
  expect(firstTab.querySelector("[title]")?.getAttribute("title")).toBe(
    first.title
  );
  expect(
    screen.getByRole("tab", { name: "Home" }).closest(".document-tab-scroll")
  ).toBeNull();
  expect(firstTab.closest(".document-tab-scroll")).not.toBeNull();
  const user = userEvent.setup();
  await user.click(firstTab);
  await waitFor(() =>
    expect(firstTab.getAttribute("aria-selected")).toBe("true")
  );
  expect(scrollIntoView).toHaveBeenCalledWith({
    block: "nearest",
    inline: "nearest",
  });
  expect(
    firstTab.closest(".desktop-workbench")?.getAttribute("data-platform")
  ).toBe("darwin");
  expect(firstTab.hasAttribute("data-tauri-drag-region")).toBe(false);
});

it("browses personal and team projects without closing local editor tabs", async () => {
  await act(async () => {
    await workspace.openDocument(first.id);
    await workspace.showLibrary();
  });
  const bridge = Object.getOwnPropertyDescriptor(
    window,
    "trackdrawDesktop"
  )!.value;
  const project = {
    id: "cloud-project",
    title: "Team track",
    updatedAt: "2026-11-16T00:00:00Z",
  };
  const team = { id: "club", name: "FPV Club", role: "viewer" };
  const openStudio = vi.fn(async () => {});
  const ownProjectId = "personal-project";
  const readProject = vi.fn(async (id: string, teamId?: string) => ({
    accountId: "pilot",
    team: teamId ? { id: teamId, name: "FPV Club" } : null,
    design: {
      ...createDefaultDesign(id),
      title: teamId ? "Team track" : "My cloud track",
    },
  }));
  const before = bridge.projects.mock.calls.length;
  Object.assign(bridge, {
    account: async () => ({
      status: "connected",
      account: {
        id: "pilot",
        name: "Pilot",
        email: "pilot@example.invalid",
        libraryAccess: true,
        projectAccess: true,
      },
    }),
    library: vi.fn(async (kind) => {
      if (kind === "teams") return { teams: [team] };
      if (kind === "team")
        return { team: { ...team, canEdit: false }, projects: [project] };
      return {
        projects: [
          { ...project, id: "personal-project", title: "My cloud track" },
        ],
      };
    }),
    openStudio,
    project: readProject,
    signOut: async () => ({ status: "signedOut" }),
  });
  try {
    showWorkspace();
    const user = userEvent.setup();
    const profile = await screen.findByRole("button", {
      name: "Account menu for Pilot",
    });
    await user.click(profile);
    expect(screen.getByText("pilot@example.invalid")).toBeTruthy();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Personal projects" }));
    expect(await screen.findByText("My cloud track")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "FPV Club" }));
    expect(await screen.findByText("Viewer · Read-only")).toBeTruthy();
    expect(screen.queryByText("My cloud track")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Team track" }));
    expect(await screen.findByText("Viewer content")).toBeTruthy();
    expect(readProject).toHaveBeenCalledWith("cloud-project", "club");
    expect(openStudio).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: first.title })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "Personal projects" }));
    await user.click(
      await screen.findByRole("button", { name: "Open My cloud track" })
    );
    expect(await screen.findByText("Viewer content")).toBeTruthy();
    expect(readProject).toHaveBeenCalledWith(ownProjectId, undefined);
    expect(
      bridge.projects.mock.calls
        .slice(before)
        .every(
          ([, payload]: [string, { design?: typeof first }?]) =>
            !payload?.design ||
            !["cloud-project", ownProjectId].includes(payload.design.id)
        )
    ).toBe(true);
    await act(async () => {
      await workspace.flushDocuments();
    });
    expect(
      window.localStorage.getItem("trackdraw.desktopWorkspace")
    ).not.toContain("personal-project");
    await user.click(screen.getByRole("tab", { name: "Home" }));
    await user.click(screen.getByRole("button", { name: "On this device" }));
    expect(
      screen.getByRole("button", { name: `Actions for ${first.title}` })
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Account menu for Pilot" })
    );
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: "Team track" })).toBeNull()
    );
    expect(workspace.useWorkspace.getState().openIds).toContain(first.id);
  } finally {
    delete bridge.account;
    delete bridge.library;
    delete bridge.openStudio;
    delete bridge.project;
    delete bridge.signOut;
    workspace.setCloudAccount(null);
  }
});
