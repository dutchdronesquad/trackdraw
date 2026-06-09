// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import PerformanceHud from "@/components/editor/PerformanceHud";
import { resetPerfMetrics } from "@/lib/perf";

const developerModeState = vi.hoisted(() => ({
  enabled: true,
  setEnabled: vi.fn(),
}));

const perfState = vi.hoisted(() => ({
  metrics: {} as Record<
    string,
    {
      avgMs: number;
      count: number;
      lastMs: number;
      maxMs: number;
      minMs: number;
      totalMs: number;
    }
  >,
}));

vi.mock("framer-motion", () => ({
  motion: {
    aside: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children: React.ReactNode;
    }) => <aside {...props}>{children}</aside>,
  },
  useReducedMotion: () => false,
}));

vi.mock("@/hooks/useDeveloperMode", () => ({
  useDeveloperMode: () => developerModeState,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

vi.mock("@/lib/perf", () => ({
  getPerfSnapshot: () => perfState.metrics,
  resetPerfMetrics: vi.fn(),
  subscribePerf: () => () => undefined,
}));

vi.mock("@/store/editor", () => ({
  useEditor: (selector: (state: unknown) => unknown) =>
    selector({
      ui: { activeTool: "gate" },
      session: { selection: ["gate-1", "gate-2"] },
    }),
}));

function metric(lastMs: number) {
  return {
    avgMs: lastMs,
    count: 1,
    lastMs,
    maxMs: lastMs,
    minMs: lastMs,
    totalMs: lastMs,
  };
}

describe("PerformanceHud", () => {
  afterEach(() => {
    cleanup();
    developerModeState.enabled = true;
    developerModeState.setEnabled.mockClear();
    perfState.metrics = {};
    vi.clearAllMocks();
  });

  it("stays hidden when developer mode is disabled", () => {
    developerModeState.enabled = false;

    render(<PerformanceHud />);

    expect(screen.queryByText("Developer HUD")).toBeNull();
  });

  it("shows editor context and performance levels", () => {
    perfState.metrics = {
      "render:TrackCanvas": metric(12),
      "render:TrackPreview3D": metric(40),
      "render:Inspector": metric(90),
    };

    render(<PerformanceHud />);

    expect(screen.getByText("Developer HUD")).toBeTruthy();
    expect(screen.getByText("Tool gate · 2 selected")).toBeTruthy();
    expect(screen.getByText("OK")).toBeTruthy();
    expect(screen.getByText("Busy")).toBeTruthy();
    expect(screen.getByText("Heavy")).toBeTruthy();
    expect(screen.getByText("12.0ms")).toBeTruthy();
  });

  it("resets metrics and closes the HUD from its controls", async () => {
    const user = userEvent.setup();
    render(<PerformanceHud />);

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(resetPerfMetrics).toHaveBeenCalledOnce();
    expect(developerModeState.setEnabled).toHaveBeenCalledWith(false);
  });
});
