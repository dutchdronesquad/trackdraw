// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FeedbackDialog from "@/components/dialogs/FeedbackDialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/share/secret-share-token",
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("FeedbackDialog", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("previews and opens a user-reviewed public GitHub issue", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Report a problem/ }));
    await user.type(screen.getByLabelText("Short title"), "Gate will not move");
    await user.type(
      screen.getByLabelText("Details"),
      "Dragging the selected gate does nothing."
    );
    await user.type(
      screen.getByLabelText("Steps to reproduce (optional)"),
      "Select a gate and drag it."
    );

    const preview = screen.getByText(/## Problem/, { selector: "pre" });
    expect(preview.textContent).toContain("- Surface: share");
    expect(preview.textContent).not.toContain("secret-share-token");

    await user.click(
      screen.getByRole("checkbox", {
        name: /Include coarse product context/,
      })
    );
    expect(preview.textContent).not.toContain("TrackDraw context");

    await user.click(screen.getByRole("button", { name: "Review on GitHub" }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const openedUrl = new URL(
      vi.mocked(window.open).mock.calls[0]?.[0] as string
    );
    expect(openedUrl.hostname).toBe("github.com");
    expect(openedUrl.searchParams.get("title")).toBe("Gate will not move");
    expect(openedUrl.searchParams.get("body")).not.toContain(
      "TrackDraw context"
    );
  });
});
