import type { jsPDF } from "@/lib/vendor/jspdf";
import type { SupportedLocale } from "@/lib/i18n/locales";

export const CJK_PDF_FONT_PATH = "/assets/fonts/noto-sans-sc/NotoSansSC-VF.ttf";
export const CJK_PDF_FONT_FILENAME = "NotoSansSC-VF.ttf";
export const CJK_PDF_FONT_FAMILY = "NotoSansSC";

type PdfFontStyle = "normal" | "bold";

let cjkFontBinaryPromise: Promise<string> | null = null;
const configuredFontFamilies = new WeakMap<jsPDF, string>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }

  return binary;
}

async function fetchCjkFontBinary() {
  const response = await fetch(CJK_PDF_FONT_PATH);
  if (!response.ok) {
    throw new Error(`Unable to load the CJK PDF font (${response.status}).`);
  }

  return arrayBufferToBinaryString(await response.arrayBuffer());
}

export function loadCjkPdfFontBinary() {
  if (!cjkFontBinaryPromise) {
    cjkFontBinaryPromise = fetchCjkFontBinary().catch((error: unknown) => {
      cjkFontBinaryPromise = null;
      throw error;
    });
  }

  return cjkFontBinaryPromise;
}

export function registerCjkPdfFont(pdf: jsPDF, fontBinary: string) {
  pdf.addFileToVFS(CJK_PDF_FONT_FILENAME, fontBinary);
  pdf.addFont(
    CJK_PDF_FONT_FILENAME,
    CJK_PDF_FONT_FAMILY,
    "normal",
    400,
    "Identity-H"
  );
  configuredFontFamilies.set(pdf, CJK_PDF_FONT_FAMILY);
}

export async function configurePdfFont(
  pdf: jsPDF,
  locale: SupportedLocale | undefined
) {
  if (locale !== "zh-CN") return;
  registerCjkPdfFont(pdf, await loadCjkPdfFontBinary());
}

export function setPdfFont(pdf: jsPDF, style: PdfFontStyle) {
  const configuredFamily = configuredFontFamilies.get(pdf);
  if (configuredFamily) {
    // The single variable font keeps the download and parse cost bounded. PDF
    // hierarchy still comes from size and color, while every CJK text run uses
    // the same embedded font resource.
    pdf.setFont(configuredFamily, "normal");
    return;
  }

  pdf.setFont("helvetica", style);
}
