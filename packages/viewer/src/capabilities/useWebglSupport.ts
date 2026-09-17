// Apache-2.0. Copyright Dutch Drone Squad. See packages/viewer/LICENSE and NOTICE.md.

"use client";

import { useState } from "react";
import { detectWebglSupport, type WebglSupport } from "./webgl";

/**
 * @param forceUnsupported Test-only escape hatch for exercising the
 * WebGL-unsupported fallback path without needing a browser that actually
 * lacks WebGL (used by the spike host page's simulate-fallback toggle).
 */
export function useWebglSupport(forceUnsupported = false): WebglSupport {
  const [detected] = useState<WebglSupport>(() => detectWebglSupport());
  return forceUnsupported ? "unsupported" : detected;
}
