// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackPreview3D from "@/components/canvas/share/TrackPreview3D";
import { normalizeDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockDroneCamera() {
      return <div data-testid="drone-camera" />;
    },
}));

vi.mock("@react-three/fiber", () => {
  function getRenderableCanvasChildren(
    children: React.ReactNode
  ): React.ReactNode[] {
    return React.Children.toArray(children).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (child.type === React.Fragment) {
        return getRenderableCanvasChildren(
          (child.props as { children?: React.ReactNode }).children
        );
      }
      return typeof child.type === "string" ? [] : [child];
    });
  }

  function MockCanvas({ children }: { children: React.ReactNode }) {
    return (
      <div data-testid="r3f-canvas">
        {getRenderableCanvasChildren(children)}
      </div>
    );
  }

  return {
    Canvas: MockCanvas,
  };
});

vi.mock("@react-three/drei", () => ({
  Grid: () => <div data-testid="preview-grid" />,
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

vi.mock("@/hooks/usePerfMetric", () => ({
  usePerfMetric: () => {},
}));

vi.mock("@/components/canvas/trackPreview3DSharedSceneContent", () => ({
  CameraAxisTracker: () => <div data-testid="axis-tracker" />,
  MemoShape3D: ({ shape }: { shape: { id: string } }) => (
    <div data-shape-id={shape.id} data-testid="shape-3d" />
  ),
  ScreenshotHelper: () => <div data-testid="screenshot-helper" />,
  WheelBridge: () => <div data-testid="wheel-bridge" />,
}));

vi.mock("@/components/canvas/trackPreview3DOverlays", () => ({
  AxisGizmoOverlay: () => <div data-testid="axis-gizmo" />,
  FieldWatermark: () => <div data-testid="field-watermark" />,
  FlyThroughControlsOverlay: () => <div data-testid="fly-controls" />,
  TrackPreview3DHintOverlays: () => <div data-testid="preview-hints" />,
}));

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

function createDensePreviewDesign() {
  const routePoints = Array.from({ length: 90 }, (_, index) => ({
    x: 4 + index * 0.7,
    y: 20 + Math.sin(index / 7) * 8,
    z: index % 5 === 0 ? 1 : 0,
  }));

  return normalizeDesign({
    id: "preview-dense-layout",
    version: 1,
    title: "Dense 3D preview layout",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 90, height: 70, origin: "tl", gridStep: 0.2, ppm: 15 },
    mapReference: {
      type: "map",
      provider: "esri-world-imagery",
      mapStyle: "satellite",
      centerLat: 52.1,
      centerLng: 5.2,
      zoom: 18,
      rotationDeg: 8,
      opacity: 0.65,
      visible: true,
      locked: true,
    },
    shapes: [
      {
        id: "long-route",
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        points: routePoints,
      },
      ...routePoints.slice(1).map((point, index) => ({
        id: `gate-${String(index + 1).padStart(3, "0")}`,
        kind: "gate" as const,
        x: point.x,
        y: point.y,
        rotation: index % 4 === 0 ? 15 : 0,
        width: 2,
        height: 2,
      })),
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

describe("TrackPreview3D large layouts", () => {
  beforeEach(() => {
    useEditor.getState().replaceDesign(createDensePreviewDesign());
  });

  afterEach(() => {
    cleanup();
    useEditor.getState().newProject();
  });

  it("renders all dense-layout shapes into the 3D preview scene", () => {
    render(<TrackPreview3D />);

    const shapeNodes = screen.getAllByTestId("shape-3d");

    expect(screen.getByTestId("r3f-canvas")).toBeTruthy();
    expect(screen.getByTestId("preview-grid")).toBeTruthy();
    expect(shapeNodes).toHaveLength(90);
    expect(shapeNodes[0]?.getAttribute("data-shape-id")).toBe("long-route");
  });
});
