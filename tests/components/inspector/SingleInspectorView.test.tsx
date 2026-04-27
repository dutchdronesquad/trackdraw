// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SingleInspectorView } from "@/components/inspector/views/single";
import type { GateShape, Shape } from "@/lib/types";

const gate: GateShape = {
  id: "gate-1",
  kind: "gate",
  x: 10,
  y: 8,
  rotation: 0,
  width: 2,
  height: 2,
};

function renderSingleInspector(
  shape: Shape = gate,
  overrides: Partial<React.ComponentProps<typeof SingleInspectorView>> = {}
) {
  const props: React.ComponentProps<typeof SingleInspectorView> = {
    appendPolylinePoint: vi.fn(),
    closePolyline: vi.fn(),
    duplicateShapes: vi.fn(),
    insertPolylinePoint: vi.fn(),
    removePolylinePoint: vi.fn(),
    removeShapes: vi.fn(),
    reversePolylinePoints: vi.fn(),
    setGroupName: vi.fn(),
    setHoveredWaypoint: vi.fn(),
    setSelection: vi.fn(),
    setShapesLocked: vi.fn(),
    shape,
    ungroupSelection: vi.fn(),
    updatePolylinePoint: vi.fn(),
    updateShape: vi.fn(),
    ...overrides,
  };

  render(<SingleInspectorView {...props} />);
  return props;
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "getAnimations", {
    configurable: true,
    value: vi.fn(() => []),
  });
});

describe("SingleInspectorView race timing controls", () => {
  afterEach(() => {
    cleanup();
  });

  it("uses a segmented role picker for timing point assignment", async () => {
    const user = userEvent.setup();
    const updateShape = vi.fn();

    renderSingleInspector(gate, { updateShape });

    await user.click(screen.getByRole("button", { name: "Split" }));

    expect(updateShape).toHaveBeenCalledWith("gate-1", {
      meta: { timing: { role: "split" } },
    });
  });

  it("keeps the split timing id field hidden for start finish markers", () => {
    renderSingleInspector({
      ...gate,
      meta: {
        timing: { role: "start_finish" },
      },
    });

    expect(
      screen.getByRole("button", { name: "Start" }).getAttribute("aria-pressed")
    ).toBe("true");
    expect(screen.queryByPlaceholderText("split-1")).toBeNull();
    expect(screen.getByText("timing: start")).toBeTruthy();
  });
});
