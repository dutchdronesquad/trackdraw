export type EditorView = "2d" | "3d";

export function parseEditorView(
  value: string | null | undefined
): EditorView | undefined {
  if (value === "2d" || value === "3d") return value;
  return undefined;
}
