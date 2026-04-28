// @vitest-environment happy-dom

import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExportDialog from "@/components/dialogs/ExportDialog";
import { normalizeDesign } from "@/lib/track/design";
import type { Shape, TrackDesign } from "@/lib/types";
import type { TrackCanvasHandle } from "@/components/canvas/editor/TrackCanvas";

const { editorDesignRef } = vi.hoisted(() => ({
  editorDesignRef: { current: null as TrackDesign | null },
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

vi.mock("@/store/editor", () => ({
  useEditor: (
    selector: (state: { track: { design: TrackDesign } }) => unknown
  ) => selector({ track: { design: editorDesignRef.current! } }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
  },
}));

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

const raceLine: Shape = {
  id: "line-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 5, z: 1 },
    { x: 30, y: 5, z: 1 },
  ],
};

const startGate: Shape = {
  id: "start-1",
  kind: "gate",
  x: 5,
  y: 5,
  rotation: 0,
  width: 2,
  height: 2,
  meta: { timing: { role: "start_finish" } },
};

function makeDesign(shapes: Shape[]) {
  return normalizeDesign({
    id: "export-dialog-test",
    version: 1,
    title: "Export dialog test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes,
    createdAt: "2026-04-28T10:00:00.000Z",
    updatedAt: "2026-04-28T10:00:00.000Z",
  });
}

function renderExportDialog(design: TrackDesign) {
  editorDesignRef.current = design;
  render(
    <ExportDialog
      open
      onOpenChange={vi.fn()}
      canvasRef={createRef<TrackCanvasHandle | null>()}
      activeTab="2d"
    />
  );
}

describe("ExportDialog", () => {
  beforeEach(() => {
    editorDesignRef.current = makeDesign([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the live overlay package as blocked until overlay prep is ready", () => {
    renderExportDialog(makeDesign([]));

    expect(screen.getByText("Live Overlay")).toBeTruthy();
    expect(screen.getByText(/Blocked: Add one race route/)).toBeTruthy();
  });

  it("shows the live overlay package as ready when route and timing setup are valid", () => {
    renderExportDialog(makeDesign([raceLine, startGate]));

    expect(screen.getByText("Live Overlay")).toBeTruthy();
    expect(
      screen.getByText("Route and timing data for overlays.")
    ).toBeTruthy();
  });
});
