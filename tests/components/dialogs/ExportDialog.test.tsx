// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/dialogs/ExportDialog";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";
import { useEditor } from "@/store/editor";

const mocks = vi.hoisted(() => ({
  downloadJsonFile: vi.fn(),
  exportPdf: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

const viewport = vi.hoisted(() => ({
  isMobile: true,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => viewport.isMobile,
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

vi.mock("@/components/DesktopModal", () => ({
  DesktopModal: ({
    children,
    open,
    title,
  }: {
    children: React.ReactNode;
    open: boolean;
    title: string;
  }) => (open ? <section aria-label={title}>{children}</section> : null),
}));

vi.mock("@/lib/export/download-json", () => ({
  downloadJsonFile: mocks.downloadJsonFile,
}));

vi.mock("@/lib/export/exportPdf", () => ({
  exportPdf: mocks.exportPdf,
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
    viewport.isMobile = true;
    mocks.downloadJsonFile.mockReset();
    mocks.exportPdf.mockReset();
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

  it("exports a desktop JSON project with a sanitized custom filename", async () => {
    viewport.isMobile = false;
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={onOpenChange}
        open
      />
    );

    await user.type(screen.getByPlaceholderText("New Track"), "Race Day #1");
    await user.click(screen.getByRole("button", { name: /Project File/ }));

    await waitFor(() => {
      expect(mocks.downloadJsonFile).toHaveBeenCalledWith(
        "Race_Day_1.json",
        expect.objectContaining({ version: 2 })
      );
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Exported", undefined);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("passes an account-published share URL into desktop Race Pack exports", async () => {
    viewport.isMobile = false;
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const stage = { id: "stage-1" };
    const canvasRef = {
      current: {
        getStage: () => stage,
      } as unknown as TrackCanvasHandle,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === "/api/shares?projectId=project-1") {
          return Response.json({
            ok: true,
            share: {
              shareType: "published",
              token: "published-token",
            },
          });
        }

        throw new Error(`Unexpected request: ${String(input)}`);
      })
    );

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={canvasRef}
        onOpenChange={onOpenChange}
        open
        projectId="project-1"
      />
    );

    await user.click(screen.getByRole("button", { name: /Race Pack/ }));

    await waitFor(() => {
      expect(mocks.exportPdf).toHaveBeenCalledWith(
        stage,
        expect.objectContaining({ version: 2 }),
        "New_Track_race_pack.pdf",
        "dark",
        expect.objectContaining({
          preset: "race-day",
          shareUrl: expect.stringMatching(/\/share\/published-token\?view=2d$/),
        })
      );
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Exported", undefined);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
