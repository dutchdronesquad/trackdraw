import type Konva from "konva";
import { jsPDF } from "@/lib/vendor/jspdf";
import {
  getInventoryComparison,
  getRequiredInventoryCounts,
} from "@/lib/planning/inventory";
import { buildSetupPlan } from "@/lib/planning/setup-estimate";
import { createQrCode } from "@/lib/qr-code";
import { getDesignTimingMarkers, timingRoleLabels } from "@/lib/track/timing";
import type { TrackDesign } from "../types";
import {
  designToSvg,
  type Export2DOptions,
  type ExportTheme,
} from "./exportSvg";

export type ExportPdfOptions = Export2DOptions & {
  shareUrl?: string | null;
};

const PRINT_BG: [number, number, number] = [255, 255, 255];
const INK: [number, number, number] = [24, 39, 60];
const MUTED: [number, number, number] = [95, 112, 140];
const BORDER: [number, number, number] = [215, 223, 235];
const PANEL: [number, number, number] = [245, 248, 252];
const WARN: [number, number, number] = [180, 83, 9];
const BRAND_LOGO_ASPECT = 1027 / 200;

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
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = svgUrl;
  });
}

async function renderDesignPngDataUrl(
  design: TrackDesign,
  theme: ExportTheme,
  options?: Export2DOptions
) {
  const svgString = designToSvg(design, theme, options);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const dataUrl = await loadSvgAsPng(
    svgUrl,
    Math.round(design.field.width * design.field.ppm * 2),
    Math.round(design.field.height * design.field.ppm * 2)
  );
  URL.revokeObjectURL(svgUrl);
  return dataUrl;
}

async function loadBrandLogo() {
  return loadSvgAsPng(
    "/assets/brand/trackdraw-logo-mono-lightbg.svg",
    799,
    200
  );
}

function setPageBackground(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...PRINT_BG);
  pdf.rect(0, 0, pageW, pageH, "F");
}

