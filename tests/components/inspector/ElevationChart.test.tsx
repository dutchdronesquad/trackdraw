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

function setupRouteWithSplitMarkers() {
  const state = resetEditorStore();
  const routeId = state.addShape(
    polylineDraft({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 1 },
      ],
    })
  );
  state.addShape(
    gateDraft({
      x: 50,
      y: 50,
      meta: { timing: { role: "split" } },
    })
  );
  const visibleSplitId = state.addShape(
    gateDraft({
      x: 4,
      y: 0,
      meta: { timing: { role: "split" } },
    })
  );
  state.setSelection([routeId]);
  return { routeId, visibleSplitId };
}

function setupRouteWithRouteOrderedSplitMarkers() {
  const state = resetEditorStore();
  const routeId = state.addShape(
    polylineDraft({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 1 },
      ],
    })
  );
  state.addShape(
    gateDraft({
      x: 8,
      y: 0,
      meta: { timing: { role: "split" } },
    })
  );
  const firstRouteSplitId = state.addShape(
    gateDraft({
      x: 2,
      y: 0,
      meta: { timing: { role: "split" } },
    })
  );
  state.setSelection([routeId]);
  return { firstRouteSplitId, routeId };
}

function setupRouteWithOffRouteObstacle() {
  const state = resetEditorStore();
  const routeId = state.addShape(
    polylineDraft({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 1 },
      ],
    })
  );
  state.addShape(gateDraft({ x: 50, y: 50 }));
  const visibleGateId = state.addShape(gateDraft({ x: 4, y: 0 }));
  state.setSelection([routeId]);
  return { routeId, visibleGateId };
}

function setupSelectedSecondaryRouteWithReversedObstacleOrder() {
  const state = resetEditorStore();
  state.addShape(
    polylineDraft({
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 1 },
      ],
    })
  );
  const secondaryRouteId = state.addShape(
    polylineDraft({
      points: [
        { x: 10, y: 0, z: 1 },
        { x: 0, y: 0, z: 0 },
      ],
    })
  );
  const primaryFirstGateId = state.addShape(gateDraft({ x: 2, y: 0 }));
  const secondaryFirstGateId = state.addShape(gateDraft({ x: 8, y: 0 }));
  state.setSelection([secondaryRouteId]);
  return { primaryFirstGateId, secondaryFirstGateId, secondaryRouteId };
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

  it("numbers visible split timing markers without counting off-route splits", () => {
    const { visibleSplitId } = setupRouteWithSplitMarkers();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );

    expect(
      screen.queryByRole("button", {
        name: "Select timing marker Split 2 in elevation profile",
      })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select timing marker Split 1 in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([visibleSplitId]);
  });

  it("numbers split timing markers in visible route order", () => {
    const { firstRouteSplitId } = setupRouteWithRouteOrderedSplitMarkers();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select timing marker Split 1 in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([firstRouteSplitId]);
  });

  it("uses the rendered timing marker color in the marker legend", () => {
    setupRoute();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );

    const timingLegendDot = screen.getByText("Timing")
      .previousElementSibling as HTMLElement | null;

    expect(timingLegendDot?.style.background).toBe("#f59e0b");
  });

  it("labels obstacle markers with route obstacle numbers", () => {
    const { visibleGateId } = setupRouteWithOffRouteObstacle();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );

    expect(
      screen.queryByRole("button", {
        name: "Select obstacle 2 in elevation profile",
      })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select obstacle 1 in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([visibleGateId]);
  });

  it("falls back to selected route order for obstacle labels on non-primary routes", () => {
    const { primaryFirstGateId, secondaryFirstGateId } =
      setupSelectedSecondaryRouteWithReversedObstacleOrder();
    renderElevationChart();

    fireEvent.click(
      screen.getByRole("button", { name: "Open elevation details" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Select obstacle 1 in elevation profile",
      })
    );

    expect(useEditor.getState().session.selection).toEqual([
      secondaryFirstGateId,
    ]);
    expect(useEditor.getState().session.selection).not.toEqual([
      primaryFirstGateId,
    ]);
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
