// @vitest-environment happy-dom

import type React from "react";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ElevationChart from "@/components/inspector/ElevationChart";
import { useEditor } from "@/store/editor";
import inspectorMessages from "@lang/en/inspector.json";
import {
  gateDraft,
  polylineDraft,
  resetEditorStore,
} from "../../helpers/editor-store";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/AppTooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function renderElevationChart() {
  render(
    <NextIntlClientProvider
      locale="en"
      messages={{
        common: { actions: { close: "Close" } },
        inspector: inspectorMessages,
      }}
    >
      <ElevationChart />
    </NextIntlClientProvider>
  );
}

function setupRoute() {
  const state = resetEditorStore();
  const routeId = state.addShape(
    polylineDraft({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 0.2, y: 0, z: 0 },
        { x: 4, y: 0, z: 3 },
      ],
    })
  );
  const timingGateId = state.addShape(
    gateDraft({
      x: 4,
      y: 0,
      meta: { timing: { role: "start_finish" } },
    })
  );
  state.setSelection([routeId]);
  return { routeId, timingGateId };
}

describe("ElevationChart", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps the compact chart as a scan-only summary", () => {
    setupRoute();
    renderElevationChart();

    expect(
      screen.queryByRole("button", {
        name: "Select waypoint 1 in elevation profile",
      })
    ).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Select timing marker Start / finish in elevation profile",
      })
    ).toBeNull();
  });

  it("selects route waypoints from profile markers in the details dialog", () => {
    const { routeId } = setupRoute();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select waypoint 1 in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([routeId]);
    expect(useEditor.getState().ui.vertexSelection).toEqual({
      shapeId: routeId,
      idx: 1,
    });
  });

  it("jumps from warning markers to route segments in the details dialog", () => {
    const { routeId } = setupRoute();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Jump to Close points segment 1",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([routeId]);
    expect(useEditor.getState().ui.segmentSelection).toEqual({
      shapeId: routeId,
      segmentIndex: 0,
      point: { x: 0.1, y: 0 },
    });
  });

  it("selects timing markers from the profile in the details dialog", () => {
    const { timingGateId } = setupRoute();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select timing marker Start / finish in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([timingGateId]);
  });

  it("offers warning segment jump actions in the details dialog", () => {
    const { routeId } = setupRoute();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(screen.getByRole("button", { name: /Jump to segment 1/ }));

    expect(useEditor.getState().session.selection).toEqual([routeId]);
    expect(useEditor.getState().ui.segmentSelection).toMatchObject({
      shapeId: routeId,
      segmentIndex: 0,
    });
  });
});
