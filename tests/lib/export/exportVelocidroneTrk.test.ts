// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVelocidronePayload,
  buildVelocidroneValueJson,
  encryptVelocidroneTrk,
  exportVelocidroneTrk,
} from "@/lib/export/exportVelocidroneTrk";
import { normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
  barrier: 0,
};

function createVelocidroneReadyDesign() {
  return normalizeDesign({
    id: "design-vd",
    version: 1,
    title: "Velocidrone Test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes: [
      {
        id: "start-1",
        kind: "startfinish",
        x: 30,
        y: 5,
        rotation: 0,
        width: 3,
      },
      {
        id: "gate-1",
        kind: "gate",
        x: 30,
        y: 10,
        rotation: 0,
        width: 2,
        height: 2,
      },
      {
        id: "gate-2",
        kind: "gate",
        x: 30,
        y: 16,
        rotation: 15,
        width: 2,
        height: 2,
      },
      {
        id: "flag-1",
        kind: "flag",
        x: 26,
        y: 5,
        rotation: 180,
        radius: 0.25,
      },
      {
        id: "cone-1",
        kind: "cone",
        x: 34,
        y: 5,
        rotation: 0,
        radius: 0.2,
      },
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

describe("exportVelocidroneTrk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds Velocidrone value json with ordered gates and barriers", () => {
    const valueJson = buildVelocidroneValueJson(createVelocidroneReadyDesign());

    expect(valueJson.gates).toHaveLength(2);
    expect(valueJson.gates[0]).toMatchObject({
      gate: 0,
      start: true,
      finish: true,
    });
    expect(valueJson.gates[1]).toMatchObject({
      gate: 1,
      start: false,
      finish: true,
    });
    expect(valueJson.barriers.length).toBeGreaterThan(0);
  });

  it("builds payload text and strips line breaks from track names", () => {
    const valueJson = buildVelocidroneValueJson(createVelocidroneReadyDesign());
    const payload = buildVelocidronePayload({
      sceneId: 8,
      trackName: "Line 1\nLine 2",
      valueJson,
      type: 0,
      onlineId: 0,
    });

    expect(payload.split("\n")[0]).toBe("8");
    expect(payload.split("\n")[1]).toBe("Line 1 Line 2");
    expect(payload).toContain(`"gates"`);
    expect(payload).toContain(`"barriers"`);
  });

  it("encrypts payloads deterministically for the same plaintext", async () => {
    const plaintext = "8\ntrack\n{}\n0\n0";

    const encryptedA = await encryptVelocidroneTrk(plaintext);
    const encryptedB = await encryptVelocidroneTrk(plaintext);

    expect(encryptedA).toBe(encryptedB);
    expect(encryptedA).not.toBe(plaintext);
    expect(encryptedA.length).toBeGreaterThan(0);
  });

  it("throws when the design is invalid for Velocidrone export", () => {
    const invalid = normalizeDesign({
      id: "invalid-vd",
      version: 1,
      title: "Invalid",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "start-1",
          kind: "startfinish",
          x: 30,
          y: 5,
          rotation: 0,
          width: 3,
        },
        {
          id: "gate-1",
          kind: "gate",
          x: 30,
          y: 10,
          rotation: 0,
          width: 2,
          height: 2,
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    expect(() => buildVelocidroneValueJson(invalid)).toThrow(
      /at least 2 gate objects/
    );
  });

  it("exports an encrypted .trk download with the requested filename", async () => {
    const anchorRef: { current: HTMLAnchorElement | null } = { current: null };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trackdraw-trk");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        anchorRef.current = element as HTMLAnchorElement;
      }
      return element;
    });

    const summary = await exportVelocidroneTrk(
      createVelocidroneReadyDesign(),
      "race-day.trk"
    );

    expect(summary.gateCount).toBe(2);
    expect(anchorRef.current?.download).toBe("race-day.trk");
    expect(anchorRef.current?.href).toBe("blob:trackdraw-trk");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:trackdraw-trk");
  });
});
