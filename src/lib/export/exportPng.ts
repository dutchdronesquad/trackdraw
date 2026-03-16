import type Konva from "konva";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPng(
  stage: Konva.Stage,
  filename = "track.png"
): Promise<void> {
  const blob = await stage.toBlob({ mimeType: "image/png", pixelRatio: 2 });
  if (blob) downloadBlob(blob as Blob, filename);
}
