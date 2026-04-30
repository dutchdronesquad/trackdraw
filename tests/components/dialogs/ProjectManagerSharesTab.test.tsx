// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/AppTooltip";
import { ProjectManagerSharesTab } from "@/components/dialogs/ProjectManager/SharesTab";
import type { AccountShareItem } from "@/components/editor/useAccountProjectSync";

function createShare(
  overrides: Partial<AccountShareItem> = {}
): AccountShareItem {
  return {
    token: "share-token",
    title: "Race day layout",
    shapeCount: 4,
    createdAt: "2026-04-20T10:00:00.000Z",
    expiresAt: null,
    projectId: "project-1",
    shareType: "published",
    galleryState: "unlisted",
    galleryTitle: null,
    galleryDescription: null,
    ...overrides,
  };
}

describe("ProjectManagerSharesTab", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("announces loading state for published shares", () => {
    render(
      <ProjectManagerSharesTab
        accountProjectTitleById={{}}
        loading
        shares={[]}
      />
    );

    const loadingState = screen.getByRole("status");
    expect(loadingState.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading published shares...")).toBeTruthy();
  });

  it("explains that only account-published shares are managed there", () => {
    render(
      <ProjectManagerSharesTab
        accountProjectTitleById={{}}
        loading={false}
        shares={[]}
      />
    );

    expect(screen.getByText("No active shares")).toBeTruthy();
    expect(
      screen.getByText(
        "Account-published links stay live until revoked. Temporary anonymous links expire automatically and are not managed here."
      )
    ).toBeTruthy();
  });

  it("labels published and temporary share lifetimes clearly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T10:00:00.000Z"));

    render(
      <TooltipProvider>
        <ProjectManagerSharesTab
          accountProjectTitleById={{ "project-1": "Opening round" }}
          loading={false}
          shares={[
            createShare(),
            createShare({
              token: "temporary-token",
              title: "Temporary snapshot",
              expiresAt: "2026-04-27T10:00:00.000Z",
              projectId: null,
              shareType: "temporary",
            }),
          ]}
        />
      </TooltipProvider>
    );

    expect(screen.getByText("Opening round")).toBeTruthy();
    expect(
      screen.getByText("4 items · read-only published link, live until revoked")
    ).toBeTruthy();
    expect(screen.getByText("Temporary snapshot")).toBeTruthy();
    expect(
      screen.getByText("4 items · read-only temporary link, 7 days left")
    ).toBeTruthy();
  });

  it("keeps share actions accessible and visible on touch layouts", () => {
    render(
      <TooltipProvider>
        <ProjectManagerSharesTab
          accountProjectTitleById={{}}
          loading={false}
          onRevoke={vi.fn()}
          shares={[createShare()]}
        />
      </TooltipProvider>
    );

    for (const buttonName of [
      "Copy share link",
      "Open share link",
      "Revoke share link",
    ]) {
      const button = screen.getByRole("button", { name: buttonName });
      expect(button.className).toContain("opacity-100");
      expect(button.className).toContain("md:opacity-0");
      expect(button.className).toContain("md:group-hover:opacity-100");
    }
  });
});
