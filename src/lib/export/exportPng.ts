import type { TrackDesign } from "../types";
import { designToSvg, type ExportTheme } from "./exportSvg";

export async function exportPng(
  design: TrackDesign,
  filename = "track.png",
  theme: ExportTheme = "dark",
  scale = 3
): Promise<void> {
  const svgString = designToSvg(design, theme);
  const W = design.field.width * design.field.ppm;
  const H = design.field.height * design.field.ppm;

  const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No 2D context")); return; }
      ctx.drawImage(img, 0, 0, W * scale, H * scale);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("PNG render failed")); return; }
        const a = document.createElement("a");
        const pngUrl = URL.createObjectURL(blob);
        a.href = pngUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(pngUrl);
        resolve();
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(svgUrl); reject(new Error("SVG load failed")); };
    img.src = svgUrl;
  });
}
