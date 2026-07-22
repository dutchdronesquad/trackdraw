import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";

const fontPath = new URL(
  "../../../public/assets/fonts/noto-sans-sc/NotoSansSC-VF.ttf",
  import.meta.url
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PDF font loading", () => {
  it("retries the CJK font request after a failed load", async () => {
    vi.resetModules();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary font failure"))
      .mockResolvedValueOnce(new Response(new Uint8Array([0, 1, 0, 0])));
    vi.stubGlobal("fetch", fetchMock);
    const { loadCjkPdfFontBinary } = await import("@/lib/export/pdf-font");

    await expect(loadCjkPdfFontBinary()).rejects.toThrow(
      "temporary font failure"
    );
    await expect(loadCjkPdfFontBinary()).resolves.toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("registers the real Noto Sans SC font with jsPDF", async () => {
    vi.resetModules();
    const { registerCjkPdfFont, setPdfFont } =
      await import("@/lib/export/pdf-font");
    const fontBinary = readFileSync(fontPath).toString("latin1");
    const pdf = new jsPDF({ format: "a4", unit: "mm" });

    registerCjkPdfFont(pdf, fontBinary);
    setPdfFont(pdf, "bold");
    pdf.setFontSize(20);
    pdf.text("赛事布场清单 - 上海竞速赛道", 20, 30);

    expect(pdf.getFontList().NotoSansSC).toContain("normal");
    const output = Buffer.from(pdf.output("arraybuffer"));
    const pdfSource = output.toString("latin1");
    expect(output.subarray(0, 8).toString("latin1")).toBe("%PDF-1.3");
    expect(pdfSource).toContain("/Identity-H");
    expect(pdfSource).toContain("/FontFile2");
    expect(output.byteLength).toBeGreaterThan(10_000);
  });
});
