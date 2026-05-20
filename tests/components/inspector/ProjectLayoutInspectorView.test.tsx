// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectLayoutInspectorView } from "@/components/inspector/views/project-layout";
import { createDefaultDesign } from "@/lib/track/design";
import type { TrackDesign } from "@/lib/types";

vi.mock("@/components/inspector/ElevationChart", () => ({
  default: () => <div data-testid="elevation-chart" />,
}));

function withMapReference(): TrackDesign {
  return {
    ...createDefaultDesign(),
    mapReference: {
      type: "map",
      provider: "esri-world-imagery",
      mapStyle: "satellite",
      centerLat: 52.37,
      centerLng: 4.9,
      zoom: 18,
      rotationDeg: 0,
      opacity: 0.5,
      visible: true,
      locked: true,
    },
  };
}

function renderProjectLayoutInspector(design = withMapReference()) {
  render(
    <ProjectLayoutInspectorView
      clearMapReference={vi.fn()}
      design={design}
      mobileInline
      panel="layout"
      removeShapes={vi.fn()}
      setHoveredShapeId={vi.fn()}
      setMapReference={vi.fn()}
      setMapReferenceOpacity={vi.fn()}
      setMapReferenceRotation={vi.fn()}
      setMapReferenceVisibility={vi.fn()}
      setSelection={vi.fn()}
      shapes={[]}
      updateDesignMeta={vi.fn()}
      updateField={vi.fn()}
    />
  );
}

describe("ProjectLayoutInspectorView map reference controls", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps map reference actions large enough for mobile use", () => {
    renderProjectLayoutInspector();

    for (const label of [
      "Edit map reference",
      "Hide map reference",
      "Remove map reference",
    ]) {
      const button = screen.getByRole("button", { name: label });
      expect(button.className).toContain("h-11");
      expect(button.className).toContain("lg:h-8");
    }
  });

  it("uses a larger mobile opacity control while preserving desktop density", () => {
    renderProjectLayoutInspector();

    const slider = screen.getByRole("slider");
    expect(slider.className).toContain("h-3");
    expect(slider.className).toContain("lg:h-2");
  });
});
