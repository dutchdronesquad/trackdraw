"use client";

import { useEffect, useState } from "react";
import type { GrowthCustomRange } from "@/lib/metrics-growth";

export function usePeriodMetrics<T>(
  initial: T,
  defaultRange: GrowthCustomRange,
  range: GrowthCustomRange,
  load: (range: GrowthCustomRange) => Promise<T>
) {
  const key = `${range.from}:${range.to}`;
  const defaultKey = `${defaultRange.from}:${defaultRange.to}`;
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    failed?: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (key === defaultKey) return;
    let cancelled = false;
    load({ from: range.from, to: range.to }).then(
      (data) => {
        if (!cancelled) setResult({ key, data });
      },
      () => {
        if (!cancelled) setResult({ key, failed: true });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [key, defaultKey, range.from, range.to, load, attempt, initial]);
  return {
    data:
      key === defaultKey
        ? initial
        : result?.key === key
          ? result.data
          : undefined,
    failed: key !== defaultKey && result?.key === key && result.failed,
    retry: () => {
      setResult(null);
      setAttempt((value) => value + 1);
    },
  };
}
