// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareViewer from "@/app/share/ShareViewer";
import { createDefaultDesign } from "@/lib/track/design";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockEditorShell({
      existingShareMode,
      initialTab,
      studioHref,
      title,
    }: {
      existingShareMode?: boolean;
      initialTab?: string;
      studioHref?: string;
      title?: string;
    }) {
      return (
        <div
          data-existing-share-mode={existingShareMode ? "true" : "false"}
          data-initial-tab={initialTab}
          data-studio-href={studioHref}
          data-title={title}
          data-testid="editor-shell"
        />
      );
    },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/share/share-token",
  useSearchParams: () => new URLSearchParams("view=3d"),
}));

describe("ShareViewer", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens stored shares in read-only mode with an editable Studio copy link", () => {
    const design = createDefaultDesign();
    design.title = "Race day handoff";
    design.authorName = "Pilot";

    render(
      <ShareViewer
        design={design}
        initialTab="2d"
        studioSeedToken="seed-token"
      />
    );

    const shell = screen.getByTestId("editor-shell");
    expect(shell.getAttribute("data-existing-share-mode")).toBe("true");
    expect(shell.getAttribute("data-initial-tab")).toBe("2d");
    expect(shell.getAttribute("data-studio-href")).toBe(
      "/studio?token=seed-token&view=3d"
    );
    expect(shell.getAttribute("data-title")).toBe("Race day handoff");
    expect(screen.getByText("Race day handoff")).toBeTruthy();
    expect(
      screen.getByText(
        "Shared by Pilot. Read-only, no edits are saved. Switch to 2D or make your own editable copy in Studio."
      )
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open 2D" }).getAttribute("href")
    ).toBe("/share/share-token?view=2d");
    expect(
      screen
        .getByRole("link", { name: /Make editable copy/ })
        .getAttribute("href")
    ).toBe("/studio?token=seed-token&view=3d");
  });

  it("removes the shared track intro when dismissed", async () => {
    const user = userEvent.setup();
    const design = createDefaultDesign();
    design.title = "Race day handoff";

    render(
      <ShareViewer
        design={design}
        initialTab="2d"
        studioSeedToken="seed-token"
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Dismiss shared track intro" })
    );

    expect(
      screen.queryByRole("button", { name: "Dismiss shared track intro" })
    ).toBeNull();
    expect(
      screen.queryByText(
        "Read-only, no edits are saved. Switch to 3D or make your own editable copy in Studio."
      )
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Open 2D" })).toBeNull();
  });
});
