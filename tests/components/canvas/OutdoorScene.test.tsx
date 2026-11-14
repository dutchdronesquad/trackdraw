// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OutdoorScene } from "@/components/canvas/preview3d/outdoor-scene";

const mocks = vi.hoisted(() => {
  const scene = { fog: null, add: vi.fn() };
  return {
    scene,
    state: { scene, gl: { shadowMap: {} }, invalidate: vi.fn() },
    construct: vi.fn(),
  };
});

vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: typeof mocks.state) => unknown) =>
    select(mocks.state),
}));

vi.mock("@/lib/track/outdoor-presentation", () => ({
  createOutdoorPresentation: mocks.construct,
  outdoorGroundExtent: () => 1600,
}));

describe("outdoor presentation fallback", () => {
  it("keeps the course visible after an environment failure and can retry at lower quality", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const scene = { group: {}, fog: {}, dispose: vi.fn() };
    mocks.construct.mockImplementation((_field, quality) => {
      if (quality === "full")
        throw new Error("Environment initialization failed");
      return scene;
    });

    try {
      const course = (quality: "full" | "low") => (
        <>
          <OutdoorScene
            width={80}
            height={65}
            quality={quality}
            fallback={<p>Design grid</p>}
          />
          <p>Course items</p>
        </>
      );
      const preview = render(course("full"));
      expect(screen.getByText("Design grid")).toBeTruthy();
      expect(screen.getByText("Course items")).toBeTruthy();

      preview.rerender(course("low"));
      expect(screen.queryByText("Design grid")).toBeNull();
      expect(mocks.scene.fog).toBe(scene.fog);

      preview.unmount();
      expect(mocks.scene.fog).toBeNull();
      expect(scene.dispose).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
    }
  });
});
