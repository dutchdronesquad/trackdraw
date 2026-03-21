"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { useTheme } from "@/hooks/useTheme";
import {
  getPerfSnapshot,
  type PerfMetric,
  resetPerfMetrics,
  subscribePerf,
} from "@/lib/perf";
import { useEditor } from "@/store/editor";
import { selectActiveTool } from "@/store/selectors";

const EMPTY_PERF_SNAPSHOT: Record<string, PerfMetric> = {};
const HUD_TRANSITION = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1] as const,
};

function getMetricLevel(metric: PerfMetric | undefined) {
  if (!metric) return { label: "No data", tone: "text-slate-500" };
  if (metric.lastMs >= 80) return { label: "Heavy", tone: "text-amber-500" };
  if (metric.lastMs >= 32) return { label: "Busy", tone: "text-amber-400" };
  return { label: "OK", tone: "text-emerald-500" };
}

export default function PerformanceHud() {
  const { enabled, setEnabled } = useDeveloperMode();
  const prefersReducedMotion = useReducedMotion();
  const theme = useTheme();
  const activeTool = useEditor(selectActiveTool);
  const selectionCount = useEditor((state) => state.selection.length);
  const metrics = useSyncExternalStore(
    subscribePerf,
    getPerfSnapshot,
    () => EMPTY_PERF_SNAPSHOT
  );

  const rows = useMemo(() => {
    const summaryRows = [
      ["2D Canvas", metrics["render:TrackCanvas"]],
      ["3D View", metrics["render:TrackPreview3D"]],
      ["Inspector", metrics["render:Inspector"]],
      ["Autosave", metrics["autosave:localStorage"]],
    ] as const;

    return summaryRows.map(([label, metric]) => ({
      label,
      metric,
      level: getMetricLevel(metric),
    }));
  }, [metrics]);

  if (process.env.NODE_ENV === "production" || !enabled) {
    return null;
  }

  const isDark = theme === "dark";
  const panelClass = isDark
    ? "border-[#2b3443] bg-[#0f1726]/88 text-slate-50 shadow-[0_32px_96px_rgba(2,6,23,0.52)] backdrop-blur-md"
    : "border-[#c8d4e5] bg-[#eef3f9]/88 text-slate-900 shadow-[0_28px_84px_rgba(15,23,42,0.22)] backdrop-blur-md";
  const titleClass = isDark ? "text-sky-200/88" : "text-sky-700";
  const bodyClass = isDark ? "text-white/54" : "text-slate-600";
  const metricValueClass = isDark ? "text-white/52" : "text-slate-500";
  const buttonClass = isDark
    ? "border-white/10 bg-white/[0.05] text-white/76 hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
    : "border-slate-900/10 bg-white/72 text-slate-700 hover:border-slate-900/16 hover:bg-white hover:text-slate-950";
  const rowClass = isDark ? "bg-white/[0.035]" : "bg-slate-900/[0.045]";

  return (
    <motion.aside
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={HUD_TRANSITION}
      className={`pointer-events-auto fixed right-3 bottom-3 z-[80] w-[18.5rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border ${panelClass}`}
    >
      <div className="border-b border-current/8 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={`text-[9px] font-semibold tracking-[0.2em] uppercase ${titleClass}`}
            >
              Developer HUD
            </p>
            <p className={`mt-1 text-[11px] ${bodyClass}`}>
              Tool {activeTool} · {selectionCount} selected
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => resetPerfMetrics()}
              className={`rounded-md border px-2 py-1 text-[9px] font-medium tracking-[0.04em] transition-colors ${buttonClass}`}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setEnabled(false)}
              className={`rounded-md border px-2 py-1 text-[9px] font-medium tracking-[0.04em] transition-colors ${buttonClass}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5 p-3">
        {rows.map(({ label, metric, level }) => (
          <div
            key={label}
            className={`grid grid-cols-[minmax(0,1fr)_48px_52px] items-center gap-2 rounded-lg px-2.5 py-1.5 ${rowClass}`}
          >
            <span className="truncate text-[11px]">{label}</span>
            <span
              className={`text-right text-[11px] font-medium ${level.tone}`}
            >
              {level.label}
            </span>
            <span
              className={`text-right font-mono text-[11px] ${metricValueClass}`}
            >
              {metric ? `${metric.lastMs.toFixed(1)}ms` : "–"}
            </span>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
