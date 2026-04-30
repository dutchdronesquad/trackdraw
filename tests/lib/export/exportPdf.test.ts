// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";

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
    expect(pdf.textCalls.some((call) => call.includes("60 × 40 m"))).toBe(true);
  });
});
