import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function MetricsSection({
  id,
  title,
  description,
  status,
  aside,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = useId();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "bg-card min-w-0 scroll-mt-20 overflow-hidden rounded-lg border",
        className
      )}
    >
      <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 max-w-3xl text-sm leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      <div className={aside ? "flex flex-wrap" : undefined}>
        <div
          className={cn(
            "min-w-0 p-4 sm:p-5",
            aside ? "flex-[3_1_30rem]" : undefined,
            bodyClassName
          )}
        >
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}

export type MetricsAsideChange = {
  text: string;
  tone: "positive" | "negative" | "neutral";
};

export function MetricsAside({
  value,
  label,
  change,
  note,
}: {
  value: string;
  label: string;
  change?: MetricsAsideChange | null;
  note?: ReactNode;
}) {
  return (
    <aside className="flex min-w-0 flex-[1_1_15rem] flex-col gap-2 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
      <div>
        <p className="text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
      {change ? (
        <p
          className={cn(
            "text-xs font-medium tabular-nums",
            change.tone === "positive" &&
              "text-emerald-700 dark:text-emerald-300",
            change.tone === "negative" && "text-rose-700 dark:text-rose-300",
            change.tone === "neutral" && "text-muted-foreground"
          )}
        >
          {change.text}
        </p>
      ) : null}
      {note ? <p className="text-sm leading-relaxed">{note}</p> : null}
    </aside>
  );
}
