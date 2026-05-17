export function downloadJsonFile(filename: string, payload: unknown) {
  const json = JSON.stringify(payload, null, 2);
  if (json === undefined) {
    throw new Error("Nothing to export");
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
