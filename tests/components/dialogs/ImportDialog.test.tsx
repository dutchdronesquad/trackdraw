// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import ImportDialog from "@/components/dialogs/ImportDialog";
import { createDefaultDesign, serializeDesign } from "@/lib/track/design";

const mocks = vi.hoisted(() => ({
  replaceDesign: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/store/actions", () => ({
  useTrackActions: () => ({
    replaceDesign: mocks.replaceDesign,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

function renderImportDialog() {
  const utils = render(<ImportDialog onOpenChange={vi.fn()} open />);
  const input = utils.container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  return { ...utils, input };
}

describe("ImportDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a recoverable error for invalid JSON", async () => {
    const user = userEvent.setup();
    const { input } = renderImportDialog();

    await user.upload(
      input,
      new File(["{"], "broken.json", { type: "application/json" })
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Invalid JSON file."
    );
    expect(toast.error).toHaveBeenCalledWith(
      "Import failed",
      expect.objectContaining({
        description:
          "TrackDraw could not read this JSON file. Check the file and try again.",
      })
    );
  });

  it("rejects non-JSON files with a clear import failure", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { input } = renderImportDialog();

    await user.upload(
      input,
      new File(["TrackDraw"], "track.txt", { type: "text/plain" })
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Only TrackDraw JSON project files are supported."
    );
    expect(toast.error).toHaveBeenCalledWith(
      "Import failed",
      expect.objectContaining({
        description: "Choose a .json file exported from TrackDraw.",
      })
    );
  });

  it("keeps the preview confirmation step for valid project files", async () => {
    const user = userEvent.setup();
    const onBeforeConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const design = createDefaultDesign();
    design.title = "Race day layout";

    const utils = render(
      <ImportDialog
        onBeforeConfirm={onBeforeConfirm}
        onOpenChange={onOpenChange}
        open
      />
    );
    const input = utils.container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(
      input,
      new File([JSON.stringify(serializeDesign(design))], "track.json", {
        type: "application/json",
      })
    );

    expect(screen.getByText("Race day layout")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Replace project" }));

    expect(onBeforeConfirm).toHaveBeenCalledOnce();
    expect(mocks.replaceDesign).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Race day layout" })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
