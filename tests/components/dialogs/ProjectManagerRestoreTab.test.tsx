// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectManagerRestoreTab } from "@/components/dialogs/ProjectManager/RestoreTab";
import type { RestorePointMeta } from "@/lib/projects";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const restorePoint: RestorePointMeta = {
  id: "restore-1",
  designId: "design-1",
  designTitle: "Race day layout",
  savedAt: "2026-04-20T10:00:00.000Z",
  shapeCount: 4,
};

describe("ProjectManagerRestoreTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("labels restore point actions and confirms restore before closing", async () => {
    const user = userEvent.setup();
    const onRestorePoint = vi.fn();
    const onDeleteRestorePoint = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <ProjectManagerRestoreTab
        onDeleteRestorePoint={onDeleteRestorePoint}
        onOpenChange={onOpenChange}
        onRestorePoint={onRestorePoint}
        restorePoints={[restorePoint]}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Restore Race day layout" })
    );
    expect(screen.getByText("Restore this snapshot?")).toBeTruthy();
    expect(onRestorePoint).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(onRestorePoint).toHaveBeenCalledWith("restore-1");
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(
      screen.getByRole("button", { name: "Delete Race day layout" })
    );
    expect(onDeleteRestorePoint).toHaveBeenCalledWith("restore-1");
  });
});
