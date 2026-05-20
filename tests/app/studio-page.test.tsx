// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudioPage from "@/app/studio/page";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockEditorShell({
      initialTab,
      seedToken,
    }: {
      initialTab?: string;
      seedToken?: string;
    }) {
      return (
        <div
          data-initial-tab={initialTab}
          data-seed-token={seedToken}
          data-testid="studio-editor-shell"
        />
      );
    },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=shared-seed&view=3d"),
}));

describe("StudioPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens the editor with share seed and view parameters from /studio", () => {
    render(<StudioPage />);

    const shell = screen.getByTestId("studio-editor-shell");
    expect(shell.getAttribute("data-seed-token")).toBe("shared-seed");
    expect(shell.getAttribute("data-initial-tab")).toBe("3d");
  });
});
