import { describe, expect, it } from "vitest";
import { buildSetupPlan } from "@/lib/planning/setup-estimate";
import { normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 2,
  flag: 1,
  cone: 1,
  startfinish: 1,
  ladder: 1,
  divegate: 1,
};

describe("setup estimate helpers", () => {
  it("builds an ordered setup plan with prep and grouped final passes", () => {
    const design = normalizeDesign({
      id: "setup-1",
      version: 1,
      title: "Setup plan",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "start-1",
          kind: "startfinish",
          x: 5,
          y: 5,
          rotation: 0,
          width: 3,
        },
        {
          id: "gate-1",
          kind: "gate",
          x: 8,
          y: 10,
          rotation: 0,
          width: 2,
          height: 2,
        },
        {
          id: "gate-2",
          kind: "gate",
          x: 12,
          y: 14,
          rotation: 0,
          width: 2,
          height: 2,
        },
        {
          id: "dive-1",
          kind: "divegate",
          x: 14,
          y: 18,
          rotation: 0,
          size: 2.8,
          tilt: 30,
          elevation: 4,
        },
        {
          id: "ladder-1",
          kind: "ladder",
          x: 20,
          y: 16,
          rotation: 0,
          width: 2,
          height: 6,
          rungs: 4,
        },
        {
          id: "flag-1",
          kind: "flag",
          x: 25,
          y: 22,
          rotation: 0,
          radius: 0.25,
        },
        {
          id: "cone-1",
          kind: "cone",
          x: 28,
          y: 24,
          rotation: 0,
          radius: 0.2,
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const plan = buildSetupPlan(design);

    expect(plan.steps[0]?.id).toBe("crew-unload-stage");
    expect(plan.steps.some((step) => step.id === "crew-rigging-check")).toBe(
      true
    );
    expect(plan.steps.some((step) => step.id === "flags-final-pass")).toBe(
      true
    );
    expect(plan.steps.some((step) => step.id === "cones-track-walk")).toBe(
      true
    );
    expect(plan.steps.find((step) => step.id === "start-1")?.kind).toBe(
      "Start / Finish"
    );
    expect(plan.steps.find((step) => step.id === "dive-1")?.complexity).toBe(
      "heavy"
    );
    expect(plan.estimatedElapsedMinutes).toBeGreaterThan(0);
    expect(plan.estimatedElapsedRange[1]).toBeGreaterThanOrEqual(
      plan.estimatedElapsedRange[0]
    );
    expect(plan.crewAssumption).toContain("2-3 person crew");
  });

  it("returns a lighter summary when no heavy obstacles are present", () => {
    const design = normalizeDesign({
      id: "setup-2",
      version: 1,
      title: "Simple setup",
      description: "",
      tags: [],
      authorName: "",
      inventory: {
        gate: 1,
        flag: 0,
        cone: 0,
        startfinish: 1,
        ladder: 0,
        divegate: 0,
      },
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "start-1",
          kind: "startfinish",
          x: 5,
          y: 5,
          rotation: 0,
          width: 3,
        },
        {
          id: "gate-1",
          kind: "gate",
          x: 8,
          y: 10,
          rotation: 0,
          width: 2,
          height: 2,
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const plan = buildSetupPlan(design);

    expect(plan.summary).toContain(
      "Most of the setup time comes from unloading"
    );
    expect(plan.complexityLabel).toMatch(/Light|Standard|Heavy/);
  });
});
