"use client";

export interface PerfMetric {
  avgMs: number;
  count: number;
  lastMs: number;
  maxMs: number;
  minMs: number;
  totalMs: number;
}

type PerfSnapshot = Record<string, PerfMetric>;

const perfMetrics = new Map<string, PerfMetric>();
const listeners = new Set<() => void>();
let cachedPerfSnapshot: PerfSnapshot = {};

function emitPerfChange() {
  cachedPerfSnapshot = Object.fromEntries(perfMetrics.entries());
  listeners.forEach((listener) => listener());
}

function nextMetricSample(
  previous: PerfMetric | undefined,
  durationMs: number
) {
  if (!previous) {
    return {
      avgMs: durationMs,
      count: 1,
      lastMs: durationMs,
      maxMs: durationMs,
      minMs: durationMs,
      totalMs: durationMs,
    };
  }

  const count = previous.count + 1;
  const totalMs = previous.totalMs + durationMs;

  return {
    avgMs: totalMs / count,
    count,
    lastMs: durationMs,
    maxMs: Math.max(previous.maxMs, durationMs),
    minMs: Math.min(previous.minMs, durationMs),
    totalMs,
  };
}

export function recordPerfSample(name: string, durationMs: number) {
  if (process.env.NODE_ENV === "production") return;
  perfMetrics.set(name, nextMetricSample(perfMetrics.get(name), durationMs));
  emitPerfChange();
}

export function getPerfSnapshot(): PerfSnapshot {
  return cachedPerfSnapshot;
}

export function resetPerfMetrics() {
  perfMetrics.clear();
  emitPerfChange();
}

export function subscribePerf(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
