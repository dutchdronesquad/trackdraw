import { describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import {
  hasLockedSelection,
  showLockedSelectionActionBlockedToast,
} from "@/components/canvas/editor/useTrackCanvasShortcuts";
import type { Shape } from "@/lib/types";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

const shapeById: Record<string, Shape> = {
  "gate-1": {
    id: "gate-1",
    kind: "gate",
    x: 10,
    y: 8,
    rotation: 0,
    width: 2,
    height: 2,
  },
  "gate-2": {
    id: "gate-2",
    kind: "gate",
    x: 14,
    y: 8,
    rotation: 0,
    width: 2,
    height: 2,
    locked: true,
  },
};

describe("useTrackCanvasShortcuts locked selection feedback", () => {
  it("detects locked shapes in expanded selections", () => {
    expect(hasLockedSelection(["gate-1"], shapeById)).toBe(false);
    expect(hasLockedSelection(["gate-1", "gate-2"], shapeById)).toBe(true);
  });

  it("shows a concise delete warning for locked selections", () => {
    showLockedSelectionActionBlockedToast("delete");

    expect(toast.error).toHaveBeenCalledWith(
      "Unlock selection before deleting.",
      {
        description: "This selection includes locked items.",
        id: "locked-selection-delete",
      }
    );
  });
});
