// @vitest-environment happy-dom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackDrawViewerOptions } from "@trackdraw/viewer";
import BioTrackViewer from "@/components/bio/BioTrackViewer";
import { bioTrack } from "@/lib/bio-track";
import { viewerDesignSnapshotSchema } from "@trackdraw/schema/snapshot/schema";

const { mount, update, destroy } = vi.hoisted(() => ({
  mount: vi.fn(),
  update: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("@trackdraw/viewer", () => ({ createTrackDrawViewer: mount }));

beforeEach(() => {
  mount.mockReset().mockImplementation(() => ({ update, destroy }));
  vi.stubGlobal("IntersectionObserver", undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("bio TrackDraw Viewer integration", () => {
  it("mounts the public example and switches modes without recreating the viewer", async () => {
    render(<BioTrackViewer />);
    const button3D = screen.getByRole("button", { name: "3D" });
    await waitFor(() =>
      expect((button3D as HTMLButtonElement).disabled).toBe(false)
    );
    expect(mount.mock.calls[0][1]).toMatchObject({
      design: bioTrack,
      view: "2d",
      showViewControls: false,
    });
    fireEvent.click(button3D);
    expect(button3D.getAttribute("aria-pressed")).toBe("true");
    expect(update.mock.lastCall?.[0].view).toBe("3d");
    fireEvent.click(screen.getByRole("button", { name: "2D" }));
    expect(update.mock.lastCall?.[0].view).toBe("2d");
    expect(mount).toHaveBeenCalledTimes(1);
    cleanup();
    await waitFor(() => expect(destroy).toHaveBeenCalledTimes(1));
  });

  it("keeps 2D available when the viewer reports a WebGL fallback", async () => {
    render(<BioTrackViewer />);
    await waitFor(() => expect(mount).toHaveBeenCalled());
    const options = mount.mock.calls[0][1] as TrackDrawViewerOptions;
    act(() => options.onViewStateChange?.({ view: "2d", available3D: false }));
    expect(
      (screen.getByRole("button", { name: "3D" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "2D" }) as HTMLButtonElement).disabled
    ).toBe(false);
    expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
  });

  it("lets the visitor retry a failed mount", async () => {
    mount.mockImplementationOnce(() => {
      throw new Error("Mount failed");
    });
    render(<BioTrackViewer />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "3D" }) as HTMLButtonElement)
          .disabled
      ).toBe(false)
    );
  });

  it("uses a valid portable version-2 track with an elevated crossover and no remote artwork", () => {
    expect(
      viewerDesignSnapshotSchema.shape.design.safeParse(bioTrack).success
    ).toBe(true);
    expect(new Set(bioTrack.shapes.map((shape) => shape.id)).size).toBe(
      bioTrack.shapes.length
    );
    expect(
      bioTrack.shapes.every((shape) => !shape.appearance && !shape.meta)
    ).toBe(true);
    const line = bioTrack.shapes.find((shape) => shape.kind === "polyline");
    if (line?.kind !== "polyline") throw new Error("Missing race line");
    expect(
      line.points
        .filter((point) => point.x === 30 && point.y === 19)
        .map((point) => point.z)
    ).toEqual([5, 1]);
    for (const point of line.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(bioTrack.field.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(bioTrack.field.height);
    }
  });
});
