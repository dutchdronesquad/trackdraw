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
  exportFlythrough: vi.fn(),
  exportPdf: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
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

vi.mock("@/lib/export/exportFlythrough", () => ({
  exportFlythrough: mocks.exportFlythrough,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

describe("ExportDialog mobile workflow", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    viewport.isMobile = true;
    mocks.downloadJsonFile.mockReset();
    mocks.exportFlythrough.mockReset();
    mocks.exportPdf.mockReset();
    mocks.toastError.mockReset();
    mocks.toastLoading.mockReset();
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

    await user.click(screen.getByRole("button", { name: /3D Render/ }));

    const switchTo3D = (await screen.findByRole("button", {
      name: "Switch to 3D view",
    })) as HTMLButtonElement;

    expect(switchTo3D.disabled).toBe(false);

    await user.click(switchTo3D);

    expect(onRequest3DView).toHaveBeenCalledOnce();
  });

  it("labels mobile export rows by their action", async () => {
    const user = userEvent.setup();

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(screen.getByRole("button", { name: "Export Image" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Vector/ }));
    expect(
      await screen.findByRole("button", { name: "Export Vector" })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Race Day$/ }));

    expect(
      await screen.findByRole("button", { name: "Export Race Pack" })
    ).toBeTruthy();
    expect(screen.getByText("Route numbers")).toBeTruthy();
  });

  it("uses sidebar navigation to select export-specific settings", async () => {
    const user = userEvent.setup();

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        open
      />
    );

    expect(screen.getByRole("button", { name: /^Visuals$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Race Day$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Project Data$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Video$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Experimental$/ })).toBeTruthy();
    expect(
      screen.getAllByText(
        "High-res 2D map for print, slides, chat, or quick review."
      ).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Race Day$/ }));

    expect(
      (
        await screen.findAllByText(
          "Race-day setup handoff with map, materials, sequence, and QR."
        )
      ).length
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^Project Data$/ }));

    expect(
      (
        await screen.findAllByText(
          "Editable backup for reopening, sharing, or archiving in TrackDraw."
        )
      ).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("Theme")).toBeNull();
    expect(screen.queryByText("Route numbers")).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Video$/ }));

    expect(
      (
        await screen.findAllByText(
          "One-loop route video for reviewing the flow or sharing the lap."
        )
      ).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.queryByText("Route numbers")).toBeNull();
    expect(
      screen.queryByText(
        "Experimental Velocidrone track file for testing in the simulator; check the layout after import."
      )
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Experimental$/ }));

    expect(
      (
        await screen.findAllByText(
          "Experimental Velocidrone track file for testing in the simulator; check the layout after import."
        )
      ).length
    ).toBeGreaterThan(0);
  });

  it("includes the selected theme in default WebM filenames", async () => {
    const user = userEvent.setup();

    render(
      <ExportDialog
        activeTab="3d"
        canvasRef={React.createRef()}
        onOpenChange={vi.fn()}
        open
      />
    );

    await user.click(screen.getByRole("button", { name: /^Video$/ }));
    await user.click(await screen.findByRole("button", { name: "Light" }));
    await user.click(
      await screen.findByRole("button", { name: "Export Cinematic FPV" })
    );

    await waitFor(() => {
      expect(mocks.exportFlythrough).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2 }),
        expect.stringMatching(
          /^New_Track_flythrough_light_\d{4}-\d{2}-\d{2}\.webm$/
        ),
        "light",
        expect.any(Function)
      );
    });
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

    await user.click(screen.getByRole("button", { name: /^Project Data$/ }));
    await user.click(
      await screen.findByRole("button", { name: "Export Project File" })
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Export failed: JSON payload could not be serialized"
      );
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("exports a desktop JSON project with a sanitized project filename", async () => {
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

    await user.click(screen.getByRole("button", { name: /^Project Data$/ }));
    await user.click(
      await screen.findByRole("button", { name: "Export Project File" })
    );

    await waitFor(() => {
      expect(mocks.downloadJsonFile).toHaveBeenCalledWith(
        expect.stringMatching(/^New_Track_\d{4}-\d{2}-\d{2}\.json$/),
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

    await user.click(screen.getByRole("button", { name: /^Race Day$/ }));
    await user.click(
      await screen.findByRole("button", { name: "Export Race Pack" })
    );

    await waitFor(() => {
      expect(mocks.exportPdf).toHaveBeenCalledWith(
        stage,
        expect.objectContaining({ version: 2 }),
        expect.stringMatching(
          /^New_Track_race_pack_dark_\d{4}-\d{2}-\d{2}\.pdf$/
        ),
        "dark",
        expect.objectContaining({
          t: expect.any(Function),
          tSetup: expect.any(Function),
          tShapes: expect.any(Function),
        }),
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
