// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCENE_3D_THEME } from "@/components/canvas/preview3d/theme";
import { GalleryPreviewRenderer } from "@/components/gallery/GalleryPreviewRenderer";
import { normalizeDesign } from "@/lib/track/design";
import { useEditor } from "@/store/editor";

const galleryTestState = vi.hoisted(() => ({
  theme: "dark" as "dark" | "light",
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => {
    const renderableChildren = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child) && typeof child.type !== "string"
    );
    return <div data-testid="gallery-canvas">{renderableChildren}</div>;
  },
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => galleryTestState.theme,
}));

vi.mock("@/components/canvas/preview3d/shared-scene", () => ({
  MemoShape3D: ({ shape }: { shape: { id: string } }) => (
    <div data-shape-id={shape.id} data-testid="gallery-shape" />
  ),
  ScreenshotHelper: () => <div data-testid="screenshot-helper" />,
  TrackSurface3D: ({
    field,
    theme,
  }: {
    field: { width: number; height: number; gridStep: number };
    theme: { gridCell: string; gridSection: string };
  }) => (
    <div
      data-field={`${field.width}x${field.height}@${field.gridStep}`}
      data-grid-cell={theme.gridCell}
      data-grid-section={theme.gridSection}
      data-testid="gallery-track-surface"
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

function createGalleryDesign() {
  return normalizeDesign({
    id: "gallery-surface-preview",
    version: 2,
    title: "Gallery surface preview",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 55, height: 35, origin: "tl", gridStep: 0.5, ppm: 20 },
    mapReference: null,
    shapes: [
      {
        id: "gallery-gate",
        kind: "gate",
        x: 10,
        y: 12,
        rotation: 0,
        width: 2,
        height: 2,
      },
    ],
    createdAt: "2026-07-21T10:00:00.000Z",
    updatedAt: "2026-07-21T10:00:00.000Z",
  });
}

describe("GalleryPreviewRenderer 3D surface wiring", () => {
  beforeEach(() => {
    galleryTestState.theme = "dark";
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
    useEditor.getState().replaceDesign(createGalleryDesign());
  });

  afterEach(() => {
    cleanup();
    useEditor.getState().newProject();
    useEditor.getState().clearHistory();
  });

  it.each(["dark", "light"] as const)(
    "passes the field and %s theme to the shared track surface",
    (theme) => {
      galleryTestState.theme = theme;

      render(<GalleryPreviewRenderer onCapture={vi.fn()} />);

      const surface = screen.getByTestId("gallery-track-surface");
      expect(surface.getAttribute("data-field")).toBe("55x35@0.5");
      expect(surface.getAttribute("data-grid-cell")).toBe(
        SCENE_3D_THEME[theme].gridCell
      );
      expect(surface.getAttribute("data-grid-section")).toBe(
        SCENE_3D_THEME[theme].gridSection
      );
      expect(screen.getByTestId("gallery-canvas")).toBeTruthy();
      expect(
        screen.getByTestId("gallery-shape").getAttribute("data-shape-id")
      ).toBe("gallery-gate");
      expect(screen.getByTestId("screenshot-helper")).toBeTruthy();
    }
  );
});