function drawPageFooter(
  pdf: jsPDF,
  {
    pageLabel,
    pageNumber,
    totalPages,
  }: { pageLabel: string; pageNumber: number; totalPages: number }
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const footerY = pageH - 10;

  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.line(margin, footerY - 3.5, pageW - margin, footerY - 3.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text(`TrackDraw · ${pageLabel}`, margin, footerY);
  pdf.text(`Page ${pageNumber} of ${totalPages}`, pageW - margin, footerY, {
    align: "right",
  });
}

function drawSmallPageLogo(pdf: jsPDF, logoDataUrl: string) {
  if (!logoDataUrl) return;
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;
  const logoH = 3.8;
  const logoW = logoH * BRAND_LOGO_ASPECT;
  pdf.addImage(
    logoDataUrl,
    "PNG",
    pageW - margin - logoW,
    margin - 1,
    logoW,
    logoH
  );
}

function drawSectionTitle(
  pdf: jsPDF,
  title: string,
  x: number,
  y: number,
  w: number
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(title.toUpperCase(), x, y);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.line(x, y + 2.5, x + w, y + 2.5);
}

function drawInfoCard(
  pdf: jsPDF,
  {
    x,
    y,
    w,
    h,
    label,
    value,
    tone = "neutral",
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value: string;
    tone?: "neutral" | "warn";
  }
) {
  pdf.setFillColor(...PANEL);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(x, y, w, h, 3, 3, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text(label.toUpperCase(), x + 4, y + 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...(tone === "warn" ? WARN : INK));
  pdf.text(value, x + 4, y + 14);
}

function drawQrCode(
  pdf: jsPDF,
  {
    size,
    url,
    x,
    y,
  }: {
    size: number;
    url: string;
    x: number;
    y: number;
  }
) {
  const quietZoneModules = 4;
  const qr = createQrCode(url);
  const totalModules = qr.size + quietZoneModules * 2;
  const moduleSize = size / totalModules;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, size, size, "F");
  pdf.setFillColor(...INK);

  qr.modules.forEach((row, rowIndex) => {
    row.forEach((dark, columnIndex) => {
      if (!dark) return;
      pdf.rect(
        x + (columnIndex + quietZoneModules) * moduleSize,
        y + (rowIndex + quietZoneModules) * moduleSize,
        moduleSize,
        moduleSize,
        "F"
      );
    });
  });
}

function drawSharedViewBlock(
  pdf: jsPDF,
  {
    shareUrl,
    w,
    x,
    y,
  }: {
    shareUrl?: string | null;
    w: number;
    x: number;
    y: number;
  }
) {
  const h = 35;
  const qrSize = 25;

  pdf.setFillColor(...PANEL);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(x, y, w, h, 3, 3, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("SHARED VIEW", x + 4, y + 6.5);

  if (shareUrl) {
    try {
      drawQrCode(pdf, {
        size: qrSize,
        url: shareUrl,
        x: x + w - qrSize - 4,
        y: y + 5,
      });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...INK);
      pdf.text("Scan to open the track", x + 4, y + 14);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      pdf.setTextColor(...MUTED);
      const lines = pdf.splitTextToSize(
        "Opens the canonical TrackDraw share link for mobile review and briefing.",
        w - qrSize - 13
      );
      pdf.text(lines, x + 4, y + 20);
      return;
    } catch {
      /* fall through to the no-QR text below */
    }
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  pdf.text("No published share linked", x + 4, y + 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  const lines = pdf.splitTextToSize(
    "Publish this project first if you want the Race Pack to include a scan code.",
    w - 8
  );
  pdf.text(lines, x + 4, y + 20);
}

function buildRacePackContext(design: TrackDesign, options?: Export2DOptions) {
  const required = getRequiredInventoryCounts(design);
  const inventoryComparison = getInventoryComparison(design);
  const shortages = inventoryComparison.filter((item) => item.missing > 0);
  const totalMissing = shortages.reduce((sum, item) => sum + item.missing, 0);
  const totalRequired = Object.values(required).reduce(
    (sum, value) => sum + value,
    0
  );
  const numberingEnabled = options?.includeObstacleNumbers !== false;
  const setupPlan = buildSetupPlan(design);
  const timingMarkers = getDesignTimingMarkers(design);

  return {
    inventoryComparison,
    numberingEnabled,
    setupSequence: setupPlan.steps,
    shortages,
    estimatedSetupRange: setupPlan.estimatedElapsedRange,
    setupCrewAssumption: setupPlan.crewAssumption,
    setupComplexityLabel: setupPlan.complexityLabel,
    setupSummary: setupPlan.summary,
    timingMarkers,
    totalMissing,
    totalRequired,
  };
}

function drawRacePackCover(
  pdf: jsPDF,
  design: TrackDesign,
  logoDataUrl: string,
  dateText: string,
  context: ReturnType<typeof buildRacePackContext>,
  options?: ExportPdfOptions
) {
  setPageBackground(pdf);
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 16;
  let y = 18;

  if (logoDataUrl) {
    const logoH = 10.5;
    const logoW = logoH * BRAND_LOGO_ASPECT;
    pdf.addImage(logoDataUrl, "PNG", margin, y, logoW, logoH);
  }

  y += 24;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(...INK);
  pdf.text("Race Pack", margin, y);

  y += 9;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(design.title.trim() || "Untitled Track", margin, y);

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(
    `${design.field.width} × ${design.field.height} m  ·  ${dateText}  ·  ${context.numberingEnabled ? "numbering included" : "numbering hidden"}`,
    margin,
    y
  );

  y += 14;
  const cardW = (pageW - margin * 2 - 8) / 3;
  drawInfoCard(pdf, {
    x: margin,
    y,
    w: cardW,
    h: 22,
    label: "Status",
    value: context.totalMissing === 0 ? "Buildable" : "Short",
    tone: context.totalMissing > 0 ? "warn" : "neutral",
  });
  drawInfoCard(pdf, {
    x: margin + cardW + 4,
    y,
    w: cardW,
    h: 22,
    label: "Missing",
    value: String(context.totalMissing),
    tone: context.totalMissing > 0 ? "warn" : "neutral",
  });
  drawInfoCard(pdf, {
    x: margin + (cardW + 4) * 2,
    y,
    w: cardW,
    h: 22,
    label: "Obstacles",
    value: String(context.totalRequired),
  });

  y += 31;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...MUTED);
  const intro = pdf.splitTextToSize(
    "This Race Pack is meant to travel with the build crew on race day. Use the map as the placement reference, the material list as the stock check, and the setup sequence as the practical order to get the course on the field. The setup timing is based on a typical 2-3 person crew and a club-style workflow: unload, stage, pre-assemble, then place and secure.",
    pageW - margin * 2
  );
  pdf.text(intro, margin, y);
  y += intro.length * 5 + 6;
  drawSectionTitle(pdf, "Contents", margin, y, pageW - margin * 2);
  y += 10;

  const contents = [
    "1. Track map and field overview",
    "2. Material list, stock check, and timing points",
    "3. Setup sequence and race-day notes",
  ];
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...INK);
  contents.forEach((line) => {
    pdf.text(line, margin, y);
    y += 8;
  });

  y += 8;
  drawSectionTitle(pdf, "Summary", margin, y, pageW - margin * 2);
  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  const summary =
    context.totalMissing > 0
      ? `This layout currently exceeds available stock in ${context.shortages.length} obstacle type${context.shortages.length === 1 ? "" : "s"}. Resolve shortages before using this pack as the final build reference.`
      : "This layout is currently buildable with the saved inventory profile. Use the following pages as the race-day setup and handoff reference.";
  const summaryLines = pdf.splitTextToSize(summary, pageW - margin * 2);
  pdf.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  drawSharedViewBlock(pdf, {
    shareUrl: options?.shareUrl ?? null,
    w: pageW - margin * 2,
    x: margin,
    y,
  });
}

function drawRacePackMapPage(
  pdf: jsPDF,
  design: TrackDesign,
  mapDataUrl: string,
  logoDataUrl: string,
  dateText: string,
  context: ReturnType<typeof buildRacePackContext>
) {
  pdf.addPage("a4", "landscape");
  setPageBackground(pdf);
  drawSmallPageLogo(pdf, logoDataUrl);

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const headerH = 18;
  const footerReserve = 14;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2 - headerH - footerReserve;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...INK);
  pdf.text("Track map", margin, margin + 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...MUTED);
  pdf.text(design.title.trim() || "Untitled Track", margin, margin + 11);
  pdf.text(dateText, pageW - margin, margin + 11, { align: "right" });

  const scale = Math.min(
    contentW / design.field.width,
    contentH / design.field.height
  );
  const imgW = design.field.width * scale;
  const imgH = design.field.height * scale;
  const imgX = margin + (contentW - imgW) / 2;
  const imgY = margin + headerH + (contentH - imgH) / 2;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8, 3, 3, "FD");
  pdf.addImage(mapDataUrl, "PNG", imgX, imgY, imgW, imgH);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.2);
  pdf.setTextColor(...MUTED);
  pdf.text(`${design.field.width} m`, imgX + imgW / 2, imgY + imgH + 7, {
    align: "center",
  });
  pdf.text(`${design.field.height} m`, imgX - 6, imgY + imgH / 2, {
    angle: 90,
    align: "center",
  });

  const statusText =
    context.totalMissing > 0
      ? `Stock short by ${context.totalMissing}`
      : "Stock check: buildable";
  pdf.text(
    `${statusText}  ·  ${context.numberingEnabled ? "numbering shown" : "numbering hidden"}`,
    margin,
    pageH - margin
  );
}

