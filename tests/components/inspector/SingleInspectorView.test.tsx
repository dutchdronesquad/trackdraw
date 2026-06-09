// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SingleInspectorView } from "@/components/inspector/views/single-shape";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import type { GateShape, Shape, StartFinishShape } from "@/lib/types";

const gate: GateShape = {
  id: "gate-1",
  kind: "gate",
  x: 10,
  y: 8,
  rotation: 0,
  width: 2,
  height: 2,
};

const startPad: StartFinishShape = {
  id: "start-1",
  kind: "startfinish",
  x: 10,
  y: 8,
  rotation: 0,
  width: 3,
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

  it("does not show race timing controls for start pads", () => {
    renderSingleInspector(startPad);

    expect(screen.queryByText("Race timing")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Split" })).toBeNull();
  });

  it("keeps mobile secondary sections collapsed while transform and race timing stay open", () => {
    renderSingleInspector(gate, { mobileInline: true });

    expect(
      screen.getByRole("button", { name: "Transform" }).className
    ).toContain("min-h-9");
    expect(
      screen.getByRole("button", { name: "Transform" }).className
    ).toContain("lg:min-h-6");
    expect(
      screen
        .getByRole("button", { name: "Transform" })
        .getAttribute("aria-expanded")
    ).toBe("true");
    // Race timing stays open on mobile for any shape that supports it,
    // so clearing the role mid-interaction does not collapse the section.
    expect(
      screen
        .getByRole("button", { name: "Race timing" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("keeps grouped shape details collapsed on mobile", () => {
    renderSingleInspector(
      {
        ...gate,
        meta: {
          groupId: "group-a",
          groupName: "Opening section",
        },
      },
      { mobileInline: true }
    );

    expect(
      screen
        .getByRole("button", { name: "Group" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Transform" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("keeps active timing controls open on mobile", () => {
    renderSingleInspector(
      {
        ...gate,
        meta: {
          timing: { role: "start_finish" },
        },
      },
      { mobileInline: true }
    );

    expect(
      screen
        .getByRole("button", { name: "Race timing" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("keeps race timing section open on mobile after clearing the timing role", async () => {
    const shapeWithMarker: GateShape = {
      ...gate,
      meta: { timing: { role: "start_finish" } },
    };
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
      shape: shapeWithMarker,
      ungroupSelection: vi.fn(),
      updatePolylinePoint: vi.fn(),
      updateShape: vi.fn(),
      mobileInline: true,
    };

    const { rerender } = render(<SingleInspectorView {...props} />);

    expect(
      screen
        .getByRole("button", { name: "Race timing" })
        .getAttribute("aria-expanded")
    ).toBe("true");

    // Simulate the store updating after the user sets role to "Off"
    rerender(<SingleInspectorView {...props} shape={gate} />);

    // The section must stay open — closing mid-interaction was the bug
    expect(
      screen
        .getByRole("button", { name: "Race timing" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("explains locked shape interaction limits", () => {
    renderSingleInspector({ ...gate, locked: true });

    expect(screen.getByText("locked")).toBeTruthy();
    expect(
      screen.getByText(
        "Locked on the canvas. Unlock before moving, resizing, or continuing path edits."
      )
    ).toBeTruthy();
  });

  it("hides fixed official gate size and color controls", () => {
    const officialGate = createCatalogShapeDraft(
      MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
      {
        x: 0,
        y: 0,
        includeCatalogMetadata: true,
      }
    ) as GateShape;

    renderSingleInspector(officialGate);

    expect(screen.getByText("MultiGP Standard Gate 5x5")).toBeTruthy();
    expect(screen.queryByText("Color")).toBeNull();
    expect(screen.queryByText(/^Width/)).toBeNull();
    expect(screen.queryByText(/^Height/)).toBeNull();
    expect(screen.queryByText(/^Thickness/)).toBeNull();
  });

  it("keeps frame-only gate size and color controls editable", () => {
    renderSingleInspector(gate);

    expect(screen.getByText("Color")).toBeTruthy();
    expect(screen.getByText(/^Width/)).toBeTruthy();
    expect(screen.getByText(/^Height/)).toBeTruthy();
    expect(screen.getByText(/^Thickness/)).toBeTruthy();
  });
});
