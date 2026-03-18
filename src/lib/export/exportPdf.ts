import type Konva from "konva";
import { loadJsPdf } from "@/lib/vendor/jspdf";
import type { TrackDesign } from "../types";

async function loadSvgAsPng(
  svgUrl: string,
  w: number,
  h: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = svgUrl;
  });
}

export async function exportPdf(
  stage: Konva.Stage,
  design: TrackDesign,
  filename = "track.pdf"
): Promise<void> {
  const { jsPDF } = await loadJsPdf();
  const { width, height } = design.field;

  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // ── Layout ──────────────────────────────────────────────────
  const margin = 14;
  const footerH = 12;
  const footerGap = 8; // gap between track card and footer
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - footerGap - footerH;

  // ── Colors ──────────────────────────────────────────────────
  const colBg: [number, number, number] = [244, 246, 250];
  const colWhite: [number, number, number] = [255, 255, 255];
  const colBorder: [number, number, number] = [215, 223, 235];
  const colMeta: [number, number, number] = [95, 112, 140];
  const colFooterBg: [number, number, number] = [236, 241, 248];

  // ── Page background ──────────────────────────────────────────
  pdf.setFillColor(...colBg);
  pdf.rect(0, 0, pageW, pageH, "F");

  // ── Track image area (fills almost the full page) ────────────
  const scale = Math.min(availW / width, availH / height);
  const imgW = width * scale;
  const imgH = height * scale;
  const imgX = margin + (availW - imgW) / 2;
  const imgY = margin + (availH - imgH) / 2;

  // White card behind track
  pdf.setFillColor(...colWhite);
  pdf.setDrawColor(...colBorder);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(imgX - 5, imgY - 5, imgW + 10, imgH + 10, 3, 3, "FD");

  // Track raster
  const ppm = design.field.ppm;
  const stageScale = stage.scaleX();
  const clipX = stage.x();
  const clipY = stage.y();
  const clipW = design.field.width * ppm * stageScale;
  const clipH = design.field.height * ppm * stageScale;
  const dataUrl = stage.toDataURL({
    x: clipX,
    y: clipY,
    width: clipW,
    height: clipH,
    pixelRatio: 2,
  });
  pdf.addImage(dataUrl, "PNG", imgX, imgY, imgW, imgH);

  // Dimension labels
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...colMeta);
  pdf.text(`${width} m`, imgX + imgW / 2, imgY + imgH + 8, { align: "center" });
  pdf.text(`${height} m`, imgX - 7, imgY + imgH / 2, {
    angle: 90,
    align: "center",
  });

  // ── Footer bar ───────────────────────────────────────────────
  const footerY = pageH - margin - footerH;
  pdf.setFillColor(...colFooterBg);
  pdf.setDrawColor(...colBorder);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(margin, footerY, availW, footerH, 2.5, 2.5, "FD");

  const midY = footerY + footerH / 2 + 1.2;

  // Left: TrackDraw logo
  const logoH = 6;
  const logoW = logoH * (799 / 200);
  const logoDataUrl = await loadSvgAsPng(
    "/assets/brand/trackdraw-logo-mono-lightbg.svg",
    799,
    200
  );
  if (logoDataUrl) {
    pdf.addImage(
      logoDataUrl,
      "PNG",
      margin + 5,
      footerY + (footerH - logoH) / 2,
      logoW,
      logoH
    );
  }

  // Center: track title + field size
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...colMeta);
  pdf.text(design.title.trim() || "Untitled Track", margin + availW / 2, midY, {
    align: "center",
  });

  const titleW = pdf.getTextWidth(design.title.trim() || "Untitled Track");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text(`  ${width} × ${height} m`, margin + availW / 2 + titleW / 2, midY);

  // Right: date
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...colMeta);
  pdf.text(dateStr, margin + availW - 5, midY, { align: "right" });

  pdf.save(filename);
}
