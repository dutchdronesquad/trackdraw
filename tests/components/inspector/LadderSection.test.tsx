// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LadderDimensionFields,
  LadderSection,
} from "@/components/inspector/sections/LadderSection";
import type { LadderShape } from "@/lib/types";

const ladder: LadderShape = {
  id: "ladder",
  kind: "ladder",
  x: 0,
  y: 0,
  rotation: 0,
  width: 2,
  height: 6,
  rungs: 3,
  elevation: 4,
};
afterEach(cleanup);

describe("custom ladder controls", () => {
  it.each([1, 2, 5])(
    "scales the default ladder height to two meters per gate for %i gates",
    (rungs) => {
      const updateShape = vi.fn();
      render(
        <LadderSection
          shape={ladder}
          updateShape={updateShape}
          hasFixedCatalogDimensions={false}
          defaultOpen
        />
      );
      const input = screen.getByRole("spinbutton", { name: "Gates" });
      expect(input.getAttribute("min")).toBe("1");
      expect(input.getAttribute("max")).toBe("5");
      fireEvent.change(input, { target: { value: String(rungs) } });
      expect(updateShape).toHaveBeenLastCalledWith("ladder", {
        rungs,
        height: rungs * 2,
      });
    }
  );

  it.each([1, 3, 5])(
    "preserves a custom five-meter opening height when changing to %i gates",
    (rungs) => {
      const updateShape = vi.fn();
      render(
        <LadderSection
          shape={{ ...ladder, rungs: 2, height: 10 }}
          updateShape={updateShape}
          hasFixedCatalogDimensions={false}
          defaultOpen
        />
      );
      fireEvent.change(screen.getByRole("spinbutton", { name: "Gates" }), {
        target: { value: String(rungs) },
      });
      expect(updateShape).toHaveBeenLastCalledWith("ladder", {
        rungs,
        height: rungs * 5,
      });
    }
  );

  it("keeps the total height at the inspector minimum for very short openings", () => {
    const updateShape = vi.fn();
    render(
      <LadderSection
        shape={{ ...ladder, rungs: 5, height: 0.5 }}
        updateShape={updateShape}
        hasFixedCatalogDimensions={false}
        defaultOpen
      />
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Gates" }), {
      target: { value: "1" },
    });
    expect(updateShape).toHaveBeenLastCalledWith("ladder", {
      rungs: 1,
      height: 0.5,
    });
  });

  it.each(["metric", "imperial"] as const)(
    "edits frame thickness in %s units",
    async (unitSystem) => {
      const updateShape = vi.fn();
      const user = userEvent.setup();
      render(
        <LadderDimensionFields
          shape={ladder}
          updateShape={updateShape}
          hasFixedCatalogDimensions={false}
          unitSystem={unitSystem}
          unitLabel={unitSystem === "metric" ? "m" : "ft"}
        />
      );
      const input = screen.getByRole("textbox", { name: /Thickness/ });
      await user.clear(input);
      await user.type(input, unitSystem === "metric" ? "0.4" : "1");
      await user.tab();
      expect(updateShape.mock.lastCall?.[0]).toBe("ladder");
      expect(updateShape.mock.lastCall?.[1].thick).toBeCloseTo(
        unitSystem === "metric" ? 0.4 : 0.3048
      );
    }
  );

  it("keeps fixed catalog dimensions and gate counts locked", () => {
    render(
      <>
        <LadderSection
          shape={ladder}
          updateShape={vi.fn()}
          hasFixedCatalogDimensions
          defaultOpen
        />
        <LadderDimensionFields
          shape={ladder}
          updateShape={vi.fn()}
          hasFixedCatalogDimensions
          unitSystem="metric"
          unitLabel="m"
        />
      </>
    );
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
});
