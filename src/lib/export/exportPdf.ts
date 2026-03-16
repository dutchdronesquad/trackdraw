import type Konva from "konva";
import type { TrackDesign } from "../types";

export async function exportPdf(
  stage: Konva.Stage,
  design: TrackDesign,
  filename = "track.pdf"
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { width, height } = design.field;

  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - 12; // room for footer

  const scale = Math.min(availW / width, availH / height);
  const imgW = width * scale;
  const imgH = height * scale;
  const imgX = margin + (availW - imgW) / 2;
  const imgY = margin;

  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  pdf.addImage(dataUrl, "PNG", imgX, imgY, imgW, imgH);

  pdf.setFontSize(9);
  pdf.setTextColor(100);
  pdf.text(
    `${design.title}  |  ${width}×${height}m  |  trackdraw`,
    margin,
    pageH - margin + 4
  );

  pdf.save(filename);
}
