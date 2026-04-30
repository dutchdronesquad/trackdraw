// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectManagerAccountTab } from "@/components/dialogs/ProjectManager/AccountTab";
import type { ProjectSyncMeta } from "@/components/editor/useAccountProjectSync";

const project = {
  id: "project-1",
  title: "Race day layout",
  updatedAt: "2026-04-20T10:30:00.000Z",
  shapeCount: 4,
};

function renderAccountTab(syncMeta: ProjectSyncMeta) {
  return render(
    <ProjectManagerAccountTab
      accountProjects={[project]}
      activeDesignId={project.id}
      error={null}
      loading={false}
      onOpenChange={vi.fn()}
      onSyncProject={vi.fn()}
      projectSyncMetaById={{ [project.id]: syncMeta }}
    />
  );
}

describe("ProjectManagerAccountTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("labels pending and failed account sync actions", () => {
    const { rerender } = renderAccountTab({ status: "pending" });

    expect(
      screen.getByRole("button", {
        name: "Sync pending changes for Race day layout",
      })
    ).toBeTruthy();

    rerender(
      <ProjectManagerAccountTab
        accountProjects={[project]}
        activeDesignId={project.id}
        error={null}
        loading={false}
        onOpenChange={vi.fn()}
        onSyncProject={vi.fn()}
        projectSyncMetaById={{ [project.id]: { status: "failed" } }}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "Retry sync for Race day layout",
      })
    ).toBeTruthy();
  });

  it("labels conflict actions without triggering direct sync", async () => {
    const user = userEvent.setup();
    const onSyncProject = vi.fn();

    render(
      <ProjectManagerAccountTab
        accountProjects={[project]}
        activeDesignId={project.id}
        error={null}
        loading={false}
        onOpenChange={vi.fn()}
        onSyncProject={onSyncProject}
        projectSyncMetaById={{ [project.id]: { status: "conflict" } }}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: "Resolve version conflict for Race day layout",
      })
    );

    expect(onSyncProject).not.toHaveBeenCalled();
  });
});
