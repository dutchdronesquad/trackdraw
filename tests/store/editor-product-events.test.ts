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

  it("counts bulk insertions by kind without treating undo and redo as new placements", () => {
    useEditor
      .getState()
      .addShapes(Array.from({ length: 501 }, () => gateDraft()));
    const placements = () =>
      trackProductEvent.mock.calls.filter(
        ([event]) => event === "editor.element_placed"
      );
    expect(placements().map(([, context]) => context.properties.count)).toEqual(
      [500, 1]
    );
    useEditor.temporal.getState().undo();
    useEditor.temporal.getState().redo();
    expect(placements()).toHaveLength(2);
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
