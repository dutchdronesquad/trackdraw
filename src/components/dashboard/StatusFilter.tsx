"use client";

import { cn } from "@/lib/utils";

export type StatusFilterItem<TValue extends string> = {
  value: TValue;
  label: string;
  count: number;
  attention?: boolean;
};

export default function StatusFilter<TValue extends string>({
  label,
  items,
  value,
  onChange,
  className,
}: {
  label: string;
  items: StatusFilterItem<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        const flagged = item.attention && item.count > 0;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "focus-visible:ring-ring/40 inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2",
              active
                ? "border-brand-primary/35 bg-brand-primary/6 text-foreground"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {flagged ? (
              <span
                className="size-1.5 rounded-full bg-amber-500"
                aria-hidden="true"
              />
            ) : null}
            {item.label}
            <span
              className={cn(
                "tabular-nums",
                flagged
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              {item.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
