// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/dialogs/ExportDialog";
import { useEditor } from "@/store/editor";

const mocks = vi.hoisted(() => ({
  downloadJsonFile: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

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

vi.mock("@/lib/export/download-json", () => ({
  downloadJsonFile: mocks.downloadJsonFile,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

describe("ExportDialog mobile workflow", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    mocks.downloadJsonFile.mockReset();
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
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
    expect(screen.getByText("Route numbers")).toBeTruthy();
  });

  it("clarifies mobile export purpose and limitations", () => {
    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(
      screen.getByText("High-res 2D map for print, chat, or review.")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Editable backup for reopening or archiving in TrackDraw."
      )
    ).toBeTruthy();
    expect(
      screen.getByText("Setup PDF with map, materials, sequence, and QR.")
    ).toBeTruthy();
    expect(
      screen.getByText("Experimental file for testing; check after import.")
    ).toBeTruthy();
  });

  it("reports JSON export failures without closing the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mocks.downloadJsonFile.mockImplementation(() => {
      throw new Error("JSON payload could not be serialized");
    });

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={onOpenChange}
        open
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Export Project File" })
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Export failed: JSON payload could not be serialized"
      );
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
