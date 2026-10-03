import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailStats({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <div
      className="grid divide-x border-b"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(({ label, value }) => (
        <div key={label} className="px-3 py-3 text-center">
          <p className="text-muted-foreground truncate text-[10px] font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-medium tabular-nums">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b px-6 py-5 last:border-b-0", className)}>
      {title ? (
        <h3 className="text-muted-foreground mb-3 text-[10px] font-medium tracking-wide uppercase">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function DetailList({
  items,
}: {
  items: { label: string; value: ReactNode; className?: string }[];
}) {
  return (
    <dl className="space-y-2">
      {items.map(({ label, value, className }) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <dt className="text-muted-foreground shrink-0">{label}</dt>
          <dd className={cn("min-w-0 truncate text-right", className)}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailNotice({
  tone,
  children,
}: {
  tone: "amber" | "destructive";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "border-b px-6 py-2.5 text-xs leading-relaxed",
        tone === "amber"
          ? "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200"
          : "border-destructive/20 bg-destructive/5 text-destructive"
      )}
    >
      {children}
    </p>
  );
}

export function DangerAction({
  description,
  action,
}: {
  description: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="border-destructive/25 bg-destructive/4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <p className="text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
}
