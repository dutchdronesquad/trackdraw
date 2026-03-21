"use client";

import { useEffect } from "react";
import { recordPerfSample } from "@/lib/perf";

export function usePerfMetric(name: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const committedAt = performance.now();
    const frameId = window.requestAnimationFrame(() => {
      recordPerfSample(name, performance.now() - committedAt);
    });

    return () => window.cancelAnimationFrame(frameId);
  });
}
