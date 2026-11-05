// @vitest-environment happy-dom
import React, { type ReactNode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

vi.mock("@/components/editor/EditorShell", () => ({
  default: () => <div>Editor content</div>,
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
              designs: state.designs.map((d) =>
                d.id === payload.design.id ? payload.design : d
              ),
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
