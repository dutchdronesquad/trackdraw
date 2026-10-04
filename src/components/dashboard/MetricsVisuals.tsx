import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function isoWeekNumber(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3);
  return (
    1 + Math.round((date.getTime() - firstThursday.getTime()) / 604_800_000)
  );
}

export const metricsTableClassNames = {
  table: "w-full border-collapse text-sm",
  headRow: "border-b",
  head: "h-10 px-3 py-2 text-left text-xs font-medium first:pl-4 last:pr-4",
  row: "border-b last:border-0",
  cell: "px-3 py-2.5 first:pl-4 last:pr-4",
};

export function MetricsSwatch({
  color,
  className,
  style,
}: {
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-[2px]", className)}
      style={{ background: color, ...style }}
    />
  );
}

export function MetricsLegend({
  items,
}: {
  items: Array<{ key: string; label: string; color: string }>;
}) {
  return (
    <div className="text-muted-foreground mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <MetricsSwatch color={item.color} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function MetricsStackedBar({
  segments,
  label,
}: {
  segments: Array<{
    key: string;
    value: number;
    color: string;
    muted?: boolean;
  }>;
  label: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div
      role="img"
      aria-label={label}
      className="bg-muted flex h-3 overflow-hidden rounded-full"
    >
      {total > 0
        ? segments.map((segment) => (
            <span
              key={segment.key}
              className={segment.muted ? "opacity-40" : undefined}
              style={{
                width: `${(segment.value / total) * 100}%`,
                background: segment.color,
              }}
            />
          ))
        : null}
    </div>
  );
}

export function MetricsInlineBar({
  ratio,
  value,
  color = "var(--chart-1)",
  muted = false,
  valueClassName,
  label,
}: {
  ratio: number;
  value: ReactNode;
  color?: string;
  muted?: boolean;
  valueClassName?: string;
  label?: string;
}) {
  const width = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <span className="flex items-center gap-2">
      <span
        className="bg-muted h-1.5 min-w-12 flex-1 overflow-hidden rounded-full"
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        {width > 0 ? (
          <span
            className={cn("block h-full rounded-full", muted && "opacity-50")}
            style={{ width: `${width}%`, background: color }}
          />
        ) : null}
      </span>
      <span
        className={cn(
          "w-10 shrink-0 text-right text-xs tabular-nums",
          valueClassName
        )}
      >
        {value}
      </span>
    </span>
  );
}

export function MetricsStatStrip({
  items,
}: {
  items: Array<{
    key: string;
    value: ReactNode;
    label: string;
    tone?: "default" | "amber";
  }>;
}) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-b">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex flex-col-reverse border-b px-4 py-3.5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
        >
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd
            className={cn(
              "text-2xl leading-8 font-semibold tabular-nums",
              item.tone === "amber" && "text-amber-700 dark:text-amber-300"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MetricsEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-40 items-center justify-center p-4 text-center text-sm">
      {children}
    </div>
  );
}
