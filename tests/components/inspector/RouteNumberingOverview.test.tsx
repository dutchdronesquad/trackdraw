// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectLayoutInspectorView } from "@/components/inspector/views/project-layout";
import { createDefaultDesign } from "@/lib/track/design";
import type {
  PolylineShape,
  Shape,
  ShapeDraft,
  TrackDesign,
} from "@/lib/types";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/components/inspector/ElevationChart", () => ({
  default: () => <div data-testid="elevation-chart" />,
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

function gate(
  id: string,
  x: number,
  y: number
): Extract<Shape, { kind: "gate" }> {
  return { id, kind: "gate", x, y, rotation: 0, width: 2, height: 2 };
}

function designWithGates(gates: Shape[]): TrackDesign {
  return {
    ...createDefaultDesign(),
    shapeOrder: gates.map((shape) => shape.id),
    shapeById: Object.fromEntries(gates.map((shape) => [shape.id, shape])),
  };
}

function renderProjectLayoutInspector(
  design: TrackDesign,
  shapes: Shape[],
  overrides: {
    addShape?: (draft: ShapeDraft<PolylineShape>) => string;
    removeShapes?: (ids: string[]) => void;
    setSelection?: (ids: string[]) => void;
  } = {}
) {
  render(
    <ProjectLayoutInspectorView
      addShape={overrides.addShape ?? vi.fn()}
      clearMapReference={vi.fn()}
      design={design}
      mobileInline
      panel="layout"
      removeShapes={overrides.removeShapes ?? vi.fn()}
      reorderShapes={vi.fn()}
      setHoveredShapeId={vi.fn()}
      setMapReference={vi.fn()}
      setMapReferenceOpacity={vi.fn()}
      setMapReferenceRotation={vi.fn()}
      setMapReferenceVisibility={vi.fn()}
      setSelection={overrides.setSelection ?? vi.fn()}
      shapes={shapes}
      updateDesignMeta={vi.fn()}
      updateField={vi.fn()}
    />
  );
}

describe("RouteNumberingOverview generate race line action", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })
    );
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("generates and selects a race line from placed obstacles", async () => {
    const user = userEvent.setup();
    const gates = [gate("gate-1", 0, 0), gate("gate-2", 10, 0)];
    const design = designWithGates(gates);
    const addShape = vi.fn().mockReturnValue("new-polyline-id");
    const setSelection = vi.fn();

    renderProjectLayoutInspector(design, gates, { addShape, setSelection });

    await user.click(
      screen.getByRole("button", { name: "Generate race line" })
    );

    expect(addShape).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "polyline" })
    );
    expect(setSelection).toHaveBeenCalledWith(["new-polyline-id"]);
    expect(mocks.toastSuccess).toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("still generates a race line but surfaces a warning when only one obstacle is placed", async () => {
    const user = userEvent.setup();
    const gates = [gate("gate-1", 0, 0)];
    const design = designWithGates(gates);
    const addShape = vi.fn().mockReturnValue("new-polyline-id");
    const setSelection = vi.fn();

    renderProjectLayoutInspector(design, gates, { addShape, setSelection });

    await user.click(
      screen.getByRole("button", { name: "Generate race line" })
    );

    expect(addShape).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "polyline" })
    );
    expect(setSelection).toHaveBeenCalledWith(["new-polyline-id"]);
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("more useful race line")
    );
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("keeps a manual race line when generating a generated race line", async () => {
    const user = userEvent.setup();
    const gates = [gate("gate-1", 0, 0), gate("gate-2", 10, 0)];
    const polyline = {
      id: "existing-line",
      kind: "polyline" as const,
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 10, y: 0, z: 1 },
      ],
    };
    const design = designWithGates([...gates, polyline]);
    const addShape = vi.fn().mockReturnValue("new-polyline-id");
    const removeShapes = vi.fn();

    renderProjectLayoutInspector(design, [...gates, polyline], {
      addShape,
      removeShapes,
    });

    await user.click(
      screen.getByRole("button", { name: "Generate race line" })
    );

    expect(removeShapes).not.toHaveBeenCalled();
    expect(addShape).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "polyline" })
    );
  });

  it("replaces only the generated race line when multiple paths exist", async () => {
    const user = userEvent.setup();
    const gates = [gate("gate-1", 0, 0), gate("gate-2", 10, 0)];
    const manualPolyline = {
      id: "manual-line",
      kind: "polyline" as const,
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 10, y: 0, z: 1 },
      ],
      color: "#3b82f6",
    };
    const generatedPolyline = {
      id: "generated-line",
      kind: "polyline" as const,
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 1, z: 1 },
        { x: 10, y: 1, z: 1 },
      ],
      smooth: true,
      showArrows: true,
      meta: { generatedRoute: true },
    };
    const design = designWithGates([
      ...gates,
      manualPolyline,
      generatedPolyline,
    ]);
    const addShape = vi.fn().mockReturnValue("new-polyline-id");
    const removeShapes = vi.fn();

    renderProjectLayoutInspector(
      design,
      [...gates, manualPolyline, generatedPolyline],
      {
        addShape,
        removeShapes,
      }
    );

    await user.click(
      screen.getByRole("button", { name: "Regenerate race line" })
    );

    expect(removeShapes).toHaveBeenCalledWith(["generated-line"]);
    expect(addShape).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "polyline" })
    );
  });

  it("labels the action as regenerate when the existing race line was generated", async () => {
    const gates = [gate("gate-1", 0, 0), gate("gate-2", 10, 0)];
    const polyline = {
      id: "existing-generated-line",
      kind: "polyline" as const,
      x: 0,
      y: 0,
      rotation: 0,
      points: [
        { x: 0, y: 0, z: 1 },
        { x: 10, y: 0, z: 1 },
      ],
      smooth: true,
      showArrows: true,
      meta: { generatedRoute: true },
    };
    const design = designWithGates([...gates, polyline]);

    renderProjectLayoutInspector(design, [...gates, polyline]);

    expect(
      screen.getByRole("button", { name: "Regenerate race line" })
    ).toBeTruthy();
  });
});
