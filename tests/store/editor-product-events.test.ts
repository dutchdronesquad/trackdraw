import { beforeEach, describe, expect, it, vi } from "vitest";
import { gateDraft, resetEditorStore } from "../helpers/editor-store";

const trackProductEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/product-events", () => ({
  trackProductEvent,
}));

import { useEditor } from "@/store/editor";

describe("editor product events", () => {
  beforeEach(() => {
    trackProductEvent.mockClear();
    resetEditorStore();
  });

  it("deduplicates meaningful edits per session, project and edit type", () => {
    const projectId = useEditor.getState().track.design.id;

    useEditor.getState().addShape(gateDraft());

    expect(trackProductEvent).toHaveBeenCalledWith(
      "editor.meaningful_edit_completed",
      {
        projectId,
        properties: { edit_type: "place" },
      },
      {
        oncePerSession: `meaningful-edit:${projectId}:place`,
      }
    );
  });
});
