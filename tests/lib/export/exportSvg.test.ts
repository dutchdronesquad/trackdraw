import { describe, expect, it, vi } from "vitest";
import { designToSvg } from "@/lib/export/exportSvg";
import { normalizeDesign } from "@/lib/track/design";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

function createDesign() {
  return normalizeDesign({
    id: "design-svg",
    version: 1,
    title: `Club <Race> & "Fun"`,
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    shapes: [
      {
        id: "start-1",
        kind: "startfinish",
        x: 10,
        y: 10,
        rotation: 0,
        width: 3,
      },
      {
        id: "gate-1",
        kind: "gate",
        x: 12,
        y: 15,
        rotation: 15,
        width: 2,
        height: 2,
      },
      {
        id: "label-1",
        kind: "label",
        x: 20,
        y: 18,
        rotation: 0,
        text: `A < B & C`,
      },
      {
        id: "line-1",
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        points: [
          { x: 10, y: 10, z: 0 },
          { x: 12, y: 15, z: 0 },
          { x: 16, y: 20, z: 0 },
        ],
      },
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

describe("exportSvg", () => {
  it("renders a complete svg with escaped text and footer metadata", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T10:00:00.000Z"));

    const svg = designToSvg(createDesign(), "dark");

    expect(svg).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(svg).toContain(`Club &lt;Race&gt; &amp; &quot;Fun&quot;`);
    expect(svg).toContain(`A &lt; B &amp; C`);
    expect(svg).toContain(`<svg xmlns="http://www.w3.org/2000/svg"`);
    expect(svg).toContain(`60×40 m`);
  });

  it("can omit obstacle numbers when requested", () => {
    const design = createDesign();

    const withNumbers = designToSvg(design, "light");
    const withoutNumbers = designToSvg(design, "light", {
      includeObstacleNumbers: false,
    });

    expect(withNumbers).toContain(`<circle cx="`);
    expect(withoutNumbers).not.toContain(`font-weight="700" fill="#f8fafc"`);
  });
});
