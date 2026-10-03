import type { ReactNode } from "react";

export type MetricsTooltipRow = {
  key: string;
  label: ReactNode;
  value: ReactNode;
};

// Colors come from the chart config via --color-{key}.
export default function MetricsTooltipCard({
  label,
  rows,
}: {
  label: ReactNode;
  rows: MetricsTooltipRow[];
}) {
  return (
    <div className="bg-popover/95 min-w-44 rounded-lg border px-3 py-2.5 text-xs shadow-lg backdrop-blur-sm">
      <p className="text-foreground mb-2 font-semibold">{label}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: `var(--color-${row.key})` }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-foreground pl-3 font-mono font-semibold tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
