// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  shouldShowStarterForDesign,
  STARTER_STEPS,
  StarterActions,
  StarterSteps,
} from "@/components/editor/StarterFlow";

vi.mock("@/components/ui/kbd", () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
}));

describe("StarterFlow", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows starter guidance only for empty default designs", () => {
    expect(
      shouldShowStarterForDesign({ title: "New Track", shapeCount: 0 })
    ).toBe(true);
    expect(
      shouldShowStarterForDesign({ title: "Club layout", shapeCount: 0 })
    ).toBe(false);
    expect(
      shouldShowStarterForDesign({ title: "New Track", shapeCount: 1 })
    ).toBe(false);
  });

  it("renders the starter steps", () => {
    render(<StarterSteps />);

    expect(screen.getByText("Good first steps")).toBeTruthy();
    for (const step of STARTER_STEPS) {
      expect(screen.getByText(step.title)).toBeTruthy();
    }
  });

  it("runs desktop starter actions for selected layout, guided start, and blank canvas", async () => {
    const user = userEvent.setup();
    const onPath = vi.fn();
    const onBlank = vi.fn();
    const onStarterLayout = vi.fn();

    render(
      <StarterActions
        onPath={onPath}
        onBlank={onBlank}
        onStarterLayout={onStarterLayout}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /^Technical ladder line$/ })
    );
    await user.click(
      screen.getByRole("button", {
        name: /Technical ladder line.*quick rhythm\./,
      })
    );
    await user.click(
      screen.getByRole("button", { name: /Start with guidance/ })
    );
    await user.click(
      screen.getByRole("button", { name: /^Continue with empty canvas$/ })
    );

    expect(onStarterLayout).toHaveBeenCalledWith("technical-ladder-line");
    expect(onPath).toHaveBeenCalledTimes(1);
    expect(onBlank).toHaveBeenCalledTimes(1);
  });

  it("runs mobile starter actions", async () => {
    const user = userEvent.setup();
    const onPath = vi.fn();
    const onBlank = vi.fn();
    const onStarterLayout = vi.fn();

    render(
      <StarterActions
        mobile
        onPath={onPath}
        onBlank={onBlank}
        onStarterLayout={onStarterLayout}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /Open practice.*build your own lap\./,
      })
    );
    await user.click(
      screen.getByRole("button", { name: /Start with guidance/ })
    );
    await user.click(
      screen.getByRole("button", { name: /Continue with empty canvas/ })
    );

    expect(onStarterLayout).toHaveBeenCalledWith("open-practice");
    expect(onPath).toHaveBeenCalledTimes(1);
    expect(onBlank).toHaveBeenCalledTimes(1);
  });
});
