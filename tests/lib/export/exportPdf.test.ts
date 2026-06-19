// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign, normalizeDesign } from "@/lib/track/design";
import { designToSvg } from "@/lib/export/exportSvg";

const pdfMock = vi.hoisted(() => ({
  instances: [] as Array<{
    addImageCalls: unknown[][];
    pages: number;
    rectCalls: unknown[][];
    savedFilenames: string[];
    textCalls: unknown[][];
  }>,
}));

vi.mock("@/lib/export/exportSvg", () => ({
  designToSvg: vi.fn(
    () =>
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>'
  ),
}));

vi.mock("@/lib/vendor/jspdf", () => {
  class MockPdf {
    addImageCalls: unknown[][] = [];
    pages = 1;
    rectCalls: unknown[][] = [];
    savedFilenames: string[] = [];
    textCalls: unknown[][] = [];
    internal = {
      pageSize: {
        getHeight: () => 297,
        getWidth: () => 210,
      },
    };

    addImage(...args: unknown[]) {
      this.addImageCalls.push(args);
    }
    addPage() {
      this.pages += 1;
    }
    getNumberOfPages() {
      return this.pages;
    }
    line() {}
    rect(...args: unknown[]) {
      this.rectCalls.push(args);
    }
    roundedRect() {}
    save(filename: string) {
      this.savedFilenames.push(filename);
    }
    setDrawColor() {}
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setLineWidth() {}
    setPage() {}
    setTextColor() {}
    splitTextToSize(text: string | string[]) {
      return Array.isArray(text) ? text : [text];
    }
    text(...args: unknown[]) {
      this.textCalls.push(args);
    }
  }

  function MockJsPdf() {
    const pdf = new MockPdf();
    pdfMock.instances.push(pdf);
    return pdf;
  }

  return {
    jsPDF: vi.fn(MockJsPdf),
  };
});

import { exportPdf } from "@/lib/export/exportPdf";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
  barrier: 0,
};

function createDensePracticalDesign() {
  const routePoints = Array.from({ length: 80 }, (_, index) => ({
    x: 4 + index * 0.75,
    y: 20 + Math.sin(index / 6) * 7,
    z: index % 4 === 0 ? 1 : 0,
  }));

  return normalizeDesign({
    id: "pdf-dense-layout",
    version: 1,
    title: "Dense PDF layout",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 80, height: 60, origin: "tl", gridStep: 0.1, ppm: 15 },
    shapes: [
      {
        id: "long-route",
        kind: "polyline",
        x: 0,
        y: 0,
        rotation: 0,
        points: routePoints,
      },
      ...routePoints.slice(1).map((point, index) => ({
        id: `gate-${String(index + 1).padStart(3, "0")}`,
        kind: "gate" as const,
        x: point.x,
        y: point.y,
        rotation: index % 3 === 0 ? 15 : 0,
        width: 2,
        height: 2,
      })),
    ],
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
  });
}

class MockImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("exportPdf", () => {
  beforeEach(() => {
    pdfMock.instances.length = 0;
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:trackdraw");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,trackdraw"
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("smoke-tests Race Pack export with a published share QR block", async () => {
    const design = createDefaultDesign();
    design.title = "Race Pack Smoke";

    await exportPdf(null as never, design, "race-pack.pdf", "dark", {
      preset: "race-day",
      shareUrl: "https://trackdraw.app/share/share-token",
    });

    const pdf = pdfMock.instances[0];
    expect(pdf).toBeTruthy();
    expect(pdf.savedFilenames).toEqual(["race-pack.pdf"]);
    expect(pdf.pages).toBe(3);
    expect(
      pdf.textCalls.some((call) => call.includes("Scan to open the track"))
    ).toBe(true);
    expect(pdf.rectCalls.length).toBeGreaterThan(20);
  });

  it("smoke-tests standard PDF export with the requested filename", async () => {
    const design = createDefaultDesign();
    design.title = "Standard PDF Smoke";

    await exportPdf(null as never, design, "track-map.pdf", "light");

    const pdf = pdfMock.instances[0];
    expect(pdf).toBeTruthy();
    expect(pdf.savedFilenames).toEqual(["track-map.pdf"]);
    expect(pdf.pages).toBe(1);
    expect(pdf.addImageCalls.length).toBe(1);
    expect(
      pdf.textCalls.some((call) => call.includes("Standard PDF Smoke"))
    ).toBe(true);
    expect(pdf.textCalls.some((call) => call.includes("60 x 40 m"))).toBe(true);
  });

  it("passes dense practical layouts through Race Pack PDF rendering", async () => {
    const design = createDensePracticalDesign();

    await exportPdf(null as never, design, "dense-race-pack.pdf", "dark", {
      includeObstacleNumbers: true,
      preset: "race-day",
      shareUrl: "https://trackdraw.app/share/share-token",
    });

    const pdf = pdfMock.instances[0];
    expect(pdf.savedFilenames).toEqual(["dense-race-pack.pdf"]);
    expect(pdf.pages).toBeGreaterThan(3);
    expect(designToSvg).toHaveBeenCalledWith(
      expect.objectContaining({ id: "pdf-dense-layout" }),
      "dark",
      expect.objectContaining({
        includeObstacleNumbers: true,
        preset: "race-day",
      })
    );
  });
});
