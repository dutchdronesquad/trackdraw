// @vitest-environment happy-dom
import React from "react";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import ExportDialog from "@/components/dialogs/ExportDialog";
import ImportDialog from "@/components/dialogs/ImportDialog";
import {
  createImportedProjectCopy,
  parseProjectFile,
} from "@/lib/track/project-file";
import { serializeDesign } from "@/lib/track/design";
import { createEditorStore, useEditor } from "@/store/editor";
import { loadProject, saveProject } from "@/lib/projects";
import { createMemoryStorage } from "../helpers/storage";
import fixture from "../fixtures/json-roundtrip.json";
import { openRepository } from "../../experiments/electron-desktop/repository.cjs";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/DesktopModal", () => ({
  DesktopModal: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <section>{children}</section> : null),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("preserves the complete browser export through desktop save/restart/edit/export and browser reimport", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "trackdraw-json-"));
  const database = path.join(directory, "projects.sqlite");
  let repository = openRepository(database);
  try {
    vi.stubGlobal("localStorage", createMemoryStorage());
    const user = userEvent.setup();
    const original = parseProjectFile(fixture)!;
    useEditor.getState().replaceDesign(original);
    saveProject(original);
    let download: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      download = blob as Blob;
      return "blob:roundtrip";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <ExportDialog open onOpenChange={vi.fn()} canvasRef={React.createRef()} />
    );
    await user.click(screen.getByRole("button", { name: "Project Data" }));
    await user.click(
      await screen.findByRole("button", {
        name: "Export Project File",
      })
    );
    await waitFor(() => expect(download).toBeDefined());
    const browserExport = JSON.parse(await download!.text());
    expect(browserExport).toEqual(fixture);
    cleanup();
    const outgoing = path.join(directory, "from-browser.json");
    writeFileSync(outgoing, JSON.stringify(browserExport));
    const desktopCopy = createImportedProjectCopy(
      parseProjectFile(JSON.parse(readFileSync(outgoing, "utf8")))!
    );
    const desktop = createEditorStore();
    desktop.getState().replaceDesign(desktopCopy);
    const expectedCopy = {
      ...fixture,
      id: desktopCopy.id,
      createdAt: desktopCopy.createdAt,
      updatedAt: desktopCopy.updatedAt,
    };
    repository.command("save", {
      design: serializeDesign(desktop.getState().track.design),
      restore: true,
    });
    repository.close();
    repository = openRepository(database);
    expect(repository.command("state").draft).toEqual(expectedCopy);
    desktop
      .getState()
      .replaceDesign(parseProjectFile(repository.command("state").draft)!);
    const gateId = fixture.shapes[0].id;
    desktop.getState().updateShape(gateId, { x: 12.875, rotation: 123.125 });
    const edited = serializeDesign(desktop.getState().track.design);
    expect(edited).toEqual({
      ...expectedCopy,
      updatedAt: edited.updatedAt,
      shapes: expectedCopy.shapes.map((shape) =>
        shape.id === gateId ? { ...shape, x: 12.875, rotation: 123.125 } : shape
      ),
    });
    repository.command("save", { design: edited, restore: true });
    repository.close();
    repository = openRepository(database);
    const returned = path.join(directory, "from-desktop.json");
    writeFileSync(returned, JSON.stringify(repository.command("state").draft));
    const view = render(
      <ImportDialog
        open
        onOpenChange={vi.fn()}
        onBeforeConfirm={() => {
          saveProject(useEditor.getState().track.design);
        }}
      />
    );
    const input = view.container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(
      input,
      new File([readFileSync(returned, "utf8")], "from-desktop.json", {
        type: "application/json",
      })
    );
    await user.click(screen.getByRole("button", { name: "Replace project" }));
    expect(serializeDesign(useEditor.getState().track.design)).toEqual(edited);
    expect(serializeDesign(loadProject(fixture.id)!)).toEqual(fixture);
    saveProject(useEditor.getState().track.design);
    expect(serializeDesign(loadProject(edited.id)!)).toEqual(edited);
  } finally {
    repository.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
