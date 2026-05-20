// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/AppTooltip";
import { ProjectManagerDeviceTab } from "@/components/dialogs/ProjectManager/DeviceTab";
import type { ProjectMeta } from "@/lib/projects";

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mobileState.isMobile,
}));

const project: ProjectMeta = {
  id: "project-1",
  title: "Race day layout",
  createdAt: "2026-04-20T10:00:00.000Z",
  updatedAt: "2026-04-20T10:30:00.000Z",
  shapeCount: 4,
};

const localOnlyProject: ProjectMeta = {
  id: "local-1",
  title: "Practice draft",
  createdAt: "2026-04-19T10:00:00.000Z",
  updatedAt: "2026-04-19T10:30:00.000Z",
  shapeCount: 2,
};

type DeviceTabProps = React.ComponentProps<typeof ProjectManagerDeviceTab>;

function renderDeviceTab(
  options: {
    projectSyncMetaById?: DeviceTabProps["projectSyncMetaById"];
    projects?: ProjectMeta[];
    accountProjects?: DeviceTabProps["accountProjects"];
  } = {}
) {
  return render(
    <TooltipProvider>
      <ProjectManagerDeviceTab
        accountProjects={options.accountProjects ?? []}
        onDeleteProject={vi.fn()}
        onExportProject={vi.fn()}
        onOpenChange={vi.fn()}
        onRenameProject={vi.fn()}
        onSyncProject={vi.fn()}
        projectSyncMetaById={options.projectSyncMetaById ?? {}}
        projects={options.projects ?? [project]}
      />
    </TooltipProvider>
  );
}

describe("ProjectManagerDeviceTab", () => {
  afterEach(() => {
    mobileState.isMobile = false;
  });

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

  it("clarifies that desktop delete removes the local copy", async () => {
    const user = userEvent.setup();
    renderDeviceTab();

    await user.click(
      screen.getByRole("button", { name: "Delete Race day layout" })
    );

    expect(screen.getByText("Delete local project?")).toBeTruthy();
    expect(screen.getByText("Removes this local copy.")).toBeTruthy();
  });

  it("shows local fallback status after failed account sync", () => {
    renderDeviceTab({
      projectSyncMetaById: {
        [project.id]: {
          status: "failed",
          error: "Network unavailable",
          fallbackSavedAt: "2026-04-20T10:35:00.000Z",
        },
      },
    });

    expect(screen.getByText(/Latest local copy saved/)).toBeTruthy();
    expect(screen.queryByText("Network unavailable")).toBeNull();
  });

  it("separates account-linked local copies from device-only projects", () => {
    renderDeviceTab({
      projects: [project, localOnlyProject],
      accountProjects: [
        {
          id: project.id,
          title: project.title,
          updatedAt: project.updatedAt,
          shapeCount: project.shapeCount,
        },
      ],
      projectSyncMetaById: {
        [project.id]: {
          status: "synced",
          lastSyncedAt: "2026-04-20T10:30:00.000Z",
        },
      },
    });

    expect(screen.getByText("Local copies linked to account")).toBeTruthy();
    expect(screen.getByText("Only on this device")).toBeTruthy();
    expect(screen.getByText(/local copy synced/)).toBeTruthy();
    expect(screen.getByText(/only on this device/)).toBeTruthy();
  });

  it("uses larger mobile project action targets", async () => {
    mobileState.isMobile = true;
    const user = userEvent.setup();

    renderDeviceTab();

    const manageButton = screen.getByRole("button", {
      name: "Manage Race day layout",
    });
    expect(manageButton.className).toContain("size-10");

    await user.click(manageButton);

    for (const label of [
      /^Sync to account/,
      /^Export JSON/,
      /^Rename/,
      /^Delete/,
    ]) {
      expect(screen.getByRole("button", { name: label }).className).toContain(
        "min-h-16"
      );
    }
  });
});
