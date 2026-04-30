// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/AppTooltip";
import { ProjectManagerDeviceTab } from "@/components/dialogs/ProjectManager/DeviceTab";
import type { ProjectMeta } from "@/lib/projects";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const project: ProjectMeta = {
  id: "project-1",
  title: "Race day layout",
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:30:00.000Z",
  shapeCount: 4,
};

function renderDeviceTab() {
  return render(
    <TooltipProvider>
      <ProjectManagerDeviceTab
        accountProjects={[]}
        onDeleteProject={vi.fn()}
        onExportProject={vi.fn()}
        onOpenChange={vi.fn()}
        onRenameProject={vi.fn()}
        onSyncProject={vi.fn()}
        projectSyncMetaById={{}}
        projects={[project]}
      />
    </TooltipProvider>
  );
}

describe("ProjectManagerDeviceTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps desktop project actions labelled and visible when keyboard-focused", () => {
    renderDeviceTab();

    for (const buttonName of [
      "Sync Race day layout to account",
      "Export Race day layout as JSON",
      "Rename Race day layout",
      "Delete Race day layout",
    ]) {
      const button = screen.getByRole("button", { name: buttonName });
      expect(button.className).toContain("opacity-0");
      expect(button.className).toContain("group-hover:opacity-100");
      expect(button.className).toContain("focus-visible:opacity-100");
    }
  });

  it("clarifies that desktop delete removes the local browser copy", async () => {
    const user = userEvent.setup();
    renderDeviceTab();

    await user.click(
      screen.getByRole("button", { name: "Delete Race day layout" })
    );

    expect(screen.getByText("Delete local project?")).toBeTruthy();
    expect(screen.getByText("Removes this browser copy.")).toBeTruthy();
  });
});