function drawRacePackBuildSheet(
  pdf: jsPDF,
  design: TrackDesign,
  logoDataUrl: string,
  dateText: string,
  context: ReturnType<typeof buildRacePackContext>
) {
  pdf.addPage("a4", "portrait");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const bottomLimit = pageH - 22;
  let y = 18;

  const startBuildSheetPage = () => {
    setPageBackground(pdf);
    drawSmallPageLogo(pdf, logoDataUrl);
    y = 18;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(...INK);
    pdf.text("Build sheet", margin, y);

    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...MUTED);
    pdf.text(
      `${design.title.trim() || "Untitled Track"}  ·  ${dateText}`,
      margin,
      y
    );
  };

  const ensurePageSpace = (neededHeight: number, continuationTitle: string) => {
    if (y + neededHeight <= bottomLimit) return;
    pdf.addPage("a4", "portrait");
    startBuildSheetPage();
    y += 12;
    drawSectionTitle(pdf, continuationTitle, margin, y, contentW);
    y += 10;
  };

  startBuildSheetPage();

  y += 12;
  drawSectionTitle(pdf, "Material list", margin, y, contentW);
  y += 10;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text("Obstacle", margin, y);
  pdf.text("Required", margin + 88, y, { align: "right" });
  pdf.text("Available", margin + 118, y, { align: "right" });
  pdf.text("Missing", margin + 148, y, { align: "right" });
  y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  context.inventoryComparison.forEach((item) => {
    ensurePageSpace(7, "Material list");
    pdf.setTextColor(...INK);
    pdf.text(item.label, margin, y);
    pdf.text(String(item.required), margin + 88, y, { align: "right" });
    pdf.text(String(item.available), margin + 118, y, { align: "right" });
    pdf.setTextColor(...(item.missing > 0 ? WARN : MUTED));
    pdf.text(String(item.missing), margin + 148, y, { align: "right" });
    y += 5.5;
  });

  y += 8;
  drawSectionTitle(pdf, "Timing points", margin, y, contentW);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  if (context.timingMarkers.length) {
    context.timingMarkers.forEach((item) => {
      const title = item.marker.timingId
        ? `${item.title} (${item.marker.timingId})`
        : item.title;
      const detail = `${timingRoleLabels[item.marker.role]} · ${item.shape.name?.trim() || item.shape.kind} · ${item.shape.x.toFixed(1)}, ${item.shape.y.toFixed(1)} m`;
      ensurePageSpace(12, "Timing points");
      pdf.setTextColor(...INK);
      pdf.setFont("helvetica", "bold");
      pdf.text(item.badgeText, margin, y);
      pdf.text(title, margin + 16, y);
      y += 4.5;
      pdf.setTextColor(...MUTED);
      pdf.setFont("helvetica", "normal");
      pdf.text(detail, margin + 16, y);
      y += 6;
    });
  } else {
    const lines = pdf.splitTextToSize(
      "No timing points are assigned yet. Mark a gate as start/finish or split in the inspector before race-day handoff.",
      contentW
    );
    pdf.setTextColor(...MUTED);
    pdf.text(lines, margin, y);
    y += lines.length * 4.5 + 2;
  }

  y += 8;
  drawSectionTitle(pdf, "Setup sequence", margin, y, contentW);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.8);
  pdf.setTextColor(...INK);
  const sequenceIntro = pdf.splitTextToSize(
    `Estimated setup effort: about ${context.estimatedSetupRange[0]}-${context.estimatedSetupRange[1]} minutes. Overall complexity: ${context.setupComplexityLabel}. ${context.setupSummary}`,
    contentW
  );
  pdf.setTextColor(...MUTED);
  pdf.text(sequenceIntro, margin, y);
  y += sequenceIntro.length * 4.5 + 3;
  const crewNote = pdf.splitTextToSize(context.setupCrewAssumption, contentW);
  pdf.text(crewNote, margin, y);
  y += crewNote.length * 4.5 + 3;

  pdf.setTextColor(...INK);
  if (context.setupSequence.length) {
    context.setupSequence.forEach((item, index) => {
      const note = pdf.splitTextToSize(item.note, contentW - 16);
      const metaLine =
        item.stepType === "crew"
          ? "Crew step"
          : item.stepType === "group"
            ? "Grouped track task"
            : item.obstacleNumber != null
              ? `${item.kind} · Obstacle #${item.obstacleNumber}`
              : item.kind;
      const title =
        item.stepType === "item" && item.label.trim() === item.kind.trim()
          ? item.kind
          : item.label;
      const blockHeight = 10 + note.length * 4 + 3;
      ensurePageSpace(blockHeight, "Setup sequence");

      pdf.setTextColor(...INK);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${index + 1}.`, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, margin + 10, y);
      pdf.text(`${item.estimatedMinutes} min`, pageW - margin, y, {
        align: "right",
      });
      y += 4;
      pdf.setTextColor(...MUTED);
      pdf.text(metaLine, margin + 10, y);
      y += 4;
      pdf.text(note, margin + 10, y);
      y += note.length * 4 + 2;
      pdf.setTextColor(...INK);
    });
  } else {
    const message = context.numberingEnabled
      ? "No setup sequence is available yet. Add a route and place some obstacles to generate a more useful pack."
      : "Numbering is hidden in this export. Enable obstacle numbers if you want the setup sequence to follow route references.";
    const lines = pdf.splitTextToSize(message, contentW);
    pdf.setTextColor(...MUTED);
    pdf.text(lines, margin, y);
    y += lines.length * 5;
  }

  y += 8;
  drawSectionTitle(pdf, "Race-day notes", margin, y, contentW);
  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  const notes = [
    "Use the map page as the placement reference during setup and pilot briefing.",
    "Treat the stock check as the source of truth before committing the layout for build.",
    "Anchor the course first, then secure higher-effort structures such as dive gates and ladders before the standard gate pass.",
    "If the route or obstacle count changes, regenerate the Race Pack so the map, stock list, and setup sequence stay aligned.",
  ];
  notes.forEach((note) => {
    const wrapped = pdf.splitTextToSize(`• ${note}`, contentW);
    ensurePageSpace(wrapped.length * 4.5 + 3, "Race-day notes");
    pdf.text(wrapped, margin, y);
    y += wrapped.length * 4.5 + 1.5;
  });
}

async function exportRacePackPdf(
  design: TrackDesign,
  filename: string,
  theme: ExportTheme,
  options?: ExportPdfOptions
) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const dateText = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const logoDataUrl = await loadBrandLogo();
  const mapDataUrl = await renderDesignPngDataUrl(design, theme, options);
  if (!mapDataUrl) {
    throw new Error("PDF render failed");
  }

  const context = buildRacePackContext(design, options);
  drawRacePackCover(pdf, design, logoDataUrl, dateText, context, options);
  drawRacePackMapPage(pdf, design, mapDataUrl, logoDataUrl, dateText, context);
  drawRacePackBuildSheet(pdf, design, logoDataUrl, dateText, context);

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    drawPageFooter(pdf, {
      pageLabel:
        page === 1 ? "Overview" : page === 2 ? "Track map" : "Build sheet",
      pageNumber: page,
      totalPages,
    });
  }

  pdf.save(filename);
}

async function exportStandardPdf(
  design: TrackDesign,
  filename: string,
  theme: ExportTheme,
  options?: Export2DOptions
) {
  const { width, height } = design.field;
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  setPageBackground(pdf);

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const footerH = 12;
  const footerGap = 8;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - footerGap - footerH;

  const dataUrl = await renderDesignPngDataUrl(design, theme, options);
  if (!dataUrl) {
    throw new Error("PDF render failed");
  }

  const scale = Math.min(availW / width, availH / height);
  const imgW = width * scale;
  const imgH = height * scale;
  const imgX = margin + (availW - imgW) / 2;
  const imgY = margin + (availH - imgH) / 2;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(imgX - 4, imgY - 4, imgW + 8, imgH + 8, 3, 3, "FD");
  pdf.addImage(dataUrl, "PNG", imgX, imgY, imgW, imgH);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text(`${width} m`, imgX + imgW / 2, imgY + imgH + 7, { align: "center" });
  pdf.text(`${height} m`, imgX - 6, imgY + imgH / 2, {
    angle: 90,
    align: "center",
  });

  const footerY = pageH - margin - footerH;
  pdf.setFillColor(...PANEL);
  pdf.setDrawColor(...BORDER);
  pdf.roundedRect(margin, footerY, availW, footerH, 2.5, 2.5, "FD");
  const dateText = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const midY = footerY + footerH / 2 + 1.2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(design.title.trim() || "Untitled Track", margin + 5, midY);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text(`${width} × ${height} m`, pageW / 2, midY, { align: "center" });
  pdf.text(dateText, pageW - margin - 5, midY, { align: "right" });

  pdf.save(filename);
}

export async function exportPdf(
  stage: Konva.Stage,
  design: TrackDesign,
  filename = "track.pdf",
  theme: ExportTheme = "dark",
  options?: ExportPdfOptions
): Promise<void> {
  void stage;
  if ((options?.preset ?? "standard") === "race-day") {
    await exportRacePackPdf(design, filename, theme, options);
    return;
  }

  await exportStandardPdf(design, filename, theme, options);
}
