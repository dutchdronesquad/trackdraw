import { useId, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3.5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base leading-6 font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm leading-5">
              {description}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      <div className={aside ? "flex flex-wrap" : undefined}>
        <div
          className={cn(
            "min-w-0 p-4",
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
  tone: "positive" | "negative" | "neutral" | "warning";
};

export function MetricsAside({
  value,
  label,
  change,
  note,
  detail,
  link,
}: {
  value: string;
  label: string;
  change?: MetricsAsideChange | null;
  note?: ReactNode;
  detail?: ReactNode;
  link?: { label: string; onClick: () => void };
}) {
  return (
    <aside className="flex min-w-0 flex-[1_1_15rem] flex-col gap-2.5 border-t p-4 lg:border-t-0 lg:border-l">
      <div>
        <p className="text-2xl leading-8 font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
      {change ? (
        <p
          className={cn(
            "text-xs font-medium tabular-nums",
            change.tone === "positive" &&
              "text-emerald-700 dark:text-emerald-300",
            change.tone === "negative" && "text-rose-700 dark:text-rose-300",
            change.tone === "warning" && "text-amber-700 dark:text-amber-300",
            change.tone === "neutral" && "text-muted-foreground"
          )}
        >
          {change.text}
        </p>
      ) : null}
      {note ? <p className="text-sm leading-5">{note}</p> : null}
      {detail ? (
        <p className="text-muted-foreground text-xs leading-[18px]">{detail}</p>
      ) : null}
      {link ? (
        <button
          type="button"
          onClick={link.onClick}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-auto inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          {link.label}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </aside>
  );
}
