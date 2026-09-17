// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

export type WebglSupport = "supported" | "unsupported";

/**
 * Detects whether the current environment can render the 3D viewer.
 * No equivalent check exists elsewhere in the codebase — the editor's 3D
 * preview simply assumes WebGL is available.
 */
export function detectWebglSupport(
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): WebglSupport {
  if (typeof document === "undefined") return "unsupported";
  try {
    const canvas = createCanvas();
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    return gl ? "supported" : "unsupported";
  } catch {
    return "unsupported";
  }
}
