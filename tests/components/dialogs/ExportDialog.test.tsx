// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/dialogs/ExportDialog";
import { useEditor } from "@/store/editor";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

vi.mock("@/components/MobileDrawer", () => ({
  MobileDrawer: ({
    children,
    open,
    pinnedContent,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    pinnedContent?: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <section aria-label={title}>
        {pinnedContent}
        {children}
      </section>
    ) : null,
}));

describe("ExportDialog mobile workflow", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lets the locked 3D export row switch to the 3D view on mobile", async () => {
    const user = userEvent.setup();
    const onRequest3DView = vi.fn();

    render(
      <ExportDialog
        activeTab="2d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        onRequest3DView={onRequest3DView}
        open
      />
    );

    const switchTo3D = screen.getByRole("button", {
      name: "Switch to 3D view",
    }) as HTMLButtonElement;

    expect(switchTo3D.disabled).toBe(false);

    await user.click(switchTo3D);

    expect(onRequest3DView).toHaveBeenCalledOnce();
  });

  it("labels mobile export rows by their action", () => {
    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(screen.getByRole("button", { name: "Export Image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export Vector" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Export Race Pack" })
    ).toBeTruthy();
  });
});
