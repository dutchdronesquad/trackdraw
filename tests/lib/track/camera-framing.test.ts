import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  fitPerspectiveBounds,
  PRESENTATION_FOV,
  updateOverviewBounds,
} from "@/lib/track/camera-framing";
import {
  getCourseFramingBounds,
  getItemFramingBounds,
} from "@/components/canvas/preview3d/framing-bounds";
import type { Shape } from "@/lib/types";

describe("interactive perspective framing", () => {
  it.each([
    [0.15, 0.25, 0.3],
    [300, 2, 3],
    [3, 300, 3],
    [8, 9, 45],
    [2200, 1700, 30],
  ])(
    "fits a %s × %s × %s course inside the usable viewport",
    (width, depth, height) => {
      const bounds = new THREE.Box3(
        new THREE.Vector3(-200, -0.1, 25),
        new THREE.Vector3(width - 200, height, depth + 25)
      );
      for (const viewport of [
        { aspect: 1.8, visibleWidth: 0.96, visibleHeight: 0.8 },
        { aspect: 0.45, visibleWidth: 0.94, visibleHeight: 0.75 },
        { aspect: 2.4, visibleWidth: 0.96, visibleHeight: 0.42 },
      ]) {
        const camera = new THREE.PerspectiveCamera(
          PRESENTATION_FOV,
          viewport.aspect,
          0.05,
          25000
        );
        const frame = fitPerspectiveBounds(bounds, camera, viewport);
        camera.position.copy(frame.position);
        camera.lookAt(frame.target);
        camera.updateMatrixWorld();
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              const projected = new THREE.Vector3(x, y, z).project(camera);
              expect(Math.abs(projected.x)).toBeLessThan(viewport.visibleWidth);
              expect(Math.abs(projected.y)).toBeLessThan(
                viewport.visibleHeight
              );
              expect(Math.abs(projected.z)).toBeLessThan(1);
            }
          }
        }
      }
    }
  );

  it("uses placed geometry and elevations, with the field as the empty-course fallback", () => {
    const gate: Shape = {
      kind: "gate",
      id: "gate",
      x: 11,
      y: 8,
      rotation: 49,
      width: 3,
      height: 2,
    };
    const diveGate: Shape = {
      kind: "divegate",
      id: "dive",
      x: 24,
      y: 8,
      rotation: 36,
      width: 8,
      elevation: 12,
      tilt: -60,
    };
    const localLabel: Shape = {
      kind: "label",
      id: "local-note",
      x: 14,
      y: 8,
      rotation: 0,
      text: "Start",
    };
    const remoteLabel: Shape = {
      ...localLabel,
      id: "remote-note",
      x: 990,
      y: 600,
    };
    const field = { width: 1000, height: 700 };
    const course = getCourseFramingBounds(
      [gate, diveGate, localLabel, remoteLabel],
      field
    );
    expect(course.min.x).toBeLessThan(gate.x);
    expect(course.max.x).toBeLessThan(35);
    expect(course.max.y).toBeGreaterThan(15.4);
    expect(course.containsBox(getItemFramingBounds(localLabel))).toBe(true);
    expect(course.containsBox(getItemFramingBounds(remoteLabel))).toBe(false);
    expect(getCourseFramingBounds([], field).max.toArray()).toEqual([
      1000, 0, 700,
    ]);
  });

  it("encloses the rendered curve height and includes both ends of a sparse track", () => {
    const path: Shape = {
      kind: "polyline",
      id: "route",
      rotation: 0,
      x: 0,
      y: 0,
      points: [
        { x: 10, y: 5, z: 0 },
        { x: 15, y: 8, z: 50 },
        { x: 500, y: 7, z: 0 },
      ],
    };
    const bounds = getCourseFramingBounds([path], { width: 60, height: 40 });
    expect(bounds.min.x).toBeLessThan(10);
    expect(bounds.max.x).toBeGreaterThan(500);
    expect(bounds.max.y).toBeGreaterThan(50);
    expect(bounds.min.y).toBeGreaterThan(-0.1);
  });

  it("retains new replay extents immediately and damps zoom-in after content recedes", () => {
    const current = new THREE.Box3();
    const tight = new THREE.Box3(
      new THREE.Vector3(-2, 0, -2),
      new THREE.Vector3(2, 4, 2)
    );
    const wider = tight.clone().expandByScalar(3);
    expect(updateOverviewBounds(current, tight, 0).equals(tight)).toBe(true);
    expect(updateOverviewBounds(current, wider, 1 / 60).equals(wider)).toBe(
      true
    );
    const once = updateOverviewBounds(wider.clone(), tight, 0.5);
    for (let i = 0; i < 30; i++) updateOverviewBounds(current, tight, 1 / 60);
    expect(current.containsBox(tight)).toBe(true);
    expect(current.max.x).toBeGreaterThan(tight.max.x);
    expect(current.max.x).toBeCloseTo(once.max.x, 10);
    expect(
      updateOverviewBounds(current, new THREE.Box3(), 0.5).equals(current)
    ).toBe(true);
  });
});
