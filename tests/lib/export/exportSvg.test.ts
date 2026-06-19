// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { designToSvg, exportSvg } from "@/lib/export/exportSvg";
import { normalizeDesign } from "@/lib/track/design";
import { getObstacleNumberingReport } from "@/lib/track/obstacleNumbering";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
  barrier: 0,
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("keeps very fine grid exports bounded for large layout stability", () => {
    const design = normalizeDesign({
      id: "design-svg-dense-grid",
      version: 1,
      title: "Dense grid",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 0.05, ppm: 20 },
      shapes: [],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const svg = designToSvg(design, "dark");
    const lineCount = svg.match(/<line /g)?.length ?? 0;

    expect(lineCount).toBeLessThan(300);
    expect(svg).toContain(`60×40 m`);
  });

  it("keeps dense practical layouts numbered and bounded in SVG export", () => {
    const routePoints = Array.from({ length: 120 }, (_, index) => ({
      x: 4 + index * 0.8,
      y: 20 + Math.sin(index / 8) * 8,
      z: index % 5 === 0 ? 1 : 0,
    }));
    const gates = routePoints.slice(1).map((point, index) => ({
      id: `gate-${String(index + 1).padStart(3, "0")}`,
      kind: "gate" as const,
      x: point.x,
      y: point.y,
      rotation: index % 4 === 0 ? 15 : 0,
      width: 2,
      height: 2,
    }));
    const design = normalizeDesign({
      id: "design-svg-large-layout",
      version: 1,
      title: "Large race-day layout",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 120, height: 80, origin: "tl", gridStep: 0.1, ppm: 15 },
      mapReference: {
        type: "map",
        provider: "esri-world-imagery",
        mapStyle: "satellite",
        centerLat: 52.1,
        centerLng: 5.2,
        zoom: 18,
        rotationDeg: 8,
        opacity: 0.65,
        visible: true,
        locked: true,
      },
      shapes: [
        {
          id: "long-route",
          kind: "polyline",
          x: 0,
          y: 0,
          rotation: 0,
          points: routePoints,
        },
        ...gates,
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const report = getObstacleNumberingReport(design);
    const svg = designToSvg(design, "dark");
    const gridLineCount = svg.match(/<line /g)?.length ?? 0;

    expect(report.status).toBe("ready");
    expect(report.mappedObstacleCount).toBe(gates.length);
    expect(report.obstacleNumberMap.get("gate-001")).toBe(1);
    expect(report.obstacleNumberMap.get("gate-119")).toBe(119);
    expect(gridLineCount).toBeLessThan(500);
    expect(svg.length).toBeLessThan(350_000);
    expect(svg).toContain(`Large race-day layout`);
    expect(svg).toContain(`>119</text>`);
  });

  it("colors timing point gates independently from obstacle numbers", () => {
    const design = normalizeDesign({
      id: "design-svg-timing",
      version: 1,
      title: "Timing points",
      description: "",
      tags: [],
      authorName: "",
      inventory,
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "gate-timing",
          kind: "gate",
          x: 12,
          y: 15,
          rotation: 0,
          width: 2,
          height: 2,
          meta: { timing: { role: "start_finish" } },
        },
      ],
      createdAt: "2026-04-13T10:00:00.000Z",
      updatedAt: "2026-04-13T10:00:00.000Z",
    });

    const svg = designToSvg(design, "light", {
      includeObstacleNumbers: false,
    });

    expect(svg).toContain(`stroke="#f59e0b" stroke-width="3"`);
    expect(svg).not.toContain(`>SF</text>`);
  });

  it("downloads the rendered svg with the requested filename", () => {
    const anchorRef: { current: HTMLAnchorElement | null } = { current: null };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trackdraw-svg");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        anchorRef.current = element as HTMLAnchorElement;
      }
      return element;
    });

    exportSvg(createDesign(), "track-map.svg", "dark");

    expect(anchorRef.current?.download).toBe("track-map.svg");
    expect(anchorRef.current?.href).toBe("blob:trackdraw-svg");
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:trackdraw-svg");
  });
});
