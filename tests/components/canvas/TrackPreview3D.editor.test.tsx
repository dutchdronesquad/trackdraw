// @vitest-environment happy-dom

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreeEvent } from "@react-three/fiber";
import TrackPreview3D from "@/components/canvas/editor/TrackPreview3D";
import { normalizeDesign } from "@/lib/track/design";
import type { PolylineShape, Shape } from "@/lib/types";
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
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({
      camera: { position: { distanceTo: vi.fn(() => 10) } },
      gl: {
        domElement: {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          toDataURL: vi.fn(() => ""),
        },
      },
    })),
  };
});

vi.mock("@react-three/drei", () => ({
  Grid: () => <div data-testid="preview-grid" />,
  OrbitControls: () => <div data-testid="orbit-controls" />,
  useTexture: Object.assign(
    vi.fn(() => ({})),
    { preload: vi.fn() }
  ),
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

vi.mock("@/hooks/account/useDeveloperMode", () => ({
  useDeveloperMode: () => ({ enabled: false, setEnabled: vi.fn() }),
}));

vi.mock("@/components/canvas/preview3d/shared-scene", () => ({
  CameraAxisTracker: () => <div data-testid="axis-tracker" />,
  CameraCapture: () => <div data-testid="camera-capture" />,
  MemoShape3D: ({
    isSelected,
    onSelect,
    shape,
  }: {
    isSelected: boolean;
    onSelect: (event: ThreeEvent<MouseEvent>, shapeId: string) => void;
    shape: Shape;
  }) => (
    <button
      data-selected={String(isSelected)}
      data-shape-id={shape.id}
      data-testid={`shape-3d-${shape.id}`}
      onClick={() =>
        onSelect(
          {
            ctrlKey: false,
            delta: 0,
            metaKey: false,
            shiftKey: false,
            stopPropagation: vi.fn(),
          } as unknown as ThreeEvent<MouseEvent>,
          shape.id
        )
      }
      type="button"
    />
  ),
  ScreenshotHelper: () => <div data-testid="screenshot-helper" />,
  useCatalogTextureWarmup: () => {},
  WheelBridge: () => <div data-testid="wheel-bridge" />,
}));

vi.mock("@/components/canvas/editor/edit-scene-content", () => ({
  DiveGateElevationHandle3D: () => null,
  DiveGateTiltHandle3D: () => null,
  GateRotateHandle3D: () => null,
  LadderElevationHandle3D: () => null,
  PolylineElevationHandles3D: ({ path }: { path: PolylineShape }) => (
    <div data-path-id={path.id} data-testid="polyline-elevation-handles" />
  ),
}));

vi.mock("@/components/canvas/preview3d/overlays", () => ({
  AxisGizmoOverlay: () => <div data-testid="axis-gizmo" />,
  FieldWatermark: () => <div data-testid="field-watermark" />,
  FlyThroughControlsOverlay: () => <div data-testid="fly-controls" />,
  TrackPreview3DHintOverlays: ({
    selectedPolyline,
  }: {
    selectedPolyline: PolylineShape | null;
  }) => (
    <div
      data-selected-polyline-id={selectedPolyline?.id ?? ""}
      data-testid="preview-hints"
    />
  ),
}));

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

function createPreviewDesign(routeLocked: boolean) {
  return normalizeDesign({
    id: "preview-layout",
    version: 2,
    title: "3D interaction layout",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    mapReference: null,
    shapes: [
      {
        id: "route-1",
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        locked: routeLocked,
        points: [
          { x: 5, y: 8, z: 0 },
          { x: 20, y: 14, z: 1.2 },
        ],
      },
      {
        id: "gate-1",
        kind: "gate",
        x: 14,
        y: 11,
        rotation: 0,
        width: 2,
        height: 2,
      },
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

describe("TrackPreview3D editor interactions", () => {
  beforeEach(() => {
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  afterEach(() => {
    cleanup();
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  it("keeps a locked selected route selected without waypoint elevation controls", () => {
    const state = useEditor.getState();
    state.replaceDesign(createPreviewDesign(true));
    state.setSelection(["route-1"]);

    render(<TrackPreview3D />);

    expect(
      screen.getByTestId("shape-3d-route-1").getAttribute("data-selected")
    ).toBe("true");
    expect(screen.queryByTestId("polyline-elevation-handles")).toBeNull();
    expect(
      screen
        .getByTestId("preview-hints")
        .getAttribute("data-selected-polyline-id")
    ).toBe("");
  });

  it("selects a locked route when clicking it in 3D", () => {
    const state = useEditor.getState();
    state.replaceDesign(createPreviewDesign(true));
    state.setSelection(["gate-1"]);

    render(<TrackPreview3D />);
    fireEvent.click(screen.getByTestId("shape-3d-route-1"));

    expect(useEditor.getState().session.selection).toEqual(["route-1"]);
  });

  it("keeps waypoint elevation controls for an editable selected route", () => {
    const state = useEditor.getState();
    state.replaceDesign(createPreviewDesign(false));
    state.setSelection(["route-1"]);

    render(<TrackPreview3D />);

    expect(
      screen.getByTestId("shape-3d-route-1").getAttribute("data-selected")
    ).toBe("true");
    expect(
      screen
        .getByTestId("polyline-elevation-handles")
        .getAttribute("data-path-id")
    ).toBe("route-1");
    expect(
      screen
        .getByTestId("preview-hints")
        .getAttribute("data-selected-polyline-id")
    ).toBe("route-1");
  });
});
