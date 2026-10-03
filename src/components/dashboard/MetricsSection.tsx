import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function MetricsSection({
  id,
  title,
  description,
  status,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
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
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
