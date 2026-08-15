// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

    await user.type(screen.getByLabelText("Short title"), "Gate will not move");
    await user.type(
      screen.getByLabelText("Details"),
      "Dragging the selected gate does nothing."
    );
    await user.click(
      screen.getByRole("button", { name: "Add reproduction steps" })
    );
    await user.type(
      screen.getByLabelText("Steps to reproduce (optional)"),
      "Select a gate and drag it."
    );
    await user.click(
      screen.getByRole("button", { name: "Preview GitHub report" })
    );

    const preview = screen.getByText(/## Problem/, { selector: "pre" });
    expect(preview.textContent).toContain("- Surface: share");
    expect(preview.textContent).not.toContain("secret-share-token");

    await user.click(
      screen.getByRole("switch", {
        name: "Include app context",
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

  it("starts with a compact problem form and preserves input across categories", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText("Short title"));
    });

    expect(
      (screen.getByRole("radio", { name: "Problem" }) as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: "Choose another route" })
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Hide GitHub report preview" })
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Preview GitHub report" })
    );
    expect(
      screen.getByText("Add a title and details to prepare the report.", {
        selector: "pre",
      })
    ).toBeTruthy();

    await user.type(screen.getByLabelText("Short title"), "Faster export");
    await user.click(screen.getByRole("radio", { name: "Idea" }));

    expect(screen.getByLabelText("Short title").getAttribute("value")).toBe(
      "Faster export"
    );
    expect(
      screen.queryByRole("button", { name: "Add reproduction steps" })
    ).toBeNull();
  });

  it("keeps report actions disabled until title and details are present", async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Question" }));

    const copyButton = screen.getByRole("button", { name: "Copy" });
    const githubButton = screen.getByRole("button", {
      name: "Review on GitHub",
    });

    expect(copyButton.hasAttribute("disabled")).toBe(true);
    expect(githubButton.hasAttribute("disabled")).toBe(true);
    expect(screen.queryByLabelText("Steps to reproduce (optional)")).toBeNull();

    await user.type(screen.getByLabelText("Short title"), "How do I export?");
    expect(githubButton.hasAttribute("disabled")).toBe(true);

    await user.type(screen.getByLabelText("Details"), "I cannot find PDF.");
    expect(copyButton.hasAttribute("disabled")).toBe(false);
    expect(githubButton.hasAttribute("disabled")).toBe(false);
  });

  it("announces copy success", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Short title"), "Export issue");
    await user.type(screen.getByLabelText("Details"), "PDF export is empty.");
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Report copied.");
  });

  it("opens the preview and announces a clipboard failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("Clipboard denied")
    );
    render(<FeedbackDialog open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Short title"), "Export issue");
    await user.type(screen.getByLabelText("Details"), "PDF export is empty.");
    await user.click(screen.getByRole("button", { name: "Copy" }));

    expect(screen.getByText(/## Problem/, { selector: "pre" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Could not copy. The preview is open so you can copy it manually."
    );
  });
});
