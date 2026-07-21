// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TrackPreview3D from "@/components/canvas/viewer/TrackPreview3D";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import { normalizeDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";

const previewTestState = vi.hoisted(() => ({ isMobile: false }));

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
  OrbitControls: ({
    enableZoom,
    maxPolarAngle,
    touches,
  }: {
    enableZoom?: boolean;
    maxPolarAngle?: number;
    touches?: unknown;
  }) => (
    <div
      data-enable-zoom={String(enableZoom)}
      data-has-touch-controls={String(Boolean(touches))}
      data-max-polar-angle={String(maxPolarAngle)}
      data-testid="orbit-controls"
    />
  ),
  useTexture: Object.assign(
    vi.fn(() => ({})),
    { preload: vi.fn() }
  ),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => previewTestState.isMobile,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

vi.mock("@/hooks/usePerfMetric", () => ({
  usePerfMetric: () => {},
}));

vi.mock("@/components/canvas/preview3d/shared-scene", () => ({
  CameraAxisTracker: () => <div data-testid="axis-tracker" />,
  GradientSky: () => null,
  OrbitGroundConstraint: () => <div data-testid="orbit-ground-constraint" />,
  ORBIT_MAX_POLAR_ANGLE: Math.PI / 2 - (4 * Math.PI) / 180,
  MemoShape3D: ({ shape }: { shape: { id: string } }) => (
    <div data-shape-id={shape.id} data-testid="shape-3d" />
  ),
  ScreenshotHelper: () => <div data-testid="screenshot-helper" />,
  TrackSurface3D: ({
    field,
    onGroundClick,
    theme,
  }: {
    field: { width: number; height: number; gridStep: number };
    onGroundClick?: unknown;
    theme: { gridCell: string; gridSection: string };
  }) => (
    <div
      data-field={`${field.width}x${field.height}@${field.gridStep}`}
      data-grid-cell={theme.gridCell}
      data-grid-section={theme.gridSection}
      data-has-ground-click={String(Boolean(onGroundClick))}
      data-testid="preview-grid"
    />
  ),
  useCatalogTextureWarmup: () => {},
  WheelBridge: () => <div data-testid="wheel-bridge" />,
}));

vi.mock("@/components/canvas/preview3d/overlays", () => ({
  AxisGizmoOverlay: () => <div data-testid="axis-gizmo" />,
  FieldWatermark: () => <div data-testid="field-watermark" />,
  FlyThroughControlsOverlay: () => <div data-testid="fly-controls" />,
  TrackPreview3DHintOverlays: ({
    isMobile,
    readOnly,
  }: {
    isMobile: boolean;
    readOnly: boolean;
  }) => (
    <div
      data-is-mobile={String(isMobile)}
      data-read-only={String(readOnly)}
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
  barrier: 0,
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
    previewTestState.isMobile = false;
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    useEditor.getState().replaceDesign(createDensePreviewDesign());
  });

  afterEach(() => {
    cleanup();
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  it("renders all dense-layout shapes into the 3D preview scene", () => {
    render(<TrackPreview3D />);

    const shapeNodes = screen.getAllByTestId("shape-3d");

    expect(screen.getByTestId("r3f-canvas")).toBeTruthy();
    expect(screen.getByTestId("preview-grid")).toBeTruthy();
    expect(shapeNodes).toHaveLength(90);
    expect(shapeNodes[0]?.getAttribute("data-shape-id")).toBe("long-route");
  });

  it("uses the shared themed surface and read-only touch controls on mobile", () => {
    previewTestState.isMobile = true;

    render(<TrackPreview3D />);

    const surface = screen.getByTestId("preview-grid");
    expect(surface.getAttribute("data-field")).toBe("90x70@0.2");
    expect(surface.getAttribute("data-grid-cell")).toBe(
      SCENE_3D_THEME.dark.gridCell
    );
    expect(surface.getAttribute("data-grid-section")).toBe(
      SCENE_3D_THEME.dark.gridSection
    );
    expect(surface.getAttribute("data-has-ground-click")).toBe("false");
    expect(
      screen
        .getByTestId("orbit-controls")
        .getAttribute("data-has-touch-controls")
    ).toBe("true");
    expect(
      Number(
        screen
          .getByTestId("orbit-controls")
          .getAttribute("data-max-polar-angle")
      )
    ).toBeLessThan(Math.PI / 2);
    expect(screen.getByTestId("orbit-ground-constraint")).toBeTruthy();
    expect(
      screen.getByTestId("preview-hints").getAttribute("data-is-mobile")
    ).toBe("true");
    expect(
      screen.getByTestId("preview-hints").getAttribute("data-read-only")
    ).toBe("true");
  });
});
